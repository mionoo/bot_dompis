const PRIVATE_FLOW_TTL_MS = 15 * 60 * 1000;

function beginPrivateFlow(ctx, session) {
  ctx.session = {
    ...session,
    expiresAt: Date.now() + PRIVATE_FLOW_TTL_MS,
  };
}

function isPrivateFlowExpired(ctx) {
  const expiresAt = ctx.session?.expiresAt;
  return Boolean(expiresAt && expiresAt <= Date.now());
}

function clearPrivateFlow(ctx) {
  ctx.session = null;
}

module.exports = { beginPrivateFlow, isPrivateFlowExpired, clearPrivateFlow };
