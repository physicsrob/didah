import { useState } from 'react';
import type { SessionMode } from '../core/types/domain';

interface ModeCardData {
  mode: SessionMode;
  icon: string;
  title: string;
  description: string;
}

interface ModeCarouselProps {
  modes: ModeCardData[];
  onModeSelect: (mode: SessionMode) => void;
}

export function ModeCarousel({ modes, onModeSelect }: ModeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const cardsPerSlide = 3;
  const totalSlides = modes.length - cardsPerSlide + 1;

  const handlePrevious = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  return (
    <div
      className="mode-carousel-wrapper"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="mode-carousel-container">
        <div
          className="mode-carousel-track"
          style={{
            transform: `translateX(-${currentSlide * (100 / cardsPerSlide)}%)`
          }}
        >
          {modes.map((mode) => (
            <div
              key={mode.mode}
              className="mode-card"
              onClick={() => onModeSelect(mode.mode)}
            >
              <div className="mode-card-icon">{mode.icon}</div>
              <div className="mode-card-title">{mode.title}</div>
              <div className="mode-card-description">{mode.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        className="carousel-arrow carousel-arrow-left"
        onClick={handlePrevious}
        disabled={currentSlide === 0}
        aria-label="Previous modes"
      >
        ‹
      </button>
      <button
        className="carousel-arrow carousel-arrow-right"
        onClick={handleNext}
        disabled={currentSlide === totalSlides - 1}
        aria-label="Next modes"
      >
        ›
      </button>

      {/* Slide Indicators */}
      <div className="carousel-indicators">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            className={`carousel-indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
