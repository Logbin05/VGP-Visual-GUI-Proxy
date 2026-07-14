import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import i18n from "../lang/i18n";

const LAST_CHECK_KEY = "vgp.updateLastCheckedAt";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function checkForUpdate(): Promise<Update | null> {
  const update = await check();
  return update?.available ? update : null;
}

export function getLastCheckedAt(): number | null {
  const raw = localStorage.getItem(LAST_CHECK_KEY);
  return raw ? Number(raw) : null;
}

function markChecked() {
  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
}

export function isCheckDue(): boolean {
  const last = getLastCheckedAt();
  return last === null || Date.now() - last >= CHECK_INTERVAL_MS;
}

export async function checkOnceADay(): Promise<Update | null> {
  if (!isCheckDue()) return null;
  markChecked();
  return checkForUpdate();
}

export async function notifyUpdateAvailable(version: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (granted) {
    sendNotification({
      title: i18n.t("updateBanner.notificationTitle"),
      body: i18n.t("updateBanner.notificationBody", { version }),
    });
  }
}

export async function installUpdateAndRelaunch(
  update: Update,
  onProgress?: (downloaded: number, total: number | null) => void,
) {
  let downloaded = 0;
  let total: number | null = null;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? null;
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      onProgress?.(downloaded, total);
    }
  });
  await relaunch();
}
