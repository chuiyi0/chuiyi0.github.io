package net.chuiyi.words;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipboardManager;
import android.content.ClipData;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import android.webkit.WebResourceResponse;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private WebView web;
  private boolean canBack=false;
  private Object backCallback;
  private android.webkit.ValueCallback<android.net.Uri[]> filePickerCallback;
  private static final int BOOK_FILE_PICKER=944;
  private android.media.MediaPlayer offlinePlayer;
  private String exportText;
  private String exportName="吹衣单词_个人备份.json",exportMime="application/json";
  private volatile boolean syncing=false;
  private String installedVersion="0.3.0";
  private static final int EXPORT=101,IMPORT=102;

  @Override public void onCreate(Bundle state){
    super.onCreate(state);
    try{installedVersion=getPackageManager().getPackageInfo(getPackageName(),0).versionName;}catch(Exception e){}
    web=new WebView(this);web.setBackgroundColor(Color.rgb(247,245,239));
    WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setTextZoom(100);
    s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setMediaPlaybackRequiresUserGesture(true);
    web.addJavascriptInterface(new Bridge(),"AndroidBridge");web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView view,android.webkit.ValueCallback<android.net.Uri[]> callback,WebChromeClient.FileChooserParams params){
        if(filePickerCallback!=null)filePickerCallback.onReceiveValue(null);filePickerCallback=callback;
        try{Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("application/json");startActivityForResult(pick,BOOK_FILE_PICKER);return true;}
        catch(Exception ex){filePickerCallback=null;callback.onReceiveValue(null);message("无法打开文件选择器");return true;}
      }
    });
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        String path=request.getUrl().getPath();
        if("file".equals(request.getUrl().getScheme())&&path!=null&&(path.endsWith("/catalog.js")||path.endsWith("/shared.js"))){
          File dir=new File(getFilesDir(),"word-content"),file=new File(dir,path.endsWith("/catalog.js")?"catalog.js":"shared.js");
          if(cacheMatches(dir)&&new File(dir,"ready").exists()&&file.exists())try{return new WebResourceResponse("application/javascript","UTF-8",new FileInputStream(file));}catch(Exception e){}
        }
        return null;
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return navigate(request.getUrl().toString());}
      @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return navigate(url);}
      private boolean navigate(String url){if(url.startsWith("file:///android_asset/app/"))return false;if(url.startsWith("https://"))openExternal(url);return true;}
    });
    setContentView(web);web.loadUrl("file:///android_asset/app/index.html");

  }
  private void js(String code){if(web!=null)web.evaluateJavascript(code,null);}
  private void message(String text){Toast.makeText(this,text,Toast.LENGTH_SHORT).show();}
  private void handleBack(){
    web.evaluateJavascript("!!(window.ChuiyiWords && window.ChuiyiWords.back())",new ValueCallback<String>(){
      @Override public void onReceiveValue(String value){if(!"true".equals(value))moveTaskToBack(true);}
    });
  }
  @Override public void onBackPressed(){if(canBack)handleBack();else super.onBackPressed();}
  private void updateBack(boolean value){
    canBack=value;
    if(Build.VERSION.SDK_INT>=33){
      if(value&&backCallback==null)backCallback=Api33.register(this,new Runnable(){@Override public void run(){handleBack();}});
      if(!value&&backCallback!=null){Api33.unregister(this,backCallback);backCallback=null;}
    }
  }
  private static class Api33 {
    static Object register(Activity a,final Runnable r){
      android.window.OnBackInvokedCallback callback=new android.window.OnBackInvokedCallback(){@Override public void onBackInvoked(){r.run();}};
      a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,callback);return callback;
    }
    static void unregister(Activity a,Object callback){a.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((android.window.OnBackInvokedCallback)callback);}
  }
  private void openExternal(String url){try{Uri uri=Uri.parse(url);if("https".equals(uri.getScheme()))startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){message("无法打开链接");}}
  private void setLauncherIcon(String requested) {
    String[] names={"fixed","mono","pop","terminal","bauhaus","light","dark","sea","sakura","paper","lavender","midnight","cobalt","sunset","neon"};
    boolean found=false;for(String name:names)if(name.equals(requested))found=true;
    if(!found)return;
    android.content.pm.PackageManager pm=getPackageManager();
    try{
      android.content.ComponentName target=new android.content.ComponentName(this,getPackageName()+".Launcher_"+requested);
      pm.setComponentEnabledSetting(target,android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED,android.content.pm.PackageManager.DONT_KILL_APP);
      for(String name:names)if(!name.equals(requested)){
        android.content.ComponentName component=new android.content.ComponentName(this,getPackageName()+".Launcher_"+name);
        if(pm.getComponentEnabledSetting(component)!=android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED)
          pm.setComponentEnabledSetting(component,android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,android.content.pm.PackageManager.DONT_KILL_APP);
      }
    }catch(Exception e){message("桌面图标切换失败，请重试");}
  }
  @Override public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);if(web!=null)js("window.dispatchEvent(new Event('cy-device-theme'))");}
  public class Bridge {
    @JavascriptInterface public boolean getSystemDark(){return (getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)==android.content.res.Configuration.UI_MODE_NIGHT_YES;}

    @JavascriptInterface public void setLauncher(final String name){runOnUiThread(new Runnable(){@Override public void run(){setLauncherIcon(name);}});}
    @JavascriptInterface public void setCanGoBack(final boolean value){runOnUiThread(new Runnable(){@Override public void run(){updateBack(value);}});}
    @JavascriptInterface public void setTheme(final String color,final boolean dark){runOnUiThread(new Runnable(){@Override public void run(){
      try{int c=Color.parseColor(color);getWindow().setStatusBarColor(c);getWindow().setNavigationBarColor(c);web.setBackgroundColor(c);getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);}catch(Exception e){}
    }});}
    @JavascriptInterface public void playOfflineAudio(final String data){runOnUiThread(new Runnable(){@Override public void run(){
      try{if(data==null||data.length()>3000000||!data.startsWith("data:audio/"))return;
        int comma=data.indexOf(',');if(comma<0||!data.substring(0,comma).endsWith(";base64"))return;
        byte[] bytes=android.util.Base64.decode(data.substring(comma+1),android.util.Base64.DEFAULT);
        if(offlinePlayer!=null){offlinePlayer.release();offlinePlayer=null;}
        File audio=new File(getCacheDir(),"word-offline.mp3");try(FileOutputStream out=new FileOutputStream(audio)){out.write(bytes);}
        offlinePlayer=new android.media.MediaPlayer();offlinePlayer.setDataSource(audio.getAbsolutePath());
        offlinePlayer.setOnCompletionListener(new android.media.MediaPlayer.OnCompletionListener(){@Override public void onCompletion(android.media.MediaPlayer p){p.release();if(offlinePlayer==p)offlinePlayer=null;}});
        offlinePlayer.setOnPreparedListener(new android.media.MediaPlayer.OnPreparedListener(){@Override public void onPrepared(android.media.MediaPlayer p){if(offlinePlayer==p)p.start();}});
        offlinePlayer.setOnErrorListener(new android.media.MediaPlayer.OnErrorListener(){@Override public boolean onError(android.media.MediaPlayer p,int what,int extra){p.release();if(offlinePlayer==p)offlinePlayer=null;message("单词音频播放失败");return true;}});
        offlinePlayer.prepareAsync();
      }catch(Exception ex){message("离线语音播放失败");}
    }});}
    @JavascriptInterface public void stopOfflineAudio(){runOnUiThread(new Runnable(){@Override public void run(){if(offlinePlayer!=null){offlinePlayer.release();offlinePlayer=null;}}});}
    @JavascriptInterface public void copyText(final String text){runOnUiThread(new Runnable(){@Override public void run(){if(text!=null&&text.length()<1000000){((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("word",text));}}});}
    @JavascriptInterface public void openLink(final String url){runOnUiThread(new Runnable(){@Override public void run(){openExternal(url);}});}
    @JavascriptInterface public void exportData(final String text,final String name,final String mime){runOnUiThread(new Runnable(){@Override public void run(){
      if(text==null||text.length()>50*1024*1024){message("备份内容无效");return;}exportText=text;exportName=name==null?"吹衣单词_个人备份.json":name;exportMime="text/markdown".equals(mime)?"text/markdown":"application/json";
      try{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType(exportMime);i.putExtra(Intent.EXTRA_TITLE,exportName);startActivityForResult(i,EXPORT);}catch(Exception e){message("无法打开文件保存位置");}
    }});}
    @JavascriptInterface public void syncContent(){startSync();}
    @JavascriptInterface public void checkUpdates(final String contentVersion){checkForUpdates(contentVersion);}
    @JavascriptInterface public String getContentInfo(){try{return readText(new File(new File(getFilesDir(),"word-content"),"content-index.json"));}catch(Exception e){return "{}";}}
    @JavascriptInterface public void importData(){runOnUiThread(new Runnable(){@Override public void run(){
      try{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain","application/octet-stream"});startActivityForResult(i,IMPORT);}catch(Exception e){message("无法打开文件选择器");}
    }});}
  }
  @Override protected void onActivityResult(int req,int result,Intent intent){
    super.onActivityResult(req,result,intent);
    if(req==BOOK_FILE_PICKER){if(filePickerCallback!=null){filePickerCallback.onReceiveValue(result==RESULT_OK&&intent!=null&&intent.getData()!=null?new android.net.Uri[]{intent.getData()}:null);filePickerCallback=null;}return;}if(result!=RESULT_OK||intent==null||intent.getData()==null)return;Uri uri=intent.getData();
    try{
      if(req==EXPORT&&exportText!=null){try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new Exception();out.write(exportText.getBytes(StandardCharsets.UTF_8));}exportText=null;message("文件已保存");}
      if(req==IMPORT){String text;try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
        if(in==null)throw new Exception();byte[] bytes=new byte[8192];int n,total=0;while((n=in.read(bytes))!=-1){total+=n;if(total>50*1024*1024)throw new Exception("large");out.write(bytes,0,n);}text=new String(out.toByteArray(),StandardCharsets.UTF_8);
      }js("window.ChuiyiWords && window.ChuiyiWords.importData("+JSONObject.quote(text)+")");}
    }catch(Exception e){message("文件读写失败，请检查所选文件");}
  }
  private boolean cacheMatches(File dir){try{return installedVersion.equals(new String(java.nio.file.Files.readAllBytes(new File(dir,"app-version").toPath()),StandardCharsets.UTF_8));}catch(Exception e){return false;}}
  private byte[] fetchContent(String name) throws Exception {return fetchContent(name,false);}
  private byte[] fetchContent(String name,boolean progress) throws Exception {
    HttpURLConnection c=(HttpURLConnection)new URL("https://chuiyi.pages.dev/words/"+name+(name.contains("?")?"&":"?")+"t="+System.currentTimeMillis()).openConnection();
    c.setConnectTimeout(12000);c.setReadTimeout(20000);c.setInstanceFollowRedirects(false);c.setRequestProperty("Cache-Control","no-cache");
    try{if(c.getResponseCode()!=200)throw new Exception("http");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] buf=new byte[8192];int n,total=0;long expected=c.getContentLengthLong(),began=android.os.SystemClock.elapsedRealtime(),last=0;
      if(expected>(progress?80000000:7000000))throw new Exception("large");
      while((n=in.read(buf))!=-1){total+=n;if(total>(progress?80000000:7000000))throw new Exception("large");out.write(buf,0,n);
        long now=android.os.SystemClock.elapsedRealtime();
        if(progress&&(now-last>=150||total==expected)){
          long speed=total*1000/Math.max(1,now-began);
          String label=expected>0?Math.min(100,total*100L/expected)+"% · "+updateBytes(total)+" / "+updateBytes(expected):"已下载 "+updateBytes(total);
          if(speed>0)label+="\n"+updateBytes(speed)+"/s"+(expected>total?" · 约剩 "+Math.max(1,(expected-total)/speed)+" 秒":"");
          reportUpdateProgress(label,total,expected);last=now;
        }
      }
      if(expected>=0&&total!=expected)throw new Exception("incomplete download");return out.toByteArray();
    }}finally{c.disconnect();}
  }
  private String digest(byte[] bytes) throws Exception {StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))s.append(String.format("%02x",b&255));return s.toString();}
  private void writeFile(File file,String text) throws Exception {try(FileOutputStream out=new FileOutputStream(file)){out.write(text.getBytes(StandardCharsets.UTF_8));}}
  private String readText(File file) throws Exception {return new String(java.nio.file.Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8);}
  private void atomicWrite(File target,String value) throws Exception {
    File tmp=new File(target.getParentFile(),target.getName()+".tmp");
    writeFile(tmp,value);
    java.nio.file.Files.move(tmp.toPath(),target.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING,java.nio.file.StandardCopyOption.ATOMIC_MOVE);
  }
  private android.app.ProgressDialog updateProgress;
  private void addUpdateChoice(android.widget.LinearLayout parent,String label,final Runnable action){
    android.widget.Button button=new android.widget.Button(this);
    button.setText(label);button.setTextSize(16);button.setAllCaps(false);button.setTextColor(Color.WHITE);
    android.graphics.drawable.GradientDrawable bg=new android.graphics.drawable.GradientDrawable();
    bg.setColor(Color.rgb(37,99,235));bg.setCornerRadius(12*getResources().getDisplayMetrics().density);
    android.content.res.ColorStateList ripple=android.content.res.ColorStateList.valueOf(0x33ffffff);
    button.setBackground(new android.graphics.drawable.RippleDrawable(ripple,bg,null));
    int gap=(int)(10*getResources().getDisplayMetrics().density);
    button.setPadding(gap,gap,gap,gap);
    android.widget.LinearLayout.LayoutParams lp=new android.widget.LinearLayout.LayoutParams(-1,-2);
    lp.setMargins(0,gap/2,0,gap/2);button.setMinHeight((int)(52*getResources().getDisplayMetrics().density));
    parent.addView(button,lp);button.setOnClickListener(new View.OnClickListener(){@Override public void onClick(View v){action.run();}});
  }
  private void showUpdateProgress(final String title){
    runOnUiThread(new Runnable(){@Override public void run(){
      if(isFinishing()||isDestroyed())return;
      if(updateProgress!=null)updateProgress.dismiss();
      updateProgress=new android.app.ProgressDialog(MainActivity.this);
      updateProgress.setTitle(title);updateProgress.setProgressStyle(android.app.ProgressDialog.STYLE_HORIZONTAL);
      updateProgress.setMax(1000);updateProgress.setIndeterminate(true);updateProgress.setMessage("正在连接…");
      updateProgress.setProgressNumberFormat(null);updateProgress.setProgressPercentFormat(null);
      updateProgress.setCancelable(false);updateProgress.setCanceledOnTouchOutside(false);updateProgress.show();
      android.widget.ProgressBar bar=updateProgress.findViewById(android.R.id.progress);
      if(bar!=null){bar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(37,99,235)));bar.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.rgb(37,99,235)));}
    }});
  }
  private void reportUpdateProgress(final String label,final long done,final long total){
    runOnUiThread(new Runnable(){@Override public void run(){
      if(updateProgress==null||isFinishing()||isDestroyed())return;
      updateProgress.setIndeterminate(total<=0);
      if(total>0)updateProgress.setProgress((int)Math.min(1000,done*1000/total));
      updateProgress.setMessage(label);
    }});
  }
  private void hideUpdateProgress(){
    runOnUiThread(new Runnable(){@Override public void run(){if(updateProgress!=null){updateProgress.dismiss();updateProgress=null;}}});
  }
  private String updateBytes(long value){return value>=1048576?String.format(Locale.US,"%.2f MB",value/1048576.0):String.format(Locale.US,"%.0f KB",value/1024.0);}
  private byte[] fetchUpdateContent(String name) throws Exception {return fetchContent(name,true);}
  private volatile boolean checkingUpdates=false,downloadingUpdate=false;
  private void checkForUpdates(final String displayedContent){
    if(checkingUpdates||syncing||downloadingUpdate)return;checkingUpdates=true;
    runOnUiThread(new Runnable(){@Override public void run(){message("正在检查更新");}});
    new Thread(new Runnable(){@Override public void run(){
      try{
        JSONObject index=new JSONObject(new String(fetchContent("content-index.json"),StandardCharsets.UTF_8));
        JSONObject release=null;try{release=new JSONObject(new String(fetchContent("app-release.json"),StandardCharsets.UTF_8));}catch(Exception ignored){}
        String current=displayedContent;
        try{File dir=new File(getFilesDir(),"word-content");if(cacheMatches(dir)&&new File(dir,"ready").exists())current=new JSONObject(readText(new File(dir,"content-index.json"))).getString("version");}catch(Exception ignored){}
        final boolean contentAvailable=!index.getString("version").equals(current);
        int currentCode=getPackageManager().getPackageInfo(getPackageName(),0).versionCode;
        final JSONObject app=release;final boolean appAvailable=app!=null&&app.optInt("versionCode",0)>currentCode;
        final String date=index.optString("updatedAt","");
        runOnUiThread(new Runnable(){@Override public void run(){
          if(isFinishing())return;
          if(!contentAvailable&&!appAvailable){new android.app.AlertDialog.Builder(MainActivity.this).setTitle("检查更新").setMessage(app==null?"单词内容已是最新；暂时无法检查应用更新。":"当前已是最新版本。").setPositiveButton("知道了",null).show();return;}
          android.widget.LinearLayout choices=new android.widget.LinearLayout(MainActivity.this);
          choices.setOrientation(android.widget.LinearLayout.VERTICAL);
          int pad=(int)(24*getResources().getDisplayMetrics().density);
          choices.setPadding(pad,pad/2,pad,pad/2);
          final android.app.AlertDialog dialog=new android.app.AlertDialog.Builder(MainActivity.this).setTitle("发现更新").setView(choices).setNegativeButton("暂不更新",null).create();
          if(contentAvailable)addUpdateChoice(choices,"更新单词内容"+(date.isEmpty()||"null".equals(date)?"":" · "+date.substring(0,Math.min(10,date.length()))),new Runnable(){@Override public void run(){dialog.dismiss();startSync();}});
          if(appAvailable)addUpdateChoice(choices,"更新应用 · "+app.optString("versionName",""),new Runnable(){@Override public void run(){dialog.dismiss();downloadAppUpdate(app);}});
          dialog.show();
          dialog.getButton(android.content.DialogInterface.BUTTON_NEGATIVE).setTextColor(Color.rgb(71,85,105));
        }});
      }catch(Exception e){runOnUiThread(new Runnable(){@Override public void run(){message("检查失败，请检查网络后重试");}});}finally{checkingUpdates=false;}
    }},"check-updates").start();
  }
  private void downloadAppUpdate(final JSONObject release){
    if(downloadingUpdate||syncing)return;downloadingUpdate=true;showUpdateProgress("正在下载应用更新");
    new Thread(new Runnable(){@Override public void run(){try{
      String path=release.getString("path"),hash=release.getString("sha256");
      if(!path.matches("downloads/[a-zA-Z0-9._-]+\\.apk")||!hash.matches("[0-9a-f]{64}"))throw new Exception("invalid release");
      byte[] bytes=fetchUpdateContent(path);reportUpdateProgress("下载完成，正在校验安装包…",1,1);if(!digest(bytes).equals(hash))throw new Exception("checksum");
      File file=new File(getCacheDir(),"update.apk");try(FileOutputStream out=new FileOutputStream(file)){out.write(bytes);out.getFD().sync();}
      runOnUiThread(new Runnable(){@Override public void run(){
        if(isFinishing())return;
        hideUpdateProgress();
        android.app.AlertDialog installDialog=new android.app.AlertDialog.Builder(MainActivity.this).setTitle("下载完成").setMessage("现在安装新版？学习记录会保留。").setNegativeButton("稍后",null).setPositiveButton("安装",new android.content.DialogInterface.OnClickListener(){@Override public void onClick(android.content.DialogInterface d,int which){installDownloadedUpdate();}}).create();
        installDialog.show();installDialog.getButton(android.content.DialogInterface.BUTTON_POSITIVE).setTextColor(Color.rgb(37,99,235));
      }});
    }catch(Exception e){runOnUiThread(new Runnable(){@Override public void run(){message("下载失败，请检查网络后重试");}});}finally{hideUpdateProgress();downloadingUpdate=false;}}},"download-update").start();
  }
  private void installDownloadedUpdate(){
    try{
      if(Build.VERSION.SDK_INT>=26&&!getPackageManager().canRequestPackageInstalls()){
        new android.app.AlertDialog.Builder(this).setTitle("允许安装更新").setMessage("请在系统设置中允许吹衣单词安装更新，然后返回并再次检查更新。").setNegativeButton("取消",null).setPositiveButton("前往设置",new android.content.DialogInterface.OnClickListener(){@Override public void onClick(android.content.DialogInterface d,int w){startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())));}}).show();return;
      }
      Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse("content://net.chuiyi.words.updates/update.apk"));i.setDataAndType(i.getData(),"application/vnd.android.package-archive");i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(i);
    }catch(Exception e){message("无法打开系统安装界面");}
  }
  private void startSync(){
    if(syncing||downloadingUpdate)return;syncing=true;showUpdateProgress("正在更新单词内容");
    new Thread(new Runnable(){@Override public void run(){try{
      JSONObject index=new JSONObject(new String(fetchContent("content-index.json"),StandardCharsets.UTF_8));
      String version=index.getString("version");JSONObject entries=index.getJSONObject("entries");
      File dir=new File(getFilesDir(),"word-content");dir.mkdirs();File dataFile=new File(dir,"shared.json"),indexFile=new File(dir,"content-index.json");
      JSONObject shared=null,oldIndex=null;
      try{shared=new JSONObject(readText(dataFile));oldIndex=new JSONObject(readText(indexFile));}catch(Exception ignored){}
      if(shared==null||oldIndex==null||!shared.has("words")||!oldIndex.has("entries")){
        shared=new JSONObject(new String(fetchUpdateContent("shared.json"),StandardCharsets.UTF_8));
        if(!version.equals(shared.getString("version")))throw new Exception("version changed");
      }else{
        JSONObject oldEntries=oldIndex.getJSONObject("entries"),words=shared.getJSONObject("words");
        java.util.ArrayList<String> changed=new java.util.ArrayList<>();
        java.util.Iterator<String> keys=entries.keys();
        while(keys.hasNext()){String id=keys.next();if(!id.matches("[A-Za-z0-9_-]+"))throw new Exception("invalid id");if(!entries.optString(id).equals(oldEntries.optString(id)))changed.add(id);}
        java.util.ArrayList<String> removed=new java.util.ArrayList<>();keys=words.keys();while(keys.hasNext()){String id=keys.next();if(!entries.has(id))removed.add(id);}for(String id:removed)words.remove(id);
        for(int n=0;n<changed.size();n+=100){reportUpdateProgress("正在更新词条 · "+n+" / "+changed.size(),n,changed.size());StringBuilder ids=new StringBuilder();for(int i=n;i<Math.min(n+100,changed.size());i++){if(ids.length()>0)ids.append(',');ids.append(changed.get(i));}
          JSONObject part=new JSONObject(new String(fetchContent("content-parts.json?version="+java.net.URLEncoder.encode(version,"UTF-8")+"&ids="+ids),StandardCharsets.UTF_8));
          if(!version.equals(part.getString("version")))throw new Exception("version changed");JSONObject received=part.getJSONObject("words");
          for(int i=n;i<Math.min(n+100,changed.size());i++){String id=changed.get(i);if(!received.has(id))throw new Exception("missing entry");words.put(id,received.get(id));}
        }shared.put("version",version);
      }
      if(!shared.has("words")||!version.equals(shared.getString("version")))throw new Exception("invalid content");
      reportUpdateProgress("正在保存单词内容…",1,1);
      if(index.has("bookMeta"))shared.put("bookMeta",index.getJSONObject("bookMeta"));
      atomicWrite(new File(dir,"shared.json"),shared.toString());atomicWrite(new File(dir,"shared.js"),"window.CY_SHARED="+shared.toString()+";");
      atomicWrite(indexFile,index.toString());atomicWrite(new File(dir,"app-version"),installedVersion);atomicWrite(new File(dir,"ready"),version);
      runOnUiThread(new Runnable(){@Override public void run(){web.reload();message("更新完成，学习记录已保留");}});
    }catch(Exception e){runOnUiThread(new Runnable(){@Override public void run(){message("更新失败，请检查网络后重试");}});}finally{hideUpdateProgress();syncing=false;}}},"word-content-sync").start();
  }
  @Override protected void onPause(){if(web!=null){js("window.ChuiyiWords && window.ChuiyiWords.suspend()");web.onPause();}if(offlinePlayer!=null){offlinePlayer.release();offlinePlayer=null;}super.onPause();}
  @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();js("window.ChuiyiWords && window.ChuiyiWords.resume()");}}
  @Override protected void onDestroy(){if(updateProgress!=null){updateProgress.dismiss();updateProgress=null;}if(Build.VERSION.SDK_INT>=33&&backCallback!=null)Api33.unregister(this,backCallback);if(web!=null){web.removeJavascriptInterface("AndroidBridge");web.destroy();web=null;}super.onDestroy();}
}
