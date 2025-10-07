
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'dbuser',
  password: process.env.DB_PASSWORD || 'dbpass',
  database: process.env.DB_NAME || 'zillow',
  connectTimeout: 30000,
  acquireTimeout: 30000,
});

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

async function clearDatabase() {
  let conn;
  try {
    conn = await getConnectionWithRetry();

    console.log('🗑️  Truncating tables...');
    await conn.query('SET foreign_key_checks=0');

    const tables = ['inquiries', 'favorites', 'property_images', 'properties', 'users'];
    for (const table of tables) {
      try {
        await conn.query(`TRUNCATE TABLE ${table}`);
        console.log(`✓ Truncated ${table}`);
      } catch (err) {
        console.error(`✗ Failed to truncate ${table}: ${err.message}`);
        throw err;
      }
    }

    await conn.query('SET foreign_key_checks=1');
    console.log('\n✓ All tables truncated successfully.');
  } catch (error) {
    console.error('\n✗ Failed to clear database:', error.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

clearDatabase();
