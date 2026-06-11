import { createHash } from "node:crypto";

export function normalizeOverlayLinkToken(token) {
  return String(token || "").trim();
}

export function hashOverlayLinkToken(token) {
  const normalizedToken = normalizeOverlayLinkToken(token);

  if (!normalizedToken) {
    return "";
  }

  return createHash("sha256").update(normalizedToken, "utf8").digest("hex");
}

export async function resolveOverlayStateForToken(repository, token) {
  const publicTokenHash = hashOverlayLinkToken(token);

  if (!publicTokenHash) {
    return null;
  }

  const link = await repository.findActiveOverlayLinkByTokenHash(publicTokenHash);

  if (!link) {
    return null;
  }

  const overlayState = await repository.findOverlayStateByStreamerProfileId(link.streamerProfileId);

  if (!overlayState) {
    return null;
  }

  return {
    linkId: link.id,
    streamerProfileId: link.streamerProfileId,
    schemaVersion: overlayState.schemaVersion,
    state: overlayState.state,
    derivedFromTaskListVersion: overlayState.derivedFromTaskListVersion ?? null,
    derivedAt: overlayState.derivedAt ?? null,
  };
}
