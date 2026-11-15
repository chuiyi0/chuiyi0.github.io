"""Generate cached natural US clips; the distributed app never calls TTS online."""
from pathlib import Path
import asyncio, base64, concurrent.futures, html, json, re, subprocess, time
import numpy as np
import edge_tts

R=Path(__file__).resolve().parent
SRC=R; CACHE=R/'work/natural-audio-cache'; CACHE.mkdir(parents=True,exist_ok=True)
CLIPS=CACHE/'clips'; CLIPS.mkdir(exist_ok=True)
import shutil
FFMPEG=shutil.which('ffmpeg')
if not FFMPEG:raise RuntimeError('Install FFmpeg and add it to PATH')
VOICE='en-US-JennyNeural'
entries=json.loads((SRC/'app/catalog.json').read_text(encoding='utf-8'))['entries']
shared=json.loads((SRC/'app/shared.json').read_text(encoding='utf-8'))
references=shared.get('bookMeta',{}).get('familyOnlyWords',{})
def reference(w):return references.get(w['id'],w.get('family_only',False) or w['word'].lower() in ['age','add'])
unique={w['word'].strip().lower():w['word'].strip() for w in entries if not reference(w)}
words=list(unique.values())
summary={'voice':VOICE,'rate':'-5%','codec':'audio/mpeg','sampleRate':24000,'bitrate':24000,'words':len(words),'batches':0,'errors':[]}

def encode_batch(batch_index, group, raw, bounds):
    if len(group)!=len(bounds): raise ValueError(f'Boundary count {len(bounds)} != {len(group)}')
    for word,b in zip(group,bounds):
        if html.unescape(b['text']).rstrip('.').strip().lower()!=word.rstrip('.').lower():
            raise ValueError(f'Boundary mismatch {word!r}: {b["text"]!r}')
    decoded=subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-i','pipe:0','-f','s16le','-ar','24000','-ac','1','pipe:1'],input=raw,capture_output=True,check=True).stdout
    pcm=np.frombuffer(decoded,dtype='<i2')
    clip_arrays=[]; outputs=[]; positions=[]; cursor=0
    for i,(word,b) in enumerate(zip(group,bounds)):
        out=CLIPS/(str(list(unique).index(word.lower())).zfill(5)+'.mp3')
        start=max(0,int((b['offset']/1e7-.025)*24000))
        end=min(len(pcm),int(((bounds[i+1]['offset']/1e7-.025) if i+1<len(bounds) else (b['offset']+b['duration'])/1e7+.08)*24000))
        audio=pcm[start:end]
        # Trim only the edges, preserving pauses within compounds and quiet consonants.
        frame=120; n=len(audio)//frame
        if n:
            rms=np.sqrt(np.mean(audio[:n*frame].astype(np.float32).reshape(n,frame)**2,axis=1))
            active=np.flatnonzero(rms>25)
            if len(active):
                lo=max(0,int(active[0]*frame)-960);hi=min(len(audio),int((active[-1]+1)*frame)+1920)
                audio=audio[lo:hi]
        if len(audio)<2400 or np.max(np.abs(audio.astype(np.int32)))<250:
            raise ValueError('Empty or silent audio: '+word)
        positions.append((cursor/24000,(cursor+len(audio))/24000))
        cursor+=len(audio);clip_arrays.append(audio);outputs.append(out)
    # One encoder process per batch avoids thousands of process launches.
    filters=[];cmd=[FFMPEG,'-hide_banner','-loglevel','error','-y','-f','s16le','-ar','24000','-ac','1','-i','pipe:0']
    for i,(start,end) in enumerate(positions): filters.append(f'[0:a]atrim=start={start:.6f}:end={end:.6f},asetpts=PTS-STARTPTS[a{i}]')
    cmd+=['-filter_complex',';'.join(filters)]
    for i,out in enumerate(outputs):cmd+=['-map',f'[a{i}]','-codec:a','libmp3lame','-b:a','24k','-ar','24000','-write_xing','1',str(out)]
    subprocess.run(cmd,input=np.concatenate(clip_arrays).tobytes(),capture_output=True,check=True)
    return [{'word':w,'file':o.name,'duration':round(len(a)/24000,4),'bytes':o.stat().st_size} for w,o,a in zip(group,outputs,clip_arrays)]

