// Universal, platform-agnostic checks that work on ANY store URL (Woo, Shopify, custom) —
// no API/integration needed, just the address. Today: SSL certificate expiry.
import tls from "node:tls";
import type { RawSignal } from "./watchers/woo.js";

export function sslDaysLeft(host: string, port = 443): Promise<number | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: number | null) => { if (!done) { done = true; resolve(v); } };
    try {
      const socket = tls.connect(
        { host, port, servername: host, timeout: 8000, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || !cert.valid_to) return finish(null);
          finish(Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000));
        },
      );
      socket.on("error", () => finish(null));
      socket.on("timeout", () => { socket.destroy(); finish(null); });
    } catch {
      finish(null);
    }
  });
}

export async function scanUniversal(storeUrl: string): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  let host = "";
  try { host = new URL(storeUrl).host; } catch { return signals; }
  const days = await sslDaysLeft(host);
  if (days === null) return signals;
  if (days < 0) {
    signals.push({
      kind: "ssl_expired", severity: "critical", title: "SSL certificate expired",
      detail: `The TLS certificate for ${host} has expired — browsers will block the store`,
      raw: { host, days },
    });
  } else if (days <= 21) {
    signals.push({
      kind: "ssl_expiring", severity: "warning", title: `SSL certificate expiring in ${days} day(s)`,
      detail: `Renew the TLS certificate for ${host} before it lapses`,
      raw: { host, days },
    });
  }
  return signals;
}
