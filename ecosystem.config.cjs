module.exports = {
  apps: [
    {
      name: 'aliconcon-ecommerce_client-customer',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
    },
  ],
};
