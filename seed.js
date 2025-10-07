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
        `INSERT INTO users (username, email, password_hash, phone_number, created_at) VALUES ${placeholders}`,
        flatValues
      );
      process.stdout.write(`Inserted users: ${Math.min(i + BATCH_SIZE, total)}\r`);
    }
    console.log('\nUsers inserted.');
  } finally {
    conn.release();
  }
}

async function insertProperties(total = 2000000) {
  console.log(`Inserting ${total} properties...`);
  const conn = await pool.getConnection();
  const [{ minUserId }] = await conn.query('SELECT MIN(user_id) AS minUserId FROM users');
  const [{ maxUserId }] = await conn.query('SELECT MAX(user_id) AS maxUserId FROM users');

  const propertyTypes = ['condo', 'house', 'apartment', 'townhouse', 'land'];
  const statuses = ['active', 'sold', 'pending'];
  const cities = ['Tallinn', 'Tartu', 'Pärnu', 'Narva', 'Viljandi', 'Rakvere'];
  const states = ['Harju', 'Tartu', 'Pärnu', 'Ida-Viru', 'Viljandi', 'Lääne-Viru'];

  try {
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        const owner_id = faker.datatype.number({ min: minUserId, max: maxUserId });
        const city = faker.helpers.arrayElement(cities);
        const state = faker.helpers.arrayElement(states);
        const bedrooms = faker.datatype.number({ min: 1, max: 7 });
        const bathrooms = faker.datatype.number({ min: 1, max: 5 });
        const sqft = faker.datatype.number({ min: 400, max: 10000 });
        const price = faker.datatype.number({ min: 30000, max: 1000000 });
        const property_type = faker.helpers.arrayElement(propertyTypes);
        const status = faker.helpers.arrayElement(statuses);
        const address = faker.address.streetAddress();
        const zipcode = faker.address.zipCode('#####');
        const description = faker.lorem.sentences(3);
        const listing_at = faker.date.past(2).toISOString().slice(0, 19).replace('T', ' ');

        batch.push([
          owner_id,
          address,
          city,
          state,
          zipcode,
          price,
          description,
          bedrooms,
          bathrooms,
          sqft,
          listing_at,
          status,
          property_type,
        ]);
      }
      const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT INTO properties
        (owner_id, address, city, state, zipcode, price, description, bedrooms, bathrooms, sqft, listing_at, status, property_type)
        VALUES ${placeholders}`,
        flatValues
      );
      process.stdout.write(`Inserted properties: ${Math.min(i + BATCH_SIZE, total)}\r`);
    }
    console.log('\nProperties inserted.');
  } finally {
    conn.release();
  }
}

async function insertPropertyImages() {
  console.log('Inserting property images...');
  const conn = await pool.getConnection();
  const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
  const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

  const imagesPerProperty = 5;
  const totalProperties = maxPropId - minPropId + 1;
  const totalImages = totalProperties * imagesPerProperty;

  try {
    for (let i = 0; i < totalImages; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < totalImages; j++) {
        const property_id = minPropId + Math.floor((i + j) / imagesPerProperty);
        const img_order = ((i + j) % imagesPerProperty) + 1;
        const img_url = `https://picsum.photos/seed/${property_id}-${img_order}/800/600`;
        const alt_text = `Property ${property_id} image ${img_order}`;
        batch.push([property_id, img_url, img_order, alt_text]);
      }
      const placeholders = batch.map(() => '(?,?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT INTO property_images (property_id, img_url, img_order, alt_text) VALUES ${placeholders}`,
        flatValues
      );
      process.stdout.write(`Inserted property images: ${Math.min(i + BATCH_SIZE, totalImages)}\r`);
    }
    console.log('\nProperty images inserted.');
  } finally {
    conn.release();
  }
}

async function insertFavorites(total = 1000000) {
  console.log(`Inserting ${total} favorites...`);
  const conn = await pool.getConnection();
  const [{ minUserId }] = await conn.query('SELECT MIN(user_id) AS minUserId FROM users');
  const [{ maxUserId }] = await conn.query('SELECT MAX(user_id) AS maxUserId FROM users');
  const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
  const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

  const uniquePairs = new Set();

  try {
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      while (batch.length < BATCH_SIZE && uniquePairs.size < total) {
        const user_id = faker.datatype.number({ min: minUserId, max: maxUserId });
        const property_id = faker.datatype.number({ min: minPropId, max: maxPropId });
        const key = `${user_id}-${property_id}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.add(key);
          batch.push([user_id, property_id, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
        }
      }
      if (batch.length === 0) break;
      const placeholders = batch.map(() => '(?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT INTO favorites (user_id, property_id, created_at) VALUES ${placeholders}`,
        flatValues
      );
      process.stdout.write(`Inserted favorites: ${uniquePairs.size}\r`);
    }
    console.log('\nFavorites inserted.');
  } finally {
    conn.release();
  }
}

async function insertInquiries(total = 500000) {
  console.log(`Inserting ${total} inquiries...`);
  const conn = await pool.getConnection();
  const [{ minUserId }] = await conn.query('SELECT MIN(user_id) AS minUserId FROM users');
  const [{ maxUserId }] = await conn.query('SELECT MAX(user_id) AS maxUserId FROM users');
  const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
  const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

  const agentRatio = 0.2;

  try {
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        const user_id = faker.datatype.number({ min: minUserId, max: maxUserId });
        const property_id = faker.datatype.number({ min: minPropId, max: maxPropId });
        const agent_id = Math.random() < agentRatio ? faker.datatype.number({ min: minUserId, max: maxUserId }) : null;

        let message = null;
        let phone_number = null;
        if (Math.random() < 0.5) {
          message = faker.lorem.sentence();
        } else {
          phone_number = faker.phone.number('+372 ### ####');
        }

        const inquiry_at = faker.date.recent(90).toISOString().slice(0, 19).replace('T', ' ');

        batch.push([user_id, property_id, agent_id, message, phone_number, inquiry_at]);
      }
      const placeholders = batch.map(() => '(?,?,?,?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT INTO inquiries (user_id, property_id, agent_id, message, phone_number, inquiry_at) VALUES ${placeholders}`,
        flatValues
      );
      process.stdout.write(`Inserted inquiries: ${Math.min(i + BATCH_SIZE, total)}\r`);
    }
    console.log('\nInquiries inserted.');
  } finally {
    conn.release();
  }
}

async function main() {
  await insertUsers();
  await insertProperties();
  await insertPropertyImages();
  await insertFavorites();
  await insertInquiries();
  pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
