# person_station · 个人内容站

基于「纯静态 HTML/CSS/JS + GitHub Pages」的个人网站，以及一套可批量生成、自动发布的工作流。

> 这台电脑（Windows）作为固定工作站，实现：
> **AI 批量生成内容 → 本地渲染静态页 → Git 推送 → GitHub Pages 自动上线**

---

## 一、技术选型

| 环节 | 选型 | 说明 |
|---|---|---|
| 内容源 | Markdown | AI 批量生成的文章/落地页，存于 `content/` |
| 渲染 | 本地脚本（bun） | `bun scripts/build.ts`，无需 Node |
| 产物 | 纯 HTML/CSS/JS | 零框架、零依赖，GitHub Pages 直接托管 |
| 版本 | Git | 内容自动留档，可回溯 |
| 部署 | GitHub Pages | push 即自动上线，免费 HTTPS |

## 二、目录结构

```
person_station/              ← GitHub Pages 站点根目录（main 分支根）
├── index.html               ← 首页（落地页）
├── posts/                   ← 文章页（由 content/posts/*.md 生成）
├── pages/                   ← 独立落地页（由 content/pages/*.md 生成）
├── assets/
│   ├── css/style.css        ← 全局样式
│   └── js/main.js           ← 全局脚本
├── content/                 ← Markdown 源内容（AI 生成的内容放这里）
│   ├── posts/               ←   文章
│   └── pages/               ←   落地页
├── templates/               ← HTML 模板
│   ├── post.html            ←   文章页模板
│   └── page.html            ←   落地页模板
├── scripts/
│   └── build.ts             ← 生成脚本：Markdown → HTML
└── README.md                ← 本文件
```

## 三、发布流程

```
1. 准备内容   把 AI 生成的文章/落地页写成 Markdown，放入 content/
2. 渲染生成   bun scripts/build.ts   （Markdown + 模板 → HTML 到 posts/ pages/）
3. 本地预览   bun serve .           （浏览器打开 http://localhost:3000 查看）
4. 提交版本   git add -A && git commit -m "..."   （内容留档）
5. 推送上线   git push              （GitHub Pages 自动部署）
6. 线上验证   访问 https://ZhouM-dev.github.io/person_station/ 确认
```

## 四、Markdown 文件格式（front-matter）

```markdown
---
title: 文章标题
date: 2026-08-17
description: 一句话摘要（用于列表/SEO）
---

正文从这里开始，支持 Markdown 语法。
```

- `content/posts/*.md` → 生成到 `posts/*.html`
- `content/pages/*.md` → 生成到 `pages/*.html`

## 五、环境要求

- 系统：Windows 11（已就绪）
- bun：已装（`C:\Users\Administrator\.cherrystudio\bin\bun.exe`）
- Git：已装（随 Cherry Studio 内置）
- SSH：已配（`~/.ssh/id_ed25519`，公钥已加到 GitHub）

## 六、后续可扩展

- [ ] 首页文章列表自动生成（当前为手写链接）
- [ ] 批量生成：AI 一次产出 N 篇 → 循环执行步骤 2–5
- [ ] 定时发布：接入 cron，按计划自动生成 + 发布
- [ ] 自定义域名 / 更多模板 / 站点地图 sitemap.xml
