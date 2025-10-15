import mariadb from 'mariadb';
import { faker } from '@faker-js/faker';

faker.seed(12345);

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'dbuser',
  password: process.env.DB_PASSWORD || 'dbpass',
  database: process.env.DB_NAME || 'zillow',
  connectionLimit: 10,
  multipleStatements: true,
  connectTimeout: 30000,
  acquireTimeout: 30000,
});

const BATCH_SIZE = 50000;

// Connection retry helper
async function getConnectionWithRetry(maxRetries = 5, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✓ Database connection established');
      return conn;
    } catch (error) {
      console.log(`Connection attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
      if (i < maxRetries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }
    }
  }
}

async function insertUsers(total = 2000000) {
  console.log(`Inserting ${total} users...`);
  const conn = await getConnectionWithRetry();

  try {
    await conn.query('SET autocommit=0');
    await conn.query('SET unique_checks=0');
    await conn.query('SET foreign_key_checks=0');

    const BATCH_SIZE = 5000;
    let inserted = 0;
    let attempts = 0;
    const maxAttempts = total * 2; // Prevent infinite loops

    while (inserted < total && attempts < maxAttempts) {
      const batch = [];

      for (let i = 0; i < BATCH_SIZE && inserted + batch.length < total; i++) {
        attempts++;
        const username = faker.internet.username() + faker.number.int({ max: 9999 });
        const email = faker.internet.email();

        batch.push([
          username,
          email,
          faker.internet.password(),
          `+372${faker.string.numeric(8)}`,
          faker.date.past({ years: 5 }).toISOString().slice(0, 19).replace('T', ' ')
        ]);
      }

      if (batch.length === 0) break;

      const placeholders = batch.map(() => '(?,?,?,?,?)').join(',');
      const flatValues = batch.flat();

      try {
        await conn.query(
          `INSERT IGNORE INTO users (username, email, password_hash, phone_number, created_at)
           VALUES ${placeholders}`,
          flatValues
        );
      } catch (err) {
        console.error(`\nError inserting batch at ${inserted}: ${err.message}`);
        await conn.query('ROLLBACK');
        throw err;
      }

      inserted += batch.length;

      if (inserted % 10000 === 0) {
        await conn.query('COMMIT');
        await conn.query('START TRANSACTION');
      }

      process.stdout.write(`Inserted users: ${inserted}\r`);
    }

    await conn.query('COMMIT');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    console.log('\nAll users inserted.');
  } catch (error) {
    console.error('\n✗ Error in insertUsers:', error.message);
    await conn.query('ROLLBACK');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    throw error;
  } finally {
    conn.release();
  }
}


async function insertProperties(total = 2000000) {
  console.log(`Inserting ${total} properties...`);
  const conn = await getConnectionWithRetry();

  try {
    await conn.query('SET autocommit=0');
    await conn.query('SET unique_checks=0');
    await conn.query('SET foreign_key_checks=0');
    const [{ minUserId }] = await conn.query('SELECT MIN(user_id) AS minUserId FROM users');
    const [{ maxUserId }] = await conn.query('SELECT MAX(user_id) AS maxUserId FROM users');

    const propertyTypes = ['condo', 'house', 'apartment', 'townhouse', 'land'];
    const statuses = ['active', 'sold', 'pending'];
    const cities = ['Tallinn', 'Tartu', 'Pärnu', 'Narva', 'Viljandi', 'Rakvere'];
    const states = ['Harju', 'Tartu', 'Pärnu', 'Ida-Viru', 'Viljandi', 'Lääne-Viru'];

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        const owner_id = faker.number.int({ min: minUserId, max: maxUserId });
        const city = faker.helpers.arrayElement(cities);
        const state = faker.helpers.arrayElement(states);
        const bedrooms = faker.number.int({ min: 1, max: 7 });
        const bathrooms = faker.number.int({ min: 1, max: 5 });
        const sqft = faker.number.int({ min: 400, max: 10000 });
        const price = faker.number.int({ min: 30000, max: 1000000 });
        const property_type = faker.helpers.arrayElement(propertyTypes);
        const status = faker.helpers.arrayElement(statuses);
        const address = faker.location.streetAddress();
        const zipcode = faker.location.zipCode('#####');
        const description = faker.lorem.sentences(3);
        const listing_at = faker.date.past({ years: 2 }).toISOString().slice(0, 19).replace('T', ' ');

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

      try {
        await conn.query(
          `INSERT INTO properties
          (owner_id, address, city, state, zipcode, price, description, bedrooms, bathrooms, sqft, listing_at, status, property_type)
          VALUES ${placeholders}`,
          flatValues
        );
      } catch (err) {
        console.error(`\nError inserting batch at ${i}: ${err.message}`);
        await conn.query('ROLLBACK');
        throw err;
      }

      if ((i + BATCH_SIZE) % 100000 === 0) {
        await conn.query('COMMIT');
        await conn.query('START TRANSACTION');
      }

      process.stdout.write(`Inserted properties: ${Math.min(i + BATCH_SIZE, total)}\r`);
    }
    await conn.query('COMMIT');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    console.log('\nProperties inserted.');
  } catch (error) {
    console.error('\n✗ Error in insertProperties:', error.message);
    await conn.query('ROLLBACK');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    throw error;
  } finally {
    conn.release();
  }
}

async function insertPropertyImages(total = 2000000) {
  console.log(`Inserting ${total} property images...`);
  const conn = await getConnectionWithRetry();

  try {
    await conn.query('SET autocommit=0');
    await conn.query('SET unique_checks=0');
    await conn.query('SET foreign_key_checks=0');

    const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
    const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        const property_id = faker.number.int({ min: minPropId, max: maxPropId });
        const img_order = faker.number.int({ min: 1, max: 10 });
        const img_url = `https://picsum.photos/seed/${property_id}-${img_order}-${i + j}/800/600`;
        const alt_text = `Property ${property_id} image ${img_order}`;
        batch.push([property_id, img_url, img_order, alt_text]);
      }
      const placeholders = batch.map(() => '(?,?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT IGNORE INTO property_images (property_id, img_url, img_order, alt_text) VALUES ${placeholders}`,
        flatValues
      );

      if ((i + BATCH_SIZE) % 100000 === 0) {
        await conn.query('COMMIT');
        await conn.query('START TRANSACTION');
      }

      process.stdout.write(`Inserted property images: ${Math.min(i + BATCH_SIZE, total)}\r`);
    }

    await conn.query('COMMIT');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    console.log('\nProperty images inserted.');
  } catch (error) {
    console.error('\n✗ Error in insertPropertyImages:', error.message);
    await conn.query('ROLLBACK');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    throw error;
  } finally {
    conn.release();
  }
}

