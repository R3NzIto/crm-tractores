const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');

const unitSchema = Joi.object({
  brand: Joi.string().max(80).required(),
  model: Joi.string().max(120).required(),
  year: Joi.number().integer().min(1900).max(9999).allow(null),
  hp: Joi.number().integer().min(0).max(1000).allow(null),
  status: Joi.string().valid('EN_USO', 'SOLD').default('EN_USO'),
  accessories: Joi.string().allow('', null),
  sale_date: Joi.date().allow(null),
  origin: Joi.string().max(30).default('WOLF_HARD'),
});

// Obtener unidades por POS
router.get('/', authMiddleware, async (req, res) => {
  const { posId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM sold_units WHERE pos_id = $1 ORDER BY id DESC`,
      [posId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener unidades POS:', err);
    res.status(500).json({ message: 'Error al obtener unidades' });
  }
});

// Crear unidad para POS
router.post('/', authMiddleware, async (req, res) => {
  const { posId } = req.params;
  const { error, value } = unitSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos inválidos: ' + error.details[0].message });

  const { brand, model, year, hp, status, accessories, sale_date, origin } = value;

  try {
    const result = await pool.query(
      `INSERT INTO sold_units (pos_id, customer_id, brand, model, year, hp, status, accessories, sale_date, origin)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [posId, brand, model, year, hp, status || 'EN_USO', accessories || '', sale_date || null, origin || 'WOLF_HARD']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear unidad POS:', err);
    res.status(500).json({ message: 'Error guardando unidad' });
  }
});

// Actualizar unidad de POS
router.put('/:unitId', authMiddleware, async (req, res) => {
  const { posId, unitId } = req.params;
  const { error, value } = unitSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos inválidos: ' + error.details[0].message });

  const { brand, model, year, hp, status, accessories, sale_date, origin } = value;

  try {
    const result = await pool.query(
      `UPDATE sold_units
       SET brand=$1, model=$2, year=$3, hp=$4, status=$5, accessories=$6, sale_date=$7, origin=$8
       WHERE id=$9 AND pos_id=$10
       RETURNING *`,
      [brand, model, year, hp, status || 'EN_USO', accessories || '', sale_date || null, origin || 'WOLF_HARD', unitId, posId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Unidad no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar unidad POS:', err);
    res.status(500).json({ message: 'Error al actualizar unidad' });
  }
});

// Borrar unidad de POS
router.delete('/:unitId', authMiddleware, async (req, res) => {
  const { posId, unitId } = req.params;
  try {
    const result = await pool.query('DELETE FROM sold_units WHERE id=$1 AND pos_id=$2', [unitId, posId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Unidad no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar unidad POS:', err);
    res.status(500).json({ message: 'Error al eliminar unidad' });
  }
});

module.exports = router;
