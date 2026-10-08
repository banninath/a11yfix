import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message = "The URL is not allowed") {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export function normalizeHttpUrlInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ipv4Number(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    result = (result * 256 + octet) >>> 0;
  }
  return result >>> 0;
}

function inIpv4Range(address: number, network: string, prefix: number): boolean {
  const base = ipv4Number(network);
  if (base === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (base & mask);
}

function isPublicIpv4(address: string): boolean {
  const value = ipv4Number(address);
  if (value === null) return false;
  const blocked: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return !blocked.some(([network, prefix]) => inIpv4Range(value, network, prefix));
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isPublicIpv4(mapped);
    const groups = mapped.split(":");
    if (groups.length === 2 && groups.every((group) => /^[\da-f]{1,4}$/.test(group))) {
      const first = Number.parseInt(groups[0] ?? "0", 16);
      const second = Number.parseInt(groups[1] ?? "0", 16);
      return isPublicIpv4(`${first >>> 8}.${first & 255}.${second >>> 8}.${second & 255}`);
    }
    return false;
  }
  if (normalized === "::" || normalized === "::1" || normalized.includes(".")) return false;
  const firstGroup = Number.parseInt(normalized.split(":")[0] || "0", 16);
  if (firstGroup < 0x2000 || firstGroup > 0x3fff) return false;
  if (/^2001:(?:0{0,3}0|0db8)(?::|$)/i.test(normalized)) return false;
  if (/^2002:/i.test(normalized)) return false;
  return true;
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

export async function validatePublicHttpUrl(input: string | URL): Promise<URL> {
  let url: URL;
  try {
    url = input instanceof URL
      ? new URL(input.href)
      : new URL(normalizeHttpUrlInput(input));
  } catch {
    throw new UnsafeUrlError("Enter a valid website URL using HTTP or HTTPS");
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new UnsafeUrlError("Only public HTTP and HTTPS URLs are allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    !hostname.includes(".") && isIP(hostname) === 0
  ) {
    throw new UnsafeUrlError("Local and internal network addresses cannot be scanned");
  }

  const family = isIP(hostname);
  if (family !== 0) {
    if (!isPublicAddress(hostname)) {
      throw new UnsafeUrlError("Private and reserved network addresses cannot be scanned");
    }
    return url;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("The website hostname could not be resolved");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new UnsafeUrlError("The website resolves to a private or reserved network address");
  }

  return url;
}
