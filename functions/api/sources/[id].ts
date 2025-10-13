import { SOURCES } from '../sources';
import { shuffleArray } from '../../shared/utils';
import { TOP_100_WORDS, TOP_1000_WORDS } from '../../shared/wordData';

// Build RSS feed map from sources
const RSS_FEEDS: Record<string, string> = {};
for (const source of SOURCES) {
  if (source.type === 'rss' && source.url) {
    RSS_FEEDS[source.id] = source.url;
  }
}

/**
 * Generate random characters from given alphabet
 */
function generateRandomCharacters(alphabet: string, count: number): string {
  if (!alphabet || alphabet.length === 0) {
    throw new Error('Alphabet cannot be empty');
  }
  let result = '';
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % 5 === 0) result += ' '; // Group by 5
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

/**
 * Extract titles from RSS feed
 */
function extractTitles(rssText: string, limit: number = 50): string[] {
  const titles: string[] = [];
  const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gs;
  let match;

  while ((match = titleRegex.exec(rssText)) !== null && titles.length < limit + 1) {
    const title = match[1]
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (title) {
      titles.push(title);
    }
  }

  // Skip first title (usually feed name) but don't shuffle here
  const items = titles.slice(1, limit + 1);
  return items;
}

/**
 * Fetch RSS feed and extract titles
 */
async function fetchRSS(feedUrl: string): Promise<string[]> {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MorseApp/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml'
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`RSS feed returned ${response.status}`);
  }

  const text = await response.text();
  return extractTitles(text);
}

// Cloudflare Pages Function
interface CloudflareContext {
  params: {
    id: string;
  };
  request: Request;
  env?: {
    KV?: KVNamespace;
  };
}

export async function onRequestGet(context: CloudflareContext) {
  const { id } = context.params;
  const kv = context.env?.KV;

  if (!id) {
    return Response.json({ error: 'Source ID required' }, { status: 400 });
  }

  // Extract query parameters
  const url = new URL(context.request.url);
  const alphabet = url.searchParams.get('alphabet');

  try {
    let items: string[] | Array<{title: string, body: string}> = [];

    switch (id) {
      case 'random_letters':
      case 'random_characters': {
        // Use provided alphabet or default to A-Z for random_letters
        const defaultAlphabet = id === 'random_letters' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '';
        const sourceAlphabet = alphabet || defaultAlphabet;

        if (!sourceAlphabet) {
          return Response.json({
            error: 'Alphabet parameter required for random_characters'
          }, { status: 400 });
        }

        items = [generateRandomCharacters(sourceAlphabet, 100)];
        break;
      }

      case 'top-100':
        items = [TOP_100_WORDS.join(' ')];
        break;

      case 'top-1000':
        items = [TOP_1000_WORDS.join(' ')];
        break;

      case 'confusing_characters': {
        const confusingModule = await import('./confusing_characters');
        return confusingModule.onRequestGet(context);
      }

      default:
        // Check if it's a Reddit source first (read from KV cache)
        if (id.startsWith('reddit_') && kv) {
          try {
            const cacheKey = `reddit:${id}`;
            const cached = await kv.get(cacheKey, 'json') as { posts: Array<{title: string, body: string}>, fetchedAt: string } | null;

            if (cached && cached.posts) {
              // Always serve cached data, even if stale
              // Shuffle on every request for variety
              const shuffledPosts = shuffleArray(cached.posts);

              // Return structured data for Reddit sources
              // Frontend will handle formatting based on user preference
              items = shuffledPosts;

              // Add staleness warning in response headers if data is old
              const fetchedAt = new Date(cached.fetchedAt);
              const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

              const response = Response.json({
                id,
                items,
                cached: true,
                fetchedAt: cached.fetchedAt,
                ageHours: Math.round(ageHours * 10) / 10
              }, {
                headers: {
                  'Cache-Control': 'no-store, no-cache, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              });

              // Add cache headers to indicate staleness
              if (ageHours > 2) {
                response.headers.set('X-Cache-Status', 'stale');
                response.headers.set('X-Cache-Age-Hours', ageHours.toString());
              }

              return response;
            } else {
              // No cache found at all - this should be rare
              return Response.json({
                error: 'Reddit data not yet available. Please try again in a few minutes.',
                details: 'This source has not been initialized yet. The cron job will populate it shortly.'
              }, { status: 503 });
            }
          } catch (error) {
            console.error(`Error reading KV cache for ${id}:`, error);
            return Response.json({
              error: 'Failed to fetch Reddit data from cache',
              details: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 500 });
          }
        }
        // Otherwise check if it's an RSS source
        else if (id in RSS_FEEDS) {
          const titles = await fetchRSS(RSS_FEEDS[id]);
          // Shuffle RSS feed items on every request too
          items = titles.length > 0 ? shuffleArray(titles) : ['No items found in feed'];
        } else {
          return Response.json({ error: 'Source not found' }, { status: 404 });
        }
    }

    return Response.json({
      id,
      items
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error(`Error fetching source ${id}:`, error);
    return Response.json({
      error: 'Failed to fetch source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}