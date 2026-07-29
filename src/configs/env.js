const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 3000;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

module.exports = {
  port,
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  jwtSecret,
  jwtExpiresIn,
};
