const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');


// backend/routes/dashboardRoutes.js

// ... imports ...

// NUEVA RUTA: Estadísticas del mes actual
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    const params = [];
    
    // Consulta: Contar acciones del MES ACTUAL agrupadas por tipo
    let query = `
      SELECT action_type, COUNT(*) as count
      FROM customer_notes
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `;

    // Si NO es jefe, filtrar solo sus propias acciones
    if (!isBoss) {
      query += ` AND user_id = $1`;
      params.push(req.user.id);
    }

    query += ` GROUP BY action_type`;

    const result = await pool.query(query, params);
    
    // Formatear para el frontend
    const stats = {
      calls: Number(result.rows.find(r => r.action_type === 'CALL')?.count || 0),
      visits: Number(result.rows.find(r => r.action_type === 'VISIT')?.count || 0),
      notes: Number(result.rows.find(r => r.action_type === 'NOTE')?.count || 0),
    };

    res.json(stats);
  } catch (err) {
    console.error('Error stats:', err);
    res.status(500).json({ message: 'Error calculando estadísticas' });
  }
});

// ... aquí sigue la ruta router.get('/activity' ...

router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    
    // CONSULTA ACTUALIZADA:
    // Agregamos 'n.action_type' para saber si es CALL, VISIT o NOTE
    let query = `
      SELECT n.id, n.texto, n.created_at, n.latitude, n.longitude, n.customer_id, n.action_type,
             u.name as user_name, u.role as user_role,
             c.name as customer_name
      FROM customer_notes n
      JOIN users u ON n.user_id = u.id
      JOIN customers c ON n.customer_id = c.id
    `;

    const params = [];

    // Si NO es jefe, solo ve su propia actividad
    if (!isBoss) {
      query += ` WHERE n.user_id = $1`;
      params.push(req.user.id);
    }

    // Ordenar por más reciente y limitar a los últimos 20 movimientos
    query += ` ORDER BY n.created_at DESC LIMIT 20`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error cargando actividad:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;