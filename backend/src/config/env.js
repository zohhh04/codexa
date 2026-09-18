require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:2000',
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
