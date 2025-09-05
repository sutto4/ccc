module.exports = {
  apps: [{
    name: 'test-startup',
    script: 'node',
    args: 'test-startup.js',
    cwd: '/var/www/ccc',
    instances: 1,
    autorestart: false,
    error_file: '/var/www/ccc/logs/test-startup-err.log',
    out_file: '/var/www/ccc/logs/test-startup-out.log',
    log_file: '/var/www/ccc/logs/test-startup-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    env: {
      NODE_ENV: 'production',
      PORT: '3000'
    }
  }]
};
