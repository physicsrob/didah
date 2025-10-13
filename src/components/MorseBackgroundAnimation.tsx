/**
 * Morse Background Animation
 *
 * Animated morse code streaming across the background.
 * Self-contained component that can be easily enabled/disabled.
 */

import { useEffect, useRef } from 'react';
import { MORSE_ALPHABET } from '../core/morse/alphabet';
import '../styles/morseBackground.css';

const SENTENCES = [
  'Never gonna give you up,',
  'never gonna let you down,',
  'Never gonna run around and desert you,',
  'Never gonna make you cry,',
  'never gonna say goodbye,',
  'Never gonna tell a lie and hurt you,',
  'Never gonna give you up,',
  'never gonna let you down,',
  'Never gonna run around and desert you,',
  'Never gonna make you cry,'
];

const LINES_COUNT = 10;

const DOT_SIZE = 3;
const DASH_LENGTH = 15;
const ELEMENT_SPACING = 8;
const CHAR_SPACING = 20;
const WORD_SPACING = 60;
const SENTENCE_SPACING = 100;

const LINE_WIDTH = 3;
const COLOR = 'rgba(96, 165, 250, 0.08)';

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split(' ')
    .map(word =>
      word
        .split('')
        .map(char => {
          const pattern = MORSE_ALPHABET[char];
          return pattern ? pattern.join('') : '';
        })
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' / ');
}

function calculateMorseWidth(morse: string): number {
  let width = 0;
  for (let i = 0; i < morse.length; i++) {
    const char = morse[i];
    if (char === '.') {
      width += ELEMENT_SPACING;
    } else if (char === '-') {
      width += DASH_LENGTH + ELEMENT_SPACING;
    } else if (char === ' ') {
      width += CHAR_SPACING;
    } else if (char === '/') {
      width += WORD_SPACING;
    }
  }
  return width;
}

class MorsePhrase {
  phrase: string;
  morse: string;
  morseWidth: number;
  x: number;
  y: number;
  lineIndex: number;
  speed: number;

  constructor(
    lineIndex: number,
    sentence: string,
    canvasHeight: number,
    lineSpeed: number
  ) {
    this.phrase = sentence;
    this.morse = textToMorse(this.phrase);
    this.morseWidth = calculateMorseWidth(this.morse);
    this.x = 0;
    this.lineIndex = lineIndex;
    this.y = ((this.lineIndex + 0.5) / LINES_COUNT) * canvasHeight;
    this.speed = lineSpeed;
  }

  update() {
    this.x -= this.speed;
    // Use modulo to wrap position seamlessly (including spacing between sentences)
    const repeatDistance = this.morseWidth + SENTENCE_SPACING;
    this.x = ((this.x % repeatDistance) + repeatDistance) % repeatDistance;
  }

  drawMorseCopy(ctx: CanvasRenderingContext2D, startX: number) {
    let currentX = startX;

    for (let i = 0; i < this.morse.length; i++) {
      const char = this.morse[i];

      ctx.strokeStyle = COLOR;
      ctx.fillStyle = COLOR;
      ctx.lineCap = 'round';
      ctx.lineWidth = LINE_WIDTH;

      if (char === '.') {
        ctx.beginPath();
        ctx.arc(currentX, this.y, DOT_SIZE, 0, Math.PI * 2);
        ctx.fill();
        currentX += ELEMENT_SPACING;
      } else if (char === '-') {
        ctx.beginPath();
        ctx.moveTo(currentX, this.y);
        ctx.lineTo(currentX + DASH_LENGTH, this.y);
        ctx.stroke();
        currentX += DASH_LENGTH + ELEMENT_SPACING;
      } else if (char === ' ') {
        currentX += CHAR_SPACING;
      } else if (char === '/') {
        currentX += WORD_SPACING;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    const canvasWidth = ctx.canvas.width;
    const repeatDistance = this.morseWidth + SENTENCE_SPACING;

    // Calculate which copy index would have its start near the left edge of screen
    const firstCopyIndex = Math.floor(-this.x / repeatDistance);

    // Draw enough copies to fill the screen
    for (let copyIndex = firstCopyIndex; copyIndex <= firstCopyIndex + 5; copyIndex++) {
      const copyX = this.x + copyIndex * repeatDistance;

      // Stop if we're way past the right edge
      if (copyX > canvasWidth + 500) break;

      // Draw this copy
      this.drawMorseCopy(ctx, copyX);
    }

    ctx.restore();
  }
}

export function MorseBackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phrasesRef = useRef<MorsePhrase[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Update Y positions for existing phrases
      phrasesRef.current.forEach(phrase => {
        phrase.y = ((phrase.lineIndex + 0.5) / LINES_COUNT) * canvas.height;
      });
    };

    const initializePhrases = () => {
      phrasesRef.current = [];

      // Create one phrase per line with random starting offsets
      for (let i = 0; i < LINES_COUNT; i++) {
        const lineSpeed = 0.1 + Math.random() * 0.1;
        const phrase = new MorsePhrase(
          i,
          SENTENCES[i],
          canvas.height,
          lineSpeed
        );
        // Start at random position within the repeat distance for variety
        phrase.x = Math.random() * (phrase.morseWidth + SENTENCE_SPACING);
        phrasesRef.current.push(phrase);
      }
    };

    const drawBackground = () => {
      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1d26');
      gradient.addColorStop(1, '#252a3a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw radial gradient overlays
      const radial1 = ctx.createRadialGradient(canvas.width * 0.2, canvas.height * 0.8, 0, canvas.width * 0.2, canvas.height * 0.8, canvas.width * 0.5);
      radial1.addColorStop(0, 'rgba(77, 171, 247, 0.08)');
      radial1.addColorStop(1, 'transparent');
      ctx.fillStyle = radial1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const radial2 = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.2, 0, canvas.width * 0.8, canvas.height * 0.2, canvas.width * 0.5);
      radial2.addColorStop(0, 'rgba(77, 171, 247, 0.05)');
      radial2.addColorStop(1, 'transparent');
      ctx.fillStyle = radial2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const animate = () => {
      drawBackground();

      phrasesRef.current.forEach(phrase => {
        phrase.update();
        phrase.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initializePhrases();
    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="morse-background-canvas" />;
}
