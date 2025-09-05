module.exports = {
  apps: [{
    name: 'test-pm2-simple',
    script: 'node',
    args: 'test-pm2-logs.js',
    cwd: '/var/www/ccc',
    instances: 1,
    autorestart: false,
    max_memory_restart: '100M',
    error_file: '/var/www/ccc/logs/test-simple-err.log',
    out_file: '/var/www/ccc/logs/test-simple-out.log',
    log_file: '/var/www/ccc/logs/test-simple-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    env: {
      NODE_ENV: 'production',
      PORT: '3001'  // Use different port to avoid conflicts
    }
  }]
};
