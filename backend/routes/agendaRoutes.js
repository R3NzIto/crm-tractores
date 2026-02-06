// backend/routes/agendaRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');

const canManageAll = (role) => ['admin', 'manager'].includes(role);

const agendaSchema = Joi.object({
  title: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(500).allow('', null),
  scheduled_at: Joi.date().allow(null),
  status: Joi.string().valid('pendiente', 'en_progreso', 'finalizado').default('pendiente'),
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;
    if (canManageAll(req.user.role)) {
      result = await pool.query(
        `SELECT a.*, u.name AS user_name
         FROM agenda_items a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.scheduled_at NULLS LAST, a.id DESC`
      );
    } else {
      result = await pool.query(
        `SELECT a.*, u.name AS user_name
         FROM agenda_items a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.user_id = $1
         ORDER BY a.scheduled_at NULLS LAST, a.id DESC`,
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo agenda:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { error, value } = agendaSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { title, description, scheduled_at, status } = value;

  try {
    const result = await pool.query(
      `INSERT INTO agenda_items (title, description, scheduled_at, status, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || null, scheduled_at || null, status, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando agenda:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { error, value } = agendaSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { id } = req.params;
  const { title, description, scheduled_at, status } = value;

  try {
    const existing = await pool.query('SELECT * FROM agenda_items WHERE id = $1', [id]);
    const item = existing.rows[0];
    if (!item) return res.status(404).json({ message: 'No encontrado' });

    const canEdit = canManageAll(req.user.role) || item.user_id === req.user.id;
    if (!canEdit) return res.status(403).json({ message: 'No tienes permisos' });

    const result = await pool.query(
      `UPDATE agenda_items
       SET title = $1, description = $2, scheduled_at = $3, status = $4
       WHERE id = $5
       RETURNING *`,
      [title, description || null, scheduled_at || null, status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando agenda:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM agenda_items WHERE id = $1', [id]);
    const item = existing.rows[0];
    if (!item) return res.status(404).json({ message: 'No encontrado' });

    const canDelete = canManageAll(req.user.role) || item.user_id === req.user.id;
    if (!canDelete) return res.status(403).json({ message: 'No tienes permisos' });

    await pool.query('DELETE FROM agenda_items WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando agenda:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
