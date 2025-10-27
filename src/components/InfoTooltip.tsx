import { useState, useRef, useEffect } from 'react';
import './InfoTooltip.css';

type InfoTooltipProps = {
  content: string;
  children: React.ReactNode;
};

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close on mobile
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  // Calculate position to avoid viewport overflow
  useEffect(() => {
    if (!isVisible || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // If more space below, show below; otherwise show above
    setPosition(spaceBelow > spaceAbove || spaceAbove < 100 ? 'bottom' : 'top');
  }, [isVisible]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleClick = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="info-tooltip-container">
      <div
        ref={triggerRef}
        className="info-tooltip-trigger"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        tabIndex={0}
        role="button"
        aria-label="More information"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`info-tooltip-content info-tooltip-${position}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
