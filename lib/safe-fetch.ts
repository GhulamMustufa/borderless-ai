import dns from "dns/promises";
import net from "net";

/**
 * List of approved top-level or second-level government domain suffixes and official immigration portals.
 */
const APPROVED_GOV_PATTERNS = [
  // Standard government domain patterns
  /\.gov$/i,
  /\.gov\.[a-z]{2}$/i,
  /\.gob\.[a-z]{2}$/i,
  /\.gouv\.[a-z]{2}$/i,
  /\.govt\.[a-z]{2}$/i,
  // Specific national government domains and portals
  /(^|\.)canada\.ca$/i,
  /(^|\.)gc\.ca$/i,
  /(^|\.)europa\.eu$/i,
  /(^|\.)admin\.ch$/i,
  /(^|\.)overheid\.nl$/i,
  /(^|\.)bund\.de$/i,
  /(^|\.)bamf\.de$/i,
  /(^|\.)make-it-in-germany\.com$/i,
  /(^|\.)e-albania\.al$/i,
  /(^|\.)govern\.ad$/i,
  /(^|\.)interieur\.gov\.dz$/i,
  /(^|\.)mesrs\.dz$/i,
  /(^|\.)cip\.gov\.ag$/i,
];

/**
 * Checks whether an IP address belongs to private, loopback, link-local, or reserved ranges.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 0.0.0.0/8 - Current network
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 - Private network
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 - Loopback
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 - Link-local / Cloud metadata (e.g. AWS/GCP 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 - Private network
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 - Private network
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 100.64.0.0/10 - Carrier-grade NAT
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 224.0.0.0/4 - Multicast
    if (parts[0] >= 224) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // Loopback & unspecified
    if (normalized === "::1" || normalized === "::") return true;
    // Unique local address (fc00::/7)
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    // Link-local address (fe80::/10)
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
    if (normalized.startsWith("::ffff:")) {
      const v4Part = normalized.replace("::ffff:", "");
      return isPrivateIp(v4Part);
    }
  }

  return false;
}

/**
 * Validates that a URL is a legitimate government portal and does not resolve to an internal network address.
 */
export async function validateGovernmentUrl(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL format: "${urlString}"`);
  }

  // Enforce HTTPS
  if (parsed.protocol !== "https:") {
    throw new Error(`Insecure protocol "${parsed.protocol}". Only HTTPS government URLs are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicitly block local/loopback hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error(`Access to local/internal hostnames is blocked: "${hostname}"`);
  }

  // Verify against approved government domain patterns
  const isApproved = APPROVED_GOV_PATTERNS.some((pattern) => pattern.test(hostname));
  if (!isApproved) {
    throw new Error(`Domain "${hostname}" is not on the approved government domains allowlist.`);
  }

  // Resolve DNS to verify IP is not internal/private (SSRF protection)
  let addresses: string[];
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    addresses = lookupResults.map((r) => r.address);
  } catch (err: any) {
    throw new Error(`DNS resolution failed for "${hostname}": ${err.message}`);
  }

  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`SSRF blocked: Domain "${hostname}" resolved to private/internal IP "${address}".`);
    }
  }

  return parsed;
}

/**
 * Safely fetches an approved government URL with manual redirect validation and SSRF protection.
 */
export async function safeFetchGovernmentUrl(
  urlString: string,
  options?: { maxRedirects?: number; timeoutMs?: number; userAgent?: string }
): Promise<Response> {
  const maxRedirects = options?.maxRedirects ?? 5;
  const timeoutMs = options?.timeoutMs ?? 15000;
  const userAgent =
    options?.userAgent ??
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

  let currentUrl = urlString;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const validatedUrl = await validateGovernmentUrl(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(validatedUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Check for redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Redirect response (${response.status}) missing Location header.`);
      }

      // Resolve redirect against current URL
      const nextUrl = new URL(location, validatedUrl).toString();
      console.log(`ℹ️ Validating redirect destination: ${nextUrl}`);
      currentUrl = nextUrl;
      continue;
    }

    return response;
  }

  throw new Error(`Exceeded maximum redirect limit (${maxRedirects}).`);
}
