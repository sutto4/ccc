module.exports = {
  apps: [{
    name: 'test-logging',
    script: 'node',
    args: 'test-simple.js',
    cwd: '/var/www/ccc',
    instances: 1,
    autorestart: false,
    error_file: '/var/www/ccc/logs/test-err.log',
    out_file: '/var/www/ccc/logs/test-out.log',
    log_file: '/var/www/ccc/logs/test-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
