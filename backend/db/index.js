const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN (
          'admin','production_manager','cutting_operator',
          'stitching_operator','button_operator','checking_operator',
          'ironing_operator','store_manager'
        )),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        sku_id VARCHAR(50) UNIQUE NOT NULL,
        style_name VARCHAR(100) NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        color VARCHAR(50) NOT NULL,
        size VARCHAR(20) NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL,
        production_date DATE NOT NULL,
        due_date DATE NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
        remarks TEXT,
        current_stage VARCHAR(50) DEFAULT 'cutting',
        status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','delayed','cancelled')),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stage_entries (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        sku_id VARCHAR(50) NOT NULL,
        stage VARCHAR(50) NOT NULL CHECK (stage IN (
          'cutting','stitching','button_attachment',
          'checking_trimming','ironing','finished_stock'
        )),
        quantity_received INTEGER DEFAULT 0,
        quantity_completed INTEGER DEFAULT 0,
        quantity_rejected INTEGER DEFAULT 0,
        remarks TEXT,
        completed_at TIMESTAMP,
        is_completed BOOLEAN DEFAULT false,
        operator_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('raw_fabric','finished_goods','ready_dispatch','reserved')),
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'pcs',
        min_stock DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventory(id),
        movement_type VARCHAR(20) CHECK (movement_type IN ('in','out','transfer','damage','adjustment')),
        quantity DECIMAL(10,2) NOT NULL,
        reference VARCHAR(100),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        related_sku VARCHAR(50),
        related_order VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_orders_sku ON orders(sku_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_name);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_stage_entries_order ON stage_entries(order_id);
      CREATE INDEX IF NOT EXISTS idx_stage_entries_sku ON stage_entries(sku_id);
      CREATE INDEX IF NOT EXISTS idx_stage_entries_stage ON stage_entries(stage);
    `);

    // Create admin user if none exists
    const { rows } = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)`,
        ['Admin User', 'admin@fabricflow.com', hash, 'admin']
      );
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
