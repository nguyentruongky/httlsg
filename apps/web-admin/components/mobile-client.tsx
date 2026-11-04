"use client";
import { App } from "../../mobile-client/src/app";
import { ClientAuthGate } from "../../mobile-client/src/login-form";
import "../../mobile-client/src/styles.css";
export function MobileClient() {
  return (
    <ClientAuthGate>
      <App />
    </ClientAuthGate>
  );
}
