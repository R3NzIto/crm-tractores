const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// 1. RENDIMIENTO DIARIO (Para gráfico mes a día)
router.get('/daily-performance', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    const params = [];
    
    // Agrupa por día y tipo de acción
    let query = `
      SELECT 
        to_char(created_at, 'YYYY-MM-DD') as day,
        action_type, 
        COUNT(*) as count
      FROM customer_notes
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `;

    if (!isBoss) {
      query += ` AND user_id = $1`;
      params.push(req.user.id);
    }

    query += ` GROUP BY day, action_type ORDER BY day ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error daily-performance:', err);
    res.status(500).json({ message: 'Error obteniendo rendimiento' });
  }
});

// 2. ACTIVIDAD RECIENTE (Últimas 48 horas)
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    
    // Filtro de 48 horas
    let query = `
      SELECT n.id, n.texto, n.created_at, n.latitude, n.longitude, n.customer_id, n.action_type,
             u.name as user_name, u.role as user_role,
             c.name as customer_name
      FROM customer_notes n
      JOIN users u ON n.user_id = u.id
      JOIN customers c ON n.customer_id = c.id
      WHERE n.created_at >= NOW() - INTERVAL '48 hours'
    `;

    const params = [];
    if (!isBoss) {
      query += ` AND n.user_id = $1`;
      params.push(req.user.id);
    }

    query += ` ORDER BY n.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error activity:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// 3. REPORTES (Semanal y Mensual)
router.get('/reports', authMiddleware, async (req, res) => {
    try {
      const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
      const params = [];
      
      let query = `
        SELECT 
            COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) AND action_type = 'CALL') as month_calls,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) AND action_type = 'VISIT') as month_visits,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) AND action_type = 'SALE') as month_sales_count,
            
            COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE) AND action_type = 'CALL') as week_calls,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE) AND action_type = 'VISIT') as week_visits,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE) AND action_type = 'SALE') as week_sales_count
        FROM customer_notes
      `;

      if (!isBoss) {
        query += ` WHERE user_id = $1`;
        params.push(req.user.id);
      }

      const result = await pool.query(query, params);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error reports:', err);
      res.status(500).json({ message: 'Error calculando reportes' });
    }
});

// 4. REGISTRAR VENTA (ACTUALIZADO CON MODELO Y HP)
// Nota: Unificamos la ruta a '/sale' para que coincida con el frontend
router.post('/sale', authMiddleware, async (req, res) => {
    // 👇 Recibimos los nuevos campos model y hp
    const { customer_id, sold_unit_id, amount, currency, notes, model, hp } = req.body;
    
    try {
        // A. Guardar en la tabla financiera (sales_records)
        // Asegúrate de que las columnas 'model' y 'hp' existan en la tabla (si no, ejecuta el ALTER TABLE)
        const insertSale = `
            INSERT INTO sales_records (user_id, customer_id, sold_unit_id, amount, currency, notes, model, hp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        // Si no vienen datos, mandamos null
        await pool.query(insertSale, [
            req.user.id, 
            customer_id, 
            sold_unit_id || null, 
            amount || 0, 
            currency || 'USD', 
            notes || '',
            model || null, // Nuevo
            hp || null     // Nuevo
        ]);

        // B. Crear nota automática para que salga en el Dashboard ("Renzo vendió...")
        const noteText = `Venta: $${amount} ${currency}. ${model ? `Modelo: ${model}` : ''} ${notes}`;
        const insertNote = `
            INSERT INTO customer_notes (user_id, customer_id, texto, action_type, created_at)
            VALUES ($1, $2, $3, 'SALE', NOW())
        `;
        await pool.query(insertNote, [req.user.id, customer_id, noteText]);

        // C. Actualizar Stock (si aplica, opcional)
        if (sold_unit_id) {
            await pool.query('UPDATE sold_units SET status = $1 WHERE id = $2', ['SOLD', sold_unit_id]);
        }

        res.json({ message: 'Venta registrada con éxito' });
    } catch (err) {
        console.error('Error en /sale:', err);
        res.status(500).json({ message: 'Error al registrar venta' });
    }
});

// --- NUEVAS RUTAS PARA GESTIÓN DE VENTAS ---

// 5. OBTENER HISTORIAL DE VENTAS (Para la tabla de eliminación)
router.get('/sales-history', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    let query = `
      SELECT s.id, s.amount, s.currency, s.sale_date, s.model, s.hp, s.notes,
             c.name as customer_name,
             u.name as user_name
      FROM sales_records s
      JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.user_id = u.id
    `;
    
    const params = [];
    if (!isBoss) {
      query += ` WHERE s.user_id = $1`;
      params.push(req.user.id);
    }

    query += ` ORDER BY s.sale_date DESC LIMIT 50`; // Traemos las últimas 50

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error cargando historial' });
  }
});

// 6. ELIMINAR VENTA (Cancelar)
router.delete('/sale/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    // Verificamos permisos antes de borrar
    const isBoss = ['admin', 'manager', 'jefe'].includes(req.user.role);
    let checkQuery = 'SELECT * FROM sales_records WHERE id = $1';
    let checkParams = [id];

    if (!isBoss) {
        checkQuery += ' AND user_id = $2';
        checkParams.push(req.user.id);
    }

    const check = await pool.query(checkQuery, checkParams);
    if (check.rows.length === 0) {
        return res.status(403).json({ message: 'No puedes eliminar esta venta o no existe' });
    }

    // Borramos
    await pool.query('DELETE FROM sales_records WHERE id = $1', [id]);
    res.json({ message: 'Venta eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar venta' });
  }
});

// 7. DATOS PARA NUEVO GRÁFICO (Top Modelos)
router.get('/sales-by-model', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT model, COUNT(*) as count 
      FROM sales_records 
      WHERE model IS NOT NULL 
      GROUP BY model 
      ORDER BY count DESC 
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en grafico modelos' });
  }
});
module.exports = router;