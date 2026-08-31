# Navigation Module — 导航站模块

An **independent, decoupled Nuxt layer** that mounts onto the host admin project.
A curated navigation start-page that replaces the host home page (`/`) and
registers `nav_categories` / `nav_links` into the host's generic dashboard CRUD.

> 独立解耦的 Nuxt layer，挂载到主管理项目上，把主项目首页 `/` 替换为一个精选链接导航站，并将 `nav_categories / nav_links` 两张表接入主项目通用 CRUD。

---

## 如何运行 / Running the module

> **关键：本模块不是独立应用，没有自己的 `package.json`，不能单独 `pnpm dev`。它只能依赖并挂载在主项目（host）里，通过主项目的 dev/build 一起运行。**
> **IMPORTANT: This is NOT a standalone app. It has no `package.json` of its own and cannot be run with `pnpm dev` on its own — it mounts into the host admin project and runs together with it.**

运行分五步，全部在主项目仓库内完成：

1. **先把主项目跑起来（前置依赖 / prerequisite first）.**
   按主项目 README 初始化并启动，保证它可用：

   ```bash
   cd <host>/Nuxt-Admin
   pnpm install
   cp .env.example .env          # 至少设置 DATABASE_URL 与 SESSION_SECRET
   pnpm db:migrate
   pnpm dev                       # 主项目先跑通
   ```

2. **把本模块克隆到主项目 `modules/`（一次性）.**
   注意：本模块会**替换主项目根首页 `/`**，启用前请确认这与你的预期一致。

   ```bash
   cp -r <this-repo>/* <host>/modules/nav/      # 或 git clone <repo> modules/nav
   ```

3. **在主项目 `.env` 打开开关** — 主项目 `nuxt.config.ts` 会自动扫描 `modules/`，挂载任何设置了 `NAV_ENABLED=true` 的目录（无需 `extends.local.txt`）。注意：本模块会**替换主项目根首页 `/`**，启用前请确认这与你的预期一致：

   ```
   NAV_ENABLED=true
   ```

4. **用主项目启动**, 访问 `/`：

   ```bash
   pnpm dev    # 然后再开 http://localhost:3000/
   ```

启动时模块会自动：注册 Drizzle schema → 幂等迁移建表 → 注册 2 张表进通用 CRUD 与侧边菜单 → 空表灌入示例分类/链接。替换首页后，原首页不再生效（如需共存，可结合 doc 模块：nav 占用 `/`，doc 占用 `/doc`）。

---

## 挂载机制 / How it is mounted

- 主项目 `nuxt.config.ts` 自动扫描 `modules/` 目录并挂载所有设置了 `<NAME>_ENABLED=true` 的文件夹（也兼容 `extends.local.txt` / `EXTENDS_MODULES`，三者去重合并）。
- 本模块的入口 `index.ts` 通过 `pages:extend` **移除主项目根首页 `/`** 并注入 `app/pages/nav.vue`（`definePageMeta({ layout: false })`，全屏落地页、不经默认 layout 包裹）。
- 未设置 `NAV_ENABLED=true` 时，模块 `index.ts` 直接 return，不注入任何内容。

---

## 目录结构 / Directory anatomy

```
modules/nav/
├── index.ts                      # 模块入口：NAV_ENABLED 开关 + pages:extend 替换首页 `/`
├── nuxt.config.ts                # 声明本 layer 自己的 i18n locale 文件
├── i18n/locales/{en,zh}.json     # 模块 i18n（dashboard tables/fields + nav UI 文案）
├── app/
│   ├── pages/nav.vue             # 替换主项目根首页 `/`（layout:false 全屏落地页）
│   ├── components/nav/           # NavHome、LinkCard、Logo、linkEditorModal
│   └── composables/useNav.ts     # SSR 数据获取 + logo 解析 + 点击计数
├── server/
│   ├── database/
│   │   ├── schema.ts             # Drizzle 两表定义
│   │   └── migrate.ts            # 幂等 DDL（nav_ 前缀，IF NOT EXISTS）
│   ├── api/nav/
│   │   ├── overview.get.ts      # 首页按分类分组的链接
│   │   ├── favicon.post.ts      # 抓取站点 favicon（先原始源 → Google 兜底）
│   │   └── links/click.post.ts  # 点击计数 +1（fire-and-forget）
│   ├── utils/fields.ts           # 两表的 TableMeta
│   └── plugins/nav.ts            # 启动：注册 schema/表、迁移、种子、合并菜单
└── README.md
```

---

## 数据表 / Tables (prefix `nav_`)

| Table | 说明 / Description |
|---|---|
| `nav_categories` | 单层分类（name、slug、icon、sortOrder、isActive、软删除） |
| `nav_links` | 网站条目（title、url、summary、description markdown、logo、tags、categoryId、clickCount、软删除） |

## 后台 CRUD 与菜单 / Dashboard CRUD & Menu

两表通过 `registerDashboardTable({ ..., custom: false })` 注册，主项目的通用列表/表单/详情、高级筛选、搜索、批量操作、软删除全部开箱即用。侧边菜单项自动并入共享的 `dashboard.menu` 配置，后台可从 `/dashboard/navCategories`、`/dashboard/navLinks` 编辑。

## Logo 字段 / Logo field

`nav_links.logo` 与 `nav_categories.icon` 都使用 `icon` 字段类型 —— 一个通用渲染器：支持 **Iconify class**（`i-lucide-globe`）、**图片 URL** 和 **行内 SVG**。后台表单用 `BaseIconPicker`（与菜单编辑器共享），表格单元格与详情视图自动渲染该图标。

## 抓取 favicon / Favicon fetch

`POST /api/nav/favicon` 入参 `{ url: "https://..." }`，返回 `{ logo, source }`。先尝试站点自身的 favicon 路径，再回退到 Google favicon 服务。后台新增链接时可用它自动填充 logo。

## 启动顺序 / Boot sequence

`plugins/nav.ts` Nitro 插件：
1. 把 nav Drizzle schema 注册进主项目 dashboard 自动发现。
2. 运行幂等 DDL 迁移（每次启动都可安全执行）。
3. 把两张表注册进通用 CRUD（含侧边菜单顺序）。
4. 把菜单项合并进持久化的 `dashboard.menu` 白名单。
5. 空表时灌入示例分类 + 链接。

---

## 复制为新的模块 / Copying for a new module

1. 把本目录复制到主项目 `modules/<name>`，重命名包级标识符。
2. 在主项目 `.env` 加 `<NAME>_ENABLED=true`（主项目会自动扫描 `modules/` 目录挂载）。
3. 编辑 `server/plugins/<name>.ts`，注册你的 schema / 表 / 菜单 / 种子。
4. 保持所有对主项目的 import 相对且注释清晰；不要把 `<name>` 字样写进主项目。