async function insertFavorites(total = 2000000) {
  console.log(`Inserting ${total} favorites...`);
  const conn = await getConnectionWithRetry();

  try {
    await conn.query('SET autocommit=0');
    await conn.query('SET unique_checks=0');
    await conn.query('SET foreign_key_checks=0');

    const [{ minUserId }] = await conn.query('SELECT MIN(user_id) AS minUserId FROM users');
    const [{ maxUserId }] = await conn.query('SELECT MAX(user_id) AS maxUserId FROM users');
    const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
    const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

    const uniquePairs = new Set();

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      while (batch.length < BATCH_SIZE && uniquePairs.size < total) {
        const user_id = faker.number.int({ min: minUserId, max: maxUserId });
        const property_id = faker.number.int({ min: minPropId, max: maxPropId });
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
        `INSERT IGNORE INTO favorites (user_id, property_id, created_at) VALUES ${placeholders}`,
        flatValues
      );

      if ((i + BATCH_SIZE) % 100000 === 0) {
        await conn.query('COMMIT');
        await conn.query('START TRANSACTION');
      }

      process.stdout.write(`Inserted favorites: ${uniquePairs.size}\r`);
    }

    await conn.query('COMMIT');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    console.log('\nFavorites inserted.');
  } catch (error) {
    console.error('\n✗ Error in insertFavorites:', error.message);
    await conn.query('ROLLBACK');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    throw error;
  } finally {
    conn.release();
  }
}

async function insertInquiries(total = 2000000) {
  console.log(`Inserting ${total} inquiries...`);
  const conn = await getConnectionWithRetry();

  try {
    await conn.query('SET autocommit=0');
    await conn.query('SET unique_checks=0');
    await conn.query('SET foreign_key_checks=0');

    const [{ minUserId }] = await conn.query('SELECT MIN(user_id) AS minUserId FROM users');
    const [{ maxUserId }] = await conn.query('SELECT MAX(user_id) AS maxUserId FROM users');
    const [{ minPropId }] = await conn.query('SELECT MIN(property_id) AS minPropId FROM properties');
    const [{ maxPropId }] = await conn.query('SELECT MAX(property_id) AS maxPropId FROM properties');

    const agentRatio = 0.2;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && i + j < total; j++) {
        const user_id = faker.number.int({ min: minUserId, max: maxUserId });
        const property_id = faker.number.int({ min: minPropId, max: maxPropId });
        const agent_id = Math.random() < agentRatio
          ? faker.number.int({ min: minUserId, max: maxUserId })
          : null;
        const message = faker.lorem.sentences(2);
        const inquiry_at = faker.date.past({ years: 1 }).toISOString().slice(0, 19).replace('T', ' ');

        batch.push([user_id, property_id, agent_id, message, inquiry_at]);
      }
      const placeholders = batch.map(() => '(?,?,?,?,?)').join(',');
      const flatValues = batch.flat();
      await conn.query(
        `INSERT INTO inquiries (user_id, property_id, agent_id, message, inquiry_at) VALUES ${placeholders}`,
        flatValues
      );

      if ((i + BATCH_SIZE) % 100000 === 0) {
        await conn.query('COMMIT');
        await conn.query('START TRANSACTION');
      }

      process.stdout.write(`Inserted inquiries: ${Math.min(i + BATCH_SIZE, total)}\r`);
    }

    await conn.query('COMMIT');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    console.log('\nInquiries inserted.');
  } catch (error) {
    console.error('\n✗ Error in insertInquiries:', error.message);
    await conn.query('ROLLBACK');
    await conn.query('SET unique_checks=1');
    await conn.query('SET foreign_key_checks=1');
    throw error;
  } finally {
    conn.release();
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting database seeding...\n');

  try {
    await insertUsers();
    await insertProperties();
    await insertPropertyImages();
    await insertFavorites();
    await insertInquiries();

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✓ All data inserted successfully in ${duration} minutes`);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
