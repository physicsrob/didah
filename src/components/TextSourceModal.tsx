import { useState, useEffect, useMemo, useRef } from 'react';
import type { TextSource } from '../features/sources/types';
import './TextSourceModal.css';

type TextSourceModalProps = {
  isOpen: boolean;
  sources: TextSource[];
  selectedId: string;
  favorites: string[];
  onSelect: (sourceId: string) => void;
  onToggleFavorite: (sourceId: string) => void;
  onClose: () => void;
};

type GroupedSources = {
  [category: string]: TextSource[];
};

export function TextSourceModal({
  isOpen,
  sources,
  selectedId,
  favorites,
  onSelect,
  onToggleFavorite,
  onClose
}: TextSourceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter sources based on search query
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) {
      return sources;
    }

    const query = searchQuery.toLowerCase();
    return sources.filter(source => {
      const nameMatch = source.name.toLowerCase().includes(query);
      const descMatch = source.description?.toLowerCase().includes(query);
      const categoryMatch = source.category?.toLowerCase().includes(query);
      return nameMatch || descMatch || categoryMatch;
    });
  }, [sources, searchQuery]);

  // Group sources by category
  const groupedSources = useMemo(() => {
    const groups: GroupedSources = {};

    // First, add favorites group if any exist
    const favoriteSources = filteredSources.filter(s => favorites.includes(s.id));
    if (favoriteSources.length > 0) {
      groups['favorites'] = favoriteSources;
    }

    // Then group by category
    filteredSources.forEach(source => {
      const category = source.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(source);
    });

    return groups;
  }, [filteredSources, favorites]);

  // Get sorted category keys (favorites first, then alphabetically)
  const sortedCategories = useMemo(() => {
    const categories = Object.keys(groupedSources);
    return categories.sort((a, b) => {
      if (a === 'favorites') return -1;
      if (b === 'favorites') return 1;
      return a.localeCompare(b);
    });
  }, [groupedSources]);

  const handleSourceClick = (sourceId: string) => {
    onSelect(sourceId);
    onClose();
  };

  const handleStarClick = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    onToggleFavorite(sourceId);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="text-source-modal-backdrop" onClick={handleBackdropClick}>
      <div className="text-source-modal">
        {/* Header with close button */}
        <div className="text-source-modal-header">
          <h2 className="text-source-modal-title">Select Text Source</h2>
          <button
            className="text-source-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Search input */}
        <div className="text-source-modal-search">
          <svg
            className="text-source-modal-search-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="text-source-modal-search-input"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search text sources"
          />
        </div>

        {/* Source list */}
        <div className="text-source-modal-content">
          {filteredSources.length === 0 ? (
            <div className="text-source-modal-empty">
              <p>No sources found matching "{searchQuery}"</p>
            </div>
          ) : (
            sortedCategories.map(category => (
              <div key={category} className="text-source-category">
                <h3 className="text-source-category-header">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h3>
                <div className="text-source-category-items">
                  {groupedSources[category].map(source => {
                    const isFavorite = favorites.includes(source.id);
                    const isSelected = source.id === selectedId;

                    return (
                      <div
                        key={source.id}
                        className={`text-source-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSourceClick(source.id)}
                      >
                        <div className="text-source-item-content">
                          <div className="text-source-item-name">{source.name}</div>
                          {source.description && (
                            <div className="text-source-item-description">
                              {source.description}
                            </div>
                          )}
                        </div>
                        <button
                          className={`text-source-star ${isFavorite ? 'active' : ''}`}
                          onClick={(e) => handleStarClick(e, source.id)}
                          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
