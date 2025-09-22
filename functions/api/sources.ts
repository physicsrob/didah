// Shared source configuration
export const SOURCES = [
  { id: 'random_letters', name: 'Random Letters', type: 'generated' },
  { id: 'common_words', name: 'Common Words', type: 'generated' },
  { id: 'common_words_easy', name: 'Easy Words', type: 'generated' },
  { id: 'reddit_popular', name: 'Reddit Popular', type: 'rss', url: 'https://www.reddit.com/r/popular.rss' },
  { id: 'reddit_news', name: 'Reddit News', type: 'rss', url: 'https://www.reddit.com/r/news.rss' },
  { id: 'reddit_amateurradio', name: 'Amateur Radio', type: 'rss', url: 'https://www.reddit.com/r/amateurradio.rss' },
  { id: 'reddit_aitah', name: 'AITA Stories', type: 'rss', url: 'https://www.reddit.com/r/AmItheAsshole.rss' },
  { id: 'hackernews', name: 'Hacker News', type: 'rss', url: 'https://news.ycombinator.com/rss' },
  { id: 'bbc_news', name: 'BBC News', type: 'rss', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
];

// Cloudflare Pages Function
export async function onRequestGet(context: any) {
  // Return list of all available sources
  return Response.json({
    sources: SOURCES,
    total: SOURCES.length
  });
}