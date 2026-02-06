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
  status: Joi.string().valid('EN_USO', 'SOLD', 'RETIRED').default('EN_USO'),
  interventions: Joi.string().allow('', null),
  intervention_date: Joi.date().allow(null),
  origin: Joi.string().max(30).default('TERCEROS'),
  hours: Joi.number().integer().min(0).default(0),
  comments: Joi.string().allow('', null)
});

// GET: Obtener unidades
router.get('/', authMiddleware, async (req, res) => {
  // OJO: Ajustamos la ruta para que coincida con tu estructura
  // Si en server.js usas app.use('/api/customers/:customerId/units', ...), entonces aquí es '/'
  const { customerId } = req.params;
  try {
    // ⚠️ IMPORTANTE: Quitamos "ORDER BY sale_date" porque esa columna ya no existe
    const result = await pool.query(
      `SELECT * FROM sold_units WHERE customer_id = $1 ORDER BY id DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener unidades' });
  }
});

// POST: Agregar unidad (VERSIÓN CORREGIDA)
router.post('/', authMiddleware, async (req, res) => {
  const { customerId } = req.params;
  const { error, value } = unitSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos inválidos: ' + error.details[0].message });

  const { brand, model, year, hp, status, interventions, intervention_date, origin, hours, comments } = value;

  try {
    const result = await pool.query(
      `INSERT INTO sold_units 
       (customer_id, brand, model, year, hp, status, interventions, intervention_date, origin, hours, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        customerId, 
        brand, 
        model, 
        year, 
        hp, 
        status || 'EN_USO', 
        interventions || '', 
        intervention_date || null,
        origin || 'TERCEROS',
        hours || 0,       
        comments || ''    
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST units:', err); // Log más claro
    res.status(500).json({ message: 'Error al guardar unidad' });
  }
});

// PUT: Editar unidad
router.put('/:unitId', authMiddleware, async (req, res) => {
  const { unitId } = req.params;
  const { error, value } = unitSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos inválidos: ' + error.details[0].message });

  const { brand, model, year, hp, status, interventions, intervention_date, origin, hours, comments } = value;

  try {
    const result = await pool.query(
      `UPDATE sold_units 
       SET brand = $1, model = $2, year = $3, hp = $4, status = $5, interventions = $6, intervention_date = $7, origin = $8, hours = $9, comments = $10
       WHERE id = $11
       RETURNING *`,
      [brand, model, year, hp, status || 'EN_USO', interventions || '', intervention_date || null, origin || 'TERCEROS', hours, comments, unitId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Unidad no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar unidad' });
  }
});

// DELETE: Borrar unidad
router.delete('/:unitId', authMiddleware, async (req, res) => {
  const { unitId } = req.params;
  try {
    await pool.query('DELETE FROM sold_units WHERE id = $1', [unitId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar unidad' });
  }
});

module.exports = router;
