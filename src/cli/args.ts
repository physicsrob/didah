/**
 * Command line argument parsing
 */

export type CliArgs = {
  text: string;
  mode: 'practice' | 'listen';
  wpm: number;
  speed: 'slow' | 'medium' | 'fast' | 'lightning';
  clockMode: 'instant' | 'realtime';
};

export function parseArgs(argv: string[]): CliArgs {
  // Default values
  const defaults: CliArgs = {
    text: '',
    mode: 'listen',
    wpm: 20,
    speed: 'medium',
    clockMode: 'instant'
  };

  // Parse positional argument (text)
  let text = '';
  let i = 0;

  // Find the text argument (first non-flag argument)
  while (i < argv.length) {
    if (!argv[i].startsWith('--')) {
      text = argv[i];
      break;
    }
    i++;
  }

  if (!text) {
    console.error('❌ Error: Text argument is required');
    console.error('Usage: npm run morse-sim "HELLO WORLD" [options]');
    console.error('\nOptions:');
    console.error('  --mode <active|passive>        Session mode (default: passive)');
    console.error('  --wpm <number>                 Words per minute (default: 20)');
    console.error('  --speed <slow|medium|fast|lightning>  Speed tier (default: medium)');
    console.error('  --clock <instant|realtime>     Clock mode (default: instant)');
    process.exit(1);
  }

  // Parse flags
  const result: CliArgs = { ...defaults, text };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      const mode = argv[i + 1];
      if (mode === 'practice' || mode === 'listen') {
        result.mode = mode;
        i++;
      } else {
        console.error(`❌ Invalid mode: ${mode}. Must be 'practice' or 'listen'`);
        process.exit(1);
      }
    } else if (argv[i] === '--wpm' && argv[i + 1]) {
      const wpm = parseInt(argv[i + 1], 10);
      if (!isNaN(wpm) && wpm > 0 && wpm <= 60) {
        result.wpm = wpm;
        i++;
      } else {
        console.error(`❌ Invalid WPM: ${argv[i + 1]}. Must be a number between 1 and 60`);
        process.exit(1);
      }
    } else if (argv[i] === '--speed' && argv[i + 1]) {
      const speed = argv[i + 1];
      if (speed === 'slow' || speed === 'medium' || speed === 'fast' || speed === 'lightning') {
        result.speed = speed;
        i++;
      } else {
        console.error(`❌ Invalid speed: ${speed}. Must be slow, medium, fast, or lightning`);
        process.exit(1);
      }
    } else if (argv[i] === '--clock' && argv[i + 1]) {
      const clockMode = argv[i + 1];
      if (clockMode === 'instant' || clockMode === 'realtime') {
        result.clockMode = clockMode;
        i++;
      } else {
        console.error(`❌ Invalid clock mode: ${clockMode}. Must be 'instant' or 'realtime'`);
        process.exit(1);
      }
    }
  }

  // Validate text contains only supported characters
  const validChars = /^[A-Za-z0-9.,/=?;:'"+@()\s-]+$/;
  if (!validChars.test(text)) {
    console.error(`❌ Text contains unsupported characters`);
    console.error(`Supported: letters, numbers, space, and punctuation: .,/=?;:'"-+@()`);
    process.exit(1);
  }

  return result;
}