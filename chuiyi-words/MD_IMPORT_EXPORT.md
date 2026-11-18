# 吹衣单词的 Markdown 词库

`app/wordbook.md` 是 Obsidian 编辑文件。它按原有四层标题组织 7,375 个单词。词条标题下是音标与释义，记忆内容支持引用块和联想、词根、提示、注释。短语放在各词条的「短语和搭配」里，63 条独立表达在文件末尾。

短语每行写 `- 英文 中文`。中文译法以英文字母开头时，用一个 Tab 分隔。详情页按去掉首尾空格、合并中间空格、忽略大小写的英文查找，保留原标点、每次收录的原文及其译法。

`app/wordbook-layout.json` 保存 Markdown 分组及成员的稳定映射。`app/catalog.json` 保留单词和网站词族 ID、义项分组、来源、别名和其他结构化字段。构建时保留这些字段并应用 Markdown 修改。日常编辑只需打开 Markdown。移动原分组内的词条可以调整文件顺序。修改拼写时，在 test 导入预览中选定原词条。

## 本地操作

1. 运行 `python build-web.py`。用本地服务器打开 `dist` 下的本地编辑版和学习版。导入回滚使用浏览器 IndexedDB。
2. 在「词书与语音」中选文件。核对音标、释义和短语变化后应用。空白笔记保留已有内容。要清空笔记，在笔记区单独写 `<!-- clear-note -->`。
3. 词条页「编辑短语和搭配」可以修改当前单词的搭配。回到「词书与语音」可导出完整 Markdown、恢复上次导入前状态，或下载发布构建包。
4. 将发布构建包传给 `python build-web.py --wordbook 路径.json`，生成使用同一份内容的两个 HTML。预览通过后可运行 `python build-deploy.py --local-release deployment/release-current.json --wordbook 路径.json` 生成 Pages 构建产物。

构建依赖 Python 3 和 Node.js。构建命令只写本地产物。线上 GitHub 与 Cloudflare 走现有审批和发布流程。

## 验收

- `node verify-md-book.cjs` 核对全量词条、分组、短语、移动顺序、拼写确认与 Markdown 往返。
- 构建网页后，设置 `BROWSER_EXE` 为本机 Chrome 或 Edge。运行 `node verify-md-ui.cjs`，使用项目可解析的 Playwright 或用 `PLAYWRIGHT_MODULE` 指向已有安装。
- 构建 Pages 后，运行 `node verify-shared-worker.mjs` 检查公开与鉴权路径。
