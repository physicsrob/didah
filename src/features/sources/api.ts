/**
 * API client for text sources
 */

import type { TextSource, SourceContent, SourcesResponse } from './types';

/**
 * Fetch list of available text sources and enrich with variants
 */
export async function fetchSources(): Promise<TextSource[]> {
  const response = await fetch('/api/sources');
  if (!response.ok) {
    throw new Error(`Failed to fetch sources: ${response.status}`);
  }
  const data: SourcesResponse = await response.json();

  // Enrich sources: expand Reddit sources into headlines/full variants
  const enrichedSources = data.sources.flatMap(source => {
    if (source.id.startsWith('reddit_')) {
      // Create two variants for each Reddit source
      return [
        {
          ...source,
          id: `${source.id}_headlines`,
          name: `${source.name} (Headlines)`,
          backendId: source.id
        },
        {
          ...source,
          id: `${source.id}_full`,
          name: `${source.name} (Full)`,
          backendId: source.id
        }
      ];
    }
    // Non-Reddit sources: explicitly set backendId = id
    return { ...source, backendId: source.id };
  });

  return enrichedSources;
}

/**
 * Fetch content for a specific source
 */
export async function fetchSourceContent(id: string, requiresAuth: boolean, alphabet?: string): Promise<SourceContent> {
  const headers: HeadersInit = {
    'Cache-Control': 'no-store'
  };

  if (requiresAuth) {
    const token = localStorage.getItem('google_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Build URL with optional alphabet query param
  const url = new URL(`/api/sources/${id}`, window.location.origin);
  if (alphabet) {
    url.searchParams.set('alphabet', alphabet);
  }

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch source content: ${response.status}`);
  }
  const data: SourceContent = await response.json();
  return data;
}

/**
 * Word source from word-sources API
 */
export interface WordSourceInfo {
  id: string;
  name: string;
  wordCount: number;
}

/**
 * Word sources response
 */
export interface WordSourcesResponse {
  sources: WordSourceInfo[];
}

/**
 * Fetch list of available word sources
 */
export async function fetchWordSources(): Promise<WordSourceInfo[]> {
  const response = await fetch('/api/word-sources');
  if (!response.ok) {
    throw new Error(`Failed to fetch word sources: ${response.status}`);
  }
  const data: WordSourcesResponse = await response.json();
  return data.sources;
}

/**
 * Fetch content for a specific word source
 */
export async function fetchWordSourceContent(id: string): Promise<SourceContent> {
  const response = await fetch(`/api/word-sources/${id}`, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch word source content: ${response.status}`);
  }
  const data = await response.json();
  // Transform to SourceContent format expected by source factory
  return {
    id: data.id,
    items: data.words // WordEntry[] becomes items
  };
}