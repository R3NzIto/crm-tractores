const express = require('express');
const router = express.Router();
const pool = require('../db'); // Asegúrate que la ruta a 'db' sea correcta

// GET /api/models - Devuelve la lista de tractores activos
router.get('/', async (req, res) => {
  try {
    // Traemos todo ordenado por Marca y luego por Modelo
    const result = await pool.query(
      'SELECT * FROM tractor_models WHERE active = TRUE ORDER BY brand, model'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error buscando modelos:', err);
    res.status(500).json({ message: 'Error de servidor al cargar modelos' });
  }
});

module.exports = router;