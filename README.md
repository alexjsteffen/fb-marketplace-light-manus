# FB Ad Accelerator Light

A full-stack web application for managing multi-tenant auto dealer inventory and creating Facebook Marketplace ads with AI-powered enhancements. Features include inventory scraping, ad staging, AI-generated ad copy, image generation, and "As Seen On Facebook" content generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, tRPC, TanStack Query |
| Backend | Node.js, Express, tRPC, TypeScript |
| Database | SQLite (Drizzle ORM) |
| AI | OpenAI API (GPT-4.1-mini for text, DALL-E 3 for images) |
| Scraping | Puppeteer, Cheerio |
| Package Manager | pnpm |

## Prerequisites

- **Node.js** ≥ 20 (LTS recommended)
- **pnpm** ≥ 10.4 (`corepack enable` to activate)
- **Chromium / Google Chrome** (required by Puppeteer for inventory scraping — installed automatically by pnpm, or set `PUPPETEER_EXECUTABLE_PATH` to an existing installation)

## Quick Start

The easiest way to get started is with the install script:

```bash
# 1. Clone the repository
git clone <repo-url>
cd fb-marketplace-light-manus

# 2. Run the install script
chmod +x install.sh
./install.sh

# 3. (Optional) Edit .env to set your OPENAI_API_KEY
#    The app works without it but AI features will be disabled.

# 4. Start the development server
pnpm run dev
#    ↳ Opens at http://localhost:3000
```

### Default Login

After installation, sign in with:

| Field    | Value   |
|----------|---------|
| Username | `admin` |
| Password | `admin` |

> **⚠️ You will be required to change the default password on first login.**

### Manual Setup

If you prefer to set up manually instead of using the install script:

```bash
# 1. Enable corepack (ships with Node.js ≥ 16) so pnpm is available
corepack enable

# 2. Install dependencies
pnpm install

# 3. Copy the example env file and fill in your values
cp .env.example .env

# 4. Create the data directory and run migrations
mkdir -p data
pnpm run db:push

# 5. Seed default background templates
node seed-templates.mjs

# 6. Create the default admin user
node seed-admin.mjs

# 7. Start the development server
pnpm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | SQLite database file path (default `./data/app.db`) |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for AI ad copy and image generation |
| `PORT` | No | Server port (default `3000`) |
| `NODE_ENV` | No | `development` or `production` (default `development`) |
| `OPENAI_BASE_URL` | No | Custom OpenAI-compatible endpoint (default `https://api.openai.com/v1`) |
| `JWT_SECRET` | No | Secret for signing session cookies |
| `VITE_APP_ID` | No | OAuth app ID (local login when unset) |
| `VITE_OAUTH_PORTAL_URL` | No | OAuth portal login URL |
| `OAUTH_SERVER_URL` | No | OAuth token exchange endpoint |
| `OWNER_OPEN_ID` | No | OpenID of the super-admin user |

> **Note:** When OAuth variables are not configured the app uses a local login page with username/password authentication — no external auth service required for development or self-hosted use.

## Database

The app uses **SQLite** via the Drizzle ORM. The database file is stored at `./data/app.db` by default (configurable via `DATABASE_URL`). No external database server is required.

### Run migrations

```bash
pnpm run db:push
```

### Seed default data

```bash
# Seed background templates
node seed-templates.mjs

# Create default admin user (admin / admin)
node seed-admin.mjs
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start development server with hot reload |
| `pnpm run build` | Build frontend (Vite) + backend (esbuild) for production |
| `pnpm start` | Run the production server (after `build`) |
| `pnpm run check` | TypeScript type-checking |
| `pnpm run format` | Format code with Prettier |
| `pnpm run test` | Run unit tests (Vitest) |
| `pnpm run db:push` | Generate and apply Drizzle database migrations |

## Production Deployment

```bash
# Build the application
pnpm run build

# Start in production mode
pnpm start
# or: NODE_ENV=production node dist/index.js
```

The production build serves the pre-built React frontend as static files from `dist/public/` and runs the Express API on the configured port.

### Reverse Proxy (Nginx)

Example Nginx configuration for proxying to the Node.js server:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

### Process Manager (PM2)

Keep the server running with PM2:

```bash
npm install -g pm2

pm2 start dist/index.js --name fb-ads
pm2 save
pm2 startup   # generates a system startup script
```

## File Storage

Generated images and uploads are stored in the `uploads/` directory at the project root by default. In production you may want to:

- Ensure the application has write access to `uploads/`.
- Back up the directory regularly.
- Optionally mount it to persistent storage or an S3-compatible service.

## Project Structure

```
├── client/            # React frontend (Vite)
│   ├── src/
│   │   ├── components/  # UI components (shadcn/ui)
│   │   ├── pages/       # Route pages (Login, ChangePassword, Home, etc.)
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities
│   └── index.html
├── server/            # Express + tRPC backend
│   ├── _core/           # Framework: auth, LLM, storage, env
│   ├── routers.ts       # tRPC API routes
│   ├── db.ts            # Database operations
│   ├── adEnhancement.ts # AI ad copy & image generation
│   ├── inventoryScraper.ts  # Puppeteer web scraper
│   ├── extensionApi.ts  # Browser extension REST API
│   └── storage.ts       # File storage (local / Forge API)
├── shared/            # Code shared between client & server
├── drizzle/           # Database schema & migrations
├── data/              # SQLite database (created on install)
├── uploads/           # Uploaded & generated images
├── patches/           # pnpm dependency patches
├── install.sh         # Automated install script
├── seed-admin.mjs     # Default admin user seeder
├── seed-templates.mjs # Background templates seeder
├── .env.example       # Environment variable template
├── vite.config.ts     # Vite configuration
└── package.json
```

## Troubleshooting

### `vite-plugin-manus-runtime` warning during install

This optional plugin is only used inside the Manus development platform. It is loaded conditionally and will be silently skipped when not available. You can safely ignore any peer-dependency warnings related to it.

### Puppeteer / Chromium issues

If the inventory scraper fails to launch a browser:

```bash
# Install Chromium system dependencies (Debian/Ubuntu)
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxrandr2 libgbm1 libpango-1.0-0 libasound2

# Or point Puppeteer at an existing Chrome installation
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Database issues

The SQLite database is stored at `./data/app.db`. If you need to reset the database:

```bash
rm -f data/app.db
pnpm run db:push
node seed-templates.mjs
node seed-admin.mjs
```

## License

MIT
