/**
 * Types for text sources
 */

export interface TextSource {
  id: string;
  name: string;
  type: 'generated' | 'rss';
}

export interface SourceContent {
  id: string;
  items: string[];  // Array of headlines or single string of words
}

export interface SourcesResponse {
  sources: TextSource[];
  total: number;
}