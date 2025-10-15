/**
 * API client for text sources
 */

import type { TextSource, SourceContent, SourcesResponse } from './types';

/**
 * Fetch list of available text sources
 */
export async function fetchSources(): Promise<TextSource[]> {
  const response = await fetch('/api/sources');
  if (!response.ok) {
    throw new Error(`Failed to fetch sources: ${response.status}`);
  }
  const data: SourcesResponse = await response.json();

  // Backend now handles all variants - just return the sources as-is
  return data.sources;
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

