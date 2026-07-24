'use strict';
require('dotenv/config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, initDb, ensurePromoBannersTable, ensureCategoriesTable, ensureFilterGroupsTable, ensureFilterItemsTable, ensureServicesTable, ensureChatTables } = require('./db.js');
const { seed } = require('./seed.js');

// ── JWT Secret — falla en producción si no está configurado ──────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET no está configurado. El servidor no puede arrancar en producción sin él.');
    process.exit(1);
  } else {
    console.warn('ADVERTENCIA: JWT_SECRET no configurado. Usando valor de desarrollo. NO usar en producción.');
  }
}
const JWT_SECRET_FINAL = JWT_SECRET || 'dev-secret-solo-local-cambiar-en-produccion';

const PORT = process.env.PORT || 3002;
const IS_PROD = process.env.NODE_ENV === 'production';

// twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_TO_NUMBER = process.env.TWILIO_TO_NUMBER;

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// ── DB init ──────────────────────────────────────────────────────────────────
seed().then(async () => {
  console.log('Base de datos inicializada desde index.js.');
  // Inicializar tablas de chat al arranque (no en cada request)
  await ensureChatTables();
  console.log('Tablas de chat listas.');
}).catch(console.error);

const app = express();

// ── CORS — solo localhost en desarrollo ─────────────────────────────────────
const allowedOrigins = IS_PROD
  ? ['https://bjconcreland.com', 'https://www.bjconcreland.com']
  : ['https://bjconcreland.com', 'https://www.bjconcreland.com', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (apps móviles, Postman en dev)
    if (!origin && !IS_PROD) return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));

// ── Helmet — headers de seguridad ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite cargar imágenes desde el frontend
  contentSecurityPolicy: false, // el frontend tiene su propio CSP
}));
app.disable('x-powered-by');

// ── Body size — máximo 200kb para JSON (no 10MB) ────────────────────────────
app.use(express.json({ limit: '200kb' }));

// ── Rate limiters ──────────────────────────────────────────────���─────────────

// Login: máximo 10 intentos cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});

// Chat: máximo 30 mensajes por minuto por IP
const chatMsgLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes. Espera un momento.' },
});

// Crear sesiones de chat: máximo 10 por hora por IP
const chatSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas sesiones creadas. Intenta más tarde.' },
});

// API general: máximo 300 requests por minuto por IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});

app.use('/api/', apiLimiter);

// static files
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// multer config
const VALID_UPLOAD_TYPES = ['products', 'carousel', 'banners', 'services', 'settings'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'misc';
    const dir = path.join(UPLOADS_DIR, type);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF, SVG).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// upload endpoint
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'https://api.bjconcreland.com';

app.post('/api/upload/:type', authMiddleware, (req, res) => {
  const { type } = req.params;
  if (!VALID_UPLOAD_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Usa: ${VALID_UPLOAD_TYPES.join(', ')}` });
  }
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'El archivo es demasiado grande. Máximo 5MB.' });
      }
      return res.status(400).json({ error: err.message || 'Error al subir archivo' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }
    const url = `${SERVER_BASE_URL}/uploads/${type}/${req.file.filename}`;
    res.json({ url });
  });
});


app.post('/api/contact/sms', async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'El mensaje es obligatorio' });
  const body = `Nuevo mensaje:\n\n` + (fullName ? `Nombre: ${fullName}\n` : '') + (email ? `Correo: ${email}\n` : '') + (phone ? `Tel: ${phone}\n` : '') + (subject ? `Asunto: ${subject}\n` : '') + `Msj:\n${message}`;
  try {
    const client = getTwilioClient();
    if (!client) return res.status(500).json({ error: 'Twilio no configurado', details: 'Faltan credenciales' });
    if (!TWILIO_FROM_NUMBER || !TWILIO_TO_NUMBER) return res.status(500).json({ error: 'Twilio no configurado', details: 'Faltan números' });
    const msg = await client.messages.create({ body, from: TWILIO_FROM_NUMBER, to: TWILIO_TO_NUMBER });
    res.json({ success: true, sid: msg.sid });
  } catch (error) {
    res.status(500).json({ error: 'Error enviando SMS', details: error.message });
  }
});

// ========== NODEMAILER CONFIG ==========
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.post('/api/contact/email', async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body || {};

  if (!message) return res.status(400).json({ error: 'El mensaje es obligatorio' });
  if (String(message).length > 5000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'jose.zevallos@bjconcreland.com',
    subject: `Nueva Consulta Web: ${escHtml(subject) || 'Contacto General'}`,
    html: `
      <h2>Nuevo mensaje de contacto desde la web</h2>
      <p><strong>Nombre:</strong> ${escHtml(fullName) || 'No especificado'}</p>
      <p><strong>Email:</strong> ${escHtml(email) || 'No especificado'}</p>
      <p><strong>Teléfono:</strong> ${escHtml(phone) || 'No especificado'}</p>
      <p><strong>Asunto:</strong> ${escHtml(subject) || 'No especificado'}</p>
      <h3>Mensaje:</h3>
      <p style="white-space: pre-wrap;">${escHtml(message)}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Correo enviado exitosamente' });
  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ error: 'Error enviando el correo' });
  }
});

app.get('/api/settings/language', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'language'");
    const language = rows[0]?.value || 'es';
    res.json({ language });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo idioma' });
  }
});

app.put('/api/settings/language', authMiddleware, async (req, res) => {
  const { language } = req.body || {};
  if (language !== 'es' && language !== 'en') {
    return res.status(400).json({ error: 'Idioma inválido' });
  }
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('language', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [language],
    );
    res.json({ language });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando idioma' });
  }
});

app.get('/api/settings/texts', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'texts'");
    let texts = {};
    if (rows.length > 0 && rows[0].value) {
      try {
        texts = JSON.parse(rows[0].value);
      } catch (e) {
        console.error('Error parsing texts JSON:', e);
      }
    }
    res.json({ texts });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo textos' });
  }
});

app.put('/api/settings/texts', authMiddleware, async (req, res) => {
  const { texts } = req.body || {};
  try {
    const jsonString = JSON.stringify(texts || {});
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('texts', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [jsonString],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando textos' });
  }
});

app.get('/api/settings/logo', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `key`, `value`, `updated_at` FROM app_settings WHERE `key` IN ('logo', 'logo_width')");
    let logo = null;
    let width = null;
    let logoUpdatedAt = null;
    rows.forEach((row) => {
      if (row.key === 'logo') logo = row.value;
      if (row.key === 'logo_width') width = Number(row.value);
      if (row.key === 'logo') logoUpdatedAt = row.updated_at;
    });
    res.json({ logo, width, logoUpdatedAt });
  } catch (error) {
    console.error('Error obteniendo logo:', error);
    res.status(500).json({ error: 'Error obteniendo logo' });
  }
});

