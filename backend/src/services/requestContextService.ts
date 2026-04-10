import { Request } from 'express';

type LocationInfo = {
  ip: string;
  city: string;
  region: string;
};

const LOOKUP_TIMEOUT_MS = Number(process.env.NOIF_IP_LOOKUP_TIMEOUT_MS || 2500);

function pickHeader(req: Request, headerNames: string[]) {
  for (const name of headerNames) {
    const value = req.header(name);
    if (value) {
      return value.trim();
    }
  }

  return '';
}

function normalizeIp(ip: string) {
  const trimmed = String(ip || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
  if (trimmed === '::1') return '127.0.0.1';
  return trimmed;
}

function isPrivateIp(ip: string) {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '0.0.0.0' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip.includes(':')
  );
}

export function getClientIp(req: Request) {
  const forwarded = pickHeader(req, ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for', 'true-client-ip']);
  const firstForwarded = forwarded.split(',')[0] || '';
  return normalizeIp(firstForwarded || req.ip || '');
}

function getLocationFromHeaders(req: Request) {
  const city = pickHeader(req, ['cf-ipcity', 'x-vercel-ip-city', 'x-geo-city', 'x-appengine-city', 'x-ip-city']);
  const region = pickHeader(req, ['cf-region', 'x-vercel-ip-country-region', 'x-geo-region', 'x-appengine-region', 'x-ip-region']);

  return {
    city,
    region,
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupLocationByIp(ip: string) {
  const enabled = String(process.env.NOIF_IP_GEOLOOKUP_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled || isPrivateIp(ip)) {
    return { city: '', region: '' };
  }

  const baseUrl = process.env.NOIF_IP_GEOLOOKUP_URL || 'https://ipwho.is';

  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(ip)}`, LOOKUP_TIMEOUT_MS);
    if (!response.ok) {
      return { city: '', region: '' };
    }

    const payload = await response.json() as {
      success?: boolean;
      city?: string;
      region?: string;
      region_name?: string;
    };

    if (payload.success === false) {
      return { city: '', region: '' };
    }

    return {
      city: String(payload.city || '').trim(),
      region: String(payload.region || payload.region_name || '').trim(),
    };
  } catch {
    return { city: '', region: '' };
  }
}

export async function resolveRequestLocation(req: Request): Promise<LocationInfo> {
  const ip = getClientIp(req);
  const fromHeaders = getLocationFromHeaders(req);

  if (fromHeaders.city || fromHeaders.region) {
    return {
      ip,
      city: fromHeaders.city,
      region: fromHeaders.region,
    };
  }

  const fromLookup = await lookupLocationByIp(ip);
  return {
    ip,
    city: fromLookup.city,
    region: fromLookup.region,
  };
}
