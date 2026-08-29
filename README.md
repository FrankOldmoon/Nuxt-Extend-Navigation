# Navigation module — decoupled nav layer

This folder is an **independent Nuxt layer** that mounts onto the host admin
project via `extends.local.txt`. It overrides the public home page (`/`) with
a curated navigation site and registers `nav_categories` / `nav_links` into
the generic dashboard CRUD.

## How it is mounted

The host project reads `extends.local.txt` (gitignored) via `readLocalExtends()`:

```
./layers/Nuxt-Extend-Navigation
```

## Directory anatomy

```
layers/Nuxt-Extend-Navigation/
├── nuxt.config.ts              # Declares this layer's own i18n locale files
├── i18n/locales/{en,zh}.json   # Module i18n (dashboard tables/fields + nav UI keys)
├── app/
│   ├── pages/index.vue         # Overrides the host root `/` → nav home
│   ├── components/nav/         # NavHome, LinkCard, Logo (smart renderer)
│   └── composables/useNav.ts   # SSR data fetching + logo parsing + click tracking
├── server/
│   ├── database/
│   │   ├── schema.ts           # Drizzle tables: nav_categories, nav_links
│   │   └── migrate.ts          # Idempotent DDL (nav_ prefix, IF NOT EXISTS)
│   ├── api/nav/
│   │   ├── overview.get.ts     # Grouped categories + links for the home page
│   │   ├── favicon.post.ts     # Fetch a site's favicon (try origin → Google fallback)
│   │   └── links/click.post.ts # Increment click counter (fire-and-forget)
│   ├── utils/fields.ts         # TableMeta for the host generic dashboard CRUD
│   └── plugins/nav.ts          # Startup: register schema+tables, migrate, seed, merge menu
│
└── README.md
```

## Tables (prefix `nav_`)

| Table | Description |
|---|---|
| `nav_categories` | Flat one-level categories (name, slug, icon, sortOrder, isActive, soft-delete) |
| `nav_links` | Website entries (title, url, description, logo, tags, categoryId, clickCount, soft-delete) |

## CRUD & Menu

Tabled are registered via `registerDashboardTable` with `custom: false`, so the
host's generic list/form/detail, advanced filters, search, batch operations and
soft-delete work out of the box. Menu entries are merged into the shared
`dashboard.menu` config automatically.

## Logo field

The `logo` column on `nav_links` and the `icon` column on `nav_categories` use
the `icon` field type — a generic renderer that supports **Iconify classes**
(`i-lucide-globe`), **image URLs** and **inline SVG**. The dashboard form uses
`BaseIconPicker` (shared with the menu editor). Cells and detail views render
the icon automatically.

## Favicon fetch

The `POST /api/nav/favicon` endpoint accepts `{ url: "https://..." }` and
returns `{ logo, source }`. It tries the site's own well-known favicon paths
first, then falls back to Google's favicon service. Use this in the admin form
to auto-fill the logo when adding a new link.

## Boot sequence

The `plugins/nav.ts` Nitro plugin:
1. Registers the nav Drizzle schema with the host dashboard discovery.
2. Runs idempotent DDL migrations (safe to call on every boot).
3. Registers tables into the generic CRUD (with sidebar menu order).
4. Merges menu entries into the persisted `dashboard.menu` whitelist.
5. Seeds sample categories + links when the tables are empty.

## Copying for a new module

1. Copy this folder to `layers/<name>`, rename package-scoped identifiers.
2. Add `./layers/<name>` to `extends.local.txt`.
3. Edit `server/plugins/<name>.ts` to register your schema/tables/menu/seed.
4. Keep every host import relative; never add `<name>` text into the host.