async def main():
    semaphore=asyncio.Semaphore(4);loop=asyncio.get_running_loop();pool=concurrent.futures.ThreadPoolExecutor(max_workers=2)
    records={};start=time.time();groups=[words[i:i+32] for i in range(0,len(words),32)]
    async def task(index,group):
        async with semaphore:
            mp3=CACHE/f'batch-{index:04d}.mp3';meta=CACHE/f'batch-{index:04d}.json'
            for attempt in range(5):
                try:
                    if mp3.exists() and meta.exists():
                        raw=mp3.read_bytes();bounds=json.loads(meta.read_text())
                    else:
                        audio=bytearray();bounds=[]
                        comm=edge_tts.Communicate('. '.join(group)+'.',voice=VOICE,rate='-5%',boundary='SentenceBoundary',connect_timeout=15,receive_timeout=45)
                        async for chunk in comm.stream():
                            if chunk['type']=='audio':audio.extend(chunk['data'])
                            elif chunk['type']=='SentenceBoundary':bounds.append(chunk)
                        raw=bytes(audio);mp3.write_bytes(raw);meta.write_text(json.dumps(bounds,ensure_ascii=False),encoding='utf-8')
                    result=await loop.run_in_executor(pool,encode_batch,index,group,raw,bounds)
                    records[index]=result
                    print(f'PROGRESS {sum(len(v) for v in records.values())}/{len(words)} batch {index+1}/{len(groups)} elapsed {time.time()-start:.1f}s',flush=True)
                    return
                except Exception as e:
                    print('RETRY',index,attempt+1,type(e).__name__,str(e)[:200],flush=True)
                    if isinstance(e,ValueError):
                        # Punctuation/abbreviations may merge sentences. Generate
                        # those words separately rather than guessing an alignment.
                        if len(group)>1:
                            results=[]
                            for word in group:
                                audio=bytearray();bounds=[]
                                comm=edge_tts.Communicate(word,voice=VOICE,rate='-5%',boundary='SentenceBoundary',connect_timeout=15,receive_timeout=45)
                                async for chunk in comm.stream():
                                    if chunk['type']=='audio':audio.extend(chunk['data'])
                                    elif chunk['type']=='SentenceBoundary':bounds.append(chunk)
                                if not bounds: raise ValueError('No timing metadata for '+word)
                                bounds=[dict(bounds[0],text=word,duration=max(b['offset']+b['duration'] for b in bounds)-bounds[0]['offset'])]
                                results.extend(await loop.run_in_executor(pool,encode_batch,index,[word],bytes(audio),bounds))
                            records[index]=results; print('RECOVERED',index,len(results),flush=True);return
                    if attempt==4: summary['errors'].append({'batch':index,'words':group,'error':str(e)})
                    else: await asyncio.sleep(min(2**attempt,12))
    await asyncio.gather(*(task(i,g) for i,g in enumerate(groups)))
    pool.shutdown();summary['batches']=len(records);summary['elapsed']=round(time.time()-start,2)
    all_records=[r for i in sorted(records) for r in records[i]]
    (CACHE/'records.json').write_text(json.dumps(all_records,ensure_ascii=False,indent=2),encoding='utf-8')
    (CACHE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    if summary['errors']:raise RuntimeError(json.dumps(summary['errors'],ensure_ascii=False))
    assert len(all_records)==len(words)
    # Shards keep browser loading small and every hosted asset below 25 MiB.
    out=SRC/'app/audio';out.mkdir(exist_ok=True);lookup={};parts=[];pack_clips={};total=0
    for index in range(0,len(all_records),128):
        chunk={}
        for record in all_records[index:index+128]:
            word=record['word'].lower();data=(CLIPS/record['file']).read_bytes();total+=len(data)
            chunk[word]=base64.b64encode(data).decode('ascii');lookup[word]=len(parts)
        pack_clips.update(chunk);name=f'audio/voice-{len(parts):03d}.js';parts.append(name)
        (SRC/'app'/name).write_text(f'window.CY_AUDIO_PARTS[{len(parts)-1}]='+json.dumps(chunk,separators=(',',':'))+';',encoding='utf-8')
    source={'engine':'Microsoft neural speech','voice':VOICE,'generation':'Pre-generated American English, not a human recording','rate':'-5%'}
    manifest={'format':'chuiyi-voice-pack','version':2,'name':'自然美式英语 · Jenny','codec':'audio/mpeg','count':len(lookup),'sizeBytes':total,'source':source,'parts':parts,'lookup':lookup}
    (SRC/'app/voice-manifest.js').write_text('window.CY_DEFAULT_VOICE='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';',encoding='utf-8')
    pack={'format':'chuiyi-voice-pack','version':2,'name':manifest['name'],'codec':'audio/mpeg','source':source,'clips':pack_clips}
    dest=R/'dist/chuiyi-natural-us-voice.json';dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    assert dest.stat().st_size<50*1024*1024
    print('COMPLETE',len(lookup),'MP3 bytes',total,'pack bytes',dest.stat().st_size,'elapsed',summary['elapsed'],flush=True)
if __name__=='__main__':asyncio.run(main())
