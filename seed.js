import mariadb from 'mariadb';
import { faker } from '@faker-js/faker';

faker.seed(12345); // Reprodutseeritavus

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'user',       
  password: 'Passw0rd',   
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
          faker.internet.userName() + faker.datatype.number({ max: 9999 }), // et ei korduks
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

  // Eeldame, et users on juba olemas
  // Loeme user_id-de hulga (min ja max)
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

  // Loeme property_id min ja max
  const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
  const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

  // Ligikaudu keskmiselt 5 pilti kinnisvara kohta, kokku ~10M rida
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

  // Hoian favorite'i paaride unikaalsust kontrolli all
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

  const agentRatio = 0.2; // 20% päringutest on agentidega

  try {
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        const user_id = faker.datatype.number({ min: minUserId, max: maxUserId });
        const property_id = faker.datatype.number({ min: minPropId, max: maxPropId });
        const agent_id = Math.random() < agentRatio ? faker.datatype.number({ min: minUserId, max: maxUserId }) : null;

        // Sõnum või telefon peab olema olemas, juhuslik valik
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

async function disableIndexesAndFKs() {
  const conn = await pool.getConnection();
  try {
    console.log('Disabling foreign key checks and indexes...');
    await conn.query('SET FOREIGN_KEY_CHECKS=0;');

    // Indekseid võiks siin eemaldada või keelata vastavalt vajadusele,
    // aga MariaDB-s ei saa indekseid lihtsalt keelata, neid saab kustutada ja hiljem taastada.

  } finally {
    conn.release();
  }
}

async function enableIndexesAndFKs() {
  const conn = await pool.getConnection();
  try {
    console.log('Enabling foreign key checks...');
    await conn.query('SET FOREIGN_KEY_CHECKS=1;');

  } finally {
    conn.release();
  }
}

async function main() {
  try {
    await disableIndexesAndFKs();

    await insertUsers(200000);
    await insertProperties(2000000);
    await insertPropertyImages();
    await insertFavorites(1000000);
    await insertInquiries(500000);

    await enableIndexesAndFKs();

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await pool.end();
  }
}

main();
