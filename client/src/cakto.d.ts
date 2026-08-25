export {};

declare global {
  interface CaktoSdkInstance {
    initAntifraud(): Promise<void>;
    completeAntifraudProfile(): Promise<void>;
    getAntifraudReference(): string | null | undefined;
    cleanupAntifraud(): void;
  }

  interface CaktoSdkConstructor {
    new (options: { client_id: string }): CaktoSdkInstance;
  }

  interface CaktoGlobal {
    CaktoSDK: CaktoSdkConstructor;
  }

  interface Window {
    Cakto?: CaktoGlobal;
  }
}
