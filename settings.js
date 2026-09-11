// Centralized runtime settings for Minecraft Agent.
// Edit this file to configure the Minecraft server, account auth, and dashboard.
// Environment variables override these defaults when provided by the host.

module.exports = {
  minecraft: {
    host: process.env.MC_HOST || 'YOUR_SERVER_IP',
    port: Number(process.env.MC_PORT || 25565),
    username: process.env.MC_USERNAME || 'MinecraftAgent',
    auth: process.env.MC_AUTH || 'offline',
    version: process.env.MC_VERSION || false,
    hideErrors: false,
    autoConnect: process.env.MC_AUTO_CONNECT !== 'false',
    autoReconnect: process.env.MC_AUTO_RECONNECT !== 'false',
    reconnectDelay: Number(process.env.MC_RECONNECT_DELAY || 5000),
    maxReconnectAttempts: Number(process.env.MC_MAX_RECONNECT_ATTEMPTS || 0)
  },

  // Chat-based authentication for offline/cracked servers using AuthMe-like plugins.
  // Password is never returned by the web status/settings APIs.
  autoAuth: {
    enabled: process.env.AUTO_AUTH_ENABLED !== 'false',
    password: process.env.MC_PASSWORD || 'CHANGE_ME',
    logging: process.env.AUTO_AUTH_LOGGING === 'true',
    ignoreRepeat: process.env.AUTO_AUTH_IGNORE_REPEAT !== 'false'
  },

  web: {
    host: process.env.WEB_HOST || '0.0.0.0',
    port: Number(process.env.PORT || process.env.WEB_PORT || 3000)
  },

  agent: {
    logLimit: Number(process.env.LOG_LIMIT || 200),
    uiTitle: process.env.UI_TITLE || 'Minecraft Agent'
  }
};
