import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOverlayDevSeedSql, createSampleOverlayState } from "../../lib/platform/overlay-dev-seed.js";
import { hashOverlayLinkToken } from "../../lib/platform/overlay-link.js";

const ownerUserId = "11111111-1111-4111-8111-111111111111";

describe("Overlay dev seed SQL", () => {
  it("generates a dev seed for one active Overlay Link and saved Overlay State", () => {
    const sql = createOverlayDevSeedSql({
      ownerUserId,
      token: "local-token",
      slug: "demo-streamer",
      displayName: "Demo Streamer",
    });

    assert.match(sql, /insert into public\.streamer_profiles/i);
    assert.match(sql, /insert into public\.overlay_links/i);
    assert.match(sql, /insert into public\.overlay_states/i);
    assert.match(sql, /status = 'inactive'/i);
    assert.match(sql, new RegExp(hashOverlayLinkToken("local-token")));
    assert.match(sql, /\/overlay\/local-token/);
    assert.match(sql, /"widgets"/);
    assert.match(sql, /"todos"/);
  });

  it("escapes SQL strings while preserving JSON overlay state", () => {
    const sql = createOverlayDevSeedSql({
      ownerUserId,
      token: "quoted-token",
      slug: "demo-streamer",
      displayName: "Streamer's Test",
    });

    assert.match(sql, /'Streamer''s Test'/);
    assert.match(sql, /"displayName": "Streamer''s Test"/);
  });

  it("rejects missing or invalid owner user IDs", () => {
    assert.throws(() => createOverlayDevSeedSql({ ownerUserId: "" }), /ownerUserId/);
    assert.throws(() => createOverlayDevSeedSql({ ownerUserId: "not-a-uuid" }), /ownerUserId/);
  });

  it("creates sample Overlay State that matches hosted render input", () => {
    const state = createSampleOverlayState({
      slug: "sample-streamer",
      displayName: "Sample Streamer",
    });
    const [todoWidget] = state.widgets;

    assert.equal(state.profile.slug, "sample-streamer");
    assert.equal(todoWidget.type, "todo");
    assert.equal(todoWidget.enabled, true);
    assert.equal(todoWidget.data.todos[0].title, "Check mic levels");
  });
});
