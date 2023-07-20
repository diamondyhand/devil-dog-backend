const postgreConfig = require('../config');

const { Client } = require('pg');

const client = new Client({
  user: postgreConfig.user,
  host: postgreConfig.host,
  database: postgreConfig.database,
  password: postgreConfig.password,
  port: postgreConfig.port,
});
// client.connect();

module.exports = client;
