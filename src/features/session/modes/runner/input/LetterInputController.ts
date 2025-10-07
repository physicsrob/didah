/**
 * Handles keyboard input for letter-based gameplay.
 * Listens for A-Z key presses and passes them to a callback.
 */
export class LetterInputController {
  private onLetterInput: (letter: string) => void;
  private onRestart: () => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private isGameOver: () => boolean;

  /**
   * Creates a new LetterInputController.
   * @param onLetterInput - Callback when a letter is typed
   * @param onRestart - Callback to restart the game
   * @param isGameOver - Function to check if game is over
   */
  constructor(
    onLetterInput: (letter: string) => void,
    onRestart: () => void,
    isGameOver: () => boolean
  ) {
    this.onLetterInput = onLetterInput;
    this.onRestart = onRestart;
    this.isGameOver = isGameOver;
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.setupListeners();
  }

  /**
   * Sets up keyboard event listeners.
   */
  private setupListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handles keyboard input events.
   * @param e - The keyboard event
   */
  private onKeyDown(e: KeyboardEvent): void {
    // If game is over, restart on space
    if (this.isGameOver()) {
      if (e.code === 'Space') {
        e.preventDefault();
        this.onRestart();
      }
      return;
    }

    // Handle letter input (A-Z)
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      this.onLetterInput(e.key.toUpperCase());
    }
  }

  /**
   * Removes event listeners and cleans up resources.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
