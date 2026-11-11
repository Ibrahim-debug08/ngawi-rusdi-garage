const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'bengkel.db'));

// Enable WAL mode for better performance
db.exec('PRAGMA journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    duration_estimate TEXT,
    category TEXT DEFAULT 'umum',
    icon TEXT DEFAULT '🔧'
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    motorcycle_brand TEXT NOT NULL,
    motorcycle_type TEXT NOT NULL,
    plate_number TEXT,
    year TEXT,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    service_ids TEXT NOT NULL,
    complaint TEXT,
    status TEXT DEFAULT 'antrian',
    mechanic_name TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    total_cost INTEGER DEFAULT 0,
    additional_cost INTEGER DEFAULT 0,
    additional_notes TEXT DEFAULT '',
    is_paid INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT '',
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    total_amount INTEGER NOT NULL,
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
  );
`);

// Seed default services if empty
const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
if (!serviceCount || serviceCount.count === 0) {
  const insertService = db.prepare(
    'INSERT INTO services (name, description, price, duration_estimate, category, icon) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const defaultServices = [
    ['Service Ringan', 'Ganti oli mesin, cek kelistrikan, cek rem, pembersihan filter udara, dan pengecekan umum kondisi motor', 85000, '30-45 menit', 'service', '🛢️'],
    ['Service Besar / Tune Up', 'Tune up mesin lengkap: ganti oli, busi, filter, setel klep, karburator/injeksi, cek kelistrikan & pengapian menyeluruh', 250000, '2-3 jam', 'service', '⚙️'],
    ['Ganti Ban & Balancing', 'Penggantian ban depan/belakang, balancing roda, cek tekanan angin, dan pengecekan velg', 150000, '45-60 menit', 'ban', '🏍️'],
    ['Service Injeksi / Karburator', 'Pembersihan & penyetelan sistem injeksi atau karburator, cek sensor throttle, dan kalibrasi ECU', 175000, '1-2 jam', 'mesin', '💉'],
    ['Perbaikan Body & Cat', 'Perbaikan body motor, dempul, pengecatan ulang panel, poles body, dan penggantian part body yang rusak', 350000, '1-3 hari', 'body', '🎨'],
    ['Overhaul Mesin', 'Bongkar pasang mesin total: ganti ring piston, bearing, seal, gasket, dan rekondisi silinder head', 1500000, '3-5 hari', 'mesin', '🔩'],
    ['Service CVT (Motor Matic)', 'Pembersihan & penggantian roller CVT, belt, per CVT, grease bearing, dan pengecekan kampas ganda', 200000, '1-2 jam', 'transmisi', '🔄'],
    ['Ganti Kampas Rem', 'Penggantian kampas rem depan/belakang, pembersihan kaliper, cek minyak rem, dan bleeding system', 100000, '30-45 menit', 'rem', '🛑'],
    ['Spooring & Lurusin Rangka', 'Pengecekan dan pelurusan rangka motor, spooring roda, cek swing arm dan bearing steering', 200000, '1-2 jam', 'rangka', '📐'],
    ['Kelistrikan & Wiring', 'Perbaikan instalasi kelistrikan, ganti kabel body, perbaikan starter, lampu, klakson, dan sistem charging', 175000, '1-3 jam', 'kelistrikan', '⚡']
  ];

  db.exec('BEGIN');
  for (const service of defaultServices) {
    insertService.run(...service);
  }
  db.exec('COMMIT');
}

module.exports = db;
