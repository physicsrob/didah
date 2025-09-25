import { SOURCES } from '../sources';

// Build RSS feed map from sources
const RSS_FEEDS: Record<string, string> = {};
for (const source of SOURCES) {
  if (source.type === 'rss' && source.url) {
    RSS_FEEDS[source.id] = source.url;
  }
}

// Word frequency data for common words generation
const COMMON_WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "work", "first", "well", "way", "even",
  "new", "want", "because", "any", "these", "give", "day", "most", "us", "find"
];

const EASY_WORDS = COMMON_WORDS.filter(w => w.length <= 4);

/**
 * Generate random letters
 */
function generateRandomLetters(count: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % 5 === 0) result += ' '; // Group by 5
    result += letters[Math.floor(Math.random() * letters.length)];
  }
  return result;
}

/**
 * Generate common words with frequency weighting
 */
function generateCommonWords(count: number, easyOnly: boolean = false): string {
  const wordList = easyOnly ? EASY_WORDS : COMMON_WORDS;
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    // Weight earlier words more heavily (they're more common)
    const maxIndex = Math.min(wordList.length, 30); // Focus on top 30
    const index = Math.floor(Math.random() * Math.random() * maxIndex);
    words.push(wordList[index]);
  }

  return words.join(' ');
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
 * Shuffle an array in place
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // Create a copy
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

  try {
    let items: string[] | Array<{title: string, body: string}> = [];

    switch (id) {
      case 'random_letters':
        items = [generateRandomLetters(100)];
        break;

      case 'common_words':
        items = [generateCommonWords(100)];
        break;

      case 'common_words_easy':
        items = [generateCommonWords(100, true)];
        break;

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