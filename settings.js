// Centralized runtime settings for Minecraft Agent.
// Edit this file to configure the Minecraft server and web dashboard.
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
    reconnectDelay: Number(process.env.MC_RECONNECT_DELAY || 5000)
  },

  web: {
    host: process.env.WEB_HOST || '0.0.0.0',
    port: Number(process.env.PORT || process.env.WEB_PORT || 3000)
  },

  agent: {
    logLimit: Number(process.env.LOG_LIMIT || 200)
  }
};
