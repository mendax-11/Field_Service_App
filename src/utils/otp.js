export function ensureOtp(value, generate = () => String(Math.floor(1000 + Math.random() * 9000))) {
  const normalized = value === null || value === undefined ? '' : String(value).trim();
  return normalized || generate();
}

export function ensureAccessPin(value, generate = () => String(Math.floor(1000 + Math.random() * 9000))) {
  const normalized = value === null || value === undefined ? '' : String(value).trim();
  return normalized || generate();
}
