CREATE DATABASE crm_tractores;

\c crm_tractores;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  company VARCHAR(150),
  phone VARCHAR(50),
  email VARCHAR(150),
  localidad VARCHAR(100),
  sector VARCHAR(100),
  created_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  texto TEXT NOT NULL,
  fecha_visita TIMESTAMP,
  proximos_pasos TEXT,
  action_type VARCHAR(20) NOT NULL DEFAULT 'NOTE', -- CALL | VISIT | SALE | NOTE
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unidades vendidas / flota de clientes
CREATE TABLE IF NOT EXISTS sold_units (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  brand VARCHAR(80),
  model VARCHAR(120),
  year INTEGER,
  hp INTEGER,
  status VARCHAR(20) DEFAULT 'EN_USO', -- EN_USO | SOLD | RETIRED
  interventions TEXT,
  intervention_date DATE,
  origin VARCHAR(30) DEFAULT 'TERCEROS',
  hours INTEGER DEFAULT 0,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Modelos de tractores (catálogo)
CREATE TABLE IF NOT EXISTS tractor_models (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(120) NOT NULL,
  hp INTEGER,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (brand, model)
);

-- Registro de ventas
CREATE TABLE IF NOT EXISTS sales_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  sold_unit_id INTEGER REFERENCES sold_units(id) ON DELETE SET NULL,
  note_id INTEGER REFERENCES customer_notes(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  notes TEXT,
  model VARCHAR(120),
  hp INTEGER,
  sale_date TIMESTAMP DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_user ON customer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_customer ON sales_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_user ON sales_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records(sale_date);

INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin Principal',
  'admin@empresa.com',
  '$2a$10$zqQ4s91YpXvWQJ6rXlEP1uPiF1MmH3RAHvbE/vUBQxLmOBIx7TA8q',
  'admin'
);
