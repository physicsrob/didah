/**
 * API client for text sources
 */

import type { TextSource, SourceContent, SourcesResponse } from './types';

/**
 * Fetch list of available text sources and enrich with variants
 */
export async function fetchSources(): Promise<TextSource[]> {
  try {
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
  } catch (error) {
    console.error('Error fetching sources:', error);
    // Return default sources as fallback
    return [
      { id: 'random_letters', name: 'Random Letters', type: 'generated', backendId: 'random_letters' }
    ];
  }
}

/**
 * Fetch content for a specific source
 */
export async function fetchSourceContent(id: string): Promise<SourceContent | null> {
  try {
    const response = await fetch(`/api/sources/${id}`, {
      cache: 'no-store', // Prevent browser caching to ensure fresh randomization
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch source content: ${response.status}`);
    }
    const data: SourceContent = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching source ${id}:`, error);
    return null;
  }
}