const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');

const canManageAll = (role) => ['admin', 'manager'].includes(role);

// 1. ACTUALIZAMOS ESQUEMA: Agregamos action_type
const noteSchema = Joi.object({
  texto: Joi.string().min(1).max(2000).required(),
  fecha_visita: Joi.date().iso().allow(null),
  proximos_pasos: Joi.string().max(500).allow('', null),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  action_type: Joi.string().valid('CALL', 'VISIT', 'NOTE').default('NOTE') // Nuevo campo
});

const canOperateOnCustomer = async (customerId, user) => {
  const customerRes = await pool.query(
    'SELECT id, created_by, assigned_to FROM customers WHERE id = $1',
    [customerId]
  );
  const customer = customerRes.rows[0];
  if (!customer) return { allowed: false, notFound: true };
  if (canManageAll(user.role)) return { allowed: true, customer };
  if (customer.created_by === user.id || customer.assigned_to === user.id) {
    return { allowed: true, customer };
  }
  return { allowed: false, customer };
};

router.get('/:customerId/notes', authMiddleware, async (req, res) => {
  const customerId = Number.parseInt(req.params.customerId, 10);
  if (Number.isNaN(customerId)) {
    return res.status(400).json({ message: 'customerId inválido' });
  }
  try {
    const { allowed, notFound } = await canOperateOnCustomer(customerId, req.user);
    if (notFound) return res.status(404).json({ message: 'Cliente no encontrado' });
    if (!allowed) return res.status(403).json({ message: 'No tienes permisos' });

    const result = await pool.query(
      `SELECT n.*, u.name AS user_name
       FROM customer_notes n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.customer_id = $1
       ORDER BY n.created_at DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo notas:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// 2. ACTUALIZAMOS EL INSERT
router.post('/:customerId/notes', authMiddleware, async (req, res) => {
  const { error, value } = noteSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const customerId = Number.parseInt(req.params.customerId, 10);
  if (Number.isNaN(customerId)) return res.status(400).json({ message: 'customerId inválido' });
  try {
    const { allowed, notFound } = await canOperateOnCustomer(customerId, req.user);
    if (notFound) return res.status(404).json({ message: 'Cliente no encontrado' });
    if (!allowed) return res.status(403).json({ message: 'No tienes permisos' });

    const result = await pool.query(
      `INSERT INTO customer_notes (customer_id, user_id, texto, fecha_visita, proximos_pasos, latitude, longitude, action_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
       RETURNING *`,
      [
        customerId,
        req.user.id,
        value.texto,
        value.fecha_visita ? new Date(value.fecha_visita) : null,
        value.proximos_pasos || null,
        value.latitude || null,
        value.longitude || null,
        value.action_type || 'NOTE' // Guardamos el tipo
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando nota:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.delete('/:customerId/notes/:noteId', authMiddleware, async (req, res) => {
  const customerId = Number.parseInt(req.params.customerId, 10);
  const noteId = Number.parseInt(req.params.noteId, 10);
  if (Number.isNaN(customerId) || Number.isNaN(noteId)) {
    return res.status(400).json({ message: 'IDs inválidos' });
  }
  try {
    const { allowed, notFound } = await canOperateOnCustomer(customerId, req.user);
    if (notFound) return res.status(404).json({ message: 'Cliente no encontrado' });
    if (!allowed) return res.status(403).json({ message: 'No tienes permisos' });

    const noteRes = await pool.query(
      'SELECT id, user_id FROM customer_notes WHERE id = $1 AND customer_id = $2',
      [noteId, customerId]
    );
    const note = noteRes.rows[0];
    if (!note) return res.status(404).json({ message: 'Nota no encontrada' });

    if (!canManageAll(req.user.role) && note.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Solo puedes eliminar tus notas' });
    }

    await pool.query('DELETE FROM customer_notes WHERE id = $1', [noteId]);
    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando nota:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
