module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'app',
      script    : './src/server/app.js',
      watch     : true
    },

    // Second application
    {
      name      : 'update',
      script    : './gitpull.js'
    }
  ]
};
