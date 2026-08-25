const FINGERPRINT_STORAGE_KEY = "doomsday-cakto-session-fingerprint";
let sdkInstance: CaktoSdkInstance | null = null;

export function getCaktoSdk() {
  if (typeof window === "undefined" || !window.Cakto || !import.meta.env.VITE_CAKTO_SDK_CLIENT_ID) return null;
  if (!sdkInstance) {
    sdkInstance = new window.Cakto.CaktoSDK({ client_id: import.meta.env.VITE_CAKTO_SDK_CLIENT_ID });
  }
  return sdkInstance;
}

export function getCaktoSessionFingerprint() {
  if (typeof window === "undefined") return "server-session";
  const current = window.sessionStorage.getItem(FINGERPRINT_STORAGE_KEY);
  if (current) return current;
  const fingerprint = window.crypto?.randomUUID?.() ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprint);
  return fingerprint;
}

async function waitForCaktoSdk(timeoutMs = 5000) {
  const immediate = getCaktoSdk();
  if (immediate || !import.meta.env.VITE_CAKTO_SDK_CLIENT_ID) return immediate;
  return new Promise<CaktoSdkInstance | null>((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const sdk = getCaktoSdk();
      if (sdk || Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(sdk);
      }
    }, 50);
  });
}

export async function collectCaktoAntifraudReference() {
  const sdk = await waitForCaktoSdk();
  if (!sdk) return undefined;
  await sdk.completeAntifraudProfile();
  const reference = sdk.getAntifraudReference();
  if (!reference) throw new Error("Não foi possível concluir a análise antifraude. Atualize a página e tente novamente.");
  return { fingerprint: getCaktoSessionFingerprint(), antifraudProfilingAttemptReference: reference };
}

export async function startCaktoAntifraudProfile() {
  const sdk = await waitForCaktoSdk();
  if (!sdk) return false;
  await sdk.initAntifraud();
  return true;
}

export function cleanupCaktoAntifraudProfile() {
  sdkInstance?.cleanupAntifraud();
}
