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
  text: string;  // Backend always returns formatted text ready for emission
}

export interface SourcesResponse {
  sources: TextSource[];
  total: number;
}