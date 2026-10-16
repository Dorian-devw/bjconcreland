'use strict';
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sc5loig2007_ecommercedb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Fallback DDL used when SHOW CREATE TABLE also fails (deep InnoDB corruption).
const FALLBACK_DDL = {
  users: `CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  products: `CREATE TABLE products (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, price DECIMAL(10,2) NOT NULL, image TEXT, category VARCHAR(255) NOT NULL, store_filter_key VARCHAR(255), subcategory VARCHAR(255), description TEXT, stock INT NOT NULL DEFAULT 0, rating FLOAT, original_price DECIMAL(10,2), tag VARCHAR(100), created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  orders: `CREATE TABLE orders (id VARCHAR(255) PRIMARY KEY, customer_name VARCHAR(255) NOT NULL, customer_phone VARCHAR(50) NOT NULL, customer_address TEXT NOT NULL, customer_notes TEXT, total DECIMAL(10,2) NOT NULL, payment_method VARCHAR(50) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'pending', stripe_payment_id VARCHAR(255), created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  order_items: `CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id VARCHAR(255) NOT NULL, product_id VARCHAR(255) NOT NULL, product_name VARCHAR(255) NOT NULL, product_price DECIMAL(10,2) NOT NULL, product_image TEXT, quantity INT NOT NULL) ENGINE=InnoDB`,
  carousel_slides: `CREATE TABLE carousel_slides (id INT AUTO_INCREMENT PRIMARY KEY, image TEXT NOT NULL, alt VARCHAR(255) NOT NULL DEFAULT '', title VARCHAR(255) DEFAULT '', highlight VARCHAR(255) DEFAULT '', description TEXT, sort_order INT NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  promo_banners: `CREATE TABLE promo_banners (id INT AUTO_INCREMENT PRIMARY KEY, image TEXT NOT NULL, title VARCHAR(255) NOT NULL DEFAULT '', description TEXT, sort_order INT NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  offers: `CREATE TABLE offers (id INT AUTO_INCREMENT PRIMARY KEY, product_id VARCHAR(255) NOT NULL, discount_percent DECIMAL(5,2) NOT NULL, valid_until DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  app_settings: `CREATE TABLE app_settings (\`key\` VARCHAR(100) PRIMARY KEY, \`value\` TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  categories: `CREATE TABLE categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, icon VARCHAR(255) NOT NULL DEFAULT 'Wrench', sort_order INT NOT NULL DEFAULT 0, filter_key VARCHAR(255), created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  filter_groups: `CREATE TABLE filter_groups (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, \`key\` VARCHAR(255) NOT NULL UNIQUE, sort_order INT NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  filter_items: `CREATE TABLE filter_items (id INT AUTO_INCREMENT PRIMARY KEY, filter_group_key VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, sort_order INT NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_item (filter_group_key, name)) ENGINE=InnoDB`,
  services: `CREATE TABLE services (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, category VARCHAR(255) NOT NULL, description TEXT NOT NULL, image TEXT, video TEXT, content TEXT, brand_name VARCHAR(255), brand_tagline VARCHAR(255), home_slot INT DEFAULT NULL, sort_order INT NOT NULL DEFAULT 0, image_before TEXT DEFAULT NULL, image_after TEXT DEFAULT NULL, images TEXT DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  chat_sessions: `CREATE TABLE chat_sessions (id INT AUTO_INCREMENT PRIMARY KEY, session_id VARCHAR(36) NOT NULL UNIQUE, visitor_name VARCHAR(255) NOT NULL DEFAULT 'Visitor', status VARCHAR(20) NOT NULL DEFAULT 'open', unread_admin INT NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
  chat_messages: `CREATE TABLE chat_messages (id INT AUTO_INCREMENT PRIMARY KEY, session_id VARCHAR(36) NOT NULL, sender VARCHAR(10) NOT NULL DEFAULT 'user', message TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
};

// Repairs tables that exist in MySQL's data dictionary but are missing their InnoDB engine files (errno 1932).
// Common on shared hosting after DB corruption or bad migration.
async function repairBrokenTables() {
  const tables = Object.keys(FALLBACK_DDL);
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    try {
      await db.query(`SELECT 1 FROM \`${table}\` LIMIT 1`);
    } catch (e) {
      if (e.errno !== 1932) continue;
      console.warn(`[db] InnoDB corruption on "${table}", repairing...`);

      // Get DDL: prefer live schema, fall back to hardcoded
      let createDdl;
      try {
        const [[row]] = await db.query(`SHOW CREATE TABLE \`${table}\``);
        createDdl = row['Create Table'];
      } catch (_) {
        createDdl = FALLBACK_DDL[table] || null;
        if (!createDdl) {
          console.warn(`[db] No DDL available for "${table}", skipping.`);
          continue;
        }
        console.warn(`[db] Using fallback DDL for "${table}"`);
      }

      // Drop the broken entry
      try {
        await db.query(`DROP TABLE IF EXISTS \`${table}\``);
      } catch (dropErr) {
        console.warn(`[db] Cannot drop "${table}":`, dropErr.sqlMessage || dropErr.message);
        continue;
      }

      // Try normal recreate
      try {
        await db.query(createDdl);
        console.log(`[db] Table "${table}" repaired.`);
        continue;
      } catch (createErr) {
        if (createErr.errno !== 1813) {
          console.warn(`[db] Cannot recreate "${table}":`, createErr.sqlMessage || createErr.message);
          continue;
        }
      }

      // errno 1813: orphaned .ibd file — use system tablespace (MySQL 8.0+)
      try {
        const sysDdl = createDdl.replace(/ENGINE=InnoDB/gi, 'ENGINE=InnoDB TABLESPACE=innodb_system');
        await db.query(sysDdl);
        console.log(`[db] Table "${table}" repaired via system tablespace.`);
      } catch (sysErr) {
        console.warn(`[db] Cannot repair "${table}" — fix needed in cPanel/phpMyAdmin:`, sysErr.sqlMessage || sysErr.message);
      }
    }
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function initDb() {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      image TEXT,
      category VARCHAR(255) NOT NULL,
      store_filter_key VARCHAR(255),
      subcategory VARCHAR(255),
      description TEXT,
      stock INT NOT NULL DEFAULT 0,
      rating FLOAT,
      original_price DECIMAL(10,2),
      tag VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      customer_address TEXT NOT NULL,
      customer_notes TEXT,
      total DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      stripe_payment_id VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      product_price DECIMAL(10,2) NOT NULL,
      product_image TEXT,
      quantity INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS carousel_slides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image TEXT NOT NULL,
      alt VARCHAR(255) NOT NULL DEFAULT '',
      title VARCHAR(255) DEFAULT '',
      highlight VARCHAR(255) DEFAULT '',
      description TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS promo_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image TEXT NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(255) NOT NULL,
      discount_percent DECIMAL(5,2) NOT NULL,
      valid_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      \`value\` TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  // Detect and repair any tables with InnoDB engine corruption
  await repairBrokenTables();

  // Add columns that may be missing in older deployments
  try { await db.query('ALTER TABLE products ADD COLUMN subcategory VARCHAR(255) DEFAULT NULL'); } catch (_) {}
  try { await db.query('ALTER TABLE products ADD COLUMN store_filter_key VARCHAR(255) DEFAULT NULL'); } catch (_) {}

  try {
    const [rows] = await db.query("SHOW INDEX FROM order_items WHERE Key_name = 'idx_order_items_order_id'");
    if (rows.length === 0) await db.query('CREATE INDEX idx_order_items_order_id ON order_items(order_id)');
  } catch (_) {}

  try {
    const [langRows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'language'");
    if (langRows.length === 0) {
      await db.query("INSERT INTO app_settings (`key`, `value`) VALUES ('language', 'es')");
    }
  } catch (e) {
    console.warn('[db] app_settings init skipped:', e.sqlMessage || e.message);
  }
}

async function isSeeded(key) {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = ?", [key]);
    return rows.length > 0;
  } catch (_) {
    return false;
  }
}

async function markSeeded(key) {
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES (?, 'true') ON DUPLICATE KEY UPDATE `value` = 'true'",
      [key]
    );
  } catch (e) {
    console.error(`[db] Error marking ${key} as seeded:`, e.message);
  }
}

async function ensureCategoriesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        icon VARCHAR(255) NOT NULL DEFAULT 'Wrench',
        sort_order INT NOT NULL DEFAULT 0,
        filter_key VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    if (!(await isSeeded('categories_seeded'))) {
      const [rows] = await db.query('SELECT COUNT(*) as n FROM categories');
      if (rows[0].n === 0) {
        const initial = [
          ['Power Tools', 'Zap', 0, 'tools'],
          ['Hand Tools', 'Wrench', 1, 'tools'],
          ['Construction Materials', 'Building2', 2, 'raw'],
          ['Paints & Finishes', 'Paintbrush', 3, 'landscaping'],
          ['Plumbing', 'Droplets', 4, 'landscaping'],
          ['Electrical', 'Lightbulb', 5, 'safety'],
        ];
        for (const [name, icon, sortOrder, filterKey] of initial) {
          await db.query(
            'INSERT INTO categories (name, icon, sort_order, filter_key) VALUES (?, ?, ?, ?)',
            [name, icon, sortOrder, filterKey],
          );
        }
      }
      await markSeeded('categories_seeded');
    }

    // Auto-migración a inglés si quedaron guardadas en español en la DB
    const translationsMap = [
      ['Herramientas Eléctricas', 'Power Tools'],
      ['Herramientas Manuales', 'Hand Tools'],
      ['Materiales de Construcción', 'Construction Materials'],
      ['Pinturas y Acabados', 'Paints & Finishes'],
      ['Fontanería', 'Plumbing'],
      ['Electricidad', 'Electrical'],
    ];
    for (const [esName, enName] of translationsMap) {
      await db.query('UPDATE categories SET name = ? WHERE name = ?', [enName, esName]).catch(() => {});
    }
  } catch (e) {
    console.warn('[db] ensureCategoriesTable:', e.sqlMessage || e.message);
  }
}

async function ensureFilterGroupsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS filter_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    if (!(await isSeeded('filters_seeded'))) {
      const [rows] = await db.query('SELECT COUNT(*) as n FROM filter_groups');
      if (rows[0].n === 0) {
        const initial = [
          ['Tools', 'tools', 0],
          ['Raw Materials', 'raw', 1],
          ['Landscaping', 'landscaping', 2],
          ['Safety & Protection', 'safety', 3],
        ];
        for (const [name, key, sortOrder] of initial) {
          await db.query(
            'INSERT INTO filter_groups (name, `key`, sort_order) VALUES (?, ?, ?)',
            [name, key, sortOrder],
          );
        }
      }
      await markSeeded('filters_seeded');
    }

    // Auto-migración de filtros a inglés si quedaron en español
    const filterTransMap = [
      ['Herramientas', 'Tools'],
      ['Materias primas', 'Raw Materials'],
      ['Jardinería', 'Landscaping'],
      ['Seguridad', 'Safety & Protection'],
    ];
    for (const [esName, enName] of filterTransMap) {
      await db.query('UPDATE filter_groups SET name = ? WHERE name = ?', [enName, esName]).catch(() => {});
    }
  } catch (e) {
    console.warn('[db] ensureFilterGroupsTable:', e.sqlMessage || e.message);
  }
}

async function ensureFilterItemsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS filter_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filter_group_key VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_item (filter_group_key, name)
      ) ENGINE=InnoDB;
    `);
  } catch (e) {
    console.warn('[db] ensureFilterItemsTable:', e.sqlMessage || e.message);
  }
}

async function ensurePromoBannersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS promo_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image TEXT NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

async function ensureServicesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      image TEXT,
      video TEXT,
      content TEXT,
      brand_name VARCHAR(255),
      brand_tagline VARCHAR(255),
      home_slot INT DEFAULT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      image_before TEXT DEFAULT NULL,
      image_after TEXT DEFAULT NULL,
      images TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  try { await db.query('ALTER TABLE services ADD COLUMN sort_order INT NOT NULL DEFAULT 0'); } catch (_) {}
  try { await db.query('ALTER TABLE services ADD COLUMN brand_name VARCHAR(255) DEFAULT NULL'); } catch (_) {}
  try { await db.query('ALTER TABLE services ADD COLUMN brand_tagline VARCHAR(255) DEFAULT NULL'); } catch (_) {}
  try { await db.query('ALTER TABLE services ADD COLUMN home_slot INT DEFAULT NULL'); } catch (_) {}
  try { await db.query('ALTER TABLE services ADD COLUMN image_before TEXT DEFAULT NULL'); } catch (_) {}
  try { await db.query('ALTER TABLE services ADD COLUMN image_after TEXT DEFAULT NULL'); } catch (_) {}
  try { await db.query('ALTER TABLE services ADD COLUMN images TEXT DEFAULT NULL'); } catch (_) {}

  // Seed / Migración inicial del servicio Landscape
  try {
    const allLandscapeImages = JSON.stringify([
      '/servicio-landscape/landscape-1.webp',
      '/servicio-landscape/landscape-2.webp',
      '/servicio-landscape/landscape-3.webp',
      '/servicio-landscape/landscape-4.webp',
      '/servicio-landscape/landscape5.webp',
      '/servicio-landscape/landscape-6.webp',
    ]);

    const [existing] = await db.query('SELECT id FROM services WHERE title = ?', ['Bring Your Outdoor Space to Life']);
    if (existing.length === 0) {
      const initialService = {
        title: 'Bring Your Outdoor Space to Life',
        category: 'Landscaping',
        description: "We design and install complete outdoor spaces, including lawns, plants, trees, decorative rock, garden beds, and irrigation. We also handle artificial grass, concrete, hardscapes, drainage and lighting, fencing, and outdoor structures. Whether you're starting from scratch or improving an existing yard, we'll help bring your plans to life.",
        image: '/servicio-landscape/landscape-1.webp',
        images: allLandscapeImages,
        brandName: 'JJ Construction',
        brandTagline: 'Landscape & Concrete Specialists',
        homeSlot: 1,
        sortOrder: 0,
      };

      await db.query(`
        INSERT INTO services (title, category, description, image, images, image_before, image_after, brand_name, brand_tagline, home_slot, sort_order)
        VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
      `, [
        initialService.title,
        initialService.category,
        initialService.description,
        initialService.image,
        initialService.images,
        initialService.brandName,
        initialService.brandTagline,
        initialService.homeSlot,
        initialService.sortOrder,
      ]);
      console.log('✅ Servicio inicial "Bring Your Outdoor Space to Life" insertado con éxito.');
    } else {
      // Actualizar por si se había insertado con antes/después
      await db.query(`
        UPDATE services 
        SET image_before = NULL, image_after = NULL, images = ? 
        WHERE title = ?
      `, [allLandscapeImages, 'Bring Your Outdoor Space to Life']);
    }
  } catch (err) {
    console.warn('[db] Seed landscape service:', err.sqlMessage || err.message);
  }
}

async function ensureChatTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(36) NOT NULL UNIQUE,
      visitor_name VARCHAR(255) NOT NULL DEFAULT 'Visitor',
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      unread_admin INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(36) NOT NULL,
      sender VARCHAR(10) NOT NULL DEFAULT 'user',
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
  try {
    const [idxRows] = await db.query("SHOW INDEX FROM chat_messages WHERE Key_name = 'idx_chat_messages_session_id'");
    if (idxRows.length === 0) await db.query('CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id)');
  } catch (_) {}
}

module.exports = {
  db,
  initDb,
  isSeeded,
  markSeeded,
  ensurePromoBannersTable,
  ensureCategoriesTable,
  ensureFilterGroupsTable,
  ensureFilterItemsTable,
  ensureServicesTable,
  ensureChatTables,
};
