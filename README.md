# ClipHouse

ClipHouse is a self-hosted short-video saver for links you do not want to lose.
Paste public links from Instagram, TikTok, YouTube Shorts, X/Twitter, Facebook Reels, Snapchat Spotlight, Threads, Kwai, and more; ClipHouse stores them in a searchable local library with categories, tags, notes, thumbnails, and playlists.

ClipHouse is designed as a small private/family tool: no cloud account, no external database service required, and no bundled starter data.

## Features

- Save public short-video URLs with title, creator, category, tags, notes, and thumbnail
- Cache remote thumbnails locally to avoid expiring social/CDN image URLs
- Best-effort metadata autofill when platforms allow anonymous fetching
- Search and filter your saved library
- Create playlists for people, projects, trips, hobbies, or rabbit holes
- First-run password setup with no default credentials
- Secure, revocable 30-day sessions and brute-force protection
- Password changes that sign out other devices
- SQLite persistence via Prisma
- Docker and bare-metal install options

## Screenshots

![ClipHouse home screen](screenshots/cliphouse-home-demo.png)

![ClipHouse library screen](screenshots/cliphouse-library-demo.png)

![ClipHouse playlists screen](screenshots/cliphouse-playlists-demo.png)

## Quick start with Docker Compose

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/vinprun71/ClipHouse.git
cd ClipHouse
docker compose pull
docker compose up -d
docker compose logs cliphouse
```

The logs print a one-time setup link similar to:

```text
ClipHouse setup link: http://localhost:3000/setup?token=...
```

Open that link and choose a household password of at least 10 characters. Once setup is complete, the token can no longer claim or reconfigure the app.

Your SQLite database is stored in `./data/cliphouse.db`. Cached thumbnails are stored in `./cache`.

## Bare-metal install

Requirements:

- Node.js 22+
- npm
- ffmpeg, optional but recommended for Instagram thumbnail extraction

```bash
git clone https://github.com/vinprun71/ClipHouse.git
cd ClipHouse
cp .env.example .env
npm ci
npm run db:migrate
npm run setup-token
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

`npm run setup-token` prints the first-run setup link. Open it after starting the server.

By default, ClipHouse stores data at `./data/cliphouse.db`. Change `DATABASE_URL` in `.env` if you want a different SQLite file path.

## Development

```bash
cp .env.example .env
npm ci
npm run db:migrate
npm run setup-token
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
npm test
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Data and privacy

This repository ships with a blank slate. It does not include any saved videos, private database, cache, or environment file.

For your own deployment, keep these files private and backed up:

- `.env`
- `data/`
- `cache/`
- any `*.db` files

Passwords are stored as salted scrypt hashes. Browser sessions use random tokens; only SHA-256 hashes of those tokens are stored in SQLite. Changing the household password revokes every other session.

## Internet access and reverse proxies

ClipHouse protects its pages and APIs with the household password, but HTTPS is still strongly recommended whenever it is reachable beyond your LAN. Put it behind Tailscale Funnel, Caddy, Traefik, nginx, or another HTTPS reverse proxy.

If the public address is not `http://localhost:3000`, set it before starting Docker so the setup link in the logs is correct:

```bash
CLIPHOUSE_PUBLIC_URL=https://clips.example.com docker compose up -d
```

Complete first-run setup before broadly sharing or exposing the address. The setup token is required to claim a blank installation and is available only in the server logs/data volume.

## Change or reset the password

Use **Settings** inside ClipHouse to change the password. This keeps the current browser signed in and revokes every other session.

If the password is lost, reset authentication from the server, restart ClipHouse, and use the setup link printed in the logs:

```bash
docker compose exec cliphouse npm run auth:reset -- --yes
docker compose restart cliphouse
docker compose logs cliphouse
```

For bare-metal installs, run `npm run auth:reset -- --yes` from the project directory.

## Backups and upgrades

Back up `data/` and `cache/` before an upgrade. To update a Docker installation:

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically when the container starts.

## Notes on metadata fetching

Social platforms frequently block anonymous metadata requests, expire CDN image signatures, or change page structure. ClipHouse treats metadata as best-effort: if autofill fails, you can still save the URL manually.

When ClipHouse can fetch a remote thumbnail, it stores a local copy under `./cache` and serves it from `/api/thumbnails/...` so saved cards are less likely to lose images later.

Instagram thumbnail extraction uses `ffmpeg` and a public proxy endpoint as a fallback. If that stops working, saved links still work; thumbnails may simply be blank.

## License

MIT
