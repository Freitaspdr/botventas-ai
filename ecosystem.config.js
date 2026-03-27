module.exports = {
  apps: [
    {
      name: 'botventas-backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/botventas/error.log',
      out_file: '/var/log/botventas/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
