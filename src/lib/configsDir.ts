const KEY = "vgp.lastConfigsDir";

export function getLastDir(): string | null {
  return localStorage.getItem(KEY);
}

export function setLastDir(dir: string) {
  localStorage.setItem(KEY, dir);
}
