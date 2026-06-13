import { createHash, randomBytes } from "node:crypto";

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

function createDefaultPublicToken() {
  return randomBytes(32).toString("base64url");
}

export async function regenerateOverlayLink(repository, input) {
  const publicToken = normalizeOverlayLinkToken((input.createPublicToken ?? createDefaultPublicToken)());
  const publicTokenHash = hashOverlayLinkToken(publicToken);

  if (!publicTokenHash) {
    throw new Error("Overlay Link token is required");
  }

  const previousLink = await repository.findActiveOverlayLinkByStreamerProfileId(input.streamerProfileId);

  if (previousLink) {
    await repository.deactivateOverlayLink(previousLink.id);
  }

  const link = await repository.createOverlayLink({
    streamerProfileId: input.streamerProfileId,
    publicTokenHash,
    regeneratedFromLinkId: previousLink?.id ?? null,
  });

  return {
    publicToken,
    link,
  };
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

export function createOverlayRoutePayload(resolvedOverlayState) {
  if (!resolvedOverlayState) {
    return {
      status: "inactive",
      state: null,
    };
  }

  return {
    status: "active",
    state: resolvedOverlayState.state,
  };
}
