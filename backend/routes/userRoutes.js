// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

const canManageAll = (role) => ['admin', 'manager', 'jefe'].includes(role);

router.get('/', authMiddleware, async (req, res) => {
  if (!canManageAll(req.user.role)) {
    return res.status(403).json({ message: 'No tienes permisos' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM users ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
