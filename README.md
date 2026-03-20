# 🚗 Daily Drive

A self-hosted recreation of Spotify's discontinued Daily Drive feature — a personalized playlist updated every morning that mixes your recent tracks, discovery picks, and unplayed podcast episodes.

## Features

- **Daily playlist** — automatically rebuilt every morning via cron
- **Smart music selection** — recent plays + short-term top tracks, max 2 tracks per artist, no consecutive same-artist
- **Discovery tracks** — medium-term top tracks you haven't heard recently
- **Podcast episodes** — scores your followed shows by listening engagement, picks the latest unplayed short episodes (≤10 min)
- **Extra podcasts** — add any show by Spotify URL even if you don't follow it
- **Configurable** — target duration, active days, discovery/comfort ratio, custom playlist name
- **Track blacklist** — exclude tracks you never want to hear again
- **Multi-user** — each user gets their own playlist

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [NextAuth.js v5](https://authjs.dev/) (Spotify OAuth)
- [Prisma](https://www.prisma.io/) + SQLite (dev) / PostgreSQL (prod)
- [Tailwind CSS](https://tailwindcss.com/)
- Vercel Cron Jobs

## Getting started

### 1. Spotify app

Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and add your redirect URI:

```
https://your-domain.com/api/auth/callback/spotify
```

Required scopes (set automatically via the app):
`user-read-recently-played`, `user-top-read`, `user-library-read`, `user-read-playback-position`, `playlist-read-private`, `playlist-modify-public`, `playlist-modify-private`

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | From your Spotify app dashboard |
| `SPOTIFY_CLIENT_SECRET` | From your Spotify app dashboard |
| `AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `AUTH_URL` | Your app's public URL |
| `CRON_SECRET` | Random secret for cron endpoint auth — `openssl rand -base64 32` |
| `DATABASE_URL` | `file:./dev.db` for SQLite, or a Postgres connection string |

### 3. Database

```bash
npm install
npm run db:push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect with Spotify, then click **Update now** to generate your first playlist.

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Create a free Postgres database on [neon.tech](https://neon.tech) and copy the connection string
4. Add all environment variables in the Vercel dashboard
5. The `vercel.json` cron runs daily at 6:00 AM UTC

## Self-hosting

Any Node.js host works. Set up an external cron to hit `GET /api/cron` with the header:

```
Authorization: Bearer <CRON_SECRET>
```

## Development notes

For local OAuth to work, Spotify requires HTTPS. Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/):

```bash
cloudflared tunnel --url http://localhost:3000
```

Set `AUTH_URL` to the generated `https://*.trycloudflare.com` URL and add it as a redirect URI in your Spotify app.

## License

MIT
