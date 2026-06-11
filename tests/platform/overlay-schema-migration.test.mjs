import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationPath = new URL(
  "../../supabase/migrations/20260611080000_create_overlay_links_and_states.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(migrationPath, "utf8");
}

describe("Overlay platform schema migration", () => {
  it("enforces one active Overlay Link per Streamer Profile", async () => {
    const migration = await readMigration();

    assert.match(migration, /create unique index if not exists overlay_links_one_active_per_profile_key/i);
    assert.match(migration, /on public\.overlay_links\(streamer_profile_id\)/i);
    assert.match(migration, /where status = 'active'/i);
  });

  it("keeps Overlay Link and Overlay State dashboard reads owner-scoped", async () => {
    const migration = await readMigration();

    assert.match(migration, /alter table public\.overlay_links enable row level security/i);
    assert.match(migration, /alter table public\.overlay_states enable row level security/i);
    assert.match(migration, /streamer_profiles\.owner_user_id = \(select auth\.uid\(\)\)/i);
  });

  it("stores Overlay State as one public-read object projection", async () => {
    const migration = await readMigration();

    assert.match(migration, /state jsonb not null/i);
    assert.match(migration, /constraint overlay_states_state_is_object check \(jsonb_typeof\(state\) = 'object'\)/i);
    assert.match(migration, /create unique index if not exists overlay_states_streamer_profile_id_key/i);
  });
});
