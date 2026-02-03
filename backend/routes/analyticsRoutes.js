const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// RUTA: Obtener estadísticas avanzadas
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { range } = req.query; // Puede ser 'year' o 'month'
        
        // Configuración por defecto (Año actual)
        let timeFilter = "s.sale_date >= date_trunc('year', CURRENT_DATE)"; 
        let groupBy = "to_char(s.sale_date, 'YYYY-MM')"; // Agrupar por Mes (2026-01, 2026-02)
        let activityTimeFilter = "created_at >= date_trunc('year', CURRENT_DATE)";

        // Si el usuario pide "Mes Actual"
        if (range === 'month') {
            timeFilter = "s.sale_date >= date_trunc('month', CURRENT_DATE)";
            groupBy = "to_char(s.sale_date, 'DD')"; // Agrupar por Día (01, 02, 03...)
            activityTimeFilter = "created_at >= date_trunc('month', CURRENT_DATE)";
        }

        // 1. GRÁFICO DE INGRESOS (Curva financiera)
        // Sumamos todas las ventas registradas en sales_records
        const salesQuery = `
            SELECT ${groupBy} as label, SUM(amount) as total_revenue, COUNT(*) as sales_count
            FROM sales_records s
            WHERE ${timeFilter}
            GROUP BY label 
            ORDER BY label ASC
        `;
        
        // 2. DISTRIBUCIÓN DE ESFUERZO (Torta)
        // Comparamos cuántas llamadas vs visitas vs ventas se hicieron
        const activityQuery = `
            SELECT action_type, COUNT(*) as count
            FROM customer_notes
            WHERE ${activityTimeFilter}
            GROUP BY action_type
        `;

        // 3. RANKING DE VENDEDORES (Tabla de líderes)
        // Quien vendió más plata este año
        const rankingQuery = `
            SELECT u.name, COUNT(s.id) as total_sales, COALESCE(SUM(s.amount), 0) as total_revenue
            FROM users u
            LEFT JOIN sales_records s ON u.id = s.user_id AND s.sale_date >= date_trunc('year', CURRENT_DATE)
            GROUP BY u.id
            ORDER BY total_revenue DESC
            LIMIT 5
        `;

        // Ejecutamos las 3 consultas a la vez (en paralelo) para que sea rápido
        const [sales, activity, ranking] = await Promise.all([
            pool.query(salesQuery),
            pool.query(activityQuery),
            pool.query(rankingQuery)
        ]);

        // Enviamos todo al frontend
        res.json({
            salesChart: sales.rows,
            activityDistribution: activity.rows,
            topEmployees: ranking.rows
        });

    } catch (err) {
        console.error("Error en Analytics:", err);
        res.status(500).json({ message: 'Error calculando analíticas' });
    }
});

module.exports = router;