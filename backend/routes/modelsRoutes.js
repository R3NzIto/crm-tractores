const express = require('express');
const router = express.Router();
const pool = require('../db'); 

// GET /api/models - Devuelve modelos (opcionalmente filtrados por marca)
router.get('/', async (req, res) => {
  try {
    const { brand } = req.query; // Capturamos el parametro ?brand=...
    
    // 1. Consulta base: Solo activos
    let query = 'SELECT * FROM tractor_models WHERE active = TRUE';
    const params = [];

    // 2. Si nos envían una marca, agregamos el filtro AND
    if (brand) {
      query += ' AND brand = $1';
      params.push(brand);
    }

    // 3. Ordenamos alfabéticamente por modelo
    query += ' ORDER BY model ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Error buscando modelos:', err);
    res.status(500).json({ message: 'Error de servidor al cargar modelos' });
  }
});

module.exports = router;