require('dotenv').config();

const postgreConfig = {
  user: process.env.POSTGRE_USER,
  host: process.env.POSTGRE_HOST_URL,
  database: process.env.POSTGRE_DATABASE, 
  password: process.env.POSTGRE_PASSWORD,
  port: process.env.POSTGRE_PORT,
  mongodb: process.env.MONGODB_URL
}
module.exports = postgreConfig;
