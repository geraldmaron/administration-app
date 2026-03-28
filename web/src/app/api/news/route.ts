import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const FEED_SOURCES = [
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.npr.org/1004/rss.xml', source: 'NPR World' },
  { url: 'https://rss.dw.com/rdf/rss-en-world', source: 'Deutsche Welle' },
  { url: 'https://feeds.feedburner.com/reuters/worldNews', source: 'Reuters World' },
];

interface FeedItem {
  title: string;
  link: string;
  snippet?: string;
  source: string;
  pubDate: string;
  pubDateMs: number;
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractText(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let val = m[1];
  const cdata = val.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) val = cdata[1];
  return unescapeHtml(val.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseRss(xml: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractText(block, 'title');
    const link = extractText(block, 'link') || extractText(block, 'guid');
    const snippet = extractText(block, 'description') || extractText(block, 'summary');
    const pubDate = extractText(block, 'pubDate') || extractText(block, 'published') || '';
    if (!title) continue;
    const pubDateMs = pubDate ? (new Date(pubDate).getTime() || 0) : 0;
    items.push({
      title,
      link,
      snippet: snippet.slice(0, 400) || undefined,
      source: sourceName,
      pubDate,
      pubDateMs,
    });
  }
  return items;
}

async function fetchFeed(url: string, source: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdminPortal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, source);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  const results = await Promise.allSettled(
    FEED_SOURCES.map((f) => fetchFeed(f.url, f.source))
  );

  const seen = new Set<string>();
  const all: FeedItem[] = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      const key = item.title.toLowerCase().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }
  }

  all.sort((a, b) => b.pubDateMs - a.pubDateMs);

  const articles = all.slice(0, limit).map(({ pubDateMs: _, ...rest }) => rest);

  return NextResponse.json({ articles, count: articles.length });
}
