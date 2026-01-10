const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    
    // Consulta para traer notas recientes + info del usuario + info del cliente
    let query = `
      SELECT n.id, n.texto, n.created_at, n.latitude, n.longitude, n.customer_id,
             u.name as user_name, u.role as user_role,
             c.name as customer_name
      FROM customer_notes n
      JOIN users u ON n.user_id = u.id
      JOIN customers c ON n.customer_id = c.id
    `;

    const params = [];

    // Si NO es jefe, solo ve lo que él mismo hizo
    if (!isBoss) {
      query += ` WHERE n.user_id = $1`;
      params.push(req.user.id);
    }

    // Ordenar por más reciente y limitar a 20
    query += ` ORDER BY n.created_at DESC LIMIT 20`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error cargando actividad:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;