require('dotenv').config();

const nodemailer = require('nodemailer');

const { Pool } = require('pg');
const isProduction = process.env.NODE_ENV === 'production';

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
  ssl: isProduction,
});

let transportDetails = {};
if (isProduction) {
    transportDetails = {
        service: 'gmail',
        auth: {
               user: 'concert.digest@gmail.com',
               pass: 'concert#88'
           }
    };
} else {
    transportDetails = {
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'theron60@ethereal.email',
            pass: 'n2NGsB3FbJJ4CwZfZq'
        }
    };
}
const transport = nodemailer.createTransport(transportDetails);

module.exports = { pool, transport};