# 共享资源区（Shared Resources）

> 本站点的共享资源目录，统一存放资料文件、文档、图片等静态资源，供站点页面与内容引用。
> 维护者：`resources` 角色（执行者），只负责本目录及其子目录。

---

## 一、这是什么目录

- 路径：`person_station/assets/resources/`
- 作用：集中管理站点会用到的**共享静态资源**（下载文件、说明文档、图片、数据文件等），与 `assets/css/`、`assets/js/`（由 `homepage` 维护）区分开。
- 页面 / 内容若需引用公共资源，统一从本目录取用，避免资源散落各处。

## 二、归类方式

按资源类型分子目录，新增资源放进对应分类：

| 子目录 | 用途 | 示例 |
|---|---|---|
| `docs/` | 文档类（PDF、说明、手册、Markdown 等） | `guide.pdf`、`manual.md` |
| `images/` | 图片类（插图、配图、图标、封面等） | `cover.png`、`logo.svg` |
| `files/` | 其他文件（压缩包、数据、模板、附件等） | `dataset.zip`、`template.xlsx` |

> 若出现新的资源类型，可新增子目录，并在本 README 的表格里同步登记。

## 三、命名规范

- **小写** + 连字符 `-`（不用空格、下划线或中文）：`user-guide.pdf`、`hero-banner.png`。
- 带语义前缀区分用途：如 `img-`（图片）、`doc-`（文档）、`file-`（附件），便于一眼识别。
- 同名冲突时加序号或日期后缀：`banner-02.png`、`report-2026-08-18.pdf`。
- 避免使用会变动的绝对路径 / 时间戳作为文件名（除非确需版本化）。

## 四、维护约定

- **维护者**：`resources` 角色。
- **边界**：`resources` 只改本目录及自己的 `outbox/resources/`、汇报文件，**不碰** `graph/`、主页三件套、`content/`、`posts/`、`templates/`、`scripts/`。
- 增删资源后，如需更新索引，一并维护本 README 的归类表格。

## 五、目录结构

```
assets/resources/
├── index.html       ← 资源区入口页（渲染分类 + 展示资源）
├── README.md        ← 本说明
├── docs/            ← 文档类（含 csp-exam-papers.html、csp-j1-prelim-notes.html、csp-s1-prelim-notes.html）
├── images/          ← 图片类（含 alipay-qr.png 支付宝收款码）
└── files/           ← 其他文件类
```
