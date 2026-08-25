const FINGERPRINT_STORAGE_KEY = "doomsday-cakto-session-fingerprint";
const CAKTO_SDK_URL = "https://cakto-sdk.pages.dev/cakto-sdk.min.js";
let sdkInstance: CaktoSdkInstance | null = null;
let sdkLoadPromise: Promise<CaktoSdkInstance | null> | null = null;
let sdkInitPromise: Promise<void> | null = null;

export function getCaktoSdk() {
  if (typeof window === "undefined" || !window.Cakto || !import.meta.env.VITE_CAKTO_SDK_CLIENT_ID) return null;
  if (!sdkInstance) {
    sdkInstance = new window.Cakto.CaktoSDK({ client_id: import.meta.env.VITE_CAKTO_SDK_CLIENT_ID });
  }
  return sdkInstance;
}

function loadCaktoSdk(timeoutMs = 5000) {
  const immediate = getCaktoSdk();
  if (immediate || !import.meta.env.VITE_CAKTO_SDK_CLIENT_ID || typeof window === "undefined") {
    return Promise.resolve(immediate);
  }
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<CaktoSdkInstance | null>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(getCaktoSdk());
    };
    const timeout = window.setTimeout(finish, timeoutMs);
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${CAKTO_SDK_URL}"]`);
    const script = existingScript ?? document.createElement("script");
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", finish, { once: true });
    if (!existingScript) {
      script.src = CAKTO_SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return sdkLoadPromise;
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
  return loadCaktoSdk(timeoutMs);
}

async function ensureCaktoAntifraudInitialized(sdk: CaktoSdkInstance) {
  if (!sdkInitPromise) {
    sdkInitPromise = sdk.initAntifraud().catch((error) => {
      sdkInitPromise = null;
      throw error;
    });
  }
  await sdkInitPromise;
}

export async function collectCaktoAntifraudReference() {
  const sdk = await waitForCaktoSdk();
  if (!sdk) return undefined;
  await ensureCaktoAntifraudInitialized(sdk);
  await sdk.completeAntifraudProfile();
  const reference = sdk.getAntifraudReference();
  if (!reference) throw new Error("Não foi possível concluir a análise antifraude. Atualize a página e tente novamente.");
  return { fingerprint: getCaktoSessionFingerprint(), antifraudProfilingAttemptReference: reference };
}

export async function startCaktoAntifraudProfile() {
  const sdk = await waitForCaktoSdk();
  if (!sdk) return false;
  await ensureCaktoAntifraudInitialized(sdk);
  return true;
}

export function cleanupCaktoAntifraudProfile() {
  sdkInstance?.cleanupAntifraud();
  sdkInitPromise = null;
  sdkInstance = null;
}
