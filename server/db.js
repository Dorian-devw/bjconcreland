import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensures env variables are loaded if not loaded yet
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

export const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ecommerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initDb() {
  await db.query("SET FOREIGN_KEY_CHECKS = 0");

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
      description TEXT,
      stock INT NOT NULL DEFAULT 0,
      rating FLOAT,
      original_price DECIMAL(10,2),
      tag VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
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

  // Index for order_items if it doesn't exist
  try {
    const [rows] = await db.query(
      "SHOW INDEX FROM order_items WHERE Key_name = 'idx_order_items_order_id'",
    );
    if (rows.length === 0) {
      await db.query(
        "CREATE INDEX idx_order_items_order_id ON order_items(order_id)",
      );
    }
  } catch (error) {
    // Index creation ignore error
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

  await db.query("SET FOREIGN_KEY_CHECKS = 1");
}

/** Asegura que la tabla categories exista y tenga datos iniciales. */
export async function ensureCategoriesTable() {
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
  const [rows] = await db.query("SELECT COUNT(*) as n FROM categories");
  if (rows[0].n === 0) {
    const initial = [
      ["Herramientas Eléctricas", "Zap", 0, "tools"],
      ["Herramientas Manuales", "Wrench", 1, "tools"],
      ["Materiales de Construcción", "Building2", 2, "raw"],
      ["Pinturas y Acabados", "Paintbrush", 3, "landscaping"],
      ["Fontanería", "Droplets", 4, "landscaping"],
      ["Electricidad", "Lightbulb", 5, "safety"],
    ];
    for (const [name, icon, sortOrder, filterKey] of initial) {
      await db.query(
        "INSERT INTO categories (name, icon, sort_order, filter_key) VALUES (?, ?, ?, ?)",
        [name, icon, sortOrder, filterKey],
      );
    }
  }
}

/** Grupos del filtro lateral de la tienda (Herramientas, Materias primas, etc.). */
export async function ensureFilterGroupsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS filter_groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const [rows] = await db.query("SELECT COUNT(*) as n FROM filter_groups");
  if (rows[0].n === 0) {
    const initial = [
      ["Herramientas", "tools", 0],
      ["Materias primas", "raw", 1],
      ["Jardinería", "landscaping", 2],
      ["Seguridad", "safety", 3],
    ];
    for (const [name, key, sortOrder] of initial) {
      await db.query(
        "INSERT INTO filter_groups (name, \`key\`, sort_order) VALUES (?, ?, ?)",
        [name, key, sortOrder],
      );
    }
  }
}

/** Asegura que la tabla promo_banners exista. */
export async function ensurePromoBannersTable() {
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

/** Asegura que la tabla services exista (blog/servicios). */
export async function ensureServicesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      image TEXT,
      video TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
