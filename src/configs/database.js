require('dotenv').config();

const { port, dbHost, dbPort, dbUser, dbPassword, dbName } = require('./env');
const { Pool } = require('pg');

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  // Render's managed Postgres (and most hosted providers) require SSL and
  // present a certificate not signed by Node's default trusted CAs. Local
  // Postgres (host = localhost/127.0.0.1) needs neither.
  ssl:
    dbHost && dbHost !== 'localhost' && dbHost !== '127.0.0.1'
      ? { rejectUnauthorized: false }
      : false,
});

module.exports = pool;
