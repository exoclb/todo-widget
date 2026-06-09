import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PlatformAuthError,
  PlatformAuthorizationError,
  ensureStreamerProfile,
  loadOwnedStreamerProfile,
  normalizeSlug,
  updateOwnedStreamerProfile
} from "../../lib/platform/streamer-profile.js";

function createMemoryRepository(initialProfiles = []) {
  const profiles = new Map(initialProfiles.map((profile) => [profile.id, { ...profile }]));

  return {
    profiles,
    async findByOwnerUserId(ownerUserId) {
      return [...profiles.values()].find((profile) => profile.ownerUserId === ownerUserId) ?? null;
    },
    async findById(profileId) {
      return profiles.get(profileId) ?? null;
    },
    async create(input) {
      const profile = {
        id: `profile-${profiles.size + 1}`,
        ownerUserId: input.ownerUserId,
        slug: input.slug,
        displayName: input.displayName
      };
      profiles.set(profile.id, profile);
      return profile;
    },
    async update(profileId, ownerUserId, input) {
      const current = profiles.get(profileId);

      if (!current || current.ownerUserId !== ownerUserId) {
        throw new PlatformAuthorizationError();
      }

      const updated = {
        ...current,
        slug: input.slug,
        displayName: input.displayName
      };
      profiles.set(profileId, updated);
      return updated;
    }
  };
}

describe("Streamer Profile bootstrap", () => {
  it("rejects unauthenticated dashboard access", async () => {
    const repository = createMemoryRepository();

    await assert.rejects(() => ensureStreamerProfile(repository, null), PlatformAuthError);
  });

  it("creates a profile for the signed-in streamer when none exists", async () => {
    const repository = createMemoryRepository();
    const profile = await ensureStreamerProfile(repository, {
      id: "streamer-1",
      email: "Demo.Streamer@example.test"
    });

    assert.equal(profile.ownerUserId, "streamer-1");
    assert.equal(profile.displayName, "Demo.Streamer");
    assert.equal(profile.slug, "demo-streamer");
  });

  it("loads an existing profile instead of creating a duplicate", async () => {
    const repository = createMemoryRepository([
      {
        id: "profile-existing",
        ownerUserId: "streamer-1",
        displayName: "Existing Streamer",
        slug: "existing-streamer"
      }
    ]);

    const profile = await ensureStreamerProfile(repository, {
      id: "streamer-1",
      email: "streamer@example.test"
    });

    assert.equal(profile.id, "profile-existing");
    assert.equal(repository.profiles.size, 1);
  });

  it("hides cross-profile dashboard reads", async () => {
    const repository = createMemoryRepository([
      {
        id: "profile-other",
        ownerUserId: "streamer-2",
        displayName: "Other Streamer",
        slug: "other-streamer"
      }
    ]);

    await assert.rejects(
      () => loadOwnedStreamerProfile(repository, { id: "streamer-1" }, "profile-other"),
      PlatformAuthorizationError
    );
  });

  it("scopes profile writes to the signed-in owner", async () => {
    const repository = createMemoryRepository([
      {
        id: "profile-1",
        ownerUserId: "streamer-1",
        displayName: "Old Name",
        slug: "old-name"
      }
    ]);

    const updated = await updateOwnedStreamerProfile(repository, { id: "streamer-1" }, "profile-1", {
      displayName: "New Name",
      slug: "New Name"
    });

    assert.equal(updated.displayName, "New Name");
    assert.equal(updated.slug, "new-name");
  });

  it("rejects cross-profile dashboard writes", async () => {
    const repository = createMemoryRepository([
      {
        id: "profile-other",
        ownerUserId: "streamer-2",
        displayName: "Other Streamer",
        slug: "other-streamer"
      }
    ]);

    await assert.rejects(
      () =>
        updateOwnedStreamerProfile(repository, { id: "streamer-1" }, "profile-other", {
          displayName: "Takeover",
          slug: "takeover"
        }),
      PlatformAuthorizationError
    );
  });

  it("normalizes slugs for route-safe profile URLs", () => {
    assert.equal(normalizeSlug(" Demo Streamer!! ", "fallback"), "demo-streamer");
    assert.equal(normalizeSlug("", "Fallback Name"), "fallback-name");
  });
});
