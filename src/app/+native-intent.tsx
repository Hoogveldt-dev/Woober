/**
 * Na inloggen met Apple of Google in de app komt de browser terug op woober://auth?code=...
 * Die code handelt src/lib/account.ts af; Expo Router hoeft daar niet naartoe te navigeren.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (/^(woober:\/\/)?\/?auth(\?|$)/.test(path) || path.includes('://auth')) return null;
    return path;
  } catch {
    return path;
  }
}
