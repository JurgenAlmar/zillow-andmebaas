import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'dbuser',
  password: process.env.DB_PASSWORD || 'dbpass',
  database: process.env.DB_NAME || 'zillow',
  connectionLimit: 5,
});

const queries = [
  {
    name: '1️⃣ Kuvab kõik aktiivsed kuulutused, hinnatud alates odavaimast',
    sql: `
      SELECT
        p.property_id AS ID,
        p.address AS Aadress,
        p.city AS Linn,
        p.price AS Hind,
        p.property_type AS Tüüp
      FROM properties p
      WHERE p.status = 'active'
      ORDER BY p.price ASC
      LIMIT 10;
    `
  },
  {
    name: '2️⃣ Kuvab iga kasutaja ja tema lisatud kinnisvara koguarvu',
    sql: `
      SELECT
        u.username AS Kasutaja,
        COUNT(p.property_id) AS 'Lisatud kuulutused'
      FROM users u
      LEFT JOIN properties p ON u.user_id = p.owner_id
      GROUP BY u.user_id
      ORDER BY COUNT(p.property_id) DESC
      LIMIT 10;
    `
  },
  {
    name: '3️⃣ Kuvab populaarsemad linnad, kus on üle 1 kuulutuse',
    sql: `
      SELECT
        p.city AS Linn,
        COUNT(p.property_id) AS 'Kuulutuste arv'
      FROM properties p
      GROUP BY p.city
      HAVING COUNT(p.property_id) > 1000
      ORDER BY COUNT(p.property_id) DESC
      LIMIT 10;
    `
  },
  {
    name: '4️⃣ Kuvab kasutajate lemmikuks märgitud kuulutused koos kasutajanime ja hinnaga',
    sql: `
      SELECT
        u.username AS Kasutaja,
        p.address AS Aadress,
        p.price AS Hind
      FROM favorites f
      INNER JOIN users u ON f.user_id = u.user_id
      INNER JOIN properties p ON f.property_id = p.property_id
      ORDER BY u.username
      LIMIT 10;
    `
  },
  {
    name: '5️⃣ Kuvab kinnisvarad, millel on kõige rohkem pilte (praktiline statistika)',
    sql: `
      SELECT
        p.property_id AS Kinnisvara_ID,
        p.address AS Aadress,
        p.city AS Linn,
        p.price AS Hind,
        COUNT(pi.img_id) AS 'Piltide arv'
      FROM properties p
      LEFT JOIN property_images pi ON p.property_id = pi.property_id
      GROUP BY p.property_id, p.address, p.city, p.price
      ORDER BY COUNT(pi.img_id) DESC
      LIMIT 10;
    `
  },
  {
    name: '6️⃣ Kuvab kõik päringud (viimased 30 päeva) koos kasutaja ja kinnisvara andmetega',
    sql: `
      SELECT
        i.inquiry_id AS Päringu_ID,
        u.username AS Küsimuse_esitaja,
        p.address AS Kinnisvara_aadress,
        i.message AS Sõnum,
        i.inquiry_at AS Kuupäev
      FROM inquiries i
      INNER JOIN users u ON i.user_id = u.user_id
      INNER JOIN properties p ON i.property_id = p.property_id
      WHERE i.inquiry_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND (p.status IS NULL OR p.status = 'active')
      ORDER BY i.inquiry_at DESC
      LIMIT 10;
    `
  }
];

async function runQueries() {
  const conn = await pool.getConnection();

  try {
    for (const query of queries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(query.name);
      console.log('='.repeat(80));

      const startTime = Date.now();
      try {
        const results = await conn.query(query.sql);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Query completed in ${duration}s - ${Array.isArray(results) ? results.length : 0} rows returned`);
        console.table(results);
      } catch (err) {
        console.error(`Query failed: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Error running queries:', error);
  } finally {
    try {
      conn.release();
    } catch (e) {}
    await pool.end();
  }
}

runQueries();
