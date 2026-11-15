# 吹衣单词 · 吹衣词族故事1

版本 0.5.4，Android versionCode 27。

- 7375 个词条、5032 个词族。age、add、up、ox 默认仅作词族参考，7371 个词条参与独立学习。
- 内置自然美式英语音频，覆盖所有独立学习词。手机播放无需联网或语音引擎；音频不是人工录音。
- 编辑端更多菜单可选“仅保留在词族”或“恢复独立学习”；词族关系保留，参考词不单独背诵、不自动朗读。
- 语音和词书可分别导入、导出、删除和恢复；导出语音只包含当前词书需要的音频，JSON 包小于 50MB。
- 保留故事编辑、Markdown/所见即所得、词书发布、完成记录、每日统计和独立学习备份。

## 使用和构建

Python 3、Node.js；网页本身不需要安装 npm 依赖。

运行 python build-web.py，dist 内生成完整离线学习预览和本地编辑器 HTML。发布页面从 app/index.html 进入。

Android 使用 JDK 17、Android SDK platform 35 / build-tools 35.0.0。设置 JAVA_HOME 和 ANDROID_SDK_ROOT 后运行 python build-android.py。默认只输出未签名 APK。

如需原签名覆盖更新，设置 CHUIYI_KEYSTORE、CHUIYI_KEYSTORE_PASSWORD_FILE、可选 CHUIYI_KEY_ALIAS，然后运行 python build-android.py --sign。密钥和密码不得加入公开源码。原密钥拥有者以外的自行签名包无法覆盖原作者安装版。

检查：
- node verify048.cjs
- node verify-delete-book.cjs
- node verify-natural-voice.cjs
- node verify-family-reference.cjs

音频来源、格式和重建方法见 AUDIO-SOURCES.md。成品不包含生成工具依赖和语音模型。

## 来源与许可

程序使用 GNU GPL v3，见 COPYING。保留词库原有 CC BY 4.0 归属：
https://github.com/designfuchen/word-atlas
https://creativecommons.org/licenses/by/4.0/

词库经过整理、合并、增补；故事与提示由吹衣创作，短语与搭配由 GPT 辅助生成，图标由吹衣与 GPT 共同设计。


共用部署：见 deployment/README.md。test、网页、安卓共用 app/app.js 和自然发音，只由配置启用编辑能力。
