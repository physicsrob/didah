# didah

A Morse code trainer built by someone frustrated with the existing options. Real-time feedback, interesting text to copy, and practice modes designed around how people actually learn CW.

**[Try it now](https://didah.app)**

## Features

- **Instant feedback** - Know immediately when you make a mistake
- **Real-time recognition** - Practice identifying characters without time to overthink
- **Multiple study modes** - Choose the learning experience that fits your needs
- **Quality text sources** - Learn from real content (Reddit headlines, Hacker News, BBC News, etc.)
- **Statistics tracking** - See your progress over time

## Study Modes

### Practice Mode
Interactive training where you type what you hear with immediate feedback. You control the pacing up to a timeout, and can enable visual flash, buzzer, or character replay on errors.

### Listen Mode
Passive listening where Morse code is played and then revealed after a timed delay. Perfect for familiarizing yourself with patterns without pressure.

### Live Copy Mode
Real-time copying that simulates actual Morse code reception. No feedback during the session - type what you hear and see corrections only at the end.

### Word Practice Mode
Multiple-choice word recognition where you select the correct word from 3 options after hearing it. Builds whole-word fluency and helps develop instant recognition at the word level.

### Morse Runner
Endless runner mini-game where you type letters to jump over obstacles. Progress through 10 levels with increasing speed and difficulty - practice disguised as fun!

## Try It Locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Contributing

Pull requests are welcome! If you'd like to see new features or improvements, feel free to submit a PR.

This codebase is designed to be ergonomic for modern coding agents, particularly Claude Code. The documentation structure and [CLAUDE.md](CLAUDE.md) file are specifically designed to help keep AI on track when implementing new features.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for development setup and architecture details.

## About

Built by a ham radio operator frustrated with existing morse code trainers. What started as a personal need for better practice tools became a modern web app designed to make learning CW engaging rather than tedious.

Read the full story: [docs/ABOUT.md](docs/ABOUT.md)

## Documentation

- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Developer guide, commands, architecture
- **[API.md](docs/API.md)** - API endpoint documentation
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide

## Tech Stack

React 19, TypeScript, Vite, WebAudio API, Cloudflare Pages

## License

MIT License - see [LICENSE](LICENSE) for details