app.put('/api/settings/logo', authMiddleware, async (req, res) => {
  const { logo, width } = req.body || {};
  if (!logo) {
    return res.status(400).json({ error: 'Logo inválido' });
  }
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('logo', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [logo],
    );
    if (width) {
      await db.query(
        "INSERT INTO app_settings (`key`, `value`) VALUES ('logo_width', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        [width.toString()],
      );
    }
    const [rows] = await db.query("SELECT `updated_at` FROM app_settings WHERE `key` = 'logo'");
    const logoUpdatedAt = rows[0]?.updated_at || null;
    res.json({ logo, width, logoUpdatedAt });
  } catch (error) {
    console.error('Error guardando logo:', error);
    res.status(500).json({ error: 'Error guardando logo' });
  }
});

app.get('/api/settings/footer', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'footer_settings'");
    const footerStr = rows[0]?.value;
    const footer = footerStr ? JSON.parse(footerStr) : null;
    res.json({ footer });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo configuración del footer' });
  }
});

app.put('/api/settings/footer', authMiddleware, async (req, res) => {
  const { footer } = req.body || {};
  if (!footer || typeof footer !== 'object') {
    return res.status(400).json({ error: 'Configuración de footer inválida' });
  }
  try {
    const footerStr = JSON.stringify(footer);
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('footer_settings', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [footerStr],
    );
    res.json({ footer });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando configuración del footer' });
  }
});

app.get('/api/settings/terms', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'terms_conditions'");
    const terms = rows[0]?.value || '';
    res.json({ terms });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo términos y condiciones' });
  }
});

app.put('/api/settings/terms', authMiddleware, async (req, res) => {
  const { terms } = req.body || {};
  if (typeof terms !== 'string') {
    return res.status(400).json({ error: 'Términos y condiciones inválidos' });
  }
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('terms_conditions', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [terms],
    );
    res.json({ terms });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando términos y condiciones' });
  }
});

app.get('/api/settings/privacy', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'privacy_policy'");
    const privacyPolicy = rows[0]?.value || '';
    res.json({ privacyPolicy });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo política de privacidad' });
  }
});

app.put('/api/settings/privacy', authMiddleware, async (req, res) => {
  const { privacyPolicy } = req.body || {};
  if (typeof privacyPolicy !== 'string') {
    return res.status(400).json({ error: 'Política de privacidad inválida' });
  }
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('privacy_policy', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [privacyPolicy],
    );
    res.json({ privacyPolicy });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando política de privacidad' });
  }
});

app.get('/api/settings/services_header', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'services_header'");
    const data = rows[0]?.value ? JSON.parse(rows[0].value) : null;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo settings de servicios' });
  }
});

app.put('/api/settings/services_header', authMiddleware, async (req, res) => {
  const { servicesHeader } = req.body || {};
  if (!servicesHeader) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('services_header', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify(servicesHeader)],
    );
    res.json({ servicesHeader });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando settings de servicios' });
  }
});

app.get('/api/settings/contact_info', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'contact_info'");
    const data = rows[0]?.value ? JSON.parse(rows[0].value) : null;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo info de contacto' });
  }
});

app.put('/api/settings/contact_info', authMiddleware, async (req, res) => {
  const { contactInfo } = req.body || {};
  if (!contactInfo) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('contact_info', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify(contactInfo)],
    );
    res.json({ contactInfo });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando info de contacto' });
  }
});

app.get('/api/settings/heavy_equipment', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'heavy_equipment'");
    const data = rows[0]?.value ? JSON.parse(rows[0].value) : null;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo info de equipo pesado' });
  }
});

app.put('/api/settings/heavy_equipment', authMiddleware, async (req, res) => {
  const { heavyEquipment } = req.body || {};
  if (!heavyEquipment) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('heavy_equipment', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify(heavyEquipment)],
    );
    res.json({ heavyEquipment });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando info de equipo pesado' });
  }
});

app.get('/api/settings/tab_title', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT `value` FROM app_settings WHERE `key` = 'tab_title'");
    const tabTitle = rows[0]?.value || 'JJ construccion';
    res.json({ tabTitle });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo título de pestaña' });
  }
});

app.put('/api/settings/tab_title', authMiddleware, async (req, res) => {
  const { tabTitle } = req.body || {};
  if (typeof tabTitle !== 'string') {
    return res.status(400).json({ error: 'Título inválido' });
  }
  try {
    await db.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES ('tab_title', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [tabTitle],
    );
    res.json({ tabTitle });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando título de pestaña' });
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET_FINAL);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: 'Usuario y contraseña requeridos'
      });
    }

    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos'
      });
    }

    const passwordValid = bcrypt.compareSync(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET_FINAL,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      username: user.username
    });

  } catch (error) {
    console.error('Error en login:', error);

    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});
app.get('/api/products', async (req, res) => {
  const [rows] = await db.query('SELECT id, name, price, image, category, store_filter_key AS storeFilterKey, subcategory, description, stock, rating, original_price AS originalPrice, tag FROM products ORDER BY id');
  res.set('Cache-Control', 'no-store');
  res.json(rows.map(r => ({ ...r, price: Number(r.price), originalPrice: r.originalPrice ? Number(r.originalPrice) : undefined, stock: Number(r.stock) })));
});

app.get('/api/products/:id', async (req, res) => {
  const [rows] = await db.query('SELECT id, name, price, image, category, store_filter_key AS storeFilterKey, subcategory, description, stock, rating, original_price AS originalPrice, tag FROM products WHERE id = ?', [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
  res.set('Cache-Control', 'no-store');
  res.json({ ...row, price: Number(row.price), originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined, stock: Number(row.stock) });
});

app.post('/api/products', authMiddleware, async (req, res) => {
  const { name, price, image, category, storeFilterKey, subcategory, description, stock, rating, originalPrice, tag } = req.body;
  if (!name || price == null || !category || stock == null) return res.status(400).json({ error: 'Faltan campos requeridos' });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  await db.query(
    'INSERT INTO products (id, name, price, image, category, store_filter_key, subcategory, description, stock, rating, original_price, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, Number(price), image || '/product-drill.jpg', category, storeFilterKey || null, subcategory || null, description || '', Number(stock), rating != null ? Number(rating) : null, originalPrice != null ? Number(originalPrice) : null, tag || null]
  );
  const [rows] = await db.query('SELECT id, name, price, image, category, store_filter_key AS storeFilterKey, subcategory, description, stock, rating, original_price AS originalPrice, tag FROM products WHERE id = ?', [id]);
  const row = rows[0];
  res.status(201).json({ ...row, price: Number(row.price), stock: Number(row.stock), originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined });
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, price, image, category, storeFilterKey, subcategory, description, stock, rating, originalPrice, tag } = req.body;
  const [existingRows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });
  await db.query(
    'UPDATE products SET name=?, price=?, image=?, category=?, store_filter_key=?, subcategory=?, description=?, stock=?, rating=?, original_price=?, tag=? WHERE id=?',
    [name ?? existing.name, price != null ? Number(price) : existing.price, image ?? existing.image, category ?? existing.category, storeFilterKey !== undefined ? (storeFilterKey || null) : existing.store_filter_key, subcategory !== undefined ? (subcategory || null) : existing.subcategory, description ?? existing.description, stock != null ? Number(stock) : existing.stock, rating != null ? Number(rating) : existing.rating, originalPrice !== undefined ? (originalPrice != null ? Number(originalPrice) : null) : existing.original_price, tag !== undefined ? (tag || null) : existing.tag, id]
  );
  const [rows] = await db.query('SELECT id, name, price, image, category, store_filter_key AS storeFilterKey, subcategory, description, stock, rating, original_price AS originalPrice, tag FROM products WHERE id = ?', [id]);
  const row = rows[0];
  res.json({ ...row, price: Number(row.price), stock: Number(row.stock), originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined });
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const [productRows] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
  if (!productRows.length) return res.status(404).json({ error: 'Producto no encontrado' });
  try {
    const connection = await db.getConnection();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DELETE FROM order_items WHERE product_id = ?', [id]);
    await connection.query('DELETE FROM offers WHERE product_id = ?', [id]);
    const [result] = await connection.query('DELETE FROM products WHERE id = ?', [id]);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    await ensureCategoriesTable();
    const [rows] = await db.query('SELECT id, name, icon, sort_order AS sortOrder, filter_key AS filterKey FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(rows.map(r => ({ ...r, id: String(r.id) })));
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    await ensureCategoriesTable();
    const { name, icon, filterKey } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const [countRows] = await db.query('SELECT COUNT(*) as n FROM categories');
    const [result] = await db.query('INSERT INTO categories (name, icon, sort_order, filter_key) VALUES (?, ?, ?, ?)', [name.trim(), (icon && String(icon).trim()) || 'Wrench', countRows[0].n, (filterKey && String(filterKey).trim()) || null]);
    const [rows] = await db.query('SELECT id, name, icon, sort_order AS sortOrder, filter_key AS filterKey FROM categories WHERE id=?', [result.insertId]);
    res.status(201).json({ ...rows[0], id: String(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sortOrder, filterKey } = req.body || {};
    const [existingRows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    const newName = name !== undefined ? String(name).trim() : existing.name;
    if (!newName) return res.status(400).json({ error: 'Nombre vacío' });
    await db.query('UPDATE categories SET name=?, icon=?, sort_order=?, filter_key=? WHERE id=?', [newName, (icon !== undefined ? String(icon) : existing.icon) || 'Wrench', sortOrder != null ? Number(sortOrder) : existing.sort_order, filterKey !== undefined ? (filterKey && String(filterKey).trim() || null) : existing.filter_key, id]);
    const [rows] = await db.query('SELECT id, name, icon, sort_order AS sortOrder, filter_key AS filterKey FROM categories WHERE id=?', [id]);
    res.json({ ...rows[0], id: String(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/filter-groups', async (req, res) => {
  try {
    await ensureFilterGroupsTable();
    const [rows] = await db.query('SELECT id, name, `key`, sort_order AS sortOrder FROM filter_groups ORDER BY sort_order ASC, name ASC');
    res.json(rows.map(r => ({ ...r, id: String(r.id) })));
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========== FILTER ITEMS ==========
app.get('/api/filter-items', async (req, res) => {
  try {
    await ensureFilterItemsTable();
    const { groupKey } = req.query;
    if (groupKey) {
      const [rows] = await db.query('SELECT id, filter_group_key AS filterGroupKey, name, sort_order AS sortOrder FROM filter_items WHERE filter_group_key = ? ORDER BY sort_order ASC, name ASC', [groupKey]);
      return res.json(rows.map(r => ({ ...r, id: String(r.id) })));
    }
    const [rows] = await db.query('SELECT id, filter_group_key AS filterGroupKey, name, sort_order AS sortOrder FROM filter_items ORDER BY filter_group_key ASC, sort_order ASC, name ASC');
    res.json(rows.map(r => ({ ...r, id: String(r.id) })));
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/filter-items', authMiddleware, async (req, res) => {
  try {
    await ensureFilterItemsTable();
    const { filterGroupKey, name } = req.body || {};
    if (!filterGroupKey || !name || !name.trim()) return res.status(400).json({ error: 'filterGroupKey and name are required' });
    const [countRows] = await db.query('SELECT COUNT(*) as n FROM filter_items WHERE filter_group_key = ?', [filterGroupKey]);
    const [result] = await db.query('INSERT INTO filter_items (filter_group_key, name, sort_order) VALUES (?, ?, ?)', [filterGroupKey, name.trim(), countRows[0].n]);
    const [rows] = await db.query('SELECT id, filter_group_key AS filterGroupKey, name, sort_order AS sortOrder FROM filter_items WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...rows[0], id: String(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Item already exists in this group' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/filter-items/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body || {};
    const [existingRows] = await db.query('SELECT * FROM filter_items WHERE id = ?', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const newName = name !== undefined ? String(name).trim() : existing.name;
    if (!newName) return res.status(400).json({ error: 'Name cannot be empty' });
    await db.query('UPDATE filter_items SET name = ? WHERE id = ?', [newName, id]);
    const [rows] = await db.query('SELECT id, filter_group_key AS filterGroupKey, name, sort_order AS sortOrder FROM filter_items WHERE id = ?', [id]);
    res.json({ ...rows[0], id: String(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Item already exists' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/filter-items/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM filter_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/filter-groups', authMiddleware, async (req, res) => {
  try {
    await ensureFilterGroupsTable();
    const { name, key } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Nombre obligatorio' });
    const keyVal = (key != null && String(key).trim()) ? String(key).trim().toLowerCase().replace(/\s+/g, '-') : name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
    if (!keyVal) return res.status(400).json({ error: 'Indica nombre' });
    const [countRows] = await db.query('SELECT COUNT(*) as n FROM filter_groups');
    const [result] = await db.query('INSERT INTO filter_groups (name, `key`, sort_order) VALUES (?, ?, ?)', [name.trim(), keyVal, countRows[0].n]);
    const [rows] = await db.query('SELECT id, name, `key`, sort_order AS sortOrder FROM filter_groups WHERE id=?', [result.insertId]);
    res.status(201).json({ ...rows[0], id: String(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/filter-groups/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, key, sortOrder } = req.body || {};
  const [existingRows] = await db.query('SELECT * FROM filter_groups WHERE id = ?', [id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  const newName = name !== undefined ? String(name).trim() : existing.name;
  const newKey = key !== undefined ? String(key).trim().toLowerCase().replace(/\s+/g, '-') : existing.key;
  if (!newName || !newKey) return res.status(400).json({ error: 'Vacío' });
  try {
    await db.query('UPDATE filter_groups SET name=?, `key`=?, sort_order=? WHERE id=?', [newName, newKey, sortOrder != null ? Number(sortOrder) : existing.sort_order, id]);
    const [rows] = await db.query('SELECT id, name, `key`, sort_order AS sortOrder FROM filter_groups WHERE id=?', [id]);
    res.json({ ...rows[0], id: String(rows[0].id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/filter-groups/:id', authMiddleware, async (req, res) => {
  const [rows] = await db.query('SELECT `key` FROM filter_groups WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  await db.query('UPDATE categories SET filter_key = NULL WHERE filter_key = ?', [rows[0].key]);
  await db.query('DELETE FROM filter_groups WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  const [rows] = await db.query(`
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_address, o.customer_notes,
           o.total, o.payment_method, o.status, o.created_at,
           oi.product_id AS productId, oi.product_name AS productName,
           oi.product_price AS productPrice, oi.product_image AS productImage, oi.quantity
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ORDER BY o.created_at DESC, o.id, oi.id
  `);
  const ordersMap = new Map();
  for (const r of rows) {
    if (!ordersMap.has(r.id)) {
      ordersMap.set(r.id, {
        id: r.id,
        customer: { name: r.customer_name, phone: r.customer_phone, address: r.customer_address, notes: r.customer_notes },
        items: [],
        total: Number(r.total),
        paymentMethod: r.payment_method,
        status: r.status,
        createdAt: r.created_at,
      });
    }
    if (r.productId) {
      ordersMap.get(r.id).items.push({
        product: { id: r.productId, name: r.productName, price: Number(r.productPrice), image: r.productImage },
        quantity: r.quantity,
      });
    }
  }
  res.json([...ordersMap.values()]);
});

app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  const [result] = await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json({ id, status });
});

app.post('/api/orders', async (req, res) => {
  const { customer, items, total, paymentMethod, stripePaymentId } = req.body;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'INSERT INTO orders (id, customer_name, customer_phone, customer_address, customer_notes, total, payment_method, stripe_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, customer.name, customer.phone, customer.address, customer.notes, Number(total), paymentMethod, stripePaymentId || null]
    );
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, product_name, product_price, product_image, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [id, item.product.id, item.product.name, Number(item.product.price), item.product.image, item.quantity]
      );
    }
    await connection.commit();
    res.status(201).json({ success: true, id });

    // Enviar correo de confirmación al cliente de forma asíncrona
    try {
      let customerEmail = '';
      if (customer.notes && customer.notes.includes('Email: ')) {
        const parts = customer.notes.split('Email: ');
        if (parts.length > 1) {
          customerEmail = parts[1].trim();
        }
      }

      if (customerEmail && transporter) {
        const itemsListHTML = items.map((i) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${i.product.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${i.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${Number(i.product.price).toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(Number(i.product.price) * i.quantity).toFixed(2)}</td>
          </tr>
        `).join('');

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: customerEmail,
          subject: `JJ Construction - Receipt for Order #${id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #1e5631;">Thank you for your purchase!</h2>
              <p>Hello ${customer.name},</p>
              <p>We have successfully received your order <strong>#${id}</strong>. Below are the details of your purchase:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background-color: #f8f8f8;">
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Item</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHTML}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Grand Total:</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">$${Number(total).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              <p><strong>Shipping Address:</strong><br>${customer.address}</p>
              <p><strong>Phone:</strong> ${customer.phone}</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
                <p>This is an automated receipt. Please do not reply directly to this email.</p>
                <p>JJ Construction &copy; ${new Date().getFullYear()}</p>
              </div>
            </div>
          `
        };

        transporter.sendMail(mailOptions).catch(err => {
          console.error('Error enviando correo de recibo:', err);
        });
      }
    } catch (mailError) {
      console.error('Error procesando el envío del recibo:', mailError);
    }

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al crear pedido' });
  } finally {
    connection.release();
  }
});

app.get('/api/carousel', async (req, res) => {
  const [rows] = await db.query('SELECT id, image, alt, title, highlight, description, sort_order AS sortOrder FROM carousel_slides ORDER BY sort_order ASC');
  res.json(rows.map(r => ({ id: r.id, src: r.image, alt: r.alt || '', title: r.title || '', highlight: r.highlight || '', description: r.description || '', sortOrder: r.sortOrder })));
});

app.post('/api/carousel', authMiddleware, async (req, res) => {
  const { image, alt, title, highlight, description } = req.body || {};
  if (!image) return res.status(400).json({ error: 'URL de imagen requerida' });
  const [countRows] = await db.query('SELECT COUNT(*) as n FROM carousel_slides');
  const [result] = await db.query(
    'INSERT INTO carousel_slides (image, alt, title, highlight, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [image.trim(), alt?.trim() || '', title?.trim() || null, highlight?.trim() || null, description?.trim() || null, countRows[0].n]
  );
  const [rows] = await db.query('SELECT id, image, alt, title, highlight, description, sort_order AS sortOrder FROM carousel_slides WHERE id=?', [result.insertId]);
  const row = rows[0];
  res.status(201).json({ id: row.id, src: row.image, alt: row.alt || '', title: row.title || '', highlight: row.highlight || '', description: row.description || '', sortOrder: row.sortOrder });
});

app.put('/api/carousel/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { image, alt, title, highlight, description, sortOrder } = req.body || {};
  const [existingRows] = await db.query('SELECT * FROM carousel_slides WHERE id = ?', [id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Slide no encontrado' });
  await db.query(
    'UPDATE carousel_slides SET image=?, alt=?, title=?, highlight=?, description=?, sort_order=? WHERE id=?',
    [image ?? existing.image, alt ?? existing.alt, title !== undefined ? title : existing.title, highlight !== undefined ? highlight : existing.highlight, description !== undefined ? description : existing.description, sortOrder ?? existing.sort_order, id]
  );
  const [rows] = await db.query('SELECT id, image, alt, title, highlight, description, sort_order AS sortOrder FROM carousel_slides WHERE id=?', [id]);
  const row = rows[0];
  res.json({ id: row.id, src: row.image, alt: row.alt || '', title: row.title || '', highlight: row.highlight || '', description: row.description || '', sortOrder: row.sortOrder });
});

app.delete('/api/carousel/:id', authMiddleware, async (req, res) => {
  const [result] = await db.query('DELETE FROM carousel_slides WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Slide no encontrado' });
  const [rows] = await db.query('SELECT id, sort_order FROM carousel_slides ORDER BY sort_order ASC');
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].sort_order !== i) await db.query('UPDATE carousel_slides SET sort_order = ? WHERE id = ?', [i, rows[i].id]);
  }
  res.status(204).send();
});

app.patch('/api/carousel/reorder', authMiddleware, async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array requerido' });
  for (let i = 0; i < order.length; i++) {
    await db.query('UPDATE carousel_slides SET sort_order = ? WHERE id = ?', [i, order[i]]);
  }
  const [rows] = await db.query('SELECT id, image, alt, title, description, sort_order AS sortOrder FROM carousel_slides ORDER BY sort_order ASC');
  res.json(rows.map(r => ({ id: r.id, src: r.image, alt: r.alt || '', title: r.title || '', description: r.description || '', sortOrder: r.sortOrder })));
});

app.get('/api/promo-banners', async (req, res) => {
  const [rows] = await db.query('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners ORDER BY sort_order ASC');
  res.json(rows);
});

app.post('/api/promo-banners', authMiddleware, async (req, res) => {
  await ensurePromoBannersTable();
  const { image, title, description } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Imagen requerida' });
  const [countRows] = await db.query('SELECT COUNT(*) as n FROM promo_banners');
  const [result] = await db.query('INSERT INTO promo_banners (image, title, description, sort_order) VALUES (?, ?, ?, ?)', [image, title || '', description || '', countRows[0].n]);
  const [rows] = await db.query('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners WHERE id=?', [result.insertId]);
  res.status(201).json(rows[0]);
});

app.put('/api/promo-banners/:id', authMiddleware, async (req, res) => {
  const { image, title, description, sortOrder } = req.body || {};
  const [existingRows] = await db.query('SELECT * FROM promo_banners WHERE id = ?', [req.params.id]);
  if (!existingRows.length) return res.status(404).json({ error: 'No encontrado' });
  await db.query('UPDATE promo_banners SET image=?, title=?, description=?, sort_order=? WHERE id=?', [image ?? existingRows[0].image, title ?? existingRows[0].title, description ?? existingRows[0].description, sortOrder ?? existingRows[0].sort_order, req.params.id]);
  const [rows] = await db.query('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners WHERE id=?', [req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/promo-banners/:id', authMiddleware, async (req, res) => {
  const [result] = await db.query('DELETE FROM promo_banners WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
  const [rows] = await db.query('SELECT id, sort_order FROM promo_banners ORDER BY sort_order ASC');
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].sort_order !== i) await db.query('UPDATE promo_banners SET sort_order = ? WHERE id = ?', [i, rows[i].id]);
  }
  res.status(204).send();
});

app.patch('/api/promo-banners/reorder', authMiddleware, async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array requerido' });
  for (let i = 0; i < order.length; i++) {
    await db.query('UPDATE promo_banners SET sort_order = ? WHERE id = ?', [i, order[i]]);
  }
  const [rows] = await db.query('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners ORDER BY sort_order ASC');
  res.json(rows);
});

app.get('/api/offers', async (req, res) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [rows] = await db.query(`
    SELECT o.id, o.product_id AS productId, o.discount_percent AS discountPercent, o.valid_until AS validUntil,
           p.id AS p_id, p.name AS p_name, p.price AS p_price, p.image AS p_image, p.category AS p_category,
           p.description AS p_description, p.stock AS p_stock, p.rating AS p_rating, p.original_price AS p_original_price, p.tag AS p_tag
    FROM offers o JOIN products p ON p.id = o.product_id
    WHERE o.valid_until IS NULL OR o.valid_until >= ?
    ORDER BY o.id DESC
  `, [now]);
  res.json(rows.map(r => ({
    id: r.id, productId: r.productId, discountPercent: Number(r.discountPercent), validUntil: r.validUntil || undefined,
    product: { id: r.p_id, name: r.p_name, price: Number(r.p_price), image: r.p_image, category: r.p_category, description: r.p_description, stock: Number(r.p_stock), rating: r.p_rating ? Number(r.p_rating) : undefined, originalPrice: r.p_original_price ? Number(r.p_original_price) : undefined, tag: r.p_tag }
  })));
});

app.get('/api/offers/all', authMiddleware, async (req, res) => {
  const [rows] = await db.query(`
    SELECT o.id, o.product_id AS productId, o.discount_percent AS discountPercent, o.valid_until AS validUntil,
           p.id AS p_id, p.name AS p_name, p.price AS p_price, p.image AS p_image, p.category AS p_category,
           p.description AS p_description, p.stock AS p_stock, p.rating AS p_rating, p.original_price AS p_original_price, p.tag AS p_tag
    FROM offers o JOIN products p ON p.id = o.product_id ORDER BY o.id DESC
  `);
  res.json(rows.map(r => ({
    id: r.id, productId: r.productId, discountPercent: Number(r.discountPercent), validUntil: r.validUntil || undefined,
    product: { id: r.p_id, name: r.p_name, price: Number(r.p_price), image: r.p_image, category: r.p_category, description: r.p_description, stock: Number(r.p_stock), rating: r.p_rating ? Number(r.p_rating) : undefined, originalPrice: r.p_original_price ? Number(r.p_original_price) : undefined, tag: r.p_tag }
  })));
});

app.post('/api/offers', authMiddleware, async (req, res) => {
  const { productId, discountPercent, validUntil } = req.body || {};
  if (!productId || discountPercent == null) return res.status(400).json({ error: 'Faltan datos' });
  const [pRows] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
  if (!pRows.length) return res.status(404).json({ error: 'Producto no encontrado' });
  const [existingRows] = await db.query('SELECT id FROM offers WHERE product_id = ?', [productId]);
  if (existingRows.length) return res.status(400).json({ error: 'Ya tiene oferta' });
  const [result] = await db.query('INSERT INTO offers (product_id, discount_percent, valid_until) VALUES (?, ?, ?)', [productId, Number(discountPercent), validUntil || null]);
  const [rows] = await db.query('SELECT * FROM offers WHERE id=?', [result.insertId]);
  res.status(201).json(rows[0]);
});

app.put('/api/offers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { discountPercent, validUntil } = req.body || {};
  const [existingRows] = await db.query('SELECT * FROM offers WHERE id = ?', [id]);
  if (!existingRows.length) return res.status(404).json({ error: 'Oferta no encontrada' });
  await db.query('UPDATE offers SET discount_percent=?, valid_until=? WHERE id=?', [discountPercent ?? existingRows[0].discount_percent, validUntil !== undefined ? validUntil : existingRows[0].valid_until, id]);
  const [rows] = await db.query('SELECT * FROM offers WHERE id=?', [id]);
  res.json(rows[0]);
});

app.delete('/api/offers/:id', authMiddleware, async (req, res) => {
  const [result] = await db.query('DELETE FROM offers WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
  res.status(204).send();
});

const dns = require('node:dns');
const https = require('node:https');
const net = require('node:net');
const Stripe = require('stripe');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripeHttpAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    if (typeof options === 'function') { callback = options; options = {}; }
    if (typeof options === 'number') { options = { family: options }; }
    const ipFamily = net.isIP(hostname);
    if (ipFamily) return callback(null, hostname, ipFamily);
    const wantAll = Boolean(options && options.all);
    dns.resolve4(hostname, (err, addresses) => {
      if (err) return callback(err);
      if (!addresses || addresses.length === 0) return callback(new Error('no addresses'));
      if (wantAll) return callback(null, addresses.map(a => ({ address: a, family: 4 })));
      return callback(null, addresses[0], 4);
    });
  },
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) return res.status(500).send({ error: 'Stripe no configurado' });
    const stripe = new Stripe(STRIPE_SECRET_KEY, { httpAgent: stripeHttpAgent });
    const { items, customer } = req.body;
    let total = 0;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    for (const item of items) {
      const [pRows] = await db.query('SELECT price FROM products WHERE id = ?', [item.product.id]);
      if (pRows.length) {
        const [oRows] = await db.query("SELECT discount_percent FROM offers WHERE product_id = ? AND (valid_until IS NULL OR valid_until > ?)", [item.product.id, now]);
        let price = Number(pRows[0].price);
        if (oRows.length) price *= (1 - Number(oRows[0].discount_percent) / 100);
        total += price * item.quantity;
      }
    }
    const shipping = 0; // Forced free shipping per request (aligned with frontend)
    const tax = 0; // Tax removed per user request
    const finalAmount = Math.round((total + shipping) * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount, currency: 'usd', automatic_payment_methods: { enabled: true },
      metadata: { customer_name: customer?.name || '', customer_email: customer?.email || '' }
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('[stripe]', error.message);
    res.status(500).send({ error: 'Error procesando el pago' });
  }
});

app.get('/api/auth/verify-token', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.get('/api/services', async (req, res) => {
  await ensureServicesTable();
  const [rows] = await db.query('SELECT id, title, category, description, image, video, content, brand_name AS brandName, brand_tagline AS brandTagline, home_slot AS homeSlot, sort_order AS sortOrder, image_before AS imageBefore, image_after AS imageAfter, created_at FROM services ORDER BY sort_order ASC, created_at DESC');
  res.json(rows);
});

app.post('/api/services', authMiddleware, async (req, res) => {
  await ensureServicesTable();
  const { title, category, description, image, video, content, brandName, brandTagline, homeSlot, imageBefore, imageAfter } = req.body || {};
  if (!title || !category || !description) return res.status(400).json({ error: 'Faltan campos' });
  const [countRows] = await db.query('SELECT COUNT(*) as n FROM services');
  const [result] = await db.query(
    'INSERT INTO services (title, category, description, image, video, content, brand_name, brand_tagline, home_slot, sort_order, image_before, image_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      title.trim(),
      category.trim(),
      description.trim(),
      image || null,
      video || null,
      content || null,
      brandName?.trim() || null,
      brandTagline?.trim() || null,
      homeSlot ?? null,
      countRows[0].n,
      imageBefore || null,
      imageAfter || null,
    ]
  );
  const [rows] = await db.query('SELECT id, title, category, description, image, video, content, brand_name AS brandName, brand_tagline AS brandTagline, home_slot AS homeSlot, sort_order AS sortOrder, image_before AS imageBefore, image_after AS imageAfter, created_at FROM services WHERE id=?', [result.insertId]);
  res.status(201).json(rows[0]);
});

app.put('/api/services/:id', authMiddleware, async (req, res) => {
  await ensureServicesTable();
  const { title, category, description, image, video, content, sortOrder, brandName, brandTagline, homeSlot, imageBefore, imageAfter } = req.body || {};
  const [existingRows] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existingRows.length) return res.status(404).json({ error: 'No encontrado' });
  await db.query(
    'UPDATE services SET title=?, category=?, description=?, image=?, video=?, content=?, brand_name=?, brand_tagline=?, home_slot=?, sort_order=?, image_before=?, image_after=? WHERE id=?',
    [
      title ?? existingRows[0].title,
      category ?? existingRows[0].category,
      description ?? existingRows[0].description,
      image !== undefined ? image : existingRows[0].image,
      video !== undefined ? video : existingRows[0].video,
      content !== undefined ? content : existingRows[0].content,
      brandName !== undefined ? (brandName?.trim() || null) : existingRows[0].brand_name,
      brandTagline !== undefined ? (brandTagline?.trim() || null) : existingRows[0].brand_tagline,
      homeSlot !== undefined ? (homeSlot === null ? null : Number(homeSlot)) : existingRows[0].home_slot,
      sortOrder ?? existingRows[0].sort_order,
      imageBefore !== undefined ? (imageBefore || null) : existingRows[0].image_before,
      imageAfter !== undefined ? (imageAfter || null) : existingRows[0].image_after,
      req.params.id
    ]
  );
  const [rows] = await db.query('SELECT id, title, category, description, image, video, content, brand_name AS brandName, brand_tagline AS brandTagline, home_slot AS homeSlot, sort_order AS sortOrder, image_before AS imageBefore, image_after AS imageAfter, created_at FROM services WHERE id=?', [req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/services/:id', authMiddleware, async (req, res) => {
  await ensureServicesTable();
  const [result] = await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
  const [rows] = await db.query('SELECT id, sort_order FROM services ORDER BY sort_order ASC');
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].sort_order !== i) await db.query('UPDATE services SET sort_order = ? WHERE id = ?', [i, rows[i].id]);
  }
  res.status(204).send();
});

app.patch('/api/services/reorder', authMiddleware, async (req, res) => {
  await ensureServicesTable();
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array requerido' });
  for (let i = 0; i < order.length; i++) {
    await db.query('UPDATE services SET sort_order = ? WHERE id = ?', [i, order[i]]);
  }
  const [rows] = await db.query('SELECT id, title, category, description, image, video, content, brand_name AS brandName, brand_tagline AS brandTagline, home_slot AS homeSlot, sort_order AS sortOrder, image_before AS imageBefore, image_after AS imageAfter, created_at FROM services ORDER BY sort_order ASC, created_at DESC');
  res.json(rows);
});

// ─────────────── CHAT ───────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Create or retrieve a chat session (public)
app.post('/api/chat/sessions', chatSessionLimiter, async (req, res) => {
  await ensureChatTables();
  const { sessionId, visitorName } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  if (!UUID_RE.test(sessionId)) return res.status(400).json({ error: 'sessionId inválido' });
  const [existing] = await db.query('SELECT * FROM chat_sessions WHERE session_id = ?', [sessionId]);
  if (existing.length > 0) {
    if (visitorName && visitorName.trim()) {
      await db.query('UPDATE chat_sessions SET visitor_name = ? WHERE session_id = ?', [visitorName.trim(), sessionId]);
    }
    return res.json({ ...existing[0], visitorName: visitorName?.trim() || existing[0].visitor_name });
  }
  const name = (visitorName && visitorName.trim()) ? visitorName.trim() : 'Visitor';
  await db.query('INSERT INTO chat_sessions (session_id, visitor_name) VALUES (?, ?)', [sessionId, name]);
  const [[row]] = await db.query('SELECT * FROM chat_sessions WHERE session_id = ?', [sessionId]);
  res.status(201).json(row);
});

// Get messages for a session (public — session_id acts as the access token)
app.get('/api/chat/messages/:sessionId', async (req, res) => {
  await ensureChatTables();
  const [rows] = await db.query(
    'SELECT id, session_id, sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
    [req.params.sessionId]
  );
  res.json(rows);
});

const AUTO_REPLY = `¡Hola! 👋 Gracias por contactarnos. Somos el equipo de JJ Construcción.\n\nPor favor cuéntanos:\n• ¿Cuál es tu consulta o necesidad?\n• ¿En qué proyecto o servicio estás interesado?\n\nUn asesor te responderá a la brevedad. ¡Estamos aquí para ayudarte!`;

const NOTIFY_WHATSAPP = process.env.NOTIFY_WHATSAPP;
const NOTIFY_EMAIL    = process.env.NOTIFY_EMAIL;

async function sendChatNotification(visitorName, firstMessage) {
  const preview = firstMessage.length > 120 ? firstMessage.slice(0, 120) + '…' : firstMessage;

  // WhatsApp via Twilio
  if (NOTIFY_WHATSAPP && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    try {
      const client = getTwilioClient();
      await client.messages.create({
        from: `whatsapp:${TWILIO_FROM_NUMBER}`,
        to:   `whatsapp:${NOTIFY_WHATSAPP}`,
        body: `💬 *Nuevo mensaje en el chat*\n\n👤 Visitante: ${visitorName}\n📝 Mensaje: "${preview}"\n\nResponde desde el panel admin → Live Chat.`,
      });
    } catch (err) {
      console.error('[chat notify] WhatsApp error:', err.message);
    }
  }

  // Email via Nodemailer
  if (NOTIFY_EMAIL && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to:   NOTIFY_EMAIL,
        subject: `💬 Nuevo mensaje en el chat — ${visitorName}`,
        html: `
          <h2 style="color:#1e5631;">Nuevo mensaje en el chat</h2>
          <p><strong>Visitante:</strong> ${visitorName}</p>
          <p><strong>Mensaje:</strong></p>
          <blockquote style="border-left:4px solid #1e5631;padding:8px 16px;color:#333;background:#f0faf3;">${preview}</blockquote>
          <p>Entra al panel de administración → sección <strong>Live Chat</strong> para responderle.</p>
        `,
      });
    } catch (err) {
      console.error('[chat notify] Email error:', err.message);
    }
  }
}

async function getGroqReply(chatHistory, dbProducts = [], dbServices = [], visitorName = 'Visitor') {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return reject(new Error('GROQ_API_KEY no configurada'));
    }

    // Format products list for AI context
    let productsListText = "";
    if (dbProducts && dbProducts.length > 0) {
      productsListText = "\nProducts currently in our store (you can recommend these):" +
        dbProducts.map(p => `\n- **${p.name}** ($${p.price}) | Category: ${p.category} | ${p.description || 'No description'}`).join('');
    } else {
      productsListText = "\n(No products are currently available in the database, but we sell general construction tools and supplies).";
    }

    // Format services list for AI context
    let servicesListText = "";
    if (dbServices && dbServices.length > 0) {
      servicesListText = "\nServices we offer (you can recommend these):" +
        dbServices.map(s => `\n- **${s.title}** (Category: ${s.category}) | ${s.description || 'No description'}`).join('');
    } else {
      servicesListText = "\nServices we offer:\n- **General Construction & Renovations**\n- **Home Remodeling & Finishes**\n- **Concrete, Masonry & Structures**\n- **Project Design**";
    }

    const systemPrompt = `You are the virtual AI assistant for the company "JJ Construcción".
Your goal is to assist visitors professionally, warmly, and efficiently.

Visitor's Name: "${visitorName}"
(Address the user by their name in a friendly, natural way. If the name is 'Visitor' or 'Visitante', use a general warm greeting).

Language Rule:
Our target audience is primarily English-speaking, so please respond in English by default. However, if the user writes to you in Spanish or any other language, you MUST respond in that same language.

Company Services:
${servicesListText}

Contact Information:
- Direct Human Assistant (WhatsApp): **+1 (801) 347-2165** (Link: **https://wa.me/18013472165**)
- Office Phone (US): **+1 (801) 347-2165**
- Email: **josarzc@hotmail.com**
- Hours: Mon-Fri: 8:00 AM - 6:00 PM, Sat: 8:00 AM - 1:00 PM
${productsListText}

CRITICAL RULE - Human Representative / Real Person Request:
If the user asks or expresses a desire to talk to a human, speak with a real person, connect with an agent, or talk to support (e.g., "quiero hablar con una persona real", "hablar con un asesor", "persona real", "talk to a human", "talk to a real person", "speak with an agent", "human representative"), you MUST immediately answer politely and provide the direct WhatsApp link: **https://wa.me/18013472165** (+1 (801) 347-2165).

Formatting & Style Guidelines:
1. Always use clean Markdown formatting: use bolding (**text**) for key terms/names, and clean bullet lists (-, •) for listings.
2. Keep your answers brief, polite, and conversational (max 2 or 3 short paragraphs).
3. Use appropriate and friendly emojis (👋, 🏗️, 🛠️, etc.) to make the text engaging.
4. Recommend matching products or services from the database lists when the user expresses a need.
5. If they want to place an order or schedule a project, guide them to contact us directly via our WhatsApp link https://wa.me/18013472165 or email.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(h => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.message
      }))
    ];

    const postData = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`Groq API error (status ${res.statusCode}): ${data}`));
          }
          const response = JSON.parse(data);
          const reply = response.choices?.[0]?.message?.content || '';
          resolve(reply.trim());
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

// User sends a message (public)
app.post('/api/chat/messages', chatMsgLimiter, async (req, res) => {
  await ensureChatTables();
  const { sessionId, message } = req.body || {};
  if (!sessionId || !message || !String(message).trim()) return res.status(400).json({ error: 'sessionId and message required' });
  if (!UUID_RE.test(sessionId)) return res.status(400).json({ error: 'sessionId inválido' });
  if (String(message).length > 2000) return res.status(400).json({ error: 'Mensaje demasiado largo (máx. 2000 caracteres)' });
  
  const [session] = await db.query('SELECT id, visitor_name FROM chat_sessions WHERE session_id = ?', [sessionId]);
  if (!session.length) return res.status(404).json({ error: 'Session not found' });
  let visitorName = session[0].visitor_name || 'Visitor';

  // Automatically extract visitor name if they introduce themselves and it's currently 'Visitor'
  if (visitorName === 'Visitor' || visitorName === 'Visitante') {
    const nameRegex = /(?:me llamo|mi nombre es|soy|my name is|i'm|i am)\s+([a-zA-ZñÑáéíóúüÁÉÍÓÚÜ\s]+)/i;
    const match = String(message).match(nameRegex);
    if (match && match[1]) {
      const extractedName = match[1].trim().split(/\s+/)[0];
      if (extractedName && extractedName.length > 1 && extractedName.length < 30) {
        const formattedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
        await db.query('UPDATE chat_sessions SET visitor_name = ? WHERE session_id = ?', [formattedName, sessionId]);
        visitorName = formattedName;
      }
    }
  }

  // check if this is the first user message in the session
  const [[{ count: prevCount }]] = await db.query(
    'SELECT COUNT(*) AS count FROM chat_messages WHERE session_id = ? AND sender = ?',
    [sessionId, 'user']
  );
  const isFirst = Number(prevCount) === 0;

  // Insert user's message
  await db.query('INSERT INTO chat_messages (session_id, sender, message) VALUES (?, ?, ?)', [sessionId, 'user', String(message).trim()]);
  await db.query('UPDATE chat_sessions SET unread_admin = unread_admin + 1, last_message_at = NOW() WHERE session_id = ?', [sessionId]);
  const [[row]] = await db.query('SELECT id, session_id, sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1', [sessionId]);

  // Fetch conversation history for Groq context (last 20 messages)
  const [history] = await db.query(
    'SELECT sender, message FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 20',
    [sessionId]
  );

  // Fetch active products and services from database to feed into the AI context
  let dbProducts = [];
  let dbServices = [];
  try {
    const [productsRows] = await db.query('SELECT name, price, category, description, stock FROM products LIMIT 25');
    dbProducts = productsRows;
  } catch (dbErr) {
    console.error('[Groq context product fetch error]:', dbErr.message);
  }

  try {
    const [servicesRows] = await db.query('SELECT title, category, description FROM services LIMIT 25');
    dbServices = servicesRows;
  } catch (dbErr) {
    console.error('[Groq context services fetch error]:', dbErr.message);
  }

  let replyText = '';
  try {
    // Generate AI response with products and services list + visitor name personalization
    replyText = await getGroqReply(history, dbProducts, dbServices, visitorName);
  } catch (error) {
    console.error('[Groq Chatbot Error]:', error.message);
    // Fallback response if AI fails
    replyText = isFirst ? AUTO_REPLY : 'I apologize, I am experiencing technical difficulties. A representative will get back to you shortly.';
  }

  // Insert AI reply as admin message
  await db.query('INSERT INTO chat_messages (session_id, sender, message) VALUES (?, ?, ?)', [sessionId, 'admin', replyText]);
  await db.query('UPDATE chat_sessions SET last_message_at = NOW() WHERE session_id = ?', [sessionId]);

  // Notify admin on first message
  if (isFirst) {
    const [[sess]] = await db.query('SELECT visitor_name FROM chat_sessions WHERE session_id = ?', [sessionId]);
    sendChatNotification(sess?.visitor_name || 'Visitante', String(message).trim()).catch(() => {});
  }

  res.status(201).json(row);
});

// Admin: list all chat sessions (protected)
app.get('/api/chat/sessions', authMiddleware, async (req, res) => {
  await ensureChatTables();
  const [rows] = await db.query(
    'SELECT id, session_id, visitor_name, status, unread_admin, created_at, last_message_at FROM chat_sessions ORDER BY last_message_at DESC'
  );
  res.json(rows);
});

// Admin: reply to a session (protected)
app.post('/api/chat/sessions/:sessionId/reply', authMiddleware, async (req, res) => {
  await ensureChatTables();
  const { message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'message required' });
  const [session] = await db.query('SELECT id FROM chat_sessions WHERE session_id = ?', [req.params.sessionId]);
  if (!session.length) return res.status(404).json({ error: 'Session not found' });
  await db.query('INSERT INTO chat_messages (session_id, sender, message) VALUES (?, ?, ?)', [req.params.sessionId, 'admin', String(message).trim()]);
  await db.query('UPDATE chat_sessions SET last_message_at = NOW() WHERE session_id = ?', [req.params.sessionId]);
  const [[row]] = await db.query('SELECT id, session_id, sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1', [req.params.sessionId]);
  res.status(201).json(row);
});

// Admin: mark session as read (protected)
app.put('/api/chat/sessions/:sessionId/read', authMiddleware, async (req, res) => {
  await ensureChatTables();
  await db.query('UPDATE chat_sessions SET unread_admin = 0 WHERE session_id = ?', [req.params.sessionId]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Servidor API en http://localhost:' + PORT));
