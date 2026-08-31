/**
 * Navigation module — SSRF guard for server-side URL fetching (used by the
 * favicon proxy as `/api/nav/links/favicon`).
 *
 * Blocks targets that resolve to loopback / link-local / private / reserved
 * address ranges so the server is never tricked into reaching internal hosts
 * (e.g. `127.0.0.1`, AWS metadata `169.254.169.254`, RFC1918 subnets).
 *
 * Pure module: only depends on `node:net` semantics (IP parsing) and
 * `node:dns/promises`, so it can be unit-tested in isolation without a
 * database or Nitro context. CIDR matching is hand-rolled on numbers / BigInt
 * (Node's `net.BlockList` is unreliable for IPv6 in some runtimes).
 */
import { lookup } from 'node:dns/promises'

// IPv4 (as 32-bit numbers) ranges a public proxy must never fetch.
const V4_BLOCKS: Array<[string, number]> = [
  ['0.0.0.0', 8],          // "this" network
  ['10.0.0.0', 8],         // RFC1918 private
  ['100.64.0.0', 10],      // CGNAT
  ['127.0.0.0', 8],        // loopback
  ['169.254.0.0', 16],     // link-local (incl. cloud metadata)
  ['172.16.0.0', 12],      // RFC1918 private
  ['192.0.0.0', 24],       // IETF protocol assignments
  ['192.0.2.0', 24],       // documentation
  ['192.168.0.0', 16],     // RFC1918 private
  ['198.18.0.0', 15],      // benchmarking
  ['198.51.100.0', 24],    // documentation
  ['203.0.113.0', 24],     // documentation
  ['224.0.0.0', 4]         // multicast
]

// IPv6 (as 128-bit BigInt) ranges a public proxy must never fetch.
const V6_BLOCKS: Array<[string, number]> = [
  ['::', 128],             // unspecified
  ['::1', 128],            // loopback
  ['::ffff:0:0', 96],      // IPv4-mapped (covers ::ffff:127.0.0.1 etc.)
  ['fc00::', 7],           // unique local (ULA)
  ['fe80::', 10],          // link-local
  ['ff00::', 8],           // multicast
  ['2001:db8::', 32]       // documentation
]

/** Strip IPv6 brackets from a hostname string (`[::1]` → `::1`). */
function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

/** Parse a dotted-quad IPv4 into an unsigned 32-bit number, or null. */
export function parseIpv4(s: string): number | null {
  const p = s.split('.')
  if (p.length !== 4) return null
  let acc = 0
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    acc = (acc << 8) | n
  }
  return acc >>> 0
}

interface ParsedIpv6 {
  addr: bigint
  /** When the address is an IPv4-mapped `::ffff:a.b.c.d`, the embedded IPv4. */
  mappedV4?: number
}

/** Parse an IPv6 literal (supports `::` compression and a dotted-quad tail)
 *  into a 128-bit BigInt, or null when it is not an IPv6 address. */
export function parseIpv6(s: string): ParsedIpv6 | null {
  let str = s.trim().toLowerCase()
  // Dotted-quad tail (IPv4-mapped / IPv4-compatible): ::ffff:192.168.1.1
  const dot = str.match(/^(.*):((?:\d{1,3}\.){3}\d{1,3})$/)
  if (dot) {
    const v4 = parseIpv4(dot[2])
    if (v4 == null) return null
    str = `${dot[1]}:${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`
  }

  if (str === '') return null
  let head: string[]
  let tail: string[] = []
  if (str.includes('::')) {
    const idx = str.indexOf('::')
    head = str.slice(0, idx).split(':').filter(Boolean)
    tail = str.slice(idx + 2).split(':').filter(Boolean)
  } else {
    head = str.split(':')
  }
  if (head.length + tail.length > 8) return null

  const parts: number[] = new Array(8).fill(0)
  for (let i = 0; i < head.length; i++) {
    const v = parseInt(head[i], 16)
    if (Number.isNaN(v)) return null
    parts[i] = v
  }
  const tailOffset = 8 - tail.length
  for (let i = 0; i < tail.length; i++) {
    const v = parseInt(tail[i], 16)
    if (Number.isNaN(v)) return null
    parts[tailOffset + i] = v
  }

  let addr = 0n
  for (const part of parts) addr = (addr << 16n) | BigInt(part)
  const parsed: ParsedIpv6 = { addr }
  // ::ffff:a.b.c.d → extract the embedded IPv4 (bits 0..31).
  if ((addr >> 32n) === 0xffffn) parsed.mappedV4 = Number(addr & 0xffffffffn)
  return parsed
}

/** True when `s` is an IPv4 or IPv6 literal (as opposed to a hostname). */
function isIpLiteral(s: string): boolean {
  return parseIpv4(s) != null || parseIpv6(s) != null
}

function inCidrV4(net4: number, ip4: number, prefix: number): boolean {
  if (prefix <= 0) return true
  if (prefix >= 32) return net4 === ip4
  const mask = (~0 << (32 - prefix)) >>> 0
  return (ip4 & mask) === (net4 & mask)
}

function inCidrV6(net6: bigint, ip6: bigint, prefix: number): boolean {
  if (prefix <= 0) return true
  if (prefix >= 128) return net6 === ip6
  const mask = ~((BigInt(1) << BigInt(128 - prefix)) - 1n)
  return (ip6 & mask) === (net6 & mask)
}

/** True when the given literal IP falls inside a blocked range. Accepts both
 *  dotted-quad and IPv6 forms. Non-IP input returns false. */
export function isBlockedIpAddress(address: string): boolean {
  const v4 = parseIpv4(address)
  if (v4 != null) return V4_BLOCKS.some(([net, p]) => inCidrV4(parseIpv4(net)!, v4, p))

  const v6 = parseIpv6(address)
  if (v6 == null) return false
  if (v6.mappedV4 != null && V4_BLOCKS.some(([net, p]) => inCidrV4(parseIpv4(net)!, v6.mappedV4!, p))) {
    return true
  }
  return V6_BLOCKS.some(([net, p]) => inCidrV6(parseIpv6(net)!.addr, v6.addr, p))
}

/** True for obvious local/reserved hostnames (bypasses DNS resolution). */
export function isLocalHostname(hostname: string): boolean {
  const h = normalizeHost(hostname)
  return h === '' || h === 'localhost' || h.endsWith('.localhost') || h === 'local' || h.endsWith('.local')
}

/**
 * Decide whether a hostname (IP or name) is safe to fetch from the server.
 * Resolves names via DNS and blocks if ANY resolved address is private.
 * Unresolvable / reservation-only hostnames are treated as blocked.
 */
export async function isHostnameBlocked(hostname: string): Promise<boolean> {
  const h = normalizeHost(hostname)
  if (isLocalHostname(h)) return true
  if (isIpLiteral(h)) return isBlockedIpAddress(h)

  let addresses: string[]
  try {
    addresses = (await lookup(h, { all: true })).map(r => r.address)
  } catch {
    // DNS failure / unresolvable name — refuse rather than guess internal hosts.
    return true
  }
  if (addresses.length === 0) return true
  // Block if any resolved address falls inside a private/reserved range.
  return addresses.some(a => isBlockedIpAddress(a))
}