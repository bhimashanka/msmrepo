const path = require('path');
const fs = require('fs');
require('dotenv').config();

const isPg = !!(process.env.DATABASE_URL || process.env.AIVEN_DB_URL || process.env.PGHOST);

let db, pool;

if (isPg) {
  const { Pool } = require('pg');
  const connectionString = process.env.DATABASE_URL || process.env.AIVEN_DB_URL;
  pool = new Pool({
    connectionString,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  console.log('[DB Engine] Connected using PostgreSQL (Aiven / Cloud DB)');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'mams_military.db');
  db = new sqlite3.Database(dbPath);
  console.log('[DB Engine] Connected using local SQLite3 database');
}

// Convert SQLite parameter placeholders (?) to PG ($1, $2, ...)
function convertSqlToPg(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Helper functions for promise-based queries
const runAsync = (sql, params = []) => {
  if (isPg) {
    const pgSql = convertSqlToPg(sql);
    return pool.query(pgSql, params);
  }
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const allAsync = (sql, params = []) => {
  if (isPg) {
    const pgSql = convertSqlToPg(sql);
    return pool.query(pgSql, params).then(res => res.rows);
  }
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getAsync = (sql, params = []) => {
  if (isPg) {
    const pgSql = convertSqlToPg(sql);
    return pool.query(pgSql, params).then(res => res.rows[0] || null);
  }
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize schema and seed sample data
async function initDatabase() {
  if (isPg) {
    await initPgDatabase();
  } else {
    await initSqliteDatabase();
  }
}

async function initPgDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bases (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(150) NOT NULL,
        commander_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS equipment_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units',
        is_serialized INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        base_id INT NOT NULL,
        equipment_id INT NOT NULL,
        opening_balance INT NOT NULL DEFAULT 0,
        current_stock INT NOT NULL DEFAULT 0,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id),
        UNIQUE(base_id, equipment_id)
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        base_id INT NOT NULL,
        equipment_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_cost NUMERIC NOT NULL,
        total_cost NUMERIC NOT NULL,
        supplier VARCHAR(100) NOT NULL,
        po_reference VARCHAR(100) UNIQUE NOT NULL,
        purchase_date DATE NOT NULL,
        created_by_user VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        source_base_id INT NOT NULL,
        dest_base_id INT NOT NULL,
        equipment_id INT NOT NULL,
        quantity INT NOT NULL,
        transfer_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK(status IN ('Pending', 'In-Transit', 'Completed', 'Cancelled')),
        tracking_number VARCHAR(100) UNIQUE NOT NULL,
        notes TEXT,
        initiated_by_user VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_base_id) REFERENCES bases(id),
        FOREIGN KEY (dest_base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        base_id INT NOT NULL,
        equipment_id INT NOT NULL,
        quantity INT NOT NULL,
        personnel_name VARCHAR(100) NOT NULL,
        personnel_rank VARCHAR(50) NOT NULL,
        service_id VARCHAR(50) NOT NULL,
        unit VARCHAR(100) NOT NULL,
        assignment_date DATE NOT NULL,
        expected_return_date DATE,
        status VARCHAR(20) NOT NULL CHECK(status IN ('Active', 'Returned', 'Overdue')),
        notes TEXT,
        assigned_by_user VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      );

      CREATE TABLE IF NOT EXISTS expenditures (
        id SERIAL PRIMARY KEY,
        base_id INT NOT NULL,
        equipment_id INT NOT NULL,
        quantity INT NOT NULL,
        expenditure_date DATE NOT NULL,
        reason TEXT NOT NULL,
        operation_name TEXT NOT NULL,
        authorized_by_user VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(30) NOT NULL CHECK(role IN ('admin', 'base_commander', 'logistics_officer')),
        base_id INT,
        rank VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        FOREIGN KEY (base_id) REFERENCES bases(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        username VARCHAR(100) NOT NULL,
        user_role VARCHAR(30) NOT NULL,
        base_id INT,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const checkRes = await pool.query('SELECT COUNT(*) as count FROM bases');
    if (parseInt(checkRes.rows[0].count) === 0) {
      console.log('Seeding initial military database assets on PostgreSQL...');
      await seedDatabase();
    }
  } catch (err) {
    console.error('Error initializing PostgreSQL database:', err);
  }
}

async function initSqliteDatabase() {
  db.serialize(async () => {
    db.run('PRAGMA foreign_keys = ON;');

    db.run(`
      CREATE TABLE IF NOT EXISTS bases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        commander_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS equipment_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        unit_of_measure TEXT NOT NULL DEFAULT 'Units',
        is_serialized INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        opening_balance INTEGER NOT NULL DEFAULT 0,
        current_stock INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id),
        UNIQUE(base_id, equipment_id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        supplier TEXT NOT NULL,
        po_reference TEXT UNIQUE NOT NULL,
        purchase_date DATE NOT NULL,
        created_by_user TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_base_id INTEGER NOT NULL,
        dest_base_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        transfer_date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Pending', 'In-Transit', 'Completed', 'Cancelled')),
        tracking_number TEXT UNIQUE NOT NULL,
        notes TEXT,
        initiated_by_user TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_base_id) REFERENCES bases(id),
        FOREIGN KEY (dest_base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        personnel_name TEXT NOT NULL,
        personnel_rank TEXT NOT NULL,
        service_id TEXT NOT NULL,
        unit TEXT NOT NULL,
        assignment_date DATE NOT NULL,
        expected_return_date DATE,
        status TEXT NOT NULL CHECK(status IN ('Active', 'Returned', 'Overdue')),
        notes TEXT,
        assigned_by_user TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS expenditures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        expenditure_date DATE NOT NULL,
        reason TEXT NOT NULL,
        operation_name TEXT NOT NULL,
        authorized_by_user TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (base_id) REFERENCES bases(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'base_commander', 'logistics_officer')),
        base_id INTEGER,
        rank TEXT NOT NULL,
        title TEXT NOT NULL,
        FOREIGN KEY (base_id) REFERENCES bases(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        user_role TEXT NOT NULL,
        base_id INTEGER,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.get('SELECT COUNT(*) as count FROM bases', async (err, row) => {
      if (err) console.error('Error checking seed:', err);
      if (row && row.count === 0) {
        console.log('Seeding initial military database assets on SQLite...');
        await seedDatabase();
      }
    });
  });
}

async function seedDatabase() {
  try {
    const bases = [
      ['ALPHA-01', 'Fort Alpha HQ', 'Sector 1 - Central Command', 'General Vance'],
      ['BRAVO-02', 'Fort Bravo Post', 'Sector 2 - Northern Frontier', 'Col. Marcus Miller'],
      ['CHARLIE-03', 'Outpost Charlie', 'Sector 3 - Eastern Ridge', 'Col. Sarah Davis'],
      ['DELTA-04', 'Naval Station Delta', 'Sector 4 - Coastal Ops', 'Capt. Robert Chen'],
      ['ECHO-05', 'Air Base Echo', 'Sector 5 - Western Airfield', 'Maj. Elena Rostova']
    ];
    for (const b of bases) {
      await runAsync('INSERT INTO bases (code, name, location, commander_name) VALUES (?, ?, ?, ?)', b);
    }

    const equipment = [
      ['M4A1 Tactical Carbine', 'Weapons', 'Standard issue 5.56mm NATO assault rifle with optics mount', 'Units', 1],
      ['Barrett M82 Sniper Rifle', 'Weapons', '12.7mm (.50 BMG) anti-materiel sniper rifle', 'Units', 1],
      ['HMMWV Armored (Humvee)', 'Vehicles', 'High-Mobility Multipurpose Wheeled Vehicle with turret', 'Vehicles', 1],
      ['M1A2 Abrams Main Battle Tank', 'Vehicles', 'Heavy armored battle tank with 120mm smoothbore gun', 'Vehicles', 1],
      ['5.56mm NATO Rounds', 'Ammunition', 'Standard rifle cartridge bulk case (1,000 rounds/crate)', 'Crates', 0],
      ['120mm Tank Shells', 'Ammunition', 'High-explosive anti-tank rounds', 'Rounds', 0],
      ['Harris PRC-152 Radio', 'Communications', 'Multi-band handheld tactical satellite radio', 'Units', 1],
      ['PVS-31A Dual Night Vision', 'Communications', 'Gen 3 night vision binocular goggle system', 'Units', 1],
      ['MQ-9 Reconnaissance Drone', 'Vehicles', 'Tactical unmanned aerial surveillance system', 'Units', 1],
      ['Javelin Anti-Tank Missile', 'Weapons', 'Man-portable fire-and-forget anti-tank missile', 'Units', 1]
    ];
    for (const e of equipment) {
      await runAsync('INSERT INTO equipment_types (name, category, description, unit_of_measure, is_serialized) VALUES (?, ?, ?, ?, ?)', e);
    }

    const users = [
      ['admin_gen', 'General Arthur Vance', 'admin', null, 'General', 'Commander-in-Chief / Supreme Admin'],
      ['commander_alpha', 'Col. Marcus Miller', 'base_commander', 1, 'Colonel', 'Base Commander - Fort Alpha HQ'],
      ['commander_bravo', 'Col. Sarah Davis', 'base_commander', 2, 'Colonel', 'Base Commander - Fort Bravo Post'],
      ['logistics_officer', 'Lt. James Hayes', 'logistics_officer', 1, 'Lieutenant', 'Logistics & Supply Officer']
    ];
    for (const u of users) {
      await runAsync('INSERT INTO users (username, name, role, base_id, rank, title) VALUES (?, ?, ?, ?, ?, ?)', u);
    }

    const baseIds = [1, 2, 3, 4, 5];
    const equipIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const openingBalanceMatrix = {
      '1_1': 250, '1_2': 35, '1_3': 40, '1_4': 12, '1_5': 500, '1_6': 150, '1_7': 120, '1_8': 95, '1_9': 6, '1_10': 30,
      '2_1': 180, '2_2': 20, '2_3': 25, '2_4': 8,  '2_5': 350, '2_6': 90,  '2_7': 80,  '2_8': 60, '2_9': 4, '2_10': 18,
      '3_1': 110, '3_2': 15, '3_3': 15, '3_4': 0,  '3_5': 200, '3_6': 40,  '3_7': 45,  '3_8': 30, '3_9': 2, '3_10': 10,
      '4_1': 150, '4_2': 10, '4_3': 20, '4_4': 0,  '4_5': 300, '4_6': 50,  '4_7': 60,  '4_8': 50, '4_9': 3, '4_10': 12,
      '5_1': 140, '5_2': 12, '5_3': 18, '5_4': 4,  '5_5': 280, '5_6': 75,  '5_7': 70,  '5_8': 45, '5_9': 8, '5_10': 14
    };

    for (const bId of baseIds) {
      for (const eId of equipIds) {
        const opening = openingBalanceMatrix[`${bId}_${eId}`] || 50;
        await runAsync(
          'INSERT INTO inventory (base_id, equipment_id, opening_balance, current_stock) VALUES (?, ?, ?, ?)',
          [bId, eId, opening, opening]
        );
      }
    }

    const purchases = [
      [1, 1, 50, 1200, 60000, 'Defense Logistics Agency', 'PO-2026-0891', '2026-09-05', 'admin_gen'],
      [1, 5, 200, 450, 90000, 'Federal Ammunition Co.', 'PO-2026-0904', '2026-09-10', 'logistics_officer'],
      [2, 3, 10, 180000, 1800000, 'General Dynamics Tactical', 'PO-2026-0912', '2026-09-12', 'commander_bravo'],
      [2, 7, 30, 3200, 96000, 'Harris Tactical Systems', 'PO-2026-0918', '2026-09-15', 'logistics_officer'],
      [3, 8, 15, 6500, 97500, 'L3Harris Technologies', 'PO-2026-0925', '2026-09-18', 'admin_gen'],
      [4, 6, 40, 2100, 84000, 'Ordnance Supply Division', 'PO-2026-0931', '2026-09-20', 'logistics_officer'],
      [5, 9, 2, 4500000, 9000000, 'General Atomics Recon', 'PO-2026-0940', '2026-09-22', 'admin_gen']
    ];
    for (const p of purchases) {
      await runAsync(
        'INSERT INTO purchases (base_id, equipment_id, quantity, unit_cost, total_cost, supplier, po_reference, purchase_date, created_by_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        p
      );
      await runAsync('UPDATE inventory SET current_stock = current_stock + ? WHERE base_id = ? AND equipment_id = ?', [p[2], p[0], p[1]]);
    }

    const transfers = [
      [1, 2, 1, 15, '2026-09-11', 'Completed', 'TR-2026-701', 'Tactical reallocation for North border deployment', 'commander_alpha'],
      [1, 3, 5, 10, '2026-09-14', 'Completed', 'TR-2026-702', 'Outpost Charlie defense reinforcement', 'logistics_officer'],
      [2, 4, 3, 5, '2026-09-16', 'Completed', 'TR-2026-703', 'Coastal patrol armor unit transfer', 'commander_bravo'],
      [1, 2, 7, 20, '2026-09-21', 'In-Transit', 'TR-2026-704', 'Urgent comms upgrade for Sector 2', 'logistics_officer'],
      [5, 1, 9, 1, '2026-09-24', 'Pending', 'TR-2026-705', 'Recon drone maintenance transport to HQ', 'admin_gen']
    ];
    for (const t of transfers) {
      await runAsync(
        'INSERT INTO transfers (source_base_id, dest_base_id, equipment_id, quantity, transfer_date, status, tracking_number, notes, initiated_by_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        t
      );
      if (t[5] === 'Completed') {
        await runAsync('UPDATE inventory SET current_stock = current_stock - ? WHERE base_id = ? AND equipment_id = ?', [t[3], t[0], t[2]]);
        await runAsync('UPDATE inventory SET current_stock = current_stock + ? WHERE base_id = ? AND equipment_id = ?', [t[3], t[1], t[2]]);
      }
    }

    const assignments = [
      [1, 1, 5, 'Sgt. John Miller', 'Staff Sergeant', 'MIL-884920', '1st Battalion Recon', '2026-09-08', '2026-10-15', 'Active', 'Issued for patrol mission Alpha', 'commander_alpha'],
      [1, 3, 2, 'Lt. Sarah Jenkins', 'First Lieutenant', 'MIL-449102', 'Armored Transport Unit', '2026-09-12', '2026-09-30', 'Active', 'Vehicle escort deployment', 'commander_alpha'],
      [2, 2, 3, 'Cpl. David Vance', 'Corporal', 'MIL-330194', 'Snipers Platoon 4', '2026-09-15', '2026-10-01', 'Active', 'Perimeter defense rifle assignment', 'commander_bravo'],
      [2, 8, 4, 'Sgt. Michael Ross', 'Sergeant', 'MIL-991023', 'Night Strike Team', '2026-09-18', '2026-09-25', 'Returned', 'Night optic gear returned to armory', 'commander_bravo'],
      [3, 7, 5, 'Specialist Alex Green', 'Specialist', 'MIL-771829', 'Forward Ops Comms', '2026-09-20', '2026-10-10', 'Active', 'Outpost radio units', 'admin_gen']
    ];
    for (const a of assignments) {
      await runAsync(
        'INSERT INTO assignments (base_id, equipment_id, quantity, personnel_name, personnel_rank, service_id, unit, assignment_date, expected_return_date, status, notes, assigned_by_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        a
      );
    }

    const expenditures = [
      [1, 5, 80, '2026-09-12', 'Live Fire Training', 'Exercise Cobra Strike', 'commander_alpha'],
      [2, 5, 60, '2026-09-17', 'Live Fire Training', 'Range Qualification Bravo', 'commander_bravo'],
      [1, 6, 25, '2026-09-22', 'Live Fire Training', 'Heavy Artillery Drill 2026', 'commander_alpha'],
      [3, 5, 45, '2026-09-25', 'Combat Loss', 'Border Security Engagement', 'admin_gen']
    ];
    for (const ex of expenditures) {
      await runAsync(
        'INSERT INTO expenditures (base_id, equipment_id, quantity, expenditure_date, reason, operation_name, authorized_by_user) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ex
      );
      await runAsync('UPDATE inventory SET current_stock = current_stock - ? WHERE base_id = ? AND equipment_id = ?', [ex[2], ex[0], ex[1]]);
    }

    const auditLogs = [
      [1, 'admin_gen', 'admin', null, 'SYSTEM_INITIALIZATION', 'System', 'Military Asset Management System initialized with base parameters'],
      [2, 'commander_alpha', 'base_commander', 1, 'PURCHASE_RECORDED', 'Purchases', 'Recorded purchase of 50x M4A1 Tactical Carbines (PO-2026-0891)'],
      [4, 'logistics_officer', 'logistics_officer', 1, 'TRANSFER_INITIATED', 'Transfers', 'Initiated transfer TR-2026-702 of 5x HMMWV to Outpost Charlie'],
      [2, 'commander_alpha', 'base_commander', 1, 'ASSET_ASSIGNED', 'Assignments', 'Assigned 5x M4A1 to Sgt. John Miller (1st Battalion Recon)'],
      [3, 'commander_bravo', 'base_commander', 2, 'ASSET_EXPENDED', 'Expenditures', 'Expended 60x crates 5.56mm NATO Rounds during Range Qualification Bravo']
    ];
    for (const log of auditLogs) {
      await runAsync(
        'INSERT INTO audit_logs (user_id, username, user_role, base_id, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
        log
      );
    }

    console.log('Database successfully seeded with military asset records!');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

module.exports = {
  db,
  initDatabase,
  runAsync,
  allAsync,
  getAsync
};
