CREATE DATABASE crm_tractores;

\c crm_tractores;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
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
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin Principal',
  'admin@empresa.com',
  '$2a$10$zqQ4s91YpXvWQJ6rXlEP1uPiF1MmH3RAHvbE/vUBQxLmOBIx7TA8q',
  'admin'
);
