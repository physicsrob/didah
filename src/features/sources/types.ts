/**
 * Types for text sources
 */

export interface TextSource {
  id: string;
  name: string;
  type: 'generated' | 'rss';
  requiresAuth?: boolean;
  category?: string;
  description?: string;
}

export interface SourceContent {
  id: string;
  items: string[];  // Always an array of strings (backend handles all formatting)
}

export interface SourcesResponse {
  sources: TextSource[];
  total: number;
}