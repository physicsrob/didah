/**
 * Cron endpoint to refresh Reddit posts cache
 * Called periodically to fetch latest posts from Reddit using OAuth
 */

interface Env {
  KV: KVNamespace;
  REDDIT_CLIENT_ID: string;
  REDDIT_CLIENT_SECRET: string;
  OPENROUTER_KEY: string;
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
    selftext?: string;
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
  { id: 'reddit_amateurradio', subreddit: 'amateurradio' },
  { id: 'reddit_todayilearned', subreddit: 'todayilearned' },
  { id: 'reddit_showerthoughts', subreddit: 'showerthoughts' }
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
async function fetchSubredditPosts(token: string, subreddit: string): Promise<Array<{title: string, body: string}>> {
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

  // Extract titles and full content (don't shuffle here - do it on read)
  const posts = data.data.children.map(post => {
    const cleanText = (text: string) => text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n+/g, ' ') // Replace newlines with spaces for Morse
      .trim();

    return {
      title: cleanText(post.data.title),
      body: post.data.selftext ? cleanText(post.data.selftext) : ''
    };
  });

  return posts;
}

const REWRITE_PROMPT = `You are rewriting Reddit titles for Morse code practice. Students will hear these titles in Morse code and copy them. Your goal is to make titles easy to follow in Morse while keeping them engaging.

REWRITING RULES:
1. Remove emojis and convert to words if needed (😭 → !)
2. Remove metadata tags: (OC), (Follow Up), source suffixes like "| CNN Politics" or "– report"
3. Remove quotes around titles/proper nouns unless critical to meaning
4. Replace # with "number" or context word (e.g., "#1" → "top" or "number 1")
5. Replace $ with "dollar" or "dollars"
6. Expand date formats: 10/24/2025 → October 24 2025
7. Simplify complex sentence structures that would be hard to follow aurally
8. KEEP slashes (/) - they're common in Morse code
9. KEEP demographic tags (21M), (19F) - useful for number practice
10. Preserve common abbreviations (AITA, TIL, MIL, JOTA, etc.)
11. Non-English content: translate if possible, but score low
12. Thread announcements/vague titles: keep as-is but score low

SCORING (1-5):
Rate the FINAL rewritten title on engagement and Morse-code suitability:
5 = Highly engaging and easy to follow in Morse
4 = Good engagement and Morse-friendly
3 = Moderately engaging, acceptable for Morse
2 = Low engagement or niche interest
1 = Poor engagement, unclear, or unsuitable

EXAMPLES:

Input: {"title": "My kitten got into a loaf of bread and probably ate at least half or more of her weight in it"}
Output: {"title": "My kitten got into a loaf of bread and probably ate at least half or more of her weight in it", "score": 5}

Input: {"title": "AITAH for not cutting off my best friend after a freak accident happened while he was babysitting my daughter?"}
Output: {"title": "AITAH for not cutting off my best friend after a freak accident happened while he was babysitting my daughter?", "score": 5}

Input: {"title": "(OC) I did it 😭 I cleaned my depression room"}
Output: {"title": "I did it! I cleaned my depression room", "score": 4}

Input: {"title": "TIL that the Dalai Lama has released an album titled \\"Inner World,\\" a collection of meditations set to easy-listening music. It debuted at #1 on the Billboard New Age chart upon its release in July 2020."}
Output: {"title": "TIL that the Dalai Lama has released an album which was a collection of meditations set to easy-listening music. It debuted top of the Billboard New Age chart upon its release in July 2020.", "score": 4}

Input: {"title": "ICE arrests police officer in Chicago suburb and accuses him of being in US illegally | CNN Politics"}
Output: {"title": "ICE arrests police officer in Chicago suburb and accuses him of being in US illegally", "score": 4}

Input: {"title": "TIL that the Library of Congress, the library and research service for the United States Congress and the de facto national library of the United States, contains \\"Fallout Equestria\\", a crossover fanfiction between the \\"Fallout\\" video game and \\"My Little Pony\\" TV show"}
Output: {"title": "TIL that the Library of Congress contains Fallout Equestria, a crossover fanfiction between the Fallout video game and My Little Pony TV show", "score": 3}

Input: {"title": "GM to take a $1.6 billion hit as tax incentives for EVs are slashed and emission rules ease"}
Output: {"title": "GM to take a 1.6 billion dollar hit as tax incentives for EVs are slashed and emission rules ease", "score": 3}

Input: {"title": "VLF Station \\"SAQ\\" to broadcast on UN Day 10/24/2025"}
Output: {"title": "VLF Station SAQ to broadcast on UN Day October 24 2025", "score": 2}

Input: {"title": "Alguém que queria falar sobre rádios frequências , como ouvir as autoridades me mande msg Porfavor"}
Output: {"title": "Someone who wanted to talk about radio frequencies, how to listen to authorities send me a message please", "score": 2}

Input: {"title": "Sleeping-in in the middle of the house"}
Output: {"title": "Sleeping-in in the middle of the house", "score": 1}

IMPORTANT: Preserve the exact order of posts in your output array.

Now process the following titles. Return ONLY valid JSON in this format:
{"posts": [{"title": "...", "score": 1-5}, ...]}

INPUT:
`;

interface PostWithScore {
  title: string;
  body: string;
  score: number;
}

/**
 * Process a single batch of posts through LLM
 */
async function processBatch(
  posts: Array<{title: string, body: string}>,
  apiKey: string
): Promise<Array<{title: string, score: number}>> {
  // Prepare input for LLM
  const inputJson = JSON.stringify({
    posts: posts.map(p => ({ title: p.title }))
  }, null, 2);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://didah.app',
      'X-Title': 'didah - Morse Code Trainer',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku',
      messages: [
        {
          role: 'user',
          content: REWRITE_PROMPT + inputJson,
        },
      ],
    }),
    signal: AbortSignal.timeout(30000) // 30s timeout per batch
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API failed: ${response.status}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in LLM response');
  }

  // Extract JSON from response (LLM sometimes adds text before/after)
  // Look for the JSON object starting with { and ending with }
  let jsonContent = content.trim();

  // Remove markdown code fences if present
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
  }

  // Find first { and last } to extract just the JSON
  const firstBrace = jsonContent.indexOf('{');
  const lastBrace = jsonContent.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in LLM response');
  }

  jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);

  // Parse JSON response
  const parsed = JSON.parse(jsonContent) as { posts: Array<{ title: string, score: number }> };

  if (!parsed.posts || parsed.posts.length !== posts.length) {
    throw new Error(`LLM returned ${parsed.posts?.length ?? 0} posts, expected ${posts.length}`);
  }

  return parsed.posts;
}

/**
 * Filter and rewrite Reddit titles using LLM (in batches of 10)
 */
async function filterAndRewriteTitles(
  posts: Array<{title: string, body: string}>,
  subreddit: string,
  apiKey: string
): Promise<PostWithScore[]> {
  try {
    console.log(`Fetched ${posts.length} titles from r/${subreddit}`);

    const BATCH_SIZE = 10;
    const allResults: Array<{title: string, score: number}> = [];

    // Process in batches of 10
    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(posts.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNum}/${totalBatches} for r/${subreddit}`);

      const batchResults = await processBatch(batch, apiKey);
      allResults.push(...batchResults);
    }

    console.log(`LLM processing complete for r/${subreddit}`);

    // Match by array order and combine with original body
    return posts.map((originalPost, i) => ({
      title: allResults[i].title,
      body: originalPost.body,
      score: allResults[i].score
    }));

  } catch (error) {
    console.error(`LLM filtering failed for r/${subreddit}, using original posts:`, error);
    // Fallback: return original posts with neutral score
    return posts.map(p => ({ ...p, score: 3 }));
  }
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

      // Filter and rewrite titles with LLM
      const postsWithScores = await filterAndRewriteTitles(posts, source.subreddit, env.OPENROUTER_KEY);

      // Calculate average score before filtering
      const avgScore = postsWithScores.reduce((sum, p) => sum + p.score, 0) / postsWithScores.length;
      console.log(`Average score: ${avgScore.toFixed(2)}`);

      // Sort by score descending
      postsWithScores.sort((a, b) => b.score - a.score);

      // Keep top 50% by count
      const keepCount = Math.ceil(postsWithScores.length / 2);
      const keptPosts = postsWithScores.slice(0, keepCount);
      const rejectedPosts = postsWithScores.slice(keepCount);

      // Calculate average scores for kept vs rejected
      const keptAvg = keptPosts.reduce((sum, p) => sum + p.score, 0) / keptPosts.length;
      const rejectedAvg = rejectedPosts.length > 0
        ? rejectedPosts.reduce((sum, p) => sum + p.score, 0) / rejectedPosts.length
        : 0;

      console.log(`Keeping top 50% (${keepCount} posts)`);
      console.log(`Kept posts average score: ${keptAvg.toFixed(2)}`);
      console.log(`Rejected posts average score: ${rejectedAvg.toFixed(2)}`);

      // Strip score field for caching
      const postsToCache = keptPosts.map(({ title, body }) => ({ title, body }));

      // Cache indefinitely (no TTL) - we'll always serve data even if stale
      const cacheKey = `reddit:${source.id}`;
      await env.KV.put(cacheKey, JSON.stringify({
        posts: postsToCache,
        fetchedAt: new Date().toISOString(),
        count: postsToCache.length
      }));

      console.log(`Cached ${postsToCache.length} posts for ${source.id}`);

      results[source.id] = {
        status: 'success',
        count: postsToCache.length,
        withContent: postsToCache.filter(p => p.body.length > 0).length,
        avgScore: avgScore.toFixed(2),
        keptAvgScore: keptAvg.toFixed(2),
        rejectedAvgScore: rejectedAvg.toFixed(2)
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