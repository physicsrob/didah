/**
 * API endpoint to list available word sources
 * GET /api/word-sources
 */

export const WORD_SOURCES = [
  { id: 'top-100', name: 'Top-100 Words', wordCount: 100 },
  { id: 'top-1000', name: 'Top-1000 Words', wordCount: 1000 },
];

export async function onRequestGet() {
  return Response.json({
    sources: WORD_SOURCES
  });
}
