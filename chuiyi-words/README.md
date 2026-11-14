# 吹衣单词 · 吹衣词族故事1

当前软件版本：0.4.9（Android versionCode 22）。网页学习版、离线本地编辑器和 Android 原生封装源码。

- 7375 个单词、5032 个词族；单词故事、词族故事及自定义故事分类。
- 难度筛选、三组固定随机顺序、完成记录、每日统计与当天单词列表。
- 编辑器默认直接编辑故事与提示；所见即所得与 Markdown 源码切换，中文释义和音标只读。
- 学习记录备份与完整词书分开；词书与离线语音可独立导入、导出、删除和恢复。
- 内置美式英语合成发音，语音引擎与数据约 5.6 MB，启动与发音均无需联网。
- 朗读图标与音标对齐；单词右上角菜单可关闭自动朗读。

## 直接使用与网页构建

Python 3、Node.js；无需 npm 安装。

```sh
python build-web.py
```

`dist/吹衣单词_本地编辑.html` 为独立离线编辑器，`dist/吹衣单词_学习版预览.html` 为学习版。
可直接双击打开，或运行 `python -m http.server 8000 --directory app` 后访问本机页面。
`app/config.js` 的 `editor` 控制编辑器入口；发布学习版为 false。本地编辑器的 HTML 构建会自动设为 true。
编辑只保存在当前设备。将编辑后的词书导出，再在学习端导入即可离线分发；这里不包含个人站点登录后台。

## Android 构建

需要 JDK 17、Android SDK platform 35 / build-tools 35.0.0、Python 3、Node.js。
设置 `JAVA_HOME` 与 `ANDROID_SDK_ROOT`（或 `ANDROID_HOME`），运行：

```sh
python build-android.py
```

默认输出未签名 APK。自行签名时设置 `CHUIYI_KEYSTORE`、`CHUIYI_KEYSTORE_PASSWORD_FILE` 和可选的 `CHUIYI_KEY_ALIAS`，再运行 `python build-android.py --sign`。
签名口令从本机文件读取，不在源码中保存。自行签名的包不能直接覆盖原作者签名的安装版。

## 检查

```sh
node verify048.cjs
node verify-voice048.cjs
```

覆盖分类、顺序唯一性、筛选、编辑权限、学习备份、词书往返、完成记录、每日明细与完全离线 WAV 合成。

## 来源与许可

程序以 GNU GPL v3 发布，见 [COPYING](COPYING)。语音使用 meSpeak/eSpeak，保留上游 GPL 条款和署名。
`vendor/` 含使用的语音 JS 源码、配置及美式英语数据；`mespeak-2.0.2.tgz` 为原始 npm 包，`build-voice.py` 可重建语音脚本。
上游：[meSpeak](https://www.masswerk.at/mespeak/)、[CommonJS wrapper](https://github.com/mikolalysenko/mespeak)、[speak.js 与 eSpeak 编译来源](https://github.com/kripken/speak.js)。

词库主要基于 [Word Atlas（词光）](https://github.com/designfuchen/word-atlas) 整理，原词库为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。保留来源，修改包括义项整理、词族、短语翻译、故事和学习功能。
故事与提示由吹衣创作，短语与搭配由 GPT 辅助生成。图标由吹衣与 GPT 共同设计。
