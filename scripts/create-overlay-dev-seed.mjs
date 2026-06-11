import { createOverlayDevSeedSql } from "../lib/platform/overlay-dev-seed.js";

function readArgs(argv) {
  const input = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--owner-user-id") {
      input.ownerUserId = next;
      index += 1;
    } else if (arg === "--token") {
      input.token = next;
      index += 1;
    } else if (arg === "--slug") {
      input.slug = next;
      index += 1;
    } else if (arg === "--display-name") {
      input.displayName = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      input.help = true;
    }
  }

  return input;
}

function printHelp() {
  console.log(`Usage:
  bun run dev:overlay-seed -- --owner-user-id <auth-user-uuid> [--token dev-overlay-token] [--slug dev-streamer] [--display-name "Dev Streamer"]

The command prints SQL for a dev Streamer Profile, one active Overlay Link, and one saved Overlay State.
Run the SQL in Supabase after applying the platform migrations.`);
}

const input = readArgs(process.argv.slice(2));

if (input.help) {
  printHelp();
  process.exit(0);
}

try {
  console.log(createOverlayDevSeedSql(input));
} catch (error) {
  console.error(`error - ${error.message}`);
  printHelp();
  process.exit(1);
}
