import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOverlayRoutePayload,
  hashOverlayLinkToken,
  normalizeOverlayLinkToken,
  resolveOverlayStateForToken,
} from "../../lib/platform/overlay-link.js";

function createMemoryOverlayRepository({ links = [], states = [] } = {}) {
  const overlayLinks = new Map(links.map((link) => [link.publicTokenHash, { ...link }]));
  const overlayStates = new Map(states.map((state) => [state.streamerProfileId, { ...state }]));
  const calls = [];

  return {
    calls,
    async findActiveOverlayLinkByTokenHash(publicTokenHash) {
      calls.push(["findActiveOverlayLinkByTokenHash", publicTokenHash]);
      const link = overlayLinks.get(publicTokenHash);
      return link && link.status === "active"
        ? { id: link.id, streamerProfileId: link.streamerProfileId }
        : null;
    },
    async findOverlayStateByStreamerProfileId(streamerProfileId) {
      calls.push(["findOverlayStateByStreamerProfileId", streamerProfileId]);
      return overlayStates.get(streamerProfileId) ?? null;
    },
  };
}

describe("Overlay Link resolution", () => {
  it("normalizes and hashes public Overlay Link tokens before lookup", () => {
    assert.equal(normalizeOverlayLinkToken("  token-123  "), "token-123");
    assert.equal(hashOverlayLinkToken("  token-123  "), hashOverlayLinkToken("token-123"));
    assert.equal(hashOverlayLinkToken(""), "");
  });

  it("resolves active Overlay Links to public Overlay State", async () => {
    const token = "public-token";
    const publicTokenHash = hashOverlayLinkToken(token);
    const state = {
      schemaVersion: 1,
      profile: { slug: "demo", displayName: "Demo" },
      widgets: [],
    };
    const repository = createMemoryOverlayRepository({
      links: [
        {
          id: "link-1",
          streamerProfileId: "profile-1",
          publicTokenHash,
          status: "active",
        },
      ],
      states: [
        {
          id: "state-1",
          streamerProfileId: "profile-1",
          schemaVersion: 1,
          state,
          derivedFromTaskListVersion: 7,
          derivedAt: "2026-06-11T00:00:00.000Z",
        },
      ],
    });

    const resolved = await resolveOverlayStateForToken(repository, ` ${token} `);

    assert.deepEqual(resolved, {
      linkId: "link-1",
      streamerProfileId: "profile-1",
      schemaVersion: 1,
      state,
      derivedFromTaskListVersion: 7,
      derivedAt: "2026-06-11T00:00:00.000Z",
    });
    assert.deepEqual(repository.calls[0], ["findActiveOverlayLinkByTokenHash", publicTokenHash]);
  });

  it("builds public route payloads without exposing resolver metadata", () => {
    const state = {
      schemaVersion: 1,
      profile: { slug: "demo", displayName: "Demo" },
      widgets: [],
    };

    assert.deepEqual(
      createOverlayRoutePayload({
        linkId: "link-1",
        streamerProfileId: "profile-1",
        schemaVersion: 1,
        state,
        derivedFromTaskListVersion: 7,
        derivedAt: "2026-06-11T00:00:00.000Z",
      }),
      {
        status: "active",
        state,
      },
    );
    assert.deepEqual(createOverlayRoutePayload(null), {
      status: "inactive",
      state: null,
    });
  });

  it("does not expose state for blank, unknown, or inactive Overlay Links", async () => {
    const inactiveTokenHash = hashOverlayLinkToken("inactive-token");
    const repository = createMemoryOverlayRepository({
      links: [
        {
          id: "link-inactive",
          streamerProfileId: "profile-1",
          publicTokenHash: inactiveTokenHash,
          status: "inactive",
        },
      ],
      states: [
        {
          id: "state-1",
          streamerProfileId: "profile-1",
          schemaVersion: 1,
          state: { profile: { displayName: "Should not leak" } },
        },
      ],
    });

    assert.equal(await resolveOverlayStateForToken(repository, ""), null);
    assert.equal(await resolveOverlayStateForToken(repository, "unknown-token"), null);
    assert.equal(await resolveOverlayStateForToken(repository, "inactive-token"), null);
    assert.equal(
      repository.calls.some(([methodName]) => methodName === "findOverlayStateByStreamerProfileId"),
      false,
    );
  });

  it("does not expose partial data when an active link has no derived Overlay State", async () => {
    const repository = createMemoryOverlayRepository({
      links: [
        {
          id: "link-1",
          streamerProfileId: "profile-1",
          publicTokenHash: hashOverlayLinkToken("missing-state-token"),
          status: "active",
        },
      ],
    });

    assert.equal(await resolveOverlayStateForToken(repository, "missing-state-token"), null);
  });
});
