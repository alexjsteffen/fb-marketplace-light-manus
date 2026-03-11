# FB Ad Accelerator Light

A full-stack web application for managing multi-tenant auto dealer inventory and creating Facebook Marketplace ads with AI-powered enhancements. Features include inventory scraping, ad staging, AI-generated ad copy, image generation, and "As Seen On Facebook" content generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, tRPC, TanStack Query |
| Backend | Node.js, Express, tRPC, TypeScript |
| Database | MySQL (Drizzle ORM) |
| AI | OpenAI API (GPT-4.1-mini for text, DALL-E 3 for images) |
| Scraping | Puppeteer, Cheerio |
| Package Manager | pnpm |

## Prerequisites

- **Node.js** ≥ 20 (LTS recommended)
- **pnpm** ≥ 10.4 (`corepack enable` to activate)
- **MySQL** 8.0+ (or MariaDB 10.6+)
- **Chromium / Google Chrome** (required by Puppeteer for inventory scraping — installed automatically by pnpm, or set `PUPPETEER_EXECUTABLE_PATH` to an existing installation)

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd fb-marketplace-light-manus

# 2. Enable corepack (ships with Node.js ≥ 16) so pnpm is available
corepack enable

# 3. Install dependencies
pnpm install

# 4. Copy the example env file and fill in your values
cp .env.example .env
#    ↳ At minimum set DATABASE_URL and OPENAI_API_KEY

# 5. Create / migrate the database
pnpm run db:push

# 6. (Optional) Seed default background templates
node seed-templates.mjs

# 7. Start the development server
pnpm run dev
#    ↳ Opens at http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | MySQL connection string, e.g. `mysql://user:pass@localhost:3306/fb_ads` |
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for AI ad copy and image generation |
| `PORT` | No | Server port (default `3000`) |
| `NODE_ENV` | No | `development` or `production` (default `development`) |
| `OPENAI_BASE_URL` | No | Custom OpenAI-compatible endpoint (default `https://api.openai.com/v1`) |
| `JWT_SECRET` | No | Secret for signing session cookies |
| `VITE_APP_ID` | No | OAuth app ID (dev bypass user when unset) |
| `VITE_OAUTH_PORTAL_URL` | No | OAuth portal login URL |
| `OAUTH_SERVER_URL` | No | OAuth token exchange endpoint |
| `OWNER_OPEN_ID` | No | OpenID of the super-admin user |

> **Note:** When OAuth variables are not configured the app automatically uses a local dev bypass user with admin privileges — no external auth service required for development or self-hosted use.

## Database Setup

The app uses MySQL via the Drizzle ORM. Create a database and user, then set `DATABASE_URL`:

```bash
# Example: create database and user in MySQL
mysql -u root -p -e "
  CREATE DATABASE IF NOT EXISTS fb_ad_accelerator;
  CREATE USER IF NOT EXISTS 'fbads'@'localhost' IDENTIFIED BY 'your_password';
  GRANT ALL PRIVILEGES ON fb_ad_accelerator.* TO 'fbads'@'localhost';
  FLUSH PRIVILEGES;
"

# Set in .env
DATABASE_URL=mysql://fbads:your_password@localhost:3306/fb_ad_accelerator
```

Run migrations:

```bash
pnpm run db:push
```

Seed the default background templates (optional):

```bash
node seed-templates.mjs
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
│   │   ├── pages/       # Route pages
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
├── uploads/           # Uploaded & generated images
├── patches/           # pnpm dependency patches
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

### Database connection errors

Verify your `DATABASE_URL` is correct and the MySQL server is running:

```bash
mysql -u fbads -p -h localhost fb_ad_accelerator -e "SELECT 1;"
```

## License

MIT
