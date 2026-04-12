import { useEffect } from "react";

/** Регистрация SW только для веб-сборки (не для бандла Tauri). */
export function PwaRegister() {
  useEffect(() => {
    if (import.meta.env.VITE_PWA_DISABLED === "true") return;
    void import("virtual:pwa-register").then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  }, []);
  return null;
}
