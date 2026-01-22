    // backend/routes/unitsRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET: Obtener TODAS las unidades con datos del cliente
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id, u.model, u.year, u.hp, u.sale_date, u.status, u.photo_url,
        c.id as customer_id, c.name as customer_name, c.localidad, c.type as customer_type
      FROM sold_units u
      JOIN customers c ON u.customer_id = c.id
      ORDER BY u.sale_date DESC
    `;
    
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener el parque de maquinaria' });
  }
});

module.exports = router;