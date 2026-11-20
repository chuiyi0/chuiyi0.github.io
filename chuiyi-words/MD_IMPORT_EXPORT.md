# 吹衣单词 Markdown 词表

在 Obsidian 打开 `app/wordbook/` 内的三份 Markdown。第 1 份开头是固定的五个测试词，第 3 份结尾是「其他」。学习卡使用二级标题，同卡派生词使用三级标题。在「其他」沿用主题组、简单词和独立短语的结构。

主词和派生词各留自己的音标、释义和短语。共同的故事写在主词下，词形特有的用法可以写在对应词形下。例如在 recruit 写故事，在 recruitment 下补 recruitment process 的用法。没灵感时可加一行 `#待补`，以后在 Obsidian 搜 `tag:#待补`。

短语用普通列表书写，每行一条英文和中文。当同一英文短语出现在多个词条时，网页会在译文旁显示「其他相关单词」。同一短语的不同中文译法会保留。

在 `/test` 的「词书导入导出」里一次选择三份文件，核对差异后导入。需要发布时下载发布构建包。构建时默认使用仓库的三份文件，也支持 `--wordbook` 指定目录或导出的 JSON。旧版完整 Markdown 仍可导入。

## 整理工具

需要 Node.js，无需安装额外依赖。在 PowerShell 中运行已有三份词表，例如：

```powershell
node organize-wordbook.cjs .\整理结果 .\旧01.md .\旧02.md .\旧03.md
```

首次整理按原有词族、构词后缀、词性和主要释义寻找适合合并的词。已改成新版格式的词表会沿用手工分组及顺序。需要调整时可加参数 `--rules=rules.json`：

```json
{
  "merge": { "recruitment": "recruit" },
  "keep": ["sleepy"],
  "seed": "optional-new-order"
}
```

`seed` 可省略。省略时重分新版文件会保留原顺序。输出目录应与输入文件所在目录不同。
