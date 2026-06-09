export class PlatformAuthError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "PlatformAuthError";
  }
}

export class PlatformAuthorizationError extends Error {
  constructor(message = "Profile is not owned by the signed-in streamer") {
    super(message);
    this.name = "PlatformAuthorizationError";
  }
}

export function normalizeSlug(input, fallback) {
  const source = String(input || fallback || "streamer").trim().toLowerCase();
  const slug = source
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "streamer";
}

export function getDefaultDisplayName(user) {
  const emailName = user?.email ? String(user.email).split("@")[0] : "";
  const metadataName = user?.user_metadata?.name || user?.user_metadata?.display_name;

  return String(metadataName || emailName || "Streamer").trim();
}

export function requireStreamerUser(user) {
  if (!user?.id) {
    throw new PlatformAuthError();
  }

  return user;
}

export async function ensureStreamerProfile(repository, user, input = {}) {
  const streamer = requireStreamerUser(user);
  const existing = await repository.findByOwnerUserId(streamer.id);

  if (existing) {
    return existing;
  }

  const displayName = String(input.displayName || getDefaultDisplayName(streamer)).trim();
  const slug = normalizeSlug(input.slug, displayName || streamer.id);

  return repository.create({
    ownerUserId: streamer.id,
    displayName,
    slug
  });
}

export async function loadOwnedStreamerProfile(repository, user, profileId) {
  const streamer = requireStreamerUser(user);
  const profile = await repository.findById(profileId);

  if (!profile || profile.ownerUserId !== streamer.id) {
    throw new PlatformAuthorizationError();
  }

  return profile;
}

export async function updateOwnedStreamerProfile(repository, user, profileId, input) {
  await loadOwnedStreamerProfile(repository, user, profileId);

  return repository.update(profileId, user.id, {
    displayName: String(input.displayName || "").trim(),
    slug: normalizeSlug(input.slug, input.displayName)
  });
}
