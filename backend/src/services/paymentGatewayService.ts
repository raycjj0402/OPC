import { createHash } from 'crypto';

export type GatewayPayload = Record<string, string | undefined | null>;

function isEmptyValue(value: string | undefined | null) {
  return value === undefined || value === null || value === '';
}

export function buildGatewaySignBase(payload: GatewayPayload) {
  return Object.entries(payload)
    .filter(([key, value]) => key !== 'sign' && key !== 'sign_type' && !isEmptyValue(value))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

export function signGatewayPayload(payload: GatewayPayload, merchantKey: string) {
  return createHash('md5')
    .update(`${buildGatewaySignBase(payload)}${merchantKey}`, 'utf8')
    .digest('hex');
}

export function verifyGatewayPayload(payload: GatewayPayload, merchantKey: string) {
  const currentSign = String(payload.sign || '').trim().toLowerCase();
  if (!currentSign) {
    return false;
  }

  return signGatewayPayload(payload, merchantKey).toLowerCase() === currentSign;
}

export function buildGatewayUrl(action: string, payload: GatewayPayload) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (!isEmptyValue(value)) {
      params.set(key, String(value));
    }
  });

  return `${action}?${params.toString()}`;
}

export async function requestGatewayApiPayment(action: string, payload: GatewayPayload) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (!isEmptyValue(value)) {
      params.set(key, String(value));
    }
  });

  const response = await fetch(action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json, text/plain, */*',
    },
    body: params.toString(),
  });

  const rawText = await response.text();

  let parsed: Record<string, any> | null = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(parsed?.msg || `支付网关请求失败，HTTP ${response.status}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('支付网关返回了无法解析的数据');
  }

  return parsed;
}
