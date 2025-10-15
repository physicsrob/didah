# Deployment Guide

Morse Academy is deployed on Cloudflare Pages at:
**https://morse.academy**

The entire application (frontend + API) is deployed together.

## Deployment

Cloudflare Pages is configured to **automatically build and deploy** when changes are pushed to the repository.

### Automatic Deployment (Primary Method)

1. Push changes to your git repository
2. Cloudflare Pages automatically detects the push
3. Cloudflare builds the project (`npm run build`)
4. The built application is deployed to production

The build and deployment happen entirely on Cloudflare's infrastructure.

### Manual Deployment (Alternative)

If you need to deploy manually from your local machine:

```bash
# Build and deploy in one command
npm run deploy

# Or step by step:
npm run build
npx wrangler pages deploy ./dist
```

Manual deployment is useful for testing deployment configurations or deploying from branches that aren't automatically deployed.

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

Before pushing changes that will be automatically deployed:

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

3. **Build succeeds locally**:
   ```bash
   npm run build
   ```
   Ensure the build completes without errors.

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

5. **Monitor deployment**: Check the Cloudflare Pages dashboard to monitor the build and deployment progress.

6. **Verify production**: Visit https://morse.academy and test functionality once deployment completes.

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

Cloudflare Pages is configured to automatically build and deploy when changes are pushed to the connected git repository.

- **Automatic builds**: Triggered on every push to the repository
- **Build command**: `npm run build`
- **Output directory**: `./dist`
- **Functions directory**: `/functions/api/`

The GitHub integration is configured in the Cloudflare Pages dashboard. You can view build logs and deployment history in the dashboard.
