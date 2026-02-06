const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');

const posSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  company: Joi.string().max(150).allow('', null),
  phone: Joi.string().max(50).allow('', null),
  email: Joi.string().email().max(150).allow('', null),
  localidad: Joi.string().max(100).allow('', null),
  sector: Joi.string().max(100).allow('', null),
  assigned_to: Joi.number().integer().allow(null),
});

// GET: listar POS
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS created_by_name, a.name AS assigned_to_name
       FROM pos p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN users a ON p.assigned_to = a.id
       ORDER BY p.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener POS:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// POST: crear POS
router.post('/', authMiddleware, async (req, res) => {
  const { error, value } = posSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos inválidos: ' + error.details[0].message });

  const { name, company, phone, email, localidad, sector, assigned_to } = value;

  try {
    const result = await pool.query(
      `INSERT INTO pos (name, company, phone, email, localidad, sector, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, company || null, phone || null, email || null, localidad || null, sector || null, assigned_to || req.user.id, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear POS:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// PUT: actualizar POS
router.put('/:id', authMiddleware, async (req, res) => {
  const { error, value } = posSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos inválidos' });
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM pos WHERE id = $1', [id]);
    if (existing.rowCount === 0) return res.status(404).json({ message: 'Punto de venta no encontrado' });

    const { name, company, phone, email, localidad, sector, assigned_to } = value;
    const result = await pool.query(
      `UPDATE pos
       SET name=$1, company=$2, phone=$3, email=$4, localidad=$5, sector=$6, assigned_to=$7
       WHERE id=$8
       RETURNING *`,
      [name, company || null, phone || null, email || null, localidad || null, sector || null, assigned_to || existing.rows[0].assigned_to, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar POS:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// DELETE: eliminar POS
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT * FROM pos WHERE id = $1', [id]);
    if (existing.rowCount === 0) return res.status(404).json({ message: 'Punto de venta no encontrado' });

    await pool.query('DELETE FROM pos WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar POS:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
