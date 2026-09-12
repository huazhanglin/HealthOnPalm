import { getStorageJson, setStorageJson } from "@/utils/storage";
import { readStoredAuthSession } from "@/utils/auth-session";

export const AI_CONSENT_STORAGE_KEY = "health-agent-ai-consent";
export const AI_CONSENT_VERSION = 1;

export const AI_CONSENT_DENIED_MESSAGE =
  "尚未同意将数据发送给第三方 AI 服务。请在「我的 → 账号与隐私」中开启。";

interface AiConsentRecord {
  granted: boolean;
  decidedAt: number;
  version: number;
}

function readMap(): Record<string, AiConsentRecord> {
  return getStorageJson<Record<string, AiConsentRecord>>(AI_CONSENT_STORAGE_KEY) ?? {};
}

function writeMap(map: Record<string, AiConsentRecord>): void {
  setStorageJson(AI_CONSENT_STORAGE_KEY, map);
}

export function hasAiConsentDecision(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const record = readMap()[userId];
  return Boolean(record && record.version === AI_CONSENT_VERSION);
}

export function hasGrantedAiConsent(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const record = readMap()[userId];
  return record?.version === AI_CONSENT_VERSION && record.granted === true;
}

export function setAiProcessingConsent(
  userId: string,
  granted: boolean
): void {
  const map = readMap();
  map[userId] = {
    granted,
    decidedAt: Date.now(),
    version: AI_CONSENT_VERSION,
  };
  writeMap(map);
}

export function clearAiProcessingConsent(userId: string | null | undefined): void {
  if (!userId) return;
  const map = readMap();
  delete map[userId];
  writeMap(map);
}

export function requireAiProcessingConsent(): void {
  const userId = readStoredAuthSession()?.userId;
  if (!hasGrantedAiConsent(userId)) {
    throw new Error(AI_CONSENT_DENIED_MESSAGE);
  }
}

/** 尚未作答则进入说明页。已同意或已拒绝都放行。 */
export function ensureAiConsentDecided(): boolean {
  const userId = readStoredAuthSession()?.userId;
  if (!userId) return true;
  if (hasAiConsentDecision(userId)) return true;
  uni.reLaunch({ url: "/pages/legal/ai-consent" });
  return false;
}

export function openAiConsentPage(): void {
  uni.navigateTo({ url: "/pages/legal/ai-consent?from=profile" });
}
