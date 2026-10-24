export const userStorageKey = (base: string, userId: string | undefined | null): string | null => {
  if (!userId) return null;
  return `${base}:${userId}`;
};

export const readUserFlag = (base: string, userId: string | undefined | null): boolean => {
  const key = userStorageKey(base, userId);
  if (!key) return false;
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

export const writeUserFlag = (base: string, userId: string | undefined | null, value: boolean) => {
  const key = userStorageKey(base, userId);
  if (!key) return;
  try {
    if (value) localStorage.setItem(key, 'true');
    else localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const clearLegacyFlag = (base: string) => {
  try {
    localStorage.removeItem(base);
  } catch {
    // ignore
  }
};