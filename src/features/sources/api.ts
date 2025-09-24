/**
 * API client for text sources
 */

import type { TextSource, SourceContent, SourcesResponse } from './types';

/**
 * Fetch list of available text sources
 */
export async function fetchSources(): Promise<TextSource[]> {
  try {
    const response = await fetch('/api/sources');
    if (!response.ok) {
      throw new Error(`Failed to fetch sources: ${response.status}`);
    }
    const data: SourcesResponse = await response.json();
    return data.sources;
  } catch (error) {
    console.error('Error fetching sources:', error);
    // Return default sources as fallback
    return [
      { id: 'random_letters', name: 'Random Letters', type: 'generated' }
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