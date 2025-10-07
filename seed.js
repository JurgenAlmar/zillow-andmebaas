import mariadb from 'mariadb';
import { Faker, en } from '@faker-js/faker';

const faker = new Faker({ locale: [en] });
faker.seed(12345);

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'dbuser',
  password: 'dbpass',
  database: 'zillow',
  connectionLimit: 5,
});

const BATCH_SIZE = 10000;

async function insertUsers(total = 200000) {
  console.log(`Inserting ${total} users...`);
  const conn = await pool.getConnection();
  try {
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        batch.push([
          faker.internet.userName() + faker.datatype.number({ max: 9999 }),
          faker.internet.email(),
          faker.internet.password(),
          faker.phone.number('+372 ### ####'),
          faker.date.past(5).toISOString().slice(0, 19).replace('T', ' '),
        ]);
      }
      const placeholders = batch.map(() => '(?,?,?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT INTO users (username, email, password_hash, ph_
