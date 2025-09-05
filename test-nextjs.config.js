module.exports = {
  apps: [{
    name: 'test-nextjs',
    script: 'node',
    args: 'minimal-startup-test.js',
    cwd: '/var/www/ccc',
    instances: 1,
    autorestart: false,
    error_file: '/var/www/ccc/logs/test-nextjs-err.log',
    out_file: '/var/www/ccc/logs/test-nextjs-out.log',
    log_file: '/var/www/ccc/logs/test-nextjs-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
