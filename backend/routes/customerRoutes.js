const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');
const multer = require('multer');
const xlsx = require('xlsx');

const canManageAll = (role) => ['admin', 'manager'].includes(role);
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
  assigned_to: Joi.number().integer().allow(null)
});

// GET: Listar clientes (Buscador Mejorado)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { machine } = req.query;
    
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

    // Forzar solo clientes
    sql += ` AND COALESCE(UPPER(c.type),'CLIENT') = 'CLIENT' `;

    // 2. Filtro por MAQUINARIA (Marca, Modelo o Comentarios)
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

    // 3. Filtro por PERMISOS (Opcional, descomentar si se requiere restringir vista)
    // if (!canManageAll(req.user.role)) {
    //   sql += ` AND (c.created_by = $${paramIndex} OR c.assigned_to = $${paramIndex})`;
    //   params.push(req.user.id);
    //   paramIndex++;
    // }

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
    console.log("Error de validación Joi:", error.details[0].message, "payload:", req.body);
    return res.status(400).json({ message: 'Datos invalidos: ' + error.details[0].message });
  }

  const { name, company, phone, email, localidad, sector, assigned_to } = value;

  try {
    const result = await pool.query(
      `INSERT INTO customers (name, company, phone, email, localidad, sector, created_by, assigned_to, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CLIENT')
       RETURNING *`,
      [
        name,
        company || null,
        phone || null,
        email || null,
        localidad || null,
        sector || null,
        req.user.id,
        assigned_to || req.user.id
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

  const { name, company, phone, email, localidad, sector, assigned_to } = value;
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
       SET name = $1, company = $2, phone = $3, email = $4, localidad = $5, sector = $6, assigned_to = $7, type = 'CLIENT'
       WHERE id = $8
       RETURNING *`,
      [
        name,
        company || null,
        phone || null,
        email || null,
        localidad || null,
        sector || null,
        assignTarget || customer.assigned_to || customer.created_by,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// DELETE: Eliminar Cliente Individual
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

    // Validamos dependencias antes de intentar borrar
    const deps = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM sales_records WHERE customer_id = $1) AS sales_count,
         (SELECT COUNT(*) FROM sold_units    WHERE customer_id = $1) AS units_count,
         (SELECT COUNT(*) FROM customer_notes WHERE customer_id = $1) AS notes_count
       `,
      [id]
    );
    const { sales_count, units_count, notes_count } = deps.rows[0];
    const totalRefs = Number(sales_count) + Number(units_count) + Number(notes_count);
    if (totalRefs > 0) {
      return res.status(400).json({
        message: `No se puede eliminar: tiene ${sales_count} ventas, ${units_count} unidades y ${notes_count} notas asociadas. Borra o reasigna esos registros primero.`,
      });
    }

    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    if (error.code === '23503') {
      // Restricción de clave foránea: hay ventas/unidades/notas asociadas
      return res.status(400).json({ message: 'No se puede eliminar: tiene registros asociados (ventas/unidades/notas).' });
    }
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// 👇 NUEVA RUTA: DELETE BATCH (Eliminación Masiva)
router.post('/delete-batch', authMiddleware, async (req, res) => {
  const { ids } = req.body; // Esperamos un array ej: [1, 5, 8]

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No se enviaron IDs para eliminar' });
  }

  try {
    let query = 'DELETE FROM customers WHERE id = ANY($1)';
    const params = [ids];

    // SEGURIDAD: Si no es admin/manager, solo puede borrar los que él creó
    if (!canManageAll(req.user.role)) {
       query += ' AND created_by = $2';
       params.push(req.user.id);
    }

    const result = await pool.query(query, params);

    res.json({ message: `${result.rowCount} clientes eliminados correctamente.` });
  } catch (err) {
    console.error('Error batch delete:', err);
    res.status(500).json({ message: 'Error al eliminar clientes seleccionados' });
  }
});

// IMPORT con deduplicación básica (email/phone)
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const phoneRegex = /^[0-9()+\-\s]{6,}$/;

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
    let inserted = 0;
    let skipped = 0;
    const duplicates = [];
    const invalids = [];

    try {
      await client.query('BEGIN');
      for (const row of parsed) {
         // validaciones de formato
         if (row.email && !emailRegex.test(row.email)) {
           invalids.push({ email: row.email, reason: 'email' });
           skipped++;
           continue;
         }
         if (row.phone && !phoneRegex.test(row.phone)) {
           invalids.push({ phone: row.phone, reason: 'phone' });
           skipped++;
           continue;
         }

         // dedupe por email o phone (si vienen)
         const dedupeRes = await client.query(
           `SELECT id FROM customers WHERE 
              (email IS NOT NULL AND email <> '' AND email = $1)
              OR (phone IS NOT NULL AND phone <> '' AND phone = $2)
            LIMIT 1`,
            [row.email || null, row.phone || null]
         );
         if (dedupeRes.rowCount > 0) {
           skipped++;
           if (duplicates.length < 20) {
             duplicates.push({ email: row.email || null, phone: row.phone || null });
           }
           continue;
         }
         await client.query(
           `INSERT INTO customers (name, company, phone, email, localidad, sector, created_by, assigned_to, type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CLIENT')`,
           [row.name, row.company || null, row.phone || null, row.email || null, row.localidad || null, row.sector || null, req.user.id, req.user.id]
         );
         inserted++;
      }
      await client.query('COMMIT');
      res.json({ 
        message: 'Importación procesada', 
        total: parsed.length, 
        insertados: inserted, 
        omitidos: skipped,
        duplicados: duplicates,
        invalidos: invalids 
      });
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
