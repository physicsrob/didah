/**
 * React hook for Live Copy mode event collection and timing
 */

import { useState, useEffect, useCallback } from 'react';
import type { LiveCopyEvent } from './evaluator';

export function useLiveCopy(isActive: boolean) {
  const [events, setEvents] = useState<LiveCopyEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Collect keyboard events
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      // Ignore special keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        // Remove last typed event
        setEvents((prev) => {
          const typed = prev.filter((e) => e.type === 'typed');
          if (typed.length === 0) return prev;

          const lastTyped = typed[typed.length - 1];
          return prev.filter((e) => e !== lastTyped);
        });
        return;
      }

      // Handle character input
      if (e.key.length === 1) {
        e.preventDefault();
        setEvents((prev) => [
          ...prev,
          {
            type: 'typed',
            char: e.key.toUpperCase(),
            time: performance.now(),
          },
        ]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive]);

  // Update current time for reveal timing
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setCurrentTime(performance.now());
    }, 50); // 50ms for smooth reveals

    return () => clearInterval(timer);
  }, [isActive]);

  // Add transmission events as they arrive
  const addTransmitEvent = useCallback((char: string, startTime: number, duration: number) => {
    setEvents((prev) => [
      ...prev,
      {
        type: 'transmitted' as const,
        char,
        startTime,
        duration,
      },
    ]);
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setCurrentTime(performance.now());
  }, []);

  return { events, currentTime, addTransmitEvent, reset };
}