import { ChatSearchCitation } from '../types/chat';

const DEFAULT_SEARCH_TIMEOUT_MS = Number(process.env.NOIF_WEB_SEARCH_TIMEOUT_MS || 5000);

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractRealUrl(url: string) {
  try {
    const parsed = new URL(url, 'https://duckduckgo.com');
    const redirected = parsed.searchParams.get('uddg');
    return redirected ? decodeURIComponent(redirected) : parsed.toString();
  } catch {
    return url;
  }
}

function parseDuckDuckGoHtml(html: string, limit: number) {
  const results: ChatSearchCitation[] = [];
  const resultRegex =
    /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;

  let match: RegExpExecArray | null = null;
  while ((match = resultRegex.exec(html)) && results.length < limit) {
    const url = extractRealUrl(match[1]);
    const title = stripHtml(match[2]);
    const snippet = stripHtml(match[3]);

    if (!url || !title) {
      continue;
    }

    results.push({
      title,
      url,
      snippet,
      source: 'duckduckgo',
    });
  }

  return results;
}

export function webSearchEnabled() {
  return String(process.env.NOIF_WEB_SEARCH_ENABLED || 'true').toLowerCase() === 'true';
}

export async function searchWeb(query: string, limit = 5) {
  if (!webSearchEnabled() || !query.trim()) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_SEARCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'User-Agent':
          process.env.NOIF_WEB_SEARCH_USER_AGENT ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`web search timed out after ${DEFAULT_SEARCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`web search failed: ${response.status}`);
  }

  const html = await response.text();
  return parseDuckDuckGoHtml(html, limit);
}
