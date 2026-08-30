/**
 * Navigation module — database migrations.
 *
 * Self-contained idempotent DDL against the shared host connection, mirroring
 * the blog module. Every statement is guarded with `IF NOT EXISTS` / `ADD
 * COLUMN IF NOT EXISTS`, so it can run on every boot as an upgrade path.
 *
 * The `pool` comes from the host project (imported via a path into the host's
 * server/ directory) — the module reuses the host connection, it never opens
 * its own.
 */
import { pool } from '../../../../server/database'

const DDL = `
CREATE TABLE IF NOT EXISTS nav_categories (
  id          serial PRIMARY KEY,
  name        varchar(120)  NOT NULL,
  slug        varchar(160)  NOT NULL UNIQUE,
  description text,
  icon        varchar(64),
  sort_order  integer       NOT NULL DEFAULT 0,
  is_active   boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS nav_categories_slug_idx   ON nav_categories (slug);
CREATE INDEX IF NOT EXISTS nav_categories_active_idx ON nav_categories (is_active);

CREATE TABLE IF NOT EXISTS nav_links (
  id          serial PRIMARY KEY,
  title       varchar(255) NOT NULL,
  url         text         NOT NULL,
  description jsonb,
  logo        text,
  tags        jsonb        NOT NULL DEFAULT '[]',
  category_id integer      REFERENCES nav_categories(id) ON DELETE SET NULL,
  is_featured boolean      NOT NULL DEFAULT false,
  is_active   boolean      NOT NULL DEFAULT true,
  sort_order  integer      NOT NULL DEFAULT 0,
  click_count integer      NOT NULL DEFAULT 0,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS nav_links_category_idx ON nav_links (category_id);
CREATE INDEX IF NOT EXISTS nav_links_active_idx  ON nav_links (is_active);
CREATE INDEX IF NOT EXISTS nav_links_featured_idx ON nav_links (is_featured);

-- Upgrade path: toggle for active/inactive flags if a database predates them.
ALTER TABLE nav_categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE nav_links     ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Upgrade path: summary column for the short card text.
ALTER TABLE nav_links ADD COLUMN IF NOT EXISTS summary varchar(255);

-- Upgrade path: nav_links.description was a text column (markdown) and is now
-- jsonb (Tiptap JSON document). On a database that predates the change, the
-- column still has data_type=text: convert it in place via a temp column so
-- the column name and any existing text content are preserved.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nav_links' AND column_name = 'description' AND data_type = 'text'
  ) THEN
    ALTER TABLE nav_links ADD COLUMN description_jsonb jsonb;
    UPDATE nav_links
      SET description_jsonb = jsonb_build_object(
            'type', 'doc',
            'content', jsonb_build_array(
              jsonb_build_object(
                'type', 'paragraph',
                'content', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', COALESCE(description, ''))
                )
              )
            )
          )
      WHERE description_jsonb IS NULL AND description IS NOT NULL AND description <> '';
    ALTER TABLE nav_links DROP COLUMN IF EXISTS description;
    ALTER TABLE nav_links RENAME COLUMN description_jsonb TO description;
  END IF;
END $$;
`

/**
 * Apply the navigation schema (idempotent). Safe to call on every server boot.
 */
export async function runNavMigrations(): Promise<void> {
  await pool.query(DDL)
}