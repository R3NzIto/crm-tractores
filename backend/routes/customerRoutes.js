const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');
const multer = require('multer');
const xlsx = require('xlsx');

const canManageAll = (role) => ['admin', 'manager', 'jefe'].includes(role);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// --- 1. ESQUEMA DE VALIDACIÓN (JOI) ---
const customerSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  company: Joi.string().max(150).allow('', null),
  phone: Joi.string().max(50).allow('', null),
  email: Joi.string().email().max(150).allow('', null),
  localidad: Joi.string().max(100).allow('', null),
  sector: Joi.string().max(100).allow('', null),
  assigned_to: Joi.number().integer().allow(null),
  type: Joi.string().valid('CLIENT', 'POS').allow('', null) 
});

// GET: Listar clientes (Buscador Mejorado)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { machine, type } = req.query;
    
    // Query base limpia
    let sql = `
      SELECT c.*, u.name AS created_by_name, a.name AS assigned_to_name
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN users a ON c.assigned_to = a.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // 1. Filtro por TIPO (Cliente o Prospecto)
    if (type) {
      sql += ` AND c.type = $${paramIndex} `;
      params.push(type);
      paramIndex++;
    }

    // 2. Filtro por MAQUINARIA (Marca, Modelo o Comentarios)
    // Usamos una subconsulta (IN) para evitar duplicados y buscar en todo
    if (machine) {
      sql += ` AND c.id IN (
        SELECT customer_id FROM sold_units 
        WHERE 
          brand ILIKE $${paramIndex} OR 
          model ILIKE $${paramIndex} OR 
          comments ILIKE $${paramIndex}
      )`;
      params.push(`%${machine}%`);
      paramIndex++;
    }

    // 3. Filtro por PERMISOS (Si no es jefe, solo ve lo suyo)
    if (!canManageAll(req.user.role)) {
      sql += ` AND (c.created_by = $${paramIndex} OR c.assigned_to = $${paramIndex})`;
      params.push(req.user.id);
      paramIndex++;
    }

    sql += ` ORDER BY c.id DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// POST: Crear Cliente
router.post('/', authMiddleware, async (req, res) => {
  const { error, value } = customerSchema.validate(req.body);
  
  if (error) {
    console.log("Error de validación Joi:", error.details[0].message);
    return res.status(400).json({ message: 'Datos invalidos: ' + error.details[0].message });
  }

  const { name, company, phone, email, localidad, sector, assigned_to, type } = value;

  try {
    const result = await pool.query(
      `INSERT INTO customers (name, company, phone, email, localidad, sector, created_by, assigned_to, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        company || null,
        phone || null,
        email || null,
        localidad || null,
        sector || null,
        req.user.id,
        assigned_to || req.user.id,
        type || 'CLIENT'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    if (error.code === '23505') {
        return res.status(400).json({ message: 'El correo o teléfono ya está registrado' });
    }
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// PUT: Editar Cliente
router.put('/:id', authMiddleware, async (req, res) => {
  const { error, value } = customerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { name, company, phone, email, localidad, sector, assigned_to, type } = value;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    const customer = existing.rows[0];

    if (!customer) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const canEdit = canManageAll(req.user.role) || customer.created_by === req.user.id;
    if (!canEdit) {
      return res.status(403).json({ message: 'No tienes permisos' });
    }

    let assignTarget = assigned_to;
    if (assigned_to && !canManageAll(req.user.role)) {
      assignTarget = customer.assigned_to; 
    }

    const result = await pool.query(
      `UPDATE customers
       SET name = $1, company = $2, phone = $3, email = $4, localidad = $5, sector = $6, assigned_to = $7, type = $8
       WHERE id = $9
       RETURNING *`,
      [
        name,
        company || null,
        phone || null,
        email || null,
        localidad || null,
        sector || null,
        assignTarget || customer.assigned_to || customer.created_by,
        type || customer.type || 'CLIENT',
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// DELETE: Eliminar Cliente
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    const customer = existing.rows[0];

    if (!customer) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const canDelete = canManageAll(req.user.role) || customer.created_by === req.user.id;
    if (!canDelete) {
      return res.status(403).json({ message: 'No tienes permisos' });
    }

    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// IMPORT
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se envio archivo' });

  const allowedExt = ['.xlsx', '.xls', '.csv'];
  const lowerName = req.file.originalname.toLowerCase();
  if (!allowedExt.some((ext) => lowerName.endsWith(ext))) {
    return res.status(400).json({ message: 'Formato no soportado. Usa .xlsx o .csv' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });

    if (!rows.length) return res.status(400).json({ message: 'El archivo esta vacio' });
    if (rows.length > 1200) return res.status(400).json({ message: 'Limite 1200 filas' });

    const normalizeKey = (key) => key.toString().trim().toLowerCase();
    const parsed = rows.map((row) => {
        const entries = Object.entries(row).reduce((acc, [k, v]) => {
          acc[normalizeKey(k)] = typeof v === 'string' ? v.trim() : v;
          return acc;
        }, {});
        return {
          name: entries.nombre || entries.name || '',
          email: entries.email || entries.correo || '',
          phone: entries.telefono || entries.phone || '',
          company: entries.empresa || entries.company || '',
          localidad: entries.localidad || entries.region || '',
          sector: entries.sector || entries.rol || '',
        };
      }).filter((row) => row.name);

    if (!parsed.length) return res.status(400).json({ message: 'Faltan nombres en el archivo' });

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      for (const row of parsed) {
         await client.query(
           `INSERT INTO customers (name, company, phone, email, localidad, sector, created_by, assigned_to, type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CLIENT')`,
           [row.name, row.company, row.phone, row.email, row.localidad, row.sector, req.user.id, req.user.id]
         );
      }
      await client.query('COMMIT');
      res.json({ message: 'Importación exitosa', total: parsed.length });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Error importando' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;