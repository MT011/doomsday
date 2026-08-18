export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  amplopayPublicKey: process.env.AMPLOPAY_PUBLIC_KEY ?? "",
  amplopaySecretKey: process.env.AMPLOPAY_SECRET_KEY ?? "",
  amplopayCallbackOrigin: process.env.AMPLOPAY_CALLBACK_ORIGIN ?? "",
};
