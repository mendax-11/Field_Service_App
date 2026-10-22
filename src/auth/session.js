export function canUseDemoAuthentication(env = {}) {
  return env.DEV === true;
}

export function getSessionUser(authStore) {
  if (!authStore?.isValid || !authStore.model) return null;
  return authStore.model;
}
