import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOverlayRoutePayload,
  hashOverlayLinkToken,
  normalizeOverlayLinkToken,
  regenerateOverlayLink,
  resolveOverlayStateForToken,
} from "../../lib/platform/overlay-link.js";

function createMemoryOverlayRepository({ links = [], states = [] } = {}) {
  const overlayLinks = new Map(links.map((link) => [link.publicTokenHash, { ...link }]));
  const overlayStates = new Map(states.map((state) => [state.streamerProfileId, { ...state }]));
  const calls = [];

  return {
    calls,
    overlayLinks,
    async findActiveOverlayLinkByTokenHash(publicTokenHash) {
      calls.push(["findActiveOverlayLinkByTokenHash", publicTokenHash]);
      const link = overlayLinks.get(publicTokenHash);
      return link && link.status === "active"
        ? { id: link.id, streamerProfileId: link.streamerProfileId }
        : null;
    },
    async findActiveOverlayLinkByStreamerProfileId(streamerProfileId) {
      calls.push(["findActiveOverlayLinkByStreamerProfileId", streamerProfileId]);
      return (
        [...overlayLinks.values()].find((link) => link.streamerProfileId === streamerProfileId && link.status === "active") ??
        null
      );
    },
    async deactivateOverlayLink(linkId) {
      calls.push(["deactivateOverlayLink", linkId]);
      for (const [tokenHash, link] of overlayLinks.entries()) {
        if (link.id === linkId) {
          overlayLinks.set(tokenHash, { ...link, status: "inactive", deactivatedAt: "2026-06-13T00:00:00.000Z" });
          return overlayLinks.get(tokenHash);
        }
      }
      return null;
    },
    async createOverlayLink(input) {
      calls.push(["createOverlayLink", input]);
      const link = {
        id: `link-${overlayLinks.size + 1}`,
        streamerProfileId: input.streamerProfileId,
        publicTokenHash: input.publicTokenHash,
        status: "active",
        regeneratedFromLinkId: input.regeneratedFromLinkId ?? null,
      };
      overlayLinks.set(input.publicTokenHash, link);
      return link;
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

  it("regenerates Overlay Links by deactivating the previous token and storing only the new token hash", async () => {
    const oldToken = "old-public-token";
    const oldTokenHash = hashOverlayLinkToken(oldToken);
    const repository = createMemoryOverlayRepository({
      links: [
        {
          id: "link-1",
          streamerProfileId: "profile-1",
          publicTokenHash: oldTokenHash,
          status: "active",
        },
      ],
      states: [
        {
          id: "state-1",
          streamerProfileId: "profile-1",
          schemaVersion: 1,
          state: { profile: { displayName: "Demo" }, widgets: [] },
        },
      ],
    });

    const result = await regenerateOverlayLink(repository, {
      streamerProfileId: "profile-1",
      createPublicToken: () => "new-public-token",
    });

    assert.equal(result.publicToken, "new-public-token");
    assert.equal(result.link.publicTokenHash, hashOverlayLinkToken("new-public-token"));
    assert.equal(result.link.regeneratedFromLinkId, "link-1");
    assert.equal([...repository.overlayLinks.values()].find((link) => link.id === "link-1").status, "inactive");
    assert.equal(await resolveOverlayStateForToken(repository, oldToken), null);
    assert.equal(Object.hasOwn(result.link, "publicToken"), false);
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
