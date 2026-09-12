const normalizeClaimText = (value) => String(value || '').trim().toLowerCase();

const getClaimMergeKey = (claim = {}) => {
  const type = normalizeClaimText(claim.type);
  const amount = Number(claim.amount || 0);
  const notes = normalizeClaimText(claim.notes);
  const timestamp = normalizeClaimText(claim.timestamp);
  return `${type}|${amount}|${notes}|${timestamp}`;
};

export function mergeExpenseClaims(localClaims = [], serverClaims = []) {
  const merged = [];
  const seen = new Set();

  const addClaim = (claim) => {
    if (!claim || typeof claim !== 'object') return;
    const key = getClaimMergeKey(claim);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(claim);
  };

  if (Array.isArray(serverClaims)) {
    serverClaims.forEach(addClaim);
  }
  if (Array.isArray(localClaims)) {
    localClaims.forEach(addClaim);
  }

  return merged;
}
