# Deployment Guide

Morse Academy is deployed on Cloudflare Pages at:
**https://morse.academy**

The entire application (frontend + API) is deployed together.

## Quick Deploy

```bash
npm run deploy
```

This command will:
1. Build the frontend (`npm run build`)
2. Deploy to Cloudflare Pages using Wrangler

## Manual Deployment

If you need to deploy manually:

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy ./dist
```

## Local Development

When developing locally, you can run the full stack (frontend + API) or just the frontend:

```bash
# Run everything (frontend + API) - RECOMMENDED
npm run dev             # http://localhost:3000

# Run frontend only (Vite dev server, no API)
npm run dev:vite        # http://localhost:5173
```

The `npm run dev` command uses the Cloudflare Pages development server, which runs both the Vite dev server and the API functions locally.

## Cloudflare Configuration

- **Project Name**: morseacademy
- **Functions Directory**: `/functions/api/`
- **Build Output Directory**: `./dist`
- **Config File**: `wrangler.toml`

## What Gets Deployed

### Frontend
- Built React application (Vite output)
- All static assets (CSS, images, etc.)
- Located in `./dist` after build

### API Functions
- Cloudflare Pages Functions from `/functions/api/`
- Deployed automatically alongside the frontend
- Available at `/api/*` routes

## Deployment Checklist

Before deploying to production:

1. **Run quality checks**:
   ```bash
   npm run check
   ```
   This runs TypeScript checks, ESLint, and all tests.

2. **Test locally**:
   ```bash
   npm run dev
   ```
   Verify the app works with both frontend and API.

3. **Build succeeds**:
   ```bash
   npm run build
   ```
   Ensure the build completes without errors.

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Verify production**: Visit https://morse.academy and test functionality.

## Troubleshooting

### Build Fails
- Check TypeScript errors: `npm run typecheck`
- Check ESLint errors: `npm run lint`
- Verify all tests pass: `npm test`

### API Functions Not Working
- Ensure functions are in `/functions/api/` directory
- Check function syntax matches Cloudflare Pages Functions format
- Test locally with `npm run dev` (not `npm run dev:vite`)

### Deployment Fails
- Verify Wrangler authentication: `npx wrangler whoami`
- Check `wrangler.toml` configuration
- Ensure you have permissions for the morseacademy project

## CI/CD

Currently, deployment is manual using `npm run deploy`.

Cloudflare Pages can be configured to automatically deploy on git pushes. If you want to enable this, configure the GitHub integration in the Cloudflare Pages dashboard.
