const router = require('express').Router();
const { pool } = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// ─── INVENTORY ────────────────────────────────────────────────────────────────

router.get('/inventory', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM inventory ORDER BY category,item_name');
  res.json(rows);
});

router.post('/inventory', auth, requireRole('admin','store_manager'), async (req, res) => {
  try {
    const { item_name, category, quantity, unit, min_stock } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO inventory (item_name,category,quantity,unit,min_stock) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [item_name, category, quantity, unit, min_stock]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/inventory/:id/movement', auth, requireRole('admin','store_manager','production_manager'), async (req, res) => {
  try {
    const { movement_type, quantity, reference, notes } = req.body;
    const id = req.params.id;
    const multiplier = movement_type === 'in' ? 1 : -1;

    await pool.query('UPDATE inventory SET quantity=quantity+$1, updated_at=NOW() WHERE id=$2', [multiplier * quantity, id]);
    const { rows } = await pool.query(
      'INSERT INTO inventory_movements (inventory_id,movement_type,quantity,reference,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, movement_type, quantity, reference, notes, req.user.id]
    );

    // Low stock alert
    const { rows: inv } = await pool.query('SELECT * FROM inventory WHERE id=$1', [id]);
    if (inv[0] && inv[0].quantity <= inv[0].min_stock) {
      await pool.query(
        `INSERT INTO notifications (type,title,message,severity) VALUES ($1,$2,$3,$4)`,
        ['low_stock', `Low stock: ${inv[0].item_name}`, `Only ${inv[0].quantity} ${inv[0].unit} remaining`, 'warning']
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/inventory/movements', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT im.*, i.item_name, i.unit, u.name as created_by_name
     FROM inventory_movements im
     JOIN inventory i ON im.inventory_id=i.id
     LEFT JOIN users u ON im.created_by=u.id
     ORDER BY im.created_at DESC LIMIT 100`
  );
  res.json(rows);
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

router.get('/notifications', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
  res.json(rows);
});

router.put('/notifications/:id/read', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

router.put('/notifications/read-all', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true');
  res.json({ success: true });
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

router.get('/reports/daily', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const target = date || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `SELECT stage,
        SUM(quantity_received) as received,
        SUM(quantity_completed) as completed,
        SUM(quantity_rejected) as rejected,
        COUNT(DISTINCT sku_id) as skus_processed,
        u.name as operator_name
       FROM stage_entries se
       LEFT JOIN users u ON se.operator_id=u.id
       WHERE DATE(se.created_at)=$1
       GROUP BY stage, u.name ORDER BY stage`,
      [target]
    );
    res.json({ date: target, entries: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/monthly', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    const { rows } = await pool.query(
      `SELECT DATE(se.created_at) as date,
        SUM(quantity_completed) as completed,
        SUM(quantity_rejected) as rejected
       FROM stage_entries se
       WHERE EXTRACT(YEAR FROM se.created_at)=$1 AND EXTRACT(MONTH FROM se.created_at)=$2
       GROUP BY DATE(se.created_at) ORDER BY date`,
      [y, m]
    );
    res.json({ year: y, month: m, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/sku', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.sku_id, o.order_number, o.style_name, o.customer_name, o.quantity,
        o.current_stage, o.status, o.due_date, o.priority,
        SUM(se.quantity_rejected) as total_rejected,
        COUNT(se.id) FILTER (WHERE se.is_completed) as stages_completed
       FROM orders o
       LEFT JOIN stage_entries se ON o.id=se.order_id
       GROUP BY o.id ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/customer', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT customer_name,
        COUNT(*) as total_orders,
        SUM(quantity) as total_quantity,
        COUNT(*) FILTER (WHERE status='completed') as completed,
        COUNT(*) FILTER (WHERE status='in_progress') as in_progress,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status='in_progress') as delayed
       FROM orders GROUP BY customer_name ORDER BY total_orders DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export to Excel
router.get('/reports/export/excel', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FabricFlow';

    if (type === 'orders' || !type) {
      const sheet = workbook.addWorksheet('Orders');
      sheet.columns = [
        { header: 'Order #', key: 'order_number', width: 15 },
        { header: 'SKU ID', key: 'sku_id', width: 12 },
        { header: 'Style', key: 'style_name', width: 18 },
        { header: 'Product', key: 'product_name', width: 18 },
        { header: 'Color', key: 'color', width: 12 },
        { header: 'Size', key: 'size', width: 8 },
        { header: 'Customer', key: 'customer_name', width: 20 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Stage', key: 'current_stage', width: 18 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Due Date', key: 'due_date', width: 14 },
        { header: 'Priority', key: 'priority', width: 10 },
      ];
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A56DB' } };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      rows.forEach(r => sheet.addRow(r));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="fabricflow-report-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
