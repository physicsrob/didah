# API Documentation

didah provides several API endpoints for retrieving text sources and utilities. All API endpoints are implemented as Cloudflare Pages Functions.

**Base URL**: https://didah.app/api
**Local Development**: http://localhost:3000/api (when running `npm run dev`)

## Endpoints

### GET `/api/sources`

Returns list of all available text sources.

**Response:**
```json
{
  "sources": [
    {"id": "random_letters", "name": "Random Letters", "type": "generated"},
    {"id": "common_words", "name": "Common Words", "type": "generated"},
    {"id": "reddit_popular", "name": "Reddit Popular", "type": "rss"},
    ...
  ],
  "total": 9
}
```

### GET `/api/sources/[id]`

Returns text content from a specific source.

**Parameters:**
- `id` (path parameter) - Source identifier

**Response Examples:**

Generated source (words):
```json
{
  "id": "common_words",
  "items": ["the be to of and a in that have i ..."]
}
```

RSS feed source (headlines):
```json
{
  "id": "reddit_popular",
  "items": [
    "First headline from Reddit",
    "Second headline from Reddit",
    ...
  ]
}
```

**Available Sources:**
- `random_letters` - Random A-Z characters
- `common_words` - Frequency-weighted English words
- `common_words_easy` - Short common words only
- `reddit_popular` - Headlines from r/popular
- `reddit_news` - Headlines from r/news
- `reddit_amateurradio` - Amateur radio discussions
- `reddit_aitah` - AITA story titles
- `hackernews` - Hacker News headlines
- `bbc_news` - BBC News headlines

### GET `/api/distractors?word={word}`

Generates confusable distractor words for a given word based on Morse code similarity patterns. Used for multiple-choice word practice.

**Query Parameters:**
- `word` (required) - Word to generate distractors for (letters only)

**Success Response:**
```json
{
  "word": "the",
  "distractors": ["tie", "top"]
}
```

**Error Response (404):**
```json
{
  "error": "Unable to generate distractors for this word",
  "details": "Not enough similar words found in word list"
}
```

**Algorithm:**
- Uses TOP_1000_WORDS as distractor pool
- Groups words by Morse similarity patterns
- Returns 2 confusable words or 404 if unable to find suitable matches

## Implementation

API endpoints are located in `/functions/api/` and deployed as Cloudflare Pages Functions.

See [DEPLOYMENT.md](DEPLOYMENT.md) for information about deploying API changes.
