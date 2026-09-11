# Minecraft Agent

A modular Mineflayer Minecraft bot with deterministic gameplay modes and a lightweight web dashboard. No LLM is required for the included control modes.

## Features
- Mine resources, diamond and iron
- Strip mining at configured Y-levels
- Explore nearby areas and patrol around the current position
- Build a simple protected home structure
- Eat food automatically from inventory
- Drop common trash and store non-food items in a nearby chest/barrel
- Auto-connect and auto-reconnect
- Live health, food, position, inventory and logs in the web dashboard
- Remote mode control over HTTP
- Node.js hosting support through `PORT`

## Setup

```sh
npm install
```

Edit `settings.js`:

```js
minecraft: {
  host: 'your.server.address',
  port: 25565,
  username: 'MinecraftAgent',
  auth: 'offline'
}
```

Start the server:

```sh
npm start
```

Open the dashboard at `http://localhost:3000` (or the URL/port supplied by your Node.js host).

### Environment variables

`MC_HOST`, `MC_PORT`, `MC_USERNAME`, `MC_AUTH`, `MC_VERSION`, `MC_AUTO_CONNECT`, `MC_AUTO_RECONNECT`, `MC_RECONNECT_DELAY`, `MC_MAX_RECONNECT_ATTEMPTS`, `PORT`, `WEB_PORT`, `WEB_HOST`, `LOG_LIMIT`, and `UI_TITLE` can override `settings.js` defaults.

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

`POST /api/connect` accepts `{ "host", "port", "username" }`.

`POST /api/disconnect` disconnects the bot.

`POST /api/reconnect` reconnects using configured settings.

`POST /api/mode` accepts `{ "mode", "args": [] }`.

The legacy `POST /cli` endpoint remains available for compatible CLI commands.

## Notes

Minecraft versions, server authentication, and anti-cheat behavior can affect which actions succeed in a live server. Gameplay actions should be tested on the target server before unattended use.

## License
ISC
