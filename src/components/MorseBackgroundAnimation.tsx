/**
 * Morse Background Animation
 *
 * Animated morse code streaming across the background.
 * Self-contained component that can be easily enabled/disabled.
 */

import { useEffect, useRef } from 'react';
import { MORSE_ALPHABET } from '../core/morse/alphabet';
import '../styles/morseBackground.css';

const PHRASES = ['LEARN', 'MORSE', 'CW', 'CODE', 'FUN', 'HELLO', 'START', 'DIT DAH'];

const LINES_COUNT = 10;
const PHRASES_PER_LINE = 4;
const PHRASE_COUNT = LINES_COUNT * PHRASES_PER_LINE;

const EXIT_POSITION = -300;
const RESET_OFFSET = 200;

const DOT_SIZE = 3;
const DASH_LENGTH = 15;
const ELEMENT_SPACING = 8;
const CHAR_SPACING = 20;

const LINE_WIDTH = 3;
const COLOR = 'rgba(96, 165, 250, 0.375)';

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split('')
    .map(char => {
      const pattern = MORSE_ALPHABET[char];
      return pattern ? pattern.join('') : '';
    })
    .filter(Boolean)
    .join(' ');
}

class MorsePhrase {
  phrase: string;
  morse: string;
  x: number;
  y: number;
  lineIndex: number;
  speed: number;
  opacity: number;

  constructor(
    index: number,
    linesCount: number,
    canvasHeight: number,
    lineSpeed: number
  ) {
    this.phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    this.morse = textToMorse(this.phrase);
    this.x = 0;
    this.lineIndex = index % linesCount;
    this.y = ((this.lineIndex + 0.5) / linesCount) * canvasHeight;
    this.speed = lineSpeed;
    this.opacity = 0.05 + Math.random() * 0.08;
  }

  reset(canvasWidth: number) {
    this.phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    this.morse = textToMorse(this.phrase);
    this.x = canvasWidth + RESET_OFFSET;
    this.opacity = 0.05 + Math.random() * 0.08;
  }

  update(canvasWidth: number) {
    this.x -= this.speed;

    if (this.x < EXIT_POSITION) {
      this.reset(canvasWidth);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    let currentX = this.x;

    for (let i = 0; i < this.morse.length; i++) {
      const char = this.morse[i];

      ctx.globalAlpha = this.opacity;
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
      }
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

      // Generate speeds for each line
      const lineSpeeds: number[] = [];
      for (let i = 0; i < LINES_COUNT; i++) {
        lineSpeeds.push(0.1 + Math.random() * 0.1);
      }

      // Calculate uniform distribution
      const resetPosition = canvas.width + RESET_OFFSET;
      const totalRange = resetPosition - EXIT_POSITION;
      const spacing = totalRange / PHRASE_COUNT;

      for (let i = 0; i < PHRASE_COUNT; i++) {
        const lineIndex = i % LINES_COUNT;
        const phrase = new MorsePhrase(
          i,
          LINES_COUNT,
          canvas.height,
          lineSpeeds[lineIndex]
        );
        phrase.x = EXIT_POSITION + i * spacing;
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
        phrase.update(canvas.width);
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