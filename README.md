# Minecraft Agent

A modular Mineflayer Minecraft bot with deterministic gameplay modes and a lightweight web dashboard. No LLM is required for the included control modes.

## Features
- Mine resources, diamond and iron
- Strip mining at configured Y-levels
- Explore nearby areas and patrol around the current position
- Build a simple protected home structure
- Eat food automatically from inventory
- Drop common trash and store non-food items in a nearby chest/barrel
- Auto-connect and auto-reconnect with bounded retries
- Runtime connection changes from the dashboard
- Live health, food, position, inventory and logs in the web dashboard
- Remote mode control over HTTP
- Node.js hosting support through `PORT` on `0.0.0.0`
- Health endpoint at `/healthz` for hosted deployments
- AuthMe-like server chat authentication through `mineflayer-auto-auth`

## Setup

```sh
npm install
npm start
```

The web server reads the platform-provided `PORT` when present and binds to `WEB_HOST` (default `0.0.0.0`). This means hosts such as Render, Railway, Fly.io, and similar Node.js platforms can expose the dashboard without hardcoding a web port.

Edit `settings.js` or provide environment variables:

```text
MC_HOST=your.server.address
MC_PORT=25565
MC_USERNAME=MinecraftAgent
MC_AUTH=offline
MC_PASSWORD=your_authme_password
AUTO_AUTH_ENABLED=true
PORT=3000
WEB_HOST=0.0.0.0
```

The AutoAuth password is kept server-side and is never included in `/api/status` or `/api/settings` responses.

Open the dashboard at the URL supplied by your Node.js host. Locally, use `http://localhost:3000` when `PORT=3000`.

## Dashboard modes

- **AFK**: keep the bot connected and idle.
- **Mine**: find and mine a nearby ore.
- **Diamond / Iron**: mine multiple nearby target ores.
- **Strip Mine**: move to the configured mining level and search branches for ores.
- **Explore**: move in a random cardinal direction by a bounded distance.
- **Patrol**: walk a square patrol around the starting position.
- **Build Home**: build a small material-backed home shell around the current/home position.
- **Eat**: eat a suitable inventory food when hunger is low.
- **Cleanup**: drop selected low-value/trash items.
- **Store**: deposit non-food inventory into a nearby chest/barrel.
- **Stop**: cancel the current pathfinding goal.

## HTTP API

`GET /api/status` returns connection state, active mode, player stats, inventory and logs.

`GET /api/settings` returns non-secret runtime settings and Node.js runtime information.

`GET /healthz` returns a simple hosting health check.

`POST /api/connect` accepts `{ "host", "port", "username" }` and reconnects when an existing session is active.

`POST /api/disconnect` disconnects the bot and disables automatic reconnect until a new connection is requested.

`POST /api/reconnect` reconnects using configured settings.

`POST /api/mode` accepts `{ "mode", "args": [] }`.

The legacy `POST /cli` endpoint remains available for compatible CLI commands.

## Notes

Minecraft versions, server authentication, and anti-cheat behavior can affect which actions succeed in a live server. The bot is intended to behave like a normal gameplay automation client, not to evade anti-bot or anti-cheat detection. Test gameplay actions on the target server before unattended use.

## License
ISC
