module.exports = {
  apps: [
    {
      name: 'coronameter',
      script: 'dist/main.js',
      instances: 3,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'coronameter-task-runner',
      script: 'dist/task-runner.js',
      instances: 2,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
