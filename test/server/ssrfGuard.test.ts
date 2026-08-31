import { describe, it, expect } from 'vitest'
import {
  isBlockedIpAddress,
  isLocalHostname,
  isHostnameBlocked
} from '../../server/utils/ssrfGuard'

describe('isBlockedIpAddress', () => {
  it('blocks loopback and "this" network', () => {
    expect(isBlockedIpAddress('127.0.0.1')).toBe(true)
    expect(isBlockedIpAddress('127.255.255.255')).toBe(true)
    expect(isBlockedIpAddress('0.0.0.0')).toBe(true)
    expect(isBlockedIpAddress('::1')).toBe(true)
  })

  it('blocks RFC1918 private ranges', () => {
    expect(isBlockedIpAddress('10.0.0.1')).toBe(true)
    expect(isBlockedIpAddress('10.255.255.255')).toBe(true)
    expect(isBlockedIpAddress('172.16.0.1')).toBe(true)
    expect(isBlockedIpAddress('172.31.255.255')).toBe(true)
    expect(isBlockedIpAddress('192.168.1.1')).toBe(true)
    expect(isBlockedIpAddress('192.168.255.255')).toBe(true)
    expect(isBlockedIpAddress('fd12:3456::1')).toBe(true) // ULA
  })

  it('blocks link-local / metadata and CGNAT', () => {
    expect(isBlockedIpAddress('169.254.169.254')).toBe(true) // cloud metadata
    expect(isBlockedIpAddress('169.254.10.10')).toBe(true)
    expect(isBlockedIpAddress('100.64.0.1')).toBe(true)
    expect(isBlockedIpAddress('fe80::1')).toBe(true)
  })

  it('blocks multicast, documentation and benchmarking ranges', () => {
    expect(isBlockedIpAddress('224.0.0.1')).toBe(true)
    expect(isBlockedIpAddress('192.0.2.1')).toBe(true)
    expect(isBlockedIpAddress('198.51.100.1')).toBe(true)
    expect(isBlockedIpAddress('203.0.113.1')).toBe(true)
    expect(isBlockedIpAddress('198.18.0.1')).toBe(true)
    expect(isBlockedIpAddress('2001:db8::1')).toBe(true)
    expect(isBlockedIpAddress('ff02::1')).toBe(true)
  })

  it('allows public addresses and non-IP input', () => {
    expect(isBlockedIpAddress('8.8.8.8')).toBe(false)
    expect(isBlockedIpAddress('93.184.216.34')).toBe(false)
    expect(isBlockedIpAddress('2606:4700:4700::1111')).toBe(false)
    expect(isBlockedIpAddress('not-an-ip')).toBe(false)
  })
})

describe('isLocalHostname', () => {
  it('detects localhost variants and mDNS .local', () => {
    expect(isLocalHostname('localhost')).toBe(true)
    expect(isLocalHostname('LOCALHOST')).toBe(true)
    expect(isLocalHostname('db.localhost')).toBe(true)
    expect(isLocalHostname('my.local')).toBe(true)
    expect(isLocalHostname('local')).toBe(true)
    expect(isLocalHostname('')).toBe(true)
  })

  it('does not treat normal hostnames or IP literals as local', () => {
    expect(isLocalHostname('example.com')).toBe(false)
    expect(isLocalHostname('github.com')).toBe(false)
    expect(isLocalHostname('127.0.0.1')).toBe(false) // IPs handled separately
    expect(isLocalHostname('[::1]')).toBe(false)      // IPs handled separately
  })
})

describe('isHostnameBlocked', () => {
  it('blocks local hostnames without contacting DNS', async () => {
    expect(await isHostnameBlocked('localhost')).toBe(true)
    expect(await isHostnameBlocked('printer.local')).toBe(true)
  })

  it('blocks private / loopback IP literals', async () => {
    expect(await isHostnameBlocked('127.0.0.1')).toBe(true)
    expect(await isHostnameBlocked('10.1.2.3')).toBe(true)
    expect(await isHostnameBlocked('192.168.0.10')).toBe(true)
    expect(await isHostnameBlocked('169.254.169.254')).toBe(true)
    expect(await isHostnameBlocked('[::1]')).toBe(true)
    expect(await isHostnameBlocked('::ffff:127.0.0.1')).toBe(true)
  })

  it('allows public IP literals', async () => {
    expect(await isHostnameBlocked('8.8.8.8')).toBe(false)
    expect(await isHostnameBlocked('1.1.1.1')).toBe(false)
  })
})