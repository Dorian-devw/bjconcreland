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

  // ── Seed / Migración inicial de los 6 Servicios Principales ────────────────
  const landscapeContent = [
    '**Custom Outdoor Living Tailored to Utah Climate**',
    'At JJ Construction, we bring over a decade of design and field expertise to every landscaping project across Utah. We understand how local weather, freeze-thaw cycles, and soil compositions impact plant life and soil retention. From comprehensive master-planned yard designs to precise plant and sod installations, we turn barren or tired yards into lush, functional outdoor extensions of your living space.',
    '**Our Full-Spectrum Landscaping Solutions**',
    '• **Custom Landscape Architecture & 3D Planning**: Tailor-made designs optimized for your lot topography, privacy desires, and HOA guidelines.',
    '• **Native & Drought-Tolerant Planting**: Hand-selected hardy trees, evergreen conifers, ornamental shrubs, and flowering perennials that thrive in Utah semi-arid climate.',
    '• **Premium Sod & Soil Conditioning**: Thorough ground cultivation, topsoil enrichment, laser grading, and fresh installation of high-density Kentucky Bluegrass and drought-resistant turf blends.',
    '• **Decorative Rock, Boulders & Mulch**: Architectural garden beds layered with weed-barrier geotextile, river rock, crushed granite, natural specimen boulders, and moisture-preserving dark mulch.',
    '• **Custom Landscape Edging & Curbing**: Heavy-gauge steel, textured poured concrete curbing, or natural stone curbing that creates sharp separation lines and stops grass intrusion.',
    '• **Yard Cleanouts & Complete Renovations**: Comprehensive clearing, excavation, weed removal, tree trimming, and re-grading for neglected yards needing a fresh start.',
    '**Our 5-Step Landscape Installation Process**',
    '1. **Site Assessment & Elevation Survey**: We analyze sunlight patterns, soil quality, and surface water runoff to establish ideal planting and grading zones.',
    '2. **Earthwork, Clearing & Grading**: Heavy grading and rough excavation ensure smooth transitions and guarantee water slopes safely away from your home foundation.',
    '3. **Soil Preparation & Irrigation Coordination**: Rototilling and amending soil with organic nutrients while integrating underground drip and sprinkler coverage.',
    '4. **Precision Plant & Tree Installation**: Root balls are planted at exact structural depths with root-stimulant fertilizers and soil backfill to guarantee robust rooting.',
    '5. **Ground Cover, Edging & Final Cleanup**: Installing industrial-grade commercial weed fabric, spreading rocks and mulch to uniform depths, and full property power washing.',
  ].join('\n\n');

  const concreteContent = [
    '**Enduring Strength & Precision Craftsmanship**',
    'At JJ Construction, we specialize in high-durability residential and commercial concrete solutions engineered to withstand heavy load demands and harsh freeze-thaw climate cycles. Whether you are upgrading your home curb appeal with a modern driveway or pouring a structural foundation, our experienced team delivers clean, long-lasting results.',
    '**Comprehensive Concrete Services**',
    '• **Driveways & Approaches**: High-load capacity concrete driveways engineered with reinforced sub-bases to eliminate premature cracking and settling.',
    '• **Custom Patios & Walkways**: Beautiful, functional outdoor living surfaces tailored to your landscape with seamless transitions.',
    '• **Structural Slabs & Foundations**: Precision-formed slabs for garages, workshops, sheds, and home additions adhering strictly to building codes.',
    '• **Pool Decks & Coping**: Slip-resistant, weather-sealed pool surrounds designed for luxury aesthetics and family safety.',
    '• **Steps, Stairs & Retaining Curbs**: Custom formed entries, multi-tier steps, and landscape curbing built for stability and clean aesthetics.',
    '• **Demolition, Removal & Haul-Off**: Safe, efficient break-out and removal of old, cracked, or sunken concrete with full site cleanup.',
    '**Our Proven Process**',
    '1. **Site Evaluation & Laser Grading**: We establish proper elevation and drainage slopes so water always flows safely away from your structures.',
    '2. **Sub-Base Compaction**: Solid ground preparation with compacted gravel base prevents future settling and voids.',
    '3. **Steel Reinforcement**: Heavy rebar grids and fiber reinforcement ensure maximum tensile strength across extreme seasonal changes.',
    '4. **Premium Mix & Professional Finishing**: High PSI commercial-grade concrete poured and finished with precision brooming or smooth architectural edges.',
    '5. **Curing & Protection**: Proper curing techniques that lock in moisture for optimal hydration, preventing surface scaling and ensuring decades of performance.',
  ].join('\n\n');

  const turfContent = [
    '**Year-Round Green Perfection Without the Hassle**',
    'Say goodbye to endless mowing, fertilizing, muddy paw prints, and costly water bills. At JJ Construction, we engineer and install premium synthetic grass systems designed specifically for high-traffic Utah homes and commercial properties. Our artificial turf looks and feels remarkably like natural grass while offering superior resilience and unmatched longevity.',
    '**Custom Turf Applications for Every Space**',
    '• **Full Residential Lawns**: Transform front yards and expansive backyards into evergreen, zero-maintenance showpieces.',
    '• **Dedicated Pet Turf & Dog Runs**: Antimicrobial, deodorizing infill with rapid-flow perforated backing that drains pet urine instantly and eliminates brown spots and mud.',
    '• **Kids Play Areas**: Cushioning underlayment and shock pads that meet critical fall-height safety ratings to keep children safe during playtime.',
    '• **Custom Putting Greens**: Professional-grade bentgrass putting surfaces engineered with adjustable stimp speeds, custom undulations, and fringe grass for golf enthusiasts.',
    '• **Commercial Landscapes & Common Areas**: Durable, pristine synthetic grass for HOA common grounds, office plazas, and retail storefronts.',
    '**Our Multi-Layer Installation Process**',
    '1. **Excavation & Weed Barrier**: Removal of native grass and soil followed by a heavy-duty geotextile weed barrier that halts weed penetration.',
    '2. **Engineered Base Compaction**: 3 to 4 inches of crushed aggregate base layered and vibratory-compacted to provide a smooth, solid foundation.',
    '3. **High-Flow Drainage System**: Multi-tier base design capable of draining over 30 inches of water per hour, preventing pooling and mold.',
    '4. **Seamless Seaming & Perimeter Anchoring**: Industrial seam tape and non-corrosive galvanized landscape spikes secure the turf permanently in place.',
    '5. **Silica Sand / Antimicrobial Infill**: Weighted infill brushed deep between blades to keep fibers standing tall, protect backing from UV degradation, and ensure a natural, springy feel underfoot.',
  ].join('\n\n');

  const stampedConcreteContent = [
    '**Architectural Elegance Meets High-Strength Concrete**',
    'Elevate your property curb appeal with decorative stamped and colored concrete from JJ Construction. We combine structural concrete integrity with artistic detailing, creating realistic surfaces that mimic imported natural stone, European cobblestone, Italian slate, or rustic wood planks at a fraction of the cost.',
    '**Custom Decorative Concrete Solutions**',
    '• **Stamped Patios & Pool Decks**: Slip-resistant, weather-sealed stamped surfaces tailored for outdoor entertaining and pool coping.',
    '• **Decorative Driveways & Entradas**: Heavy-duty structural stamped driveways engineered with reinforced sub-bases to resist heavy vehicles and winter salt.',
    '• **Integral Coloring & Antique Accent Releases**: Multi-tone coloring techniques where base color is blended throughout the concrete batch and antique powders create dramatic surface contrast.',
    '• **Seamless Texture Skins & Slate Stamps**: Hand-stamped Ashlar slate, Roman cobblestone, wood plank, and seamless granite textures.',
    '• **Stamped Borders & Contrasting Bands**: Elegant perimeter framing combining broom-finish slabs with rich decorative stamped borders.',
    '• **Commercial Acrylic Sealing**: UV-resistant, non-yellowing high-solids sealers infused with slip-resistant polymer grit for lasting sheen and protection.',
    '**Our Decorative Process**',
    '1. **Forming & High-Density Rebar Grid**: Rigid perimeter forming and tied rebar reinforcement prevent settling and crack migration.',
    '2. **High-PSI Integral Color Pour**: Commercial-grade 4000+ PSI concrete with pure mineral oxide pigments mixed uniformly.',
    '3. **Color Hardener & Release Application**: Specialized release agents prevent stamp adhesion while imparting rich antique shadows in deep grout lines.',
    '4. **Precision Hand Stamping**: Systematic stamping with calibrated tools while concrete is at optimal plasticity for crisp, deep impressions.',
    '5. **Wash, Cut & Premium Seal**: Pressure washing excess release, saw-cutting expansion control joints, and applying dual coats of wet-look protective sealer.',
  ].join('\n\n');

  const retainingWallsContent = [
    '**Engineered Soil Retention & Outdoor Living Spaces**',
    'Transform steep, unusable slopes into breathtaking multi-tier terraces with retaining walls and hardscaping from JJ Construction. Built with structural engineering principles and premium materials, our walls and paver systems resist heavy hydrostatic soil pressures while expanding your yard usable footprint.',
    '**Specialized Hardscape & Retaining Services**',
    '• **Engineered Block Retaining Walls**: Heavy segmental interlocking concrete blocks designed for tall hillside retention, terraced gardens, and driveway support.',
    '• **Natural Stone & Boulder Walls**: Massive quarry boulders and hand-stacked natural flagstone providing an authentic, rugged mountain aesthetic.',
    '• **Interlocking Paver Patios & Walkways**: High-compressive-strength pavers installed over multi-layer gravel bases that eliminate surface cracking and joint shifting.',
    '• **Custom Fire Pits & Built-in Seating**: Circular or rectangular stone fire features (wood-burning or gas) flanked by integrated radius seat walls.',
    '• **Multi-Tier Terrace Systems**: Converting steep backyards into functional multi-level yards for gardens, turf play zones, and entertaining decks.',
    '• **Outdoor Kitchens & Grilling Stations**: Custom masonry BBQ islands and outdoor countertops crafted for luxury outdoor cooking.',
    '**Our Engineered Installation Standards**',
    '1. **Excavation & Deep Base Trenching**: Trenching below native grade to establish an immovable foundation below the frost line.',
    '2. **Crushed Aggregate Base Compaction**: Heavy road-base stone vibratory-compacted to 98% Proctor density to eliminate settling.',
    '3. **First-Course Laser Leveling**: The critical bottom row is laser-aligned and leveled to fraction-of-an-inch tolerances.',
    '4. **Geogrid Soil Reinforcement & Backfill Drainage**: Heavy structural geogrid fabric anchored into backfill soil with perforated drain pipe and clean drainage gravel behind the wall.',
    '5. **Capping & High-Strength Adhesive Bonding**: Wall caps secured with polyurethane structural masonry adhesive for decades of durability.',
  ].join('\n\n');

  const irrigationDrainageContent = [
    '**Smart Water Management & Architectural Night Lighting**',
    'A healthy landscape requires intelligent water delivery and effective storm runoff control. At JJ Construction, we design and install high-efficiency automated irrigation systems, structural storm drainage, and low-voltage architectural lighting that protect your property and bring your yard to life after dark.',
    '**Comprehensive Water & Lighting Systems**',
    '• **Smart Automated Sprinkler Systems**: Wi-Fi enabled smart controllers (Hunter, Rain Bird) that automatically adjust watering schedules based on local satellite weather forecasts.',
    '• **High-Efficiency Micro-Drip Irrigation**: Targeted low-volume drip lines for shrubs, trees, flower beds, and hanging pots that reduce water waste by up to 50%.',
    '• **French Drains & Foundation Protection**: Heavy-duty perforated pipe enclosed in non-woven filter fabric and drainage rock to capture and redirect groundwater away from basements.',
    '• **Catch Basins & Downspout Direct Lines**: Underground solid PVC piping connecting roof gutters directly to pop-up emitters or dry wells, eliminating soggy lawns and foundation pooling.',
    '• **Swales & Surface Slope Corrections**: Re-shaping property elevations to ensure rainwater flows naturally towards designated drainage easements.',
    '• **Low-Voltage LED Landscape Lighting**: Solid brass and cast aluminum path lights, tree uplights, wall wash fixtures, and step lights creating safety and breathtaking nighttime curb appeal.',
    '**Our Installation Standards**',
    '1. **Hydraulic Flow & Pressure Calculation**: Calculating static water pressure and GPM to map balanced zones without dry patches or pressure drops.',
    '2. **Trenching with Minimal Turf Disturbance**: Laser-guided pipe trenching positioned safely away from underground utilities.',
    '3. **Commercial Schedule 40 Fittings & Valves**: Heavy-duty PVC manifolds, brass backflow preventers, and commercial-grade solenoid valves.',
    '4. **Precision Head Calibration**: Aligning rotary and spray nozzles to provide uniform head-to-head coverage with zero overspray on concrete or buildings.',
    '5. **System Commissioning & Mobile App Handover**: Full zone pressure testing, smart app configuration on your smartphone, and complete client walkthrough.',
  ].join('\n\n');

  const defaultServices = [
    {
      title: 'Bring Your Outdoor Space to Life',
      category: 'Landscaping',
      description: "We design and install complete outdoor spaces, including lawns, plants, trees, decorative rock, garden beds, and irrigation. We also handle artificial grass, concrete, hardscapes, drainage and lighting, fencing, and outdoor structures. Whether you're starting from scratch or improving an existing yard, we'll help bring your plans to life.",
      image: '/servicio-landscape/landscape-6.webp',
      images: JSON.stringify([
        '/servicio-landscape/landscape-1.webp',
        '/servicio-landscape/landscape-2.webp',
        '/servicio-landscape/landscape-3.webp',
        '/servicio-landscape/landscape-4.webp',
        '/servicio-landscape/landscape5.webp',
      ]),
      content: landscapeContent,
      homeSlot: 1,
      sortOrder: 0,
    },
    {
      title: 'Concrete Built Right From the Ground Up',
      category: 'Concrete',
      description: 'We build driveways, patios, walkways, slabs, foundations, pool decks, steps, and curbs, and remove old concrete. Each job starts with proper site prep, grading, and reinforcement so it finishes clean and lasts.',
      image: '/servicio-concrete/concrete-6.webp',
      images: JSON.stringify([
        '/servicio-concrete/concrete-1.webp',
        '/servicio-concrete/concrete-2.webp',
        '/servicio-concrete/concrete-3.webp',
        '/servicio-concrete/concrete-4.webp',
        '/servicio-concrete/concrete-5.webp',
      ]),
      content: concreteContent,
      homeSlot: 2,
      sortOrder: 1,
    },
    {
      title: 'Artificial Turf Installation',
      category: 'Artificial Turf',
      description: 'Artificial turf is the perfect solution for homeowners who want a lush, green lawn without the high maintenance. It stays green all year, saves water, and holds up to kids, pets, and heavy use. From front yards and backyards to pet areas, play areas, and putting greens, our artificial turf systems are built with premium materials and installed with precision for long-term performance and beauty.',
      image: '/servicio-artificial-turf/artificial-turf-6.webp',
      images: JSON.stringify([
        '/servicio-artificial-turf/artificial-turf-1.webp',
        '/servicio-artificial-turf/artificial-turf-2.webp',
        '/servicio-artificial-turf/artificial-turf-3.webp',
        '/servicio-artificial-turf/artificial-turf-4.webp',
        '/servicio-artificial-turf/artificial-turf-5.webp',
      ]),
      content: turfContent,
      homeSlot: 3,
      sortOrder: 2,
    },
    {
      title: 'Decorative & Stamped Concrete',
      category: 'Concrete',
      description: 'Elevate your property curb appeal with custom stamped patterns and integral colors replicating slate, flagstone, cobblestone, and rustic wood planks. Designed for durable patios, pool surrounds, walkways, and decorative borders that endure Utah freeze-thaw cycles.',
      image: '/servicio-stamped-concrete/stamped-concrete-6.webp',
      images: JSON.stringify([
        '/servicio-stamped-concrete/stamped-concrete-1.webp',
        '/servicio-stamped-concrete/stamped-concrete-2.webp',
        '/servicio-stamped-concrete/stamped-concrete-3.webp',
        '/servicio-stamped-concrete/stamped-concrete-4.webp',
        '/servicio-stamped-concrete/stamped-concrete-5.webp',
      ]),
      content: stampedConcreteContent,
      homeSlot: 4,
      sortOrder: 3,
    },
    {
      title: 'Retaining Walls & Hardscaping',
      category: 'Hardscapes',
      description: 'Maximize your yard usable space and stop soil erosion with structural retaining walls, interlocking paver patios, stone fire pits, and custom outdoor seating. Engineered for heavy soil loads and built to stand strong for decades.',
      image: '/servicio-retaining-walls/retaining-walls-6.webp',
      images: JSON.stringify([
        '/servicio-retaining-walls/retaining-walls-1.webp',
        '/servicio-retaining-walls/retaining-walls-2.webp',
        '/servicio-retaining-walls/retaining-walls-3.webp',
        '/servicio-retaining-walls/retaining-walls-4.webp',
        '/servicio-retaining-walls/retaining-walls-5.webp',
      ]),
      content: retainingWallsContent,
      homeSlot: 5,
      sortOrder: 4,
    },
    {
      title: 'Irrigation, Drainage & Lighting',
      category: 'Irrigation & Drainage',
      description: 'Protect your property and landscaping investment with automated smart sprinkler systems, commercial-grade French drains, and low-voltage architectural LED landscape lighting. Save water, prevent basement flooding, and illuminate your home at night.',
      image: '/servicio-irrigation-drainage/irrigation-drainage-6.webp',
      images: JSON.stringify([
        '/servicio-irrigation-drainage/irrigation-drainage-1.webp',
        '/servicio-irrigation-drainage/irrigation-drainage-2.webp',
        '/servicio-irrigation-drainage/irrigation-drainage-3.webp',
        '/servicio-irrigation-drainage/irrigation-drainage-4.webp',
        '/servicio-irrigation-drainage/irrigation-drainage-5.webp',
      ]),
      content: irrigationDrainageContent,
      homeSlot: 6,
      sortOrder: 5,
    },
  ];

  for (const s of defaultServices) {
    try {
      const [existing] = await db.query('SELECT id FROM services WHERE title = ?', [s.title]);
      if (existing.length === 0) {
        await db.query(`
          INSERT INTO services (title, category, description, image, images, content, image_before, image_after, brand_name, brand_tagline, home_slot, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'JJ Construction', 'Landscape & Concrete Specialists', ?, ?)
        `, [s.title, s.category, s.description, s.image, s.images, s.content, s.homeSlot, s.sortOrder]);
        console.log(`✅ Servicio inicial "${s.title}" insertado con éxito.`);
      } else {
        await db.query(`
          UPDATE services 
          SET category = ?,
              description = ?,
              image = ?,
              images = ?,
              content = ?,
              brand_name = 'JJ Construction',
              brand_tagline = 'Landscape & Concrete Specialists',
              home_slot = ?,
              sort_order = ?
          WHERE title = ?
        `, [s.category, s.description, s.image, s.images, s.content, s.homeSlot, s.sortOrder, s.title]);
      }
    } catch (err) {
      console.warn(`[db] Seed service "${s.title}":`, err.sqlMessage || err.message);
    }
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
