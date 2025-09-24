/**
 * Cron endpoint to refresh Reddit posts cache
 * Called periodically to fetch latest posts from Reddit using OAuth
 */

interface Env {
  KV: KVNamespace;
  REDDIT_CLIENT_ID: string;
  REDDIT_CLIENT_SECRET: string;
}

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface RedditPost {
  data: {
    title: string;
    created_utc: number;
  };
}

interface RedditListingResponse {
  data: {
    children: RedditPost[];
  };
}

// Subreddits to cache
const REDDIT_SOURCES = [
  { id: 'reddit_popular', subreddit: 'popular' },
  { id: 'reddit_news', subreddit: 'news' },
  { id: 'reddit_aitah', subreddit: 'aitah' },
  { id: 'reddit_amateurradio', subreddit: 'amateurradio' }
];

/**
 * Get Reddit OAuth token (not cached - fresh for each cron run)
 */
async function getRedditToken(clientId: string, clientSecret: string): Promise<string> {
  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MorseAcademy/1.0'
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  const data = await response.json() as RedditTokenResponse;
  return data.access_token;
}

/**
 * Fetch posts from a subreddit
 */
async function fetchSubredditPosts(token: string, subreddit: string): Promise<string[]> {
  const response = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/hot?limit=50&raw_json=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'MorseAcademy/1.0'
      },
      signal: AbortSignal.timeout(5000)
    }
  );

  if (!response.ok) {
    throw new Error(`Reddit API failed for r/${subreddit}: ${response.status}`);
  }

  const data = await response.json() as RedditListingResponse;

  // Extract titles and clean them (don't shuffle here - do it on read)
  const titles = data.data.children.map(post =>
    post.data.title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  );

  return titles;
}

export async function onRequestGet(context: { env: Env }) {
  const { env } = context;
  const results: Record<string, unknown> = {};
  let token: string;

  try {
    // Get fresh OAuth token
    console.log('Getting Reddit OAuth token...');
    token = await getRedditToken(env.REDDIT_CLIENT_ID, env.REDDIT_CLIENT_SECRET);
    results.auth = 'success';
  } catch (error) {
    console.error('Auth failed:', error);
    return Response.json({
      error: 'Reddit authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }

  // Fetch and cache each subreddit
  const fetchPromises = REDDIT_SOURCES.map(async (source) => {
    try {
      console.log(`Fetching r/${source.subreddit}...`);
      const posts = await fetchSubredditPosts(token, source.subreddit);

      // Cache indefinitely (no TTL) - we'll always serve data even if stale
      const cacheKey = `reddit:${source.id}`;
      await env.KV.put(cacheKey, JSON.stringify({
        posts,
        fetchedAt: new Date().toISOString(),
        count: posts.length
      }));

      results[source.id] = {
        status: 'success',
        count: posts.length,
        sample: posts[0]?.substring(0, 50) + '...'
      };
    } catch (error) {
      console.error(`Failed to fetch ${source.id}:`, error);
      results[source.id] = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Wait for all fetches to complete
  await Promise.all(fetchPromises);

  // Return summary
  return Response.json({
    message: 'Reddit cache refresh completed',
    timestamp: new Date().toISOString(),
    results
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}