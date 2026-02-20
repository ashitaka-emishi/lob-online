// PM2 process manager configuration
// Usage:
//   Start:   pm2 start ecosystem.config.cjs --env production
//   Reload:  pm2 reload ecosystem.config.cjs --env production
//   Logs:    pm2 logs lob-online

module.exports = {
  apps: [
    {
      name: 'lob-online',
      script: 'server/src/server.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',

      // Production environment variables are set here (not via .env files)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Remaining secrets injected via Droplet environment or PM2 secrets:
        // JWT_SECRET, SQLITE_PATH, DO_SPACES_*, DISCORD_*
      },

      // Logging
      log_file: '/var/log/lob-online/combined.log',
      error_file: '/var/log/lob-online/error.log',
      out_file: '/var/log/lob-online/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Restart policy
      max_restarts: 10,
      min_uptime: '5s',
      restart_delay: 2000,
    },
  ],
};
