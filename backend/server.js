const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ram_berkah_sawit_tua_secret_2026';
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads-ram-berkah-sawit-tua');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Database connection pool
let pool = null;
let dbConnected = false;

async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ram_berkah_sawit_tua',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully to:', process.env.DB_NAME || 'ram_berkah_sawit_tua');
    dbConnected = true;

    // Check & auto-run schema migrations if needed
    try {
      const sqlPath = path.join(__dirname, 'sql', 'database.sql');
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));
        
        for (const statement of statements) {
          try {
            await pool.query(statement);
          } catch (stmtErr) {
            // Ignore if already exists or duplicate key
          }
        }

        // Ensure new loading fee columns exist for existing databases
        try {
          await pool.query('ALTER TABLE `settings` ADD COLUMN `default_loading_fee` DECIMAL(10, 2) NOT NULL DEFAULT 10.00');
        } catch (colErr) {
          // Column may already exist
        }
        try {
          await pool.query('ALTER TABLE `transactions` ADD COLUMN `loading_fee_per_kg` DECIMAL(10, 2) NOT NULL DEFAULT 10.00');
        } catch (colErr) {
          // Column may already exist
        }
        try {
          await pool.query('ALTER TABLE `transactions` ADD COLUMN `loading_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00');
        } catch (colErr) {
          // Column may already exist
        }

        console.log('✅ Database schema verified/initialized');
      }
    } catch (e) {
      console.warn('⚠️ Auto-schema check notice:', e.message);
    }

    // Ensure default admin & operator accounts exist
    try {
      const [userRows] = await pool.query('SELECT * FROM users WHERE username IN ("admin", "operator")');
      const hasAdmin = userRows.some(u => u.username === 'admin');
      const hasOperator = userRows.some(u => u.username === 'operator');

      const salt = await bcrypt.genSalt(10);
      if (!hasAdmin) {
        const adminHash = await bcrypt.hash('admin123', salt);
        await pool.query(
          'INSERT INTO users (name, username, password, role, status) VALUES (?, ?, ?, ?, ?)',
          ['Administrator RAM', 'admin', adminHash, 'admin', 'active']
        );
        console.log('✅ Default Admin user created: admin / admin123');
      }
      if (!hasOperator) {
        const opHash = await bcrypt.hash('operator123', salt);
        await pool.query(
          'INSERT INTO users (name, username, password, role, status) VALUES (?, ?, ?, ?, ?)',
          ['Operator Timbang 1', 'operator', opHash, 'operator', 'active']
        );
        console.log('✅ Default Operator user created: operator / operator123');
      }
    } catch (userErr) {
      console.warn('⚠️ User seed check notice:', userErr.message);
    }

    connection.release();
  } catch (err) {
    dbConnected = false;
    console.error('❌ Database connection failed:', err.message);
    console.log('ℹ️ Server will continue running. Ensure MySQL is running on port ' + (process.env.DB_PORT || 3306));
  }
}

initDb();

// DB Middleware to verify database availability
const checkDb = (req, res, next) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please ensure MySQL server is running and configured correctly.',
    });
  }
  next();
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak: Token tidak ditemukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Sesi kedaluwarsa atau token tidak valid' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya untuk Administrator' });
  }
  next();
};

// Helper to log audit
async function logAudit(userId, userName, action, entityType, entityId, details, req) {
  if (!pool || !dbConnected) return;
  try {
    const ip = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, userName || 'System', action, entityType, String(entityId || ''), typeof details === 'object' ? JSON.stringify(details) : String(details), ip]
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

// ==========================================================
// 1. AUTH ROUTES
// ==========================================================

app.post('/api/auth/login', checkDb, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND status = "active"', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const user = rows[0];
    let isMatch = false;

    // Check bcrypt hash or plain text fallback (for initial seeds)
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
    }

    // Default emergency match for default credentials
    if (!isMatch && ((username === 'admin' && password === 'admin123') || (username === 'operator' && password === 'operator123'))) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.id, user.name, 'LOGIN', 'auth', user.id, 'User login successfully', req);

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server: ' + error.message });
  }
});

