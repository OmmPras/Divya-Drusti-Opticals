import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'data', 'divya_drusti.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE CHECK(name IN ('ADMIN', 'DOCTOR', 'RECEPTIONIST')),
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_approved INTEGER NOT NULL DEFAULT 1,
      approved_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      registration_no TEXT NOT NULL DEFAULT '',
      specialization TEXT NOT NULL DEFAULT 'Optometry & Clinical Refraction',
      qualification TEXT NOT NULL DEFAULT 'B.Optom / M.Optom',
      consultation_fee REAL NOT NULL DEFAULT 0,
      availability TEXT NOT NULL DEFAULT 'Mon-Sat, 9:30 AM - 7:30 PM',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
      mobile TEXT NOT NULL,
      alt_phone TEXT DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      village TEXT DEFAULT '',
      district TEXT DEFAULT '',
      state TEXT DEFAULT '',
      pin_code TEXT DEFAULT '',
      photo_data TEXT DEFAULT '',
      medical_history TEXT DEFAULT '',
      consent_given INTEGER NOT NULL DEFAULT 1,
      consent_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      registration_fee REAL NOT NULL DEFAULT 0 CHECK(registration_fee = 0),
      registration_date TEXT NOT NULL,
      registered_by_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Registered' CHECK(status IN ('Registered', 'Pending Exam', 'Exam Completed', 'In Lab', 'Dispatched')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (registered_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_code TEXT NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Consultation', 'Completed', 'Cancelled', 'Rescheduled')),
      reason TEXT DEFAULT 'Routine Eye Examination',
      notes TEXT DEFAULT '',
      created_by_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS eye_checkups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkup_code TEXT NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_id INTEGER REFERENCES appointments(id),
      exam_date TEXT NOT NULL,
      od_sph TEXT NOT NULL DEFAULT '0.00',
      od_cyl TEXT NOT NULL DEFAULT '0.00',
      od_axis TEXT NOT NULL DEFAULT '000',
      od_add TEXT NOT NULL DEFAULT '0.00',
      od_prism TEXT NOT NULL DEFAULT '',
      os_sph TEXT NOT NULL DEFAULT '0.00',
      os_cyl TEXT NOT NULL DEFAULT '0.00',
      os_axis TEXT NOT NULL DEFAULT '000',
      os_add TEXT NOT NULL DEFAULT '0.00',
      os_prism TEXT NOT NULL DEFAULT '',
      visual_acuity_od TEXT NOT NULL DEFAULT '6/6',
      visual_acuity_os TEXT NOT NULL DEFAULT '6/6',
      distance_vision TEXT DEFAULT '6/6',
      near_vision TEXT DEFAULT 'N6',
      pd_mm TEXT DEFAULT '63',
      iop_od TEXT DEFAULT '',
      iop_os TEXT DEFAULT '',
      remarks TEXT DEFAULT '',
      observations TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Completed' CHECK(status IN ('Pending', 'Completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_code TEXT NOT NULL UNIQUE,
      checkup_id INTEGER NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      lens_type TEXT DEFAULT '',
      frame_recommendation TEXT DEFAULT '',
      coating TEXT DEFAULT '',
      medicines_json TEXT NOT NULL DEFAULT '[]',
      follow_up_date TEXT DEFAULT '',
      signed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (checkup_id) REFERENCES eye_checkups(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN (
        'Eyeglasses',
        'Spectacle Frames',
        'Spectacle Lenses',
        'Sunglasses',
        'Contact Lenses',
        'Optical Accessories',
        'Eye Medicines'
      )),
      brand TEXT DEFAULT '',
      model_no TEXT DEFAULT '',
      description TEXT DEFAULT '',
      unit_price REAL NOT NULL DEFAULT 0,
      gst_percent REAL NOT NULL DEFAULT 12,
      is_medicine INTEGER NOT NULL DEFAULT 0,
      expiry_date TEXT DEFAULT '',
      batch_no TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE,
      quantity_in_stock INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 5,
      location TEXT DEFAULT 'Main Optical Shelf',
      last_restocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      checkup_id INTEGER REFERENCES eye_checkups(id),
      exam_charge REAL NOT NULL DEFAULT 0,
      frame_charge REAL NOT NULL DEFAULT 0,
      lens_charge REAL NOT NULL DEFAULT 0,
      medicine_charge REAL NOT NULL DEFAULT 0,
      accessory_charge REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      gst_percent REAL NOT NULL DEFAULT 12,
      gst_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK(payment_method IN ('Cash', 'UPI', 'Card', 'NetBanking', 'Pending')),
      payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK(payment_status IN ('Paid', 'Pending', 'Partial')),
      items_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_by_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('Cash', 'UPI', 'Card', 'NetBanking')),
      reference_no TEXT DEFAULT '',
      paid_at TEXT NOT NULL DEFAULT (datetime('now')),
      recorded_by_id INTEGER NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (recorded_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT DEFAULT '',
      user_role TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clinic_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_jti TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'CodeIssued', 'Completed', 'Expired')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
    CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
    CREATE INDEX IF NOT EXISTS idx_patients_reg_date ON patients(registration_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_checkups_patient ON eye_checkups(patient_id);
    CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(token_jti);
  `);

  // Seed default roles
  const insertRole = db.prepare(`INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)`);
  insertRole.run('ADMIN', 'Clinic Owner & System Administrator with full access');
  insertRole.run('DOCTOR', 'Optometrist / Ophthalmologist managing checkups, prescriptions, and patient registration');
  insertRole.run('RECEPTIONIST', 'Front-desk coordinator handling free patient registration and appointments');

  // Seed default clinic settings (registration fee always locked to 0)
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO clinic_settings (key, value) VALUES (?, ?)`);
  insertSetting.run('clinic_name', 'Divya Drusti Opticals');
  insertSetting.run('clinic_tagline', 'Precision Eye Care & Optical Consultancy');
  insertSetting.run('clinic_address', 'Shop 12, Medical Enclave, Station Road, Bhubaneswar, Odisha 751001');
  insertSetting.run('clinic_phone', '+91 94370 11223');
  insertSetting.run('clinic_email', 'care@divyadrusti.in');
  insertSetting.run('clinic_gstin', '21AABCD4512K1Z5');
  insertSetting.run('default_gst_percent', '12');
  insertSetting.run('registration_fee', '0');

  // Ensure registration_fee is always 0
  db.prepare(`UPDATE clinic_settings SET value = '0' WHERE key = 'registration_fee'`).run();

  // Seed initial optical catalog if empty (non-PII clinic inventory)
  const productCount = db.prepare(`SELECT COUNT(*) as count FROM products`).get() as { count: number };
  if (productCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (sku, name, category, brand, model_no, description, unit_price, gst_percent, is_medicine, expiry_date, batch_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertInventory = db.prepare(`
      INSERT INTO inventory (product_id, quantity_in_stock, reorder_level, location)
      VALUES (?, ?, ?, ?)
    `);

    const seedCatalog = [
      ['FRM-TIT-101', 'Titanium Rimless Executive Frame', 'Spectacle Frames', 'Titan Eyeplus', 'TE-8821', 'Ultra-lightweight hypoallergenic beta-titanium frame', 2450, 12, 0, '', '', 18, 5, 'Showcase A1'],
      ['FRM-ACT-102', 'Classic Matte Wayfarer Acetate Frame', 'Spectacle Frames', 'Vogue Optical', 'VO-4120', 'Hand-finished Italian acetate frame with spring hinges', 1650, 12, 0, '', '', 24, 6, 'Showcase A2'],
      ['LNS-BLU-201', 'Blue-Cut Anti-Glare Single Vision Lens (Pair)', 'Spectacle Lenses', 'Essilor', 'ES-BC-156', '1.56 index digital screen blue-light filtering lens', 1200, 12, 0, '', '', 40, 10, 'Lab Drawer B1'],
      ['LNS-PRG-202', 'HD Digital Progressive Multifocal Lens (Pair)', 'Spectacle Lenses', 'Zeiss', 'ZS-PRG-160', '1.60 high-index wide-corridor progressive lens with AR coat', 4800, 12, 0, '', '', 15, 4, 'Lab Drawer B2'],
      ['EYE-CMP-301', 'Complete Reading Eyeglasses (+1.50D)', 'Eyeglasses', 'Divya Drusti Select', 'DD-RD-15', 'Ready-to-wear lightweight TR90 reading eyeglasses', 750, 12, 0, '', '', 22, 5, 'Rack C1'],
      ['SUN-POL-401', 'Polarized UV400 Aviator Sunglasses', 'Sunglasses', 'Ray-Ban', 'RB-3025-P', 'Polarized glare-free outdoor sun protection', 3850, 18, 0, '', '', 12, 4, 'Showcase D1'],
      ['CNT-MNT-501', 'Monthly Silicone Hydrogel Contact Lens (Box of 6)', 'Contact Lenses', 'Alcon', 'AirOptix-6', 'Breathable monthly disposable soft contact lenses', 1450, 12, 0, '2028-09-30', 'CL-8841', 20, 6, 'Cold Cabinet E1'],
      ['ACC-SOL-601', 'Multi-Purpose Contact Lens Solution (300ml) + Case', 'Optical Accessories', 'Bausch & Lomb', 'Renu-300', 'Sterile disinfecting & moisturizing lens care solution', 380, 18, 0, '2028-06-30', 'SL-2204', 35, 10, 'Shelf F1'],
      ['ACC-KIT-602', 'Anti-Fog Lens Cleaner Spray & Microfiber Kit', 'Optical Accessories', 'Divya Drusti Care', 'DD-CLN-100', 'Ammonia-free safe anti-reflective lens cleaning kit', 180, 18, 0, '', '', 50, 12, 'Counter Tray'],
      ['MED-LUB-701', 'Carboxymethylcellulose 0.5% Lubricating Eye Drops (10ml)', 'Eye Medicines', 'Allergan', 'Refresh-10', 'Preservative-gentle artificial tears for dry eye relief', 165, 12, 1, '2028-03-15', 'MED-9912', 45, 12, 'Pharmacy Rack M1'],
      ['MED-ANT-702', 'Moxifloxacin 0.5% Ophthalmic Solution (5ml)', 'Eye Medicines', 'Cipla', 'Moxicip-5', 'Broad-spectrum ophthalmic antibiotic drops (Rx only)', 142, 12, 1, '2027-11-30', 'MED-7741', 30, 8, 'Pharmacy Rack M2'],
    ] as const;

    const tx = db.transaction(() => {
      for (const item of seedCatalog) {
        const res = insertProduct.run(
          item[0], item[1], item[2], item[3], item[4], item[5],
          item[6], item[7], item[8], item[9], item[10]
        );
        insertInventory.run(res.lastInsertRowid, item[11], item[12], item[13]);
      }
    });
    tx();
  }

  // If ADMIN_BOOTSTRAP_PASSWORD env var is set, ensure primary admin exists/updates cleanly
  const envAdminPass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  if (envAdminPass && envAdminPass.length >= 8) {
    const adminRole = db.prepare(`SELECT id FROM roles WHERE name = 'ADMIN'`).get() as { id: number };
    const existingAdmin = db.prepare(`
      SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'ADMIN' LIMIT 1
    `).get() as { id: number } | undefined;

    const hash = bcrypt.hashSync(envAdminPass, 10);
    if (!existingAdmin) {
      db.prepare(`
        INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active, is_approved)
        VALUES (?, ?, ?, ?, ?, 1, 1)
      `).run('Clinic Administrator', 'admin@divyadrusti.in', '+91 94370 11223', hash, adminRole.id);
    } else {
      db.prepare(`UPDATE users SET password_hash = ?, is_active = 1, is_approved = 1, updated_at = datetime('now') WHERE id = ?`)
        .run(hash, existingAdmin.id);
    }
  }
}
