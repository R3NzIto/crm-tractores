const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET: Obtener unidades
router.get('/:customerId/units', authMiddleware, async (req, res) => {
  const { customerId } = req.params;
  try {
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

// POST: Agregar unidad (Actualizado con Horas y Comentarios)
router.post('/:customerId/units', authMiddleware, async (req, res) => {
  const { customerId } = req.params;
  // 👇 Sacamos accessories/date y metemos hours/comments
  const { brand, model, year, hp, status, interventions, intervention_date, origin, hours, comments } = req.body;

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
        hours || 0,       // 👇 Nuevo
        comments || ''    // 👇 Nuevo
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar unidad' });
  }
});

// PUT: Editar unidad
router.put('/:customerId/units/:unitId', authMiddleware, async (req, res) => {
  const { unitId } = req.params;
  const { brand, model, year, hp, status, interventions, intervention_date, origin, hours, comments } = req.body;

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

// DELETE: (Queda igual)
router.delete('/:customerId/units/:unitId', authMiddleware, async (req, res) => {
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