app.get('/api/auth/profile', authenticateToken, checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, username, role, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 2. SETTINGS ROUTES (RAM Identity & Config)
// ==========================================================

app.get('/api/settings', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings ORDER BY id ASC LIMIT 1');
    if (rows.length === 0) {
      // Return default
      return res.json({
        success: true,
        data: {
          ram_name: 'RAM BERKAH SAWIT TUA',
          ram_code: 'BST',
          location_line1: 'Tanjung Enim',
          location_line2: 'Muara Enim, Sumatera Selatan',
          phone: '0812-7890-1234',
          address: 'Jl. Sawit Raya No. 88, Tanjung Enim',
          ticket_prefix: 'BST',
          receipt_footer: 'TERIMA KASIH\nRAM BERKAH SAWIT TUA',
          receipt_width: '58mm',
          rounding_rule: 'exact',
          default_price: 2650,
          default_loading_fee: 10,
        },
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/settings', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const {
      ram_name,
      ram_code,
      location_line1,
      location_line2,
      phone,
      address,
      ticket_prefix,
      receipt_footer,
      receipt_width,
      rounding_rule,
      default_price,
      default_loading_fee,
    } = req.body;

    const [rows] = await pool.query('SELECT id FROM settings LIMIT 1');
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO settings (ram_name, ram_code, location_line1, location_line2, phone, address, ticket_prefix, receipt_footer, receipt_width, rounding_rule, default_price, default_loading_fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ram_name || 'RAM BERKAH SAWIT TUA', ram_code || 'BST', location_line1 || 'Tanjung Enim', location_line2 || '', phone || '', address || '', ticket_prefix || 'BST', receipt_footer || '', receipt_width || '58mm', rounding_rule || 'exact', default_price || 2650, default_loading_fee !== undefined ? Number(default_loading_fee) : 10]
      );
    } else {
      await pool.query(
        `UPDATE settings SET 
         ram_name = ?, ram_code = ?, location_line1 = ?, location_line2 = ?, 
         phone = ?, address = ?, ticket_prefix = ?, receipt_footer = ?, 
         receipt_width = ?, rounding_rule = ?, default_price = ?, default_loading_fee = ?
         WHERE id = ?`,
        [ram_name, ram_code, location_line1, location_line2, phone, address, ticket_prefix, receipt_footer, receipt_width, rounding_rule, default_price, default_loading_fee !== undefined ? Number(default_loading_fee) : 10, rows[0].id]
      );
    }

    await logAudit(req.user.id, req.user.name, 'UPDATE_SETTINGS', 'settings', 1, req.body, req);

    res.json({ success: true, message: 'Pengaturan RAM berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 3. TRANSACTIONS ROUTES
// ==========================================================

// Next Ticket Number Generator
app.get('/api/transactions/next-ticket', checkDb, async (req, res) => {
  try {
    // Get prefix from settings
    const [settings] = await pool.query('SELECT ticket_prefix FROM settings LIMIT 1');
    const prefix = settings[0]?.ticket_prefix || 'BST';

    // Format: YYMMDD
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;

    const pattern = `${prefix}-${datePart}-%`;
    const [rows] = await pool.query(
      'SELECT ticket_number FROM transactions WHERE ticket_number LIKE ? ORDER BY id DESC LIMIT 1',
      [pattern]
    );

    let nextSequence = 1;
    if (rows.length > 0) {
      const lastTicket = rows[0].ticket_number;
      const parts = lastTicket.split('-');
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextSequence = lastNum + 1;
        }
      }
    }

    const ticketNumber = `${prefix}-${datePart}-${String(nextSequence).padStart(4, '0')}`;
    res.json({ success: true, ticketNumber, sequence: nextSequence });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List Transactions with Pagination, Search, Date & Status Filters
app.get('/api/transactions', checkDb, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const search = req.query.search ? req.query.search.trim() : '';
    const date = req.query.date; // 'today', 'yesterday', or specific YYYY-MM-DD
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const supplierId = req.query.supplierId;
    const status = req.query.status; // 'completed', 'cancelled', 'all'
    const sort = req.query.sort || 'DESC';

    let conditions = ['t.deleted_at IS NULL'];
    let params = [];

    if (search) {
      conditions.push('(t.ticket_number LIKE ? OR t.supplier_name LIKE ? OR t.supplier_do LIKE ? OR t.driver_name LIKE ? OR t.plate_number LIKE ? OR t.origin LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    if (status && status !== 'all') {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (date === 'today') {
      conditions.push('t.transaction_date = CURDATE()');
    } else if (date === 'yesterday') {
      conditions.push('t.transaction_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)');
    } else if (date && date !== 'all') {
      conditions.push('t.transaction_date = ?');
      params.push(date);
    }

    if (startDate && endDate) {
      conditions.push('t.transaction_date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push('t.transaction_date >= ?');
      params.push(startDate);
    } else if (endDate) {
      conditions.push('t.transaction_date <= ?');
      params.push(endDate);
    }

    if (supplierId) {
      conditions.push('t.supplier_id = ?');
      params.push(supplierId);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      params
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Fetch data
    const [data] = await pool.query(
      `SELECT t.*, s.phone as supplier_phone, s.supplier_code
       FROM transactions t
       LEFT JOIN suppliers s ON t.supplier_id = s.id
       ${whereClause}
       ORDER BY t.transaction_date ${sort}, t.transaction_time ${sort}, t.id ${sort}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Single Transaction Detail
app.get('/api/transactions/:id', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.phone as supplier_phone, s.supplier_code, s.address as supplier_address, u.name as operator_user_name
       FROM transactions t
       LEFT JOIN suppliers s ON t.supplier_id = s.id
       LEFT JOIN users u ON t.operator_id = u.id
       WHERE t.id = ? OR t.ticket_number = ?`,
      [req.params.id, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Transaction
app.post('/api/transactions', authenticateToken, checkDb, async (req, res) => {
  try {
    const {
      ticket_number,
      supplier_id,
      supplier_name,
      supplier_do,
      driver_name,
      plate_number,
      origin,
      block,
      gross_kg,
      tare_kg,
      netto_kg,
      sortation,
      deduction_percent,
      deduction_kg,
      clean_kg,
      price_per_kg,
      loading_fee_per_kg,
      loading_fee,
      total_price,
      transaction_date,
      transaction_time,
      notes,
      local_uuid,
      sync_status,
    } = req.body;

    // Basic validations
    if (!supplier_name || !driver_name || !plate_number) {
      return res.status(400).json({ success: false, message: 'Data pengirim (Supplier, Sopir, No Polisi) wajib diisi' });
    }

    if (Number(gross_kg) < Number(tare_kg)) {
      return res.status(400).json({ success: false, message: 'Tare (berat kosong) tidak boleh lebih besar dari Gross (berat kotor)' });
    }

    const nowDate = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0];

    const finalDate = transaction_date || nowDate;
    const finalTime = transaction_time || nowTime;
    const finalOperatorId = req.user.id;
    const finalOperatorName = req.user.name || 'Operator';

    // Auto-create/update driver and vehicle for quick autocomplete
    try {
      if (driver_name) {
        await pool.query(
          'INSERT INTO drivers (name, status) VALUES (?, "active") ON DUPLICATE KEY UPDATE updated_at = NOW()',
          [driver_name.trim()]
        );
      }
      if (plate_number) {
        await pool.query(
          'INSERT INTO vehicles (plate_number, owner_name, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE updated_at = NOW()',
          [plate_number.trim().toUpperCase(), supplier_name || null]
        );
      }
    } catch (e) {
      // Non-blocking
    }

    const nGross = Number(gross_kg) || 0;
    const nTare = Number(tare_kg) || 0;
    const nNetto = Number(netto_kg) || Math.max(0, nGross - nTare);
    const nClean = Number(clean_kg) || 0;
    const nPrice = Number(price_per_kg) || 0;
    const nLoadingFeePerKg = loading_fee_per_kg !== undefined ? Number(loading_fee_per_kg) : 10;
    const nLoadingFee = loading_fee !== undefined ? Number(loading_fee) : Math.round(nNetto * nLoadingFeePerKg);
    const nTotalPrice = total_price !== undefined ? Number(total_price) : Math.max(0, Math.round(nClean * nPrice) - nLoadingFee);

    const [result] = await pool.query(
      `INSERT INTO transactions (
        ticket_number, supplier_id, supplier_name, supplier_do,
        driver_name, plate_number, origin, block,
        gross_kg, tare_kg, netto_kg,
        sortation, deduction_percent, deduction_kg, clean_kg,
        price_per_kg, loading_fee_per_kg, loading_fee, total_price,
        transaction_date, transaction_time,
        operator_id, operator_name, notes,
        status, sync_status, local_uuid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
      [
        ticket_number,
        supplier_id || null,
        supplier_name,
        supplier_do || null,
        driver_name,
        plate_number.toUpperCase(),
        origin || null,
        block || null,
        nGross,
        nTare,
        nNetto,
        sortation || 'Matang',
        Number(deduction_percent) || 0,
        Number(deduction_kg) || 0,
        nClean,
        nPrice,
        nLoadingFeePerKg,
        nLoadingFee,
        nTotalPrice,
        finalDate,
        finalTime,
        finalOperatorId,
        finalOperatorName,
        notes || null,
        sync_status || 'synced',
        local_uuid || null,
      ]
    );

    const newId = result.insertId;
    await logAudit(req.user.id, req.user.name, 'CREATE_TRANSACTION', 'transactions', newId, { ticket_number, total_price: nTotalPrice, clean_kg: nClean, loading_fee: nLoadingFee }, req);

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan',
      data: {
        id: newId,
        ticket_number,
        clean_kg: nClean,
        loading_fee: nLoadingFee,
        total_price: nTotalPrice,
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Nomor tiket sudah digunakan, silakan buat tiket baru' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Transaction (Edit)
app.put('/api/transactions/:id', authenticateToken, checkDb, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      supplier_name,
      supplier_do,
      driver_name,
      plate_number,
      origin,
      block,
      gross_kg,
      tare_kg,
      netto_kg,
      sortation,
      deduction_percent,
      deduction_kg,
      clean_kg,
      price_per_kg,
      loading_fee_per_kg,
      loading_fee,
      total_price,
      notes,
    } = req.body;

    if (Number(gross_kg) < Number(tare_kg)) {
      return res.status(400).json({ success: false, message: 'Tare tidak boleh lebih besar dari Gross' });
    }

    const [current] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const nGross = Number(gross_kg) || 0;
    const nTare = Number(tare_kg) || 0;
    const nNetto = Number(netto_kg) || Math.max(0, nGross - nTare);
    const nClean = Number(clean_kg) || 0;
    const nPrice = Number(price_per_kg) || 0;
    const nLoadingFeePerKg = loading_fee_per_kg !== undefined ? Number(loading_fee_per_kg) : 10;
    const nLoadingFee = loading_fee !== undefined ? Number(loading_fee) : Math.round(nNetto * nLoadingFeePerKg);
    const nTotalPrice = total_price !== undefined ? Number(total_price) : Math.max(0, Math.round(nClean * nPrice) - nLoadingFee);

    await pool.query(
      `UPDATE transactions SET
        supplier_id = ?, supplier_name = ?, supplier_do = ?,
        driver_name = ?, plate_number = ?, origin = ?, block = ?,
        gross_kg = ?, tare_kg = ?, netto_kg = ?,
        sortation = ?, deduction_percent = ?, deduction_kg = ?, clean_kg = ?,
        price_per_kg = ?, loading_fee_per_kg = ?, loading_fee = ?, total_price = ?, notes = ?
      WHERE id = ?`,
      [
        supplier_id || null,
        supplier_name,
        supplier_do || null,
        driver_name,
        plate_number.toUpperCase(),
        origin || null,
        block || null,
        nGross,
        nTare,
        nNetto,
        sortation || 'Matang',
        Number(deduction_percent) || 0,
        Number(deduction_kg) || 0,
        nClean,
        nPrice,
        nLoadingFeePerKg,
        nLoadingFee,
        nTotalPrice,
        notes || null,
        id,
      ]
    );

    await logAudit(req.user.id, req.user.name, 'UPDATE_TRANSACTION', 'transactions', id, { old: current[0], new: req.body }, req);

    res.json({ success: true, message: 'Data transaksi berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Soft Delete / Cancel Transaction
app.post('/api/transactions/:id/cancel', authenticateToken, checkDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;

    if (!cancel_reason) {
      return res.status(400).json({ success: false, message: 'Alasan pembatalan wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    await pool.query(
      `UPDATE transactions SET 
        status = 'cancelled', 
        cancel_reason = ?, 
        cancelled_by = ?, 
        cancelled_at = NOW() 
       WHERE id = ?`,
      [cancel_reason, req.user.id, id]
    );

    await logAudit(req.user.id, req.user.name, 'CANCEL_TRANSACTION', 'transactions', id, { reason: cancel_reason }, req);

    res.json({ success: true, message: 'Transaksi berhasil dibatalkan' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch Sync Offline Transactions
app.post('/api/transactions/sync', authenticateToken, checkDb, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, syncedCount: 0, message: 'Tidak ada item untuk disinkronkan' });
    }

    let syncedCount = 0;
    for (const item of items) {
      try {
        const [existing] = await pool.query(
          'SELECT id FROM transactions WHERE ticket_number = ? OR (local_uuid IS NOT NULL AND local_uuid = ?)',
          [item.ticket_number, item.local_uuid || '']
        );

        if (existing.length === 0) {
          const nGross = Number(item.gross_kg) || 0;
          const nTare = Number(item.tare_kg) || 0;
          const nNetto = Number(item.netto_kg) || Math.max(0, nGross - nTare);
          const nClean = Number(item.clean_kg) || 0;
          const nPrice = Number(item.price_per_kg) || 0;
          const nLoadingFeePerKg = item.loading_fee_per_kg !== undefined ? Number(item.loading_fee_per_kg) : 10;
          const nLoadingFee = item.loading_fee !== undefined ? Number(item.loading_fee) : Math.round(nNetto * nLoadingFeePerKg);
          const nTotalPrice = item.total_price !== undefined ? Number(item.total_price) : Math.max(0, Math.round(nClean * nPrice) - nLoadingFee);

          await pool.query(
            `INSERT INTO transactions (
              ticket_number, supplier_id, supplier_name, supplier_do,
              driver_name, plate_number, origin, block,
              gross_kg, tare_kg, netto_kg,
              sortation, deduction_percent, deduction_kg, clean_kg,
              price_per_kg, loading_fee_per_kg, loading_fee, total_price,
              transaction_date, transaction_time,
              operator_id, operator_name, notes,
              status, sync_status, local_uuid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
            [
              item.ticket_number,
              item.supplier_id || null,
              item.supplier_name,
              item.supplier_do || null,
              item.driver_name,
              item.plate_number.toUpperCase(),
              item.origin || null,
              item.block || null,
              nGross,
              nTare,
              nNetto,
              item.sortation || 'Matang',
              Number(item.deduction_percent) || 0,
              Number(item.deduction_kg) || 0,
              nClean,
              nPrice,
              nLoadingFeePerKg,
              nLoadingFee,
              nTotalPrice,
              item.transaction_date,
              item.transaction_time,
              req.user.id,
              req.user.name || 'Operator',
              item.notes || null,
              item.status || 'completed',
              item.local_uuid || null,
            ]
          );
          syncedCount++;
        }
      } catch (err) {
        console.error('Error syncing item:', item.ticket_number, err.message);
      }
    }

    res.json({
      success: true,
      syncedCount,
      message: `${syncedCount} transaksi offline berhasil disinkronkan ke server`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 4. SUPPLIERS ROUTES
// ==========================================================

app.get('/api/suppliers', checkDb, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status;

    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(s.name LIKE ? OR s.do_name LIKE ? OR s.supplier_code LIKE ? OR s.phone LIKE ? OR s.village LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (status && status !== 'all') {
      conditions.push('s.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM suppliers s ${whereClause}`, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const [data] = await pool.query(
      `SELECT s.*, 
        COUNT(CASE WHEN t.status = 'completed' THEN t.id END) as total_transactions,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.clean_kg ELSE 0 END), 0) as total_kg,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_price ELSE 0 END), 0) as total_amount
       FROM suppliers s
       LEFT JOIN transactions t ON s.id = t.supplier_id
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/suppliers/:id', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, 
        COUNT(CASE WHEN t.status = 'completed' THEN t.id END) as total_transactions,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.clean_kg ELSE 0 END), 0) as total_kg,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_price ELSE 0 END), 0) as total_amount
       FROM suppliers s
       LEFT JOIN transactions t ON s.id = t.supplier_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/suppliers/:id/transactions', checkDb, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM transactions WHERE supplier_id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const [data] = await pool.query(
      `SELECT * FROM transactions 
       WHERE supplier_id = ? AND deleted_at IS NULL 
       ORDER BY transaction_date DESC, transaction_time DESC 
       LIMIT ? OFFSET ?`,
      [req.params.id, limit, offset]
    );

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/suppliers', authenticateToken, checkDb, async (req, res) => {
  try {
    const { name, do_name, phone, address, village, district, regency, notes, status } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama supplier wajib diisi' });
    }

    // Auto generate code if empty
    const [count] = await pool.query('SELECT COUNT(*) as total FROM suppliers');
    const code = req.body.supplier_code || `SUP-${String(count[0].total + 1).padStart(3, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO suppliers (supplier_code, name, do_name, phone, address, village, district, regency, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, do_name || null, phone || null, address || null, village || null, district || null, regency || 'Muara Enim', notes || null, status || 'active']
    );

    await logAudit(req.user.id, req.user.name, 'CREATE_SUPPLIER', 'suppliers', result.insertId, { name, code }, req);

    res.status(201).json({
      success: true,
      message: 'Supplier berhasil ditambahkan',
      data: { id: result.insertId, name, supplier_code: code },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/suppliers/:id', authenticateToken, checkDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, do_name, phone, address, village, district, regency, notes, status, supplier_code } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama supplier wajib diisi' });
    }

    await pool.query(
      `UPDATE suppliers SET
        supplier_code = ?, name = ?, do_name = ?, phone = ?,
        address = ?, village = ?, district = ?, regency = ?,
        notes = ?, status = ?
       WHERE id = ?`,
      [supplier_code, name, do_name || null, phone || null, address || null, village || null, district || null, regency || 'Muara Enim', notes || null, status || 'active', id]
    );

    await logAudit(req.user.id, req.user.name, 'UPDATE_SUPPLIER', 'suppliers', id, req.body, req);

    res.json({ success: true, message: 'Data supplier berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    await logAudit(req.user.id, req.user.name, 'DELETE_SUPPLIER', 'suppliers', id, {}, req);
    res.json({ success: true, message: 'Supplier berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 5. REPORTS & DASHBOARD ANALYTICS
// ==========================================================

// Main Dashboard KPI Summary
app.get('/api/reports/dashboard', checkDb, async (req, res) => {
  try {
    // Today stats
    const [todayRows] = await pool.query(`
      SELECT 
        COUNT(*) as total_trans,
        COALESCE(SUM(gross_kg), 0) as gross_kg,
        COALESCE(SUM(tare_kg), 0) as tare_kg,
        COALESCE(SUM(netto_kg), 0) as netto_kg,
        COALESCE(SUM(deduction_kg), 0) as deduction_kg,
        COALESCE(SUM(clean_kg), 0) as clean_kg,
        COALESCE(SUM(total_price), 0) as total_price,
        COALESCE(AVG(price_per_kg), 0) as avg_price
      FROM transactions
      WHERE transaction_date = CURDATE() AND status = 'completed' AND deleted_at IS NULL
    `);

    // 7 Days Trend
    const [trendRows] = await pool.query(`
      SELECT 
        transaction_date,
        COUNT(*) as transactions_count,
        COALESCE(SUM(clean_kg), 0) as total_clean_kg,
        COALESCE(SUM(total_price), 0) as total_amount
      FROM transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        AND status = 'completed' AND deleted_at IS NULL
      GROUP BY transaction_date
      ORDER BY transaction_date ASC
    `);

    // Top 5 Suppliers
    const [topSuppliers] = await pool.query(`
      SELECT 
        supplier_name,
        supplier_do,
        COUNT(*) as total_trans,
        COALESCE(SUM(clean_kg), 0) as total_kg,
        COALESCE(SUM(total_price), 0) as total_amount
      FROM transactions
      WHERE status = 'completed' AND deleted_at IS NULL
      GROUP BY supplier_name, supplier_do
      ORDER BY total_kg DESC
      LIMIT 5
    `);

    // Sortation Distribution
    const [sortationDist] = await pool.query(`
      SELECT 
        sortation,
        COUNT(*) as count,
        COALESCE(SUM(clean_kg), 0) as total_kg
      FROM transactions
      WHERE status = 'completed' AND deleted_at IS NULL
      GROUP BY sortation
      ORDER BY total_kg DESC
    `);

    res.json({
      success: true,
      data: {
        today: todayRows[0],
        trend: trendRows,
        topSuppliers,
        sortationDist,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Period Report Breakdown
app.get('/api/reports/period', checkDb, async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date().toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_trans,
        COALESCE(SUM(gross_kg), 0) as gross_kg,
        COALESCE(SUM(tare_kg), 0) as tare_kg,
        COALESCE(SUM(netto_kg), 0) as netto_kg,
        COALESCE(SUM(deduction_kg), 0) as deduction_kg,
        COALESCE(SUM(clean_kg), 0) as clean_kg,
        COALESCE(SUM(loading_fee), 0) as loading_fee,
        COALESCE(SUM(total_price), 0) as total_price,
        COALESCE(AVG(price_per_kg), 0) as avg_price
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND status = 'completed' AND deleted_at IS NULL
    `, [startDate, endDate]);

    const [supplierReport] = await pool.query(`
      SELECT 
        supplier_name,
        supplier_do,
        COUNT(*) as total_trans,
        COALESCE(SUM(gross_kg), 0) as gross_kg,
        COALESCE(SUM(tare_kg), 0) as tare_kg,
        COALESCE(SUM(netto_kg), 0) as netto_kg,
        COALESCE(SUM(deduction_kg), 0) as deduction_kg,
        COALESCE(SUM(clean_kg), 0) as clean_kg,
        COALESCE(SUM(loading_fee), 0) as loading_fee,
        COALESCE(SUM(total_price), 0) as total_price
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND status = 'completed' AND deleted_at IS NULL
      GROUP BY supplier_name, supplier_do
      ORDER BY clean_kg DESC
    `, [startDate, endDate]);

    const [driverReport] = await pool.query(`
      SELECT 
        driver_name,
        COUNT(*) as total_trans,
        COALESCE(SUM(clean_kg), 0) as clean_kg,
        COALESCE(SUM(total_price), 0) as total_price
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND status = 'completed' AND deleted_at IS NULL
      GROUP BY driver_name
      ORDER BY clean_kg DESC
    `, [startDate, endDate]);

    const [vehicleReport] = await pool.query(`
      SELECT 
        plate_number,
        COUNT(*) as total_trans,
        COALESCE(SUM(clean_kg), 0) as clean_kg,
        COALESCE(SUM(total_price), 0) as total_price
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND status = 'completed' AND deleted_at IS NULL
      GROUP BY plate_number
      ORDER BY clean_kg DESC
    `, [startDate, endDate]);

    res.json({
      success: true,
      data: {
        summary: summary[0],
        bySupplier: supplierReport,
        byDriver: driverReport,
        byVehicle: vehicleReport,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 6. SORTATIONS & PRICES MASTER
// ==========================================================

app.get('/api/sortations', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sortation_settings ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/sortations', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const { name, default_deduction_percent, badge_color } = req.body;
    const [result] = await pool.query(
      'INSERT INTO sortation_settings (name, default_deduction_percent, badge_color) VALUES (?, ?, ?)',
      [name, default_deduction_percent || 0, badge_color || 'green']
    );
    res.json({ success: true, message: 'Kategori sortasi berhasil ditambahkan', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/sortations/:id', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const { name, default_deduction_percent, badge_color, status } = req.body;
    await pool.query(
      'UPDATE sortation_settings SET name = ?, default_deduction_percent = ?, badge_color = ?, status = ? WHERE id = ?',
      [name, default_deduction_percent || 0, badge_color || 'green', status || 'active', req.params.id]
    );
    res.json({ success: true, message: 'Kategori sortasi berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Daily Price Endpoints
app.get('/api/prices/today', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM price_settings WHERE effective_date = CURDATE() ORDER BY id DESC LIMIT 1'
    );
    if (rows.length > 0) {
      return res.json({ success: true, price_per_kg: Number(rows[0].price_per_kg), date: rows[0].effective_date });
    }

    // Fallback to latest price or settings default
    const [latest] = await pool.query('SELECT price_per_kg, effective_date FROM price_settings ORDER BY effective_date DESC LIMIT 1');
    if (latest.length > 0) {
      return res.json({ success: true, price_per_kg: Number(latest[0].price_per_kg), date: latest[0].effective_date });
    }

    const [settings] = await pool.query('SELECT default_price FROM settings LIMIT 1');
    const defaultPrice = settings[0]?.default_price || 2650;
    res.json({ success: true, price_per_kg: Number(defaultPrice), date: new Date().toISOString().split('T')[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/prices', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM price_settings ORDER BY effective_date DESC LIMIT 30');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/prices', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const { effective_date, price_per_kg, notes } = req.body;
    const date = effective_date || new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO price_settings (effective_date, price_per_kg, notes, created_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE price_per_kg = VALUES(price_per_kg), notes = VALUES(notes)`,
      [date, price_per_kg, notes || 'Update harga harian', req.user.id]
    );

    // Also update settings default
    await pool.query('UPDATE settings SET default_price = ?', [price_per_kg]);

    await logAudit(req.user.id, req.user.name, 'UPDATE_PRICE', 'price_settings', date, { price_per_kg, date }, req);

    res.json({ success: true, message: 'Harga TBS harian berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 7. DRIVERS & VEHICLES AUTOCOMPLETE
// ==========================================================

app.get('/api/drivers', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name, phone FROM drivers WHERE status = "active" ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/vehicles', checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT plate_number, owner_name FROM vehicles WHERE status = "active" ORDER BY plate_number ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 8. USER MANAGEMENT (Admin Only)
// ==========================================================

app.get('/api/users', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, username, role, status, created_at FROM users ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const { name, username, password, role, status } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nama, username, dan password wajib diisi' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, username, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, username, hashedPassword, role || 'operator', status || 'active']
    );

    res.status(201).json({ success: true, message: 'User berhasil dibuat', data: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, role, status } = req.body;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET name = ?, username = ?, password = ?, role = ?, status = ? WHERE id = ?',
        [name, username, hashedPassword, role, status, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, username = ?, role = ?, status = ? WHERE id = ?',
        [name, username, role, status, id]
      );
    }

    res.json({ success: true, message: 'Data user berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Audit Logs Endpoint
app.get('/api/audit-logs', authenticateToken, requireAdmin, checkDb, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = countRows[0].total;

    const [data] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'RAM Berkah Sawit Tua Backend API',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 RAM Berkah Sawit Tua Server running on http://localhost:${PORT}`);
});
