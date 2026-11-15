# 共用应用部署

app/app.js 是网页学习版、test 编辑端和 Android 的唯一应用实现。编辑权限由现有登录后端和 CY_CONFIG.editor 控制。

- /test/app.js 和 /test/project/app.js 先通过原登录检查，再前置 app/editor-kit.js 并使用同一份 app/app.js。
- 两端的 voice-engine.js 兼容地址返回同一个自然音频清单与播放器。test 设置 CY_VOICE_ASSET_BASE='/words/'；Android 使用包内相对路径。
- 基础参考词 age/add/up/ox 不进入学习首页和独立学习列表，仍保留搜索及相关材料；参考词不朗读、不导出音频。
- 私有 config、local-state、shared 及发布 API 保留原后端，不能用公开学习数据覆盖用户草稿。
- 固定编辑入口基线为 8d139183。不要再只继承 f70a262b/694cb240 的旧入口。

运行 python build-deploy.py --apk /path/to/signed.apk，再将输出目录部署到现有 Pages 项目。先上传 APK 到现有 R2 发布桶，再发布更新清单。
