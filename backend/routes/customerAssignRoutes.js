// backend/routes/customerAssignRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');
const nodemailer = require('nodemailer');
require('dotenv').config();

const assignSchema = Joi.object({
  user_id: Joi.number().integer().required(),
});

const canManageAll = (role) => ['admin', 'manager', 'jefe'].includes(role);

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const canSendMail =
  smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass;

const transporter = canSendMail ? nodemailer.createTransport(smtpConfig) : null;

async function sendAssignmentEmail({ customer, assignee, assignedBy }) {
  if (!transporter || !assignee?.email) return;
  const from = process.env.SMTP_FROM || smtpConfig.auth.user;
  const subject = `Nuevo cliente asignado: ${customer.name}`;
  const lines = [
    `Hola ${assignee.name || 'equipo'},`,
    ``,
    `Se te asigno un nuevo cliente: ${customer.name}`,
    customer.company ? `Empresa: ${customer.company}` : null,
    customer.localidad ? `Localidad: ${customer.localidad}` : null,
    customer.phone ? `Telefono: ${customer.phone}` : null,
    customer.email ? `Correo: ${customer.email}` : null,
    ``,
    assignedBy ? `Asignado por: ${assignedBy.name || assignedBy.email}` : null,
    ``,
    `Recuerda registrar notas y tareas asociadas.`,
  ].filter(Boolean);

  try {
    await transporter.sendMail({
      from,
      to: assignee.email,
      subject,
      text: lines.join('\n'),
    });
  } catch (err) {
    console.error('No se pudo enviar correo de asignacion:', err.message);
  }
}

router.patch('/:id/assign', authMiddleware, async (req, res) => {
  if (!canManageAll(req.user.role)) {
    return res.status(403).json({ message: 'No tienes permisos' });
  }

  const { error, value } = assignSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { id } = req.params;
  const { user_id } = value;

  try {
    const existing = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!userCheck.rows.length) {
      return res.status(400).json({ message: 'Usuario destino no existe' });
    }

    const result = await pool.query(
      `UPDATE customers SET assigned_to = $1 WHERE id = $2 RETURNING *`,
      [user_id, id]
    );

    const customer = result.rows[0];

    let assignee = null;
    try {
      const assigneeRes = await pool.query(
        'SELECT id, name, email, role FROM users WHERE id = $1',
        [user_id]
      );
      assignee = assigneeRes.rows[0];
    } catch (err) {
      // no romper por fallo secundario
    }

    sendAssignmentEmail({
      customer,
      assignee,
      assignedBy: req.user,
    });

    res.json(customer);
  } catch (err) {
    console.error('Error asignando cliente:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
