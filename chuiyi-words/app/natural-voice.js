/* Offline prerecorded American English. Generation details: AUDIO-SOURCES.md. */
(() => {
  'use strict';
  const MAX_BYTES = 50 * 1024 * 1024, loads = new Map();
  let player = null, sequence = 0;
  window.CY_AUDIO_PARTS = Object.create(null);
  const key = word => String(word).trim().toLowerCase();
  const owns = (obj, name) => Object.prototype.hasOwnProperty.call(obj, name);
  function validatePack(pack) {
    if (pack?.format === 'chuiyi-voice-pack' && pack.version === 1)
      throw Error('这是旧版机械合成语音包，请导入新版单词音频包');
    if (pack?.format !== 'chuiyi-voice-pack' || pack.version !== 2 ||
        pack.codec !== 'audio/mpeg' || typeof pack.name !== 'string' ||
        pack.name.length > 100 || !pack.clips || typeof pack.clips !== 'object' || Array.isArray(pack.clips))
      throw Error('不是支持的离线单词音频包');
    const entries = Object.entries(pack.clips);
    if (!entries.length || entries.length > 20000) throw Error('音频包中的单词数量不正确');
    let total = 0;
    for (const [word, clip] of entries) {
      if (word !== key(word) || !word.length || word.length > 120 ||
          typeof clip !== 'string' || clip.length < 100 || clip.length > 200000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(clip) || clip.length % 4)
        throw Error('音频数据不完整：' + word);
      const head = atob(clip.slice(0, 12));
      if (!(head.startsWith('ID3') || (head.charCodeAt(0) === 255 && (head.charCodeAt(1) & 224) === 224)))
        throw Error('音频不是受支持的 MP3：' + word);
      total += clip.length;
      if (total > MAX_BYTES) throw Error('语音包不能超过50MB');
    }
    return pack;
  }
  function loadPart(index) {
    if (window.CY_AUDIO_PARTS[index]) return Promise.resolve(window.CY_AUDIO_PARTS[index]);
    if (loads.has(index)) return loads.get(index);
    const path = window.CY_DEFAULT_VOICE?.parts?.[index];
    if (!/^audio\/voice-\d{3}\.js$/.test(path || '')) return Promise.reject(Error('内置音频索引不完整'));
    const pending = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = path;
      script.onload = () => {
        script.remove(); const part = window.CY_AUDIO_PARTS[index];
        if (part) resolve(part);
        else { loads.delete(index); reject(Error('单词音频未载入')); }
      };
      script.onerror = () => { script.remove(); loads.delete(index); reject(Error('音频未下载，请联网打开后重试')); };
      document.head.append(script);
    });
    loads.set(index, pending); return pending;
  }
  async function getClip(word, pack) {
    const name = key(word);
    if (pack.clips) {
      if (!owns(pack.clips, name)) throw Error('这个单词还没有离线音频');
      return pack.clips[name];
    }
    const part = pack.lookup?.[name];
    if (!Number.isInteger(part)) throw Error('这个单词还没有离线音频');
    const clips = await loadPart(part);
    if (!owns(clips, name)) throw Error('这个单词的音频不完整');
    return clips[name];
  }
  function stop() {
    sequence++;
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); player = null; }
    try { window.AndroidBridge?.stopOfflineAudio?.(); } catch (_) {}
  }
  async function play(word, pack) {
    stop(); const request = sequence, clip = await getClip(word, pack);
    if (request !== sequence) return;
    const source = 'data:audio/mpeg;base64,' + clip;
    if (window.AndroidBridge?.playOfflineAudio) { AndroidBridge.playOfflineAudio(source); return; }
    const audio = new Audio(source); player = audio;
    try { await audio.play(); }
    catch (error) {
      if (request !== sequence || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') throw Error('请点击朗读按钮播放');
      throw Error('单词音频播放失败');
    }
  }
  async function exportPack(pack, words) {
    const wanted = words ? new Set(words.map(key)) : null;
    if (pack.clips) {
      if (!wanted) return pack;
      return {...pack, clips:Object.fromEntries(Object.entries(pack.clips).filter(([word])=>wanted.has(word)))};
    }
    const clips = Object.create(null);
    const selected = wanted ? [...new Set([...wanted].filter(w=>owns(pack.lookup,w)).map(w=>pack.lookup[w]))] : pack.parts.map((_,i)=>i);
    for (const i of selected) for (const [word,data] of Object.entries(await loadPart(i))) if (!wanted||wanted.has(word)) clips[word]=data;
    const result = {format: 'chuiyi-voice-pack', version: 2, name: pack.name,
      codec: 'audio/mpeg', source: pack.source, clips};
    validatePack(result);
    if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_BYTES)
      throw Error('语音包不能超过50MB');
    return result;
  }
  function clear() { stop(); loads.clear(); window.CY_AUDIO_PARTS = Object.create(null); }
  window.CYVoiceAudio = {validatePack, getClip, play, stop, exportPack, clear};
})();
