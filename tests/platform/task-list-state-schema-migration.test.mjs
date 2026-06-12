import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationPath = new URL(
  "../../supabase/migrations/20260612090000_create_task_list_state.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(migrationPath, "utf8");
}

describe("Task List State schema migration", () => {
  it("creates backend-owned Task List State tables in dependency order", async () => {
    const migration = await readMigration();

    assert.match(migration, /create table if not exists public\.widgets/i);
    assert.match(migration, /create table if not exists public\.task_widget_configs/i);
    assert.match(migration, /create table if not exists public\.task_list_states/i);
    assert.match(migration, /create table if not exists public\.task_list_cycles/i);
    assert.match(migration, /create table if not exists public\.tasks/i);
    assert.match(migration, /create table if not exists public\.task_votes/i);
    assert.match(migration, /create table if not exists public\.task_history/i);
    assert.match(migration, /create table if not exists public\.command_logs/i);
  });

  it("keeps Task List State dashboard access scoped to the Streamer Profile owner", async () => {
    const migration = await readMigration();

    assert.match(migration, /alter table public\.task_list_states enable row level security/i);
    assert.match(migration, /alter table public\.task_list_cycles enable row level security/i);
    assert.match(migration, /alter table public\.tasks enable row level security/i);
    assert.match(migration, /alter table public\.task_votes enable row level security/i);
    assert.match(migration, /alter table public\.command_logs enable row level security/i);
    assert.match(migration, /create policy "Overlay State writes are owner scoped"/i);
    assert.match(migration, /streamer_profiles\.owner_user_id = \(select auth\.uid\(\)\)/i);
  });

  it("stores Task Numbers, Task List Cycles, private owner hashes, and dashboard-private history", async () => {
    const migration = await readMigration();

    assert.match(migration, /next_task_number integer not null default 1/i);
    assert.match(migration, /current_cycle_id uuid/i);
    assert.match(migration, /task_number integer not null/i);
    assert.match(migration, /owner_subject_hash text/i);
    assert.match(migration, /viewer_subject_hash text not null/i);
    assert.match(migration, /viewer_label text not null/i);
    assert.match(migration, /outcome text not null/i);
    assert.match(migration, /constraint tasks_status_check check \(status in \('active', 'completed'\)\)/i);
    assert.match(migration, /constraint task_history_outcome_check check \(outcome in \('completed', 'removed', 'reset'\)\)/i);
    assert.match(migration, /raw_command_text text not null/i);
    assert.match(migration, /ignored_reason text/i);
    assert.match(migration, /constraint command_logs_outcome_check check \(outcome in \('accepted', 'ignored'\)\)/i);
  });
});
