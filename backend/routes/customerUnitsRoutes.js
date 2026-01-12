const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET: Obtener unidades
router.get('/:customerId/units', authMiddleware, async (req, res) => {
  const { customerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM sold_units WHERE customer_id = $1 ORDER BY sale_date DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener unidades' });
  }
});

// POST: Agregar unidad
router.post('/:customerId/units', authMiddleware, async (req, res) => {
  const { customerId } = req.params;
  const { model, year, hp, accessories, sale_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO sold_units (customer_id, model, year, hp, accessories, sale_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [customerId, model, year, hp, accessories, sale_date]
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
  const { model, year, hp, accessories, sale_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE sold_units 
       SET model = $1, year = $2, hp = $3, accessories = $4, sale_date = $5
       WHERE id = $6
       RETURNING *`,
      [model, year, hp, accessories, sale_date, unitId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Unidad no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar unidad' });
  }
});

// DELETE: Borrar unidad
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