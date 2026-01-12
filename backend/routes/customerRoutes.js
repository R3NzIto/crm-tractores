// backend/routes/customerRoutes.js
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

const customerSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  company: Joi.string().max(150).allow('', null),
  phone: Joi.string().max(50).allow('', null),
  email: Joi.string().email().max(150).allow('', null),
  localidad: Joi.string().max(100).allow('', null),
  sector: Joi.string().max(100).allow('', null), // rol en la empresa (comprador, taller, repuestos)
  assigned_to: Joi.number().integer().allow(null),
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { machine } = req.query; // <--- Recibimos el filtro de maquinaria
    let queryBase;
    const params = [];

    // Consulta Base Inteligente
    if (machine) {
      // PUNTO 3: Si busca maquinaria, hacemos JOIN con sold_units
      queryBase = `
        SELECT DISTINCT c.*, u.name AS created_by_name, a.name AS assigned_to_name
        FROM customers c
        JOIN sold_units su ON c.id = su.customer_id
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN users a ON c.assigned_to = a.id
        WHERE su.model ILIKE $1
      `;
      params.push(`%${machine}%`);
    } else {
      // Consulta normal
      queryBase = `
        SELECT c.*, u.name AS created_by_name, a.name AS assigned_to_name
        FROM customers c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN users a ON c.assigned_to = a.id
        WHERE 1=1
      `;
    }

    // Filtros de Rol (Si no es jefe, solo ve lo suyo)
    if (!canManageAll(req.user.role)) {
      if (machine) {
        queryBase += ` AND (c.created_by = $2 OR c.assigned_to = $2)`;
        params.push(req.user.id);
      } else {
        queryBase += ` AND (c.created_by = $1 OR c.assigned_to = $1)`;
        params.push(req.user.id);
      }
    }

    queryBase += ` ORDER BY c.id DESC`;

    const result = await pool.query(queryBase, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { error, value } = customerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { name, company, phone, email, localidad, sector, assigned_to } = value;

  try {
    const result = await pool.query(
      `INSERT INTO customers (name, company, phone, email, localidad, sector, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

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
      assignTarget = customer.assigned_to; // no permitir que no-jefe reasigne
    }

    const result = await pool.query(
      `UPDATE customers
       SET name = $1, company = $2, phone = $3, email = $4, localidad = $5, sector = $6, assigned_to = $7
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

router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se envio archivo' });
  }

  const allowedExt = ['.xlsx', '.xls', '.csv'];
  const lowerName = req.file.originalname.toLowerCase();
  const isAllowed = allowedExt.some((ext) => lowerName.endsWith(ext));
  if (!isAllowed) {
    return res.status(400).json({ message: 'Formato no soportado. Usa .xlsx o .csv' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ message: 'El archivo esta vacio' });
    }

    if (rows.length > 1200) {
      return res.status(400).json({ message: 'Limite 1200 filas por importacion' });
    }

    const normalizeKey = (key) => key.toString().trim().toLowerCase();

    const parsed = rows
      .map((row) => {
        const entries = Object.entries(row).reduce((acc, [k, v]) => {
          acc[normalizeKey(k)] = typeof v === 'string' ? v.trim() : v;
          return acc;
        }, {});

        const name = entries.nombre || entries.name;
        const email = entries.email || entries.correo;
        const phone = entries.telefono || entries.phone || entries['teléfono'] || entries['telǸfono'];
        const company = entries.empresa || entries.company || entries.cliente;
        const localidad = entries.localidad || entries.region || entries.zona || entries.sector;
        const sectorRol =
          entries.sector ||
          entries['sector_empresa'] ||
          entries.rol ||
          entries['rol en empresa'] ||
          entries.area ||
          entries.puesto;

        return {
          name: name ? String(name).trim() : '',
          email: email ? String(email).trim() : '',
          phone: phone ? String(phone).trim() : '',
          company: company ? String(company).trim() : '',
          localidad: localidad ? String(localidad).trim() : '',
          sector: sectorRol ? String(sectorRol).trim() : '',
        };
      })
      .filter((row) => row.name);

    if (!parsed.length) {
      return res.status(400).json({ message: 'No se encontraron filas validas (falta nombre)' });
    }

    const client = await pool.connect();
    const existing = await client.query('SELECT email FROM customers WHERE email IS NOT NULL');
    const existingEmails = new Set(existing.rows.map((r) => r.email?.toLowerCase()).filter(Boolean));

    let inserted = 0;
    let skipped = 0;

    try {
      await client.query('BEGIN');
      for (const row of parsed) {
        if (row.email && existingEmails.has(row.email.toLowerCase())) {
          skipped += 1;
          continue;
        }

        await client.query(
          `INSERT INTO customers (name, company, phone, email, localidad, sector, created_by, assigned_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            row.name,
            row.company || null,
            row.phone || null,
            row.email || null,
            row.localidad || null,
            row.sector || null,
            req.user.id,
            req.user.id,
          ]
        );

        if (row.email) existingEmails.add(row.email.toLowerCase());
        inserted += 1;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error en importacion:', err);
      return res.status(500).json({ message: 'No pudimos importar clientes' });
    } finally {
      client.release();
    }

    res.json({
      total: parsed.length,
      insertados: inserted,
      omitidos: skipped,
    });
  } catch (error) {
    console.error('Error procesando importacion:', error);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
