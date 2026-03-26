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

async function initDb() {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
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
    );
  `);

  // Add subcategory column to existing tables that may not have it
  try {
    await db.query('ALTER TABLE products ADD COLUMN subcategory VARCHAR(255) DEFAULT NULL');
  } catch (e) {
    // Column already exists, ignore
  }
  // Add store_filter_key column to existing tables that may not have it
  try {
    await db.query('ALTER TABLE products ADD COLUMN store_filter_key VARCHAR(255) DEFAULT NULL');
  } catch (e) {
    // Column already exists, ignore
  }

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
    );
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
    );
  `);

  try {
    const [rows] = await db.query(
      "SHOW INDEX FROM order_items WHERE Key_name = 'idx_order_items_order_id'",
    );
    if (rows.length === 0) {
      await db.query('CREATE INDEX idx_order_items_order_id ON order_items(order_id)');
    }
  } catch (error) {
    // ignore
  }

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
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS promo_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image TEXT NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(255) NOT NULL,
      discount_percent DECIMAL(5,2) NOT NULL,
      valid_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      \`value\` TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  const [langRows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'language'");
  if (langRows.length === 0) {
    await db.query("INSERT INTO app_settings (`key`, `value`) VALUES ('language', 'es')");
  }

  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function ensureCategoriesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      icon VARCHAR(255) NOT NULL DEFAULT 'Wrench',
      sort_order INT NOT NULL DEFAULT 0,
      filter_key VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const [rows] = await db.query('SELECT COUNT(*) as n FROM categories');
  if (rows[0].n === 0) {
    const initial = [
      ['Herramientas Eléctricas', 'Zap', 0, 'tools'],
      ['Herramientas Manuales', 'Wrench', 1, 'tools'],
      ['Materiales de Construcción', 'Building2', 2, 'raw'],
      ['Pinturas y Acabados', 'Paintbrush', 3, 'landscaping'],
      ['Fontanería', 'Droplets', 4, 'landscaping'],
      ['Electricidad', 'Lightbulb', 5, 'safety'],
    ];
    for (const [name, icon, sortOrder, filterKey] of initial) {
      await db.query(
        'INSERT INTO categories (name, icon, sort_order, filter_key) VALUES (?, ?, ?, ?)',
        [name, icon, sortOrder, filterKey],
      );
    }
  }
}

async function ensureFilterGroupsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS filter_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const [rows] = await db.query('SELECT COUNT(*) as n FROM filter_groups');
  if (rows[0].n === 0) {
    const initial = [
      ['Herramientas', 'tools', 0],
      ['Materias primas', 'raw', 1],
      ['Jardinería', 'landscaping', 2],
      ['Seguridad', 'safety', 3],
    ];
    for (const [name, key, sortOrder] of initial) {
      await db.query(
        'INSERT INTO filter_groups (name, `key`, sort_order) VALUES (?, ?, ?)',
        [name, key, sortOrder],
      );
    }
  }
}

async function ensureFilterItemsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS filter_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filter_group_key VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_item (filter_group_key, name)
    );
  `);
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
    );
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add sort_order column to existing tables that may not have it
  try {
    await db.query('ALTER TABLE services ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
  } catch (e) {
    // Column already exists, ignore
  }
  // Add brand fields to existing tables that may not have them
  try {
    await db.query('ALTER TABLE services ADD COLUMN brand_name VARCHAR(255) DEFAULT NULL');
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await db.query('ALTER TABLE services ADD COLUMN brand_tagline VARCHAR(255) DEFAULT NULL');
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await db.query('ALTER TABLE services ADD COLUMN home_slot INT DEFAULT NULL');
  } catch (e) {
    // Column already exists, ignore
  }
}

module.exports = { db, initDb, ensurePromoBannersTable, ensureCategoriesTable, ensureFilterGroupsTable, ensureFilterItemsTable, ensureServicesTable };
