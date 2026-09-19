// Verify step: turn a RAW signal into a confirmed, evidence-backed Finding.
// - re-checks transient signals to cut false positives
// - attaches evidence lines, including Tavily-cited sources for known issues
// - proposes a fix the owner can approve
import type { RawSignal } from "./watchers/woo.js";

export interface VerifiedFinding {
  kind: string;
  severity: RawSignal["severity"];
  title: string;
  detail: string;
  evidence: string[];
  suggestedFix?: string;
}

// Pull an authoritative source/citation for a known problem class (best-effort).
async function tavilyCite(query: string): Promise<string | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, max_results: 1, search_depth: "basic" }),
    });
    const j = await res.json();
    const top = j?.results?.[0];
    return top ? `Source: ${top.title} — ${top.url}` : null;
  } catch {
    return null;
  }
}

export async function verify(signal: RawSignal): Promise<VerifiedFinding | null> {
  const evidence: string[] = [signal.detail];
  let suggestedFix: string | undefined;

  switch (signal.kind) {
    case "site_down": {
      // Re-probe once to confirm it is not a blip before we alarm the owner.
      const url = String((signal.raw as any).url ?? process.env.WOO_STORE_URL ?? "");
      if (url) {
        try {
          const res = await fetch(url, { redirect: "follow" });
          if (res.ok) return null; // recovered -> false positive
          evidence.push(`Re-check confirmed: HTTP ${res.status}`);
        } catch (e) {
          evidence.push(`Re-check confirmed unreachable: ${String(e)}`);
        }
      }
      suggestedFix = "Check hosting/uptime and the payment gateway; put up a maintenance notice if extended.";
      break;
    }
    case "orders_failing": {
      suggestedFix = "Verify the payment gateway credentials/webhooks; test a checkout with a sandbox card.";
      const cite = await tavilyCite("WooCommerce orders stuck on failed payment gateway troubleshooting");
      if (cite) evidence.push(cite);
      break;
    }
    case "plugin_outdated": {
      const name = String((signal.raw as any).plugin ?? "");
      const latest = String((signal.raw as any).latest ?? "");
      suggestedFix = `Update ${name} to ${latest} (test on staging first).`;
      const cite = await tavilyCite(`${name} WordPress plugin ${latest} changelog security fixes`);
      if (cite) evidence.push(cite);
      break;
    }
    case "insecure_connection": {
      suggestedFix = "Install/renew an SSL certificate and force HTTPS site-wide.";
      break;
    }
    case "php_outdated": {
      suggestedFix = "Upgrade PHP to 8.1+ in your hosting panel after testing on staging.";
      break;
    }
    case "ssl_expiring":
    case "ssl_expired": {
      suggestedFix = "Renew the SSL certificate (or enable auto-renewal via your host/Let's Encrypt/Cloudflare).";
      break;
    }
    case "stockout": {
      suggestedFix = "Restock or hide the product; enable back-in-stock notifications.";
      break;
    }
    case "site_slow": {
      suggestedFix = "Check plugin conflicts and enable page/object caching; review recent plugin updates.";
      break;
    }
    default:
      break;
  }

  return {
    kind: signal.kind,
    severity: signal.severity,
    title: signal.title,
    detail: signal.detail,
    evidence,
    suggestedFix,
  };
}
