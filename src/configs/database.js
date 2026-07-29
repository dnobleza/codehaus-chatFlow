require('dotenv').config();

const { port, dbHost, dbPort, dbUser, dbPassword, dbName } = require('./env');
const { Pool } = require('pg');

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
});

module.exports = pool;
