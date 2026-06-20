'use strict';
const bcrypt = require('bcryptjs');
const { db, initDb } = require('./db.js');
const { initialProducts } = require('./seed-data.js');

async function seed() {
  await initDb();
  const defaultPassword = 'admin123';
  const hash = bcrypt.hashSync(defaultPassword, 10);

  try {
    await db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('⚠️  PRODUCCIÓN: cambia la contraseña del usuario admin (admin123) antes de lanzar. Usa el panel de admin.');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log('Usuario admin ya existe.');
    } else if (e.errno === 1932) {
      console.warn('[seed] Tabla users con corrupción InnoDB — arreglá la DB en cPanel/phpMyAdmin.');
    } else {
      throw e;
    }
  }

  try {
    const [productRows] = await db.query('SELECT COUNT(*) as n FROM products');
    if (productRows[0].n === 0) {
      for (const p of initialProducts) {
        await db.query(`
          INSERT INTO products (id, name, price, image, category, store_filter_key, description, stock, rating, original_price, tag)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.id, p.name, p.price, p.image, p.category, p.storeFilterKey ?? null, p.description, p.stock, p.rating ?? null, p.originalPrice ?? null, p.tag ?? null
        ]);
      }
      console.log('Productos iniciales insertados.');
    }
  } catch (e) {
    if (e.errno === 1932) {
      console.warn('[seed] Tabla products con corrupción InnoDB — arreglá la DB en cPanel/phpMyAdmin.');
    } else {
      throw e;
    }
  }

  try {
    const [rows] = await db.query('SELECT COUNT(*) as n FROM carousel_slides');
    if (rows[0].n === 0) {
      const slides = [
        ['/hero-banner.jpg', 'Obra en construcción', 0],
        ['/promo-tools.jpg', 'Herramientas', 1],
        ['/promo-materials.jpg', 'Materiales', 2],
        ['/promo-shipping.jpg', 'Envíos', 3],
      ];
      for (const [image, alt, sortOrder] of slides) {
        await db.query('INSERT INTO carousel_slides (image, alt, sort_order) VALUES (?, ?, ?)', [image, alt, sortOrder]);
      }
      console.log('Carrusel: slides iniciales insertados.');
    }
  } catch (e) {
    if (e.errno === 1932) {
      console.warn('[seed] Tabla carousel_slides con corrupción InnoDB — arreglá la DB en cPanel/phpMyAdmin.');
    } else {
      throw e;
    }
  }
}

module.exports = { seed };

// via node seed.js
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed completado a través de CLI.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error durante el seed:', error);
      process.exit(1);
    });
}
