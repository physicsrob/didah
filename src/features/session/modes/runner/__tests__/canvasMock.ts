/**
 * Minimal canvas mock for runner integration tests.
 * Provides just enough functionality to let the Game and CanvasRenderer initialize.
 */

export function setupCanvasMock() {
  // Mock Image class - FORCE override even if jsdom provides one
  global.Image = class MockImage {
    private _src = '';
    width = 100;
    height = 100;
    complete = false;
    onload: (() => void) | null = null;
    onerror: ((error: any) => void) | null = null;

    get src() {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      // Trigger onload asynchronously when src is set
      setTimeout(() => {
        this.complete = true;
        if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  } as any;

  // Mock requestAnimationFrame
  if (typeof requestAnimationFrame === 'undefined') {
    let rafId = 0;
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      // Execute callback asynchronously with a reasonable timestamp
      setTimeout(() => callback(performance.now()), 16); // ~60fps
      return ++rafId;
    };
  }

  // Mock performance.now if needed
  if (typeof performance === 'undefined') {
    global.performance = {
      now: () => Date.now()
    } as any;
  }

  // Enhance canvas mock to provide 2D context
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName: string, options?: ElementCreationOptions): any {
    const element = originalCreateElement(tagName, options);

    if (tagName === 'canvas') {
      const canvas = element as HTMLCanvasElement;

      // Mock getContext to return a minimal 2D context
      canvas.getContext = function (contextType: string) {
        if (contextType === '2d') {
          return {
            // Drawing methods (no-ops)
            fillRect: () => {},
            drawImage: () => {},
            clearRect: () => {},
            fillText: () => {},
            strokeRect: () => {},

            // State methods
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},

            // Gradient methods
            createLinearGradient: () => ({
              addColorStop: () => {}
            }),

            // Properties
            fillStyle: '',
            strokeStyle: '',
            globalAlpha: 1,
            font: '',
            textAlign: 'left',
            imageSmoothingEnabled: true
          } as any;
        }
        return null;
      };
    }

    return element;
  };
}
