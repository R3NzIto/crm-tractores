const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');

// Helpers
const isBoss = (role) => ['admin', 'manager'].includes(role);

// Schemas
const saleSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  sold_unit_id: Joi.number().integer().allow(null),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().valid('USD', 'ARS').default('USD'),
  notes: Joi.string().max(500).allow('', null),
  model: Joi.string().max(120).allow('', null),
  hp: Joi.number().integer().min(0).max(1000).allow(null)
});

// 1. RENDIMIENTO DIARIO
router.get('/daily-performance', authMiddleware, async (req, res) => {
  try {
    const boss = isBoss(req.user.role);
    const params = [];
    
    let query = `
      SELECT 
        (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date as day,
        action_type, 
        COUNT(*) as count
      FROM customer_notes
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;

    if (!boss) {
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

// 2. ACTIVIDAD RECIENTE
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const boss = isBoss(req.user.role);
    
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
    if (!boss) {
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

// 3. REPORTES
// Alias: el frontend llama /stats, mantenemos /reports por compatibilidad
const buildReports = async (req, res) => {
    try {
      const boss = isBoss(req.user.role);
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

      if (!boss) {
        query += ` WHERE user_id = $1`;
        params.push(req.user.id);
      }

      const result = await pool.query(query, params);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error reports:', err);
      res.status(500).json({ message: 'Error calculando reportes' });
    }
};

router.get('/reports', authMiddleware, buildReports);
router.get('/stats', authMiddleware, buildReports);

// 4. REGISTRAR VENTA
router.post('/sale', authMiddleware, async (req, res) => {
    const { error, value } = saleSchema.validate(req.body);
    if (error) return res.status(400).json({ message: 'Datos inválidos: ' + error.details[0].message });

    const { customer_id, sold_unit_id, amount, currency, notes, model, hp } = value;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Si no es admin/manager, validar que el cliente le pertenece (creado o asignado)
        if (!isBoss(req.user.role)) {
            const ownership = await client.query(
              `SELECT 1 FROM customers WHERE id = $1 AND (created_by = $2 OR assigned_to = $2)`,
              [customer_id, req.user.id]
            );
            if (ownership.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ message: 'No puedes registrar ventas para este cliente' });
            }
        }

        const insertSale = `
            INSERT INTO sales_records (user_id, customer_id, sold_unit_id, amount, currency, notes, model, hp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        const saleRes = await client.query(insertSale, [
            req.user.id, 
            customer_id, 
            sold_unit_id || null, 
            amount || 0, 
            currency || 'USD', 
            notes || '',
            model || null,
            hp || null
        ]);

        const noteText = `Venta: $${amount} ${currency}. ${model ? `Modelo: ${model}` : ''} ${notes || ''}`.trim();
        const insertNote = `
            INSERT INTO customer_notes (user_id, customer_id, texto, action_type, created_at)
            VALUES ($1, $2, $3, 'SALE', NOW())
            RETURNING id
        `;
        const noteRes = await client.query(insertNote, [req.user.id, customer_id, noteText]);

        // Guardar referencia de la nota en la venta (si la columna existe)
        try {
          await client.query(
            'UPDATE sales_records SET note_id = $1 WHERE id = $2',
            [noteRes.rows[0].id, saleRes.rows[0].id]
          );
        } catch (_) {
          // si note_id no existe aún, ignoramos
        }

        if (sold_unit_id) {
            await client.query('UPDATE sold_units SET status = $1 WHERE id = $2', ['SOLD', sold_unit_id]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Venta registrada con éxito' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en /sale:', err);
        res.status(500).json({ message: 'Error al registrar venta' });
    } finally {
        client.release();
    }
});

// 5. OBTENER HISTORIAL DE VENTAS
router.get('/sales-history', authMiddleware, async (req, res) => {
  try {
    const isBoss = ['admin', 'manager'].includes(req.user.role);
    let query = `
      SELECT s.id, s.amount, s.currency, s.sale_date, s.model, s.hp, s.notes,
             c.name as customer_name,
             u.name as user_name, s.customer_id
      FROM sales_records s
      JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.user_id = u.id
    `;
    
    const params = [];
    if (!isBoss) {
      query += ` WHERE s.user_id = $1`;
      params.push(req.user.id);
    }

    query += ` ORDER BY s.sale_date DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error cargando historial' });
  }
});

// 👇👇 6. ELIMINAR VENTA (CORREGIDO PARA DECIMALES Y FALLBACK) 👇👇
router.delete('/sale/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect(); 

  try {
    await client.query('BEGIN');

    // 1. Obtener datos de la venta ANTES de borrarla
    const boss = isBoss(req.user.role);
    let checkQuery = 'SELECT * FROM sales_records WHERE id = $1';
    let checkParams = [id];

    if (!boss) {
        checkQuery += ' AND user_id = $2';
        checkParams.push(req.user.id);
    }

    const check = await client.query(checkQuery, checkParams);
    
    if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'No puedes eliminar esta venta o no existe' });
    }

    const saleToDelete = check.rows[0];

    // 2. Borrar la Venta Financiera
    await client.query('DELETE FROM sales_records WHERE id = $1', [id]);

    // 3. Borrar la Nota asociada con referencia directa si existe note_id; fallback por última venta
    const deleteByRef = async () => {
      if (saleToDelete.note_id) {
        const resDel = await client.query('DELETE FROM customer_notes WHERE id = $1', [saleToDelete.note_id]);
        return resDel.rowCount;
      }
      return 0;
    };

    let deleted = await deleteByRef();
    if (deleted === 0) {
      await client.query(`
          DELETE FROM customer_notes
          WHERE id = (
              SELECT id FROM customer_notes
              WHERE customer_id = $1
              AND action_type = 'SALE'
              ORDER BY created_at DESC
              LIMIT 1
          )
      `, [saleToDelete.customer_id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Venta eliminada correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar venta' });
  } finally {
    client.release();
  }
});
// 👆👆 FIN DE LA CORRECCIÓN 👆👆

// 7. DATOS PARA NUEVO GRÁFICO
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
