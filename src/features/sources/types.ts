/**
 * Types for text sources
 */

export interface TextSource {
  id: string;
  name: string;
  type: 'generated' | 'rss';
  backendId: string;  // ID to use when fetching from backend
}

export interface FullPost {
  title: string;
  body: string;
}

export interface SourceContent {
  id: string;
  items: string[] | FullPost[];  // Array of headlines, Reddit posts, or single string of words
}

export interface SourcesResponse {
  sources: TextSource[];
  total: number;
}