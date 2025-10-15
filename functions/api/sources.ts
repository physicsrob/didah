// Internal RSS URL mapping (not exposed to frontend)
const RSS_URLS: Record<string, string> = {
  'reddit_popular': 'https://www.reddit.com/r/popular.rss',
  'reddit_news': 'https://www.reddit.com/r/news.rss',
  'reddit_amateurradio': 'https://www.reddit.com/r/amateurradio.rss',
  'reddit_aitah': 'https://www.reddit.com/r/AmItheAsshole.rss',
  'hackernews': 'https://news.ycombinator.com/rss',
  'bbc_news': 'http://feeds.bbci.co.uk/news/rss.xml',
};

// Shared source configuration (URL field removed - it's an internal implementation detail)
export const SOURCES = [
  { id: 'random_letters', name: 'Random Letters', type: 'generated', category: 'basic', description: 'Practice with random letters from the alphabet' },
  { id: 'random_characters', name: 'Random Characters', type: 'generated', category: 'basic', description: 'Practice with letters, numbers, and punctuation' },
  { id: 'top-100', name: 'Top-100 Words', type: 'generated', category: 'basic', description: 'Most common English words for vocabulary building' },
  { id: 'top-1000', name: 'Top-1000 Words', type: 'generated', category: 'basic', description: 'Extended vocabulary with 1000 common English words' },
  { id: 'confusing_characters', name: 'Confusing Characters', type: 'generated', category: 'basic', description: 'Focus on characters you find difficult', requiresAuth: true },

  // Reddit sources - explicit headlines/full variants
  { id: 'reddit_popular_headlines', name: 'Popular Post Titles', type: 'rss', category: 'reddit', description: 'Trending post titles from r/popular on Reddit' },
  { id: 'reddit_popular_full', name: 'Popular Posts (Title and Body)', type: 'rss', category: 'reddit', description: 'Complete posts with content from r/popular on Reddit' },
  { id: 'reddit_news_headlines', name: 'News Post Titles', type: 'rss', category: 'reddit', description: 'Breaking news headlines from r/news on Reddit' },
  { id: 'reddit_news_full', name: 'News Posts (Title and Body)', type: 'rss', category: 'reddit', description: 'Full news articles and discussions from r/news on Reddit' },
  { id: 'reddit_amateurradio_headlines', name: 'Amateur Radio Post Titles', type: 'rss', category: 'reddit', description: 'Ham radio discussion topics from r/amateurradio on Reddit' },
  { id: 'reddit_amateurradio_full', name: 'Amateur Radio Posts (Title and Body)', type: 'rss', category: 'reddit', description: 'In-depth ham radio conversations from r/amateurradio on Reddit' },
  { id: 'reddit_aitah_headlines', name: 'AITA Post Titles', type: 'rss', category: 'reddit', description: 'Relationship dilemma titles from r/AmItheAsshole on Reddit' },
  { id: 'reddit_aitah_full', name: 'AITA Posts (Title and Body)', type: 'rss', category: 'reddit', description: 'Complete relationship stories from r/AmItheAsshole on Reddit' },

  // Other RSS sources
  { id: 'hackernews', name: 'Hacker News', type: 'rss', category: 'news', description: 'Tech news and discussions from Hacker News' },
  { id: 'bbc_news', name: 'BBC News', type: 'rss', category: 'news', description: 'World news headlines from BBC' },
];

// Export RSS URLs for use by sources/[id].ts
export { RSS_URLS };

// Cloudflare Pages Function
export async function onRequestGet() {
  // Return list of all available sources
  return Response.json({
    sources: SOURCES,
    total: SOURCES.length
  });
}