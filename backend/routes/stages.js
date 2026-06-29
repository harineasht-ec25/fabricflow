const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const STAGE_ROLES = {
  cutting: ['admin','production_manager','cutting_operator'],
  stitching: ['admin','production_manager','stitching_operator'],
  button_attachment: ['admin','production_manager','button_operator'],
  checking_trimming: ['admin','production_manager','checking_operator'],
  ironing: ['admin','production_manager','ironing_operator'],
  finished_stock: ['admin','production_manager','store_manager'],
};

const STAGE_ORDER = ['cutting','stitching','button_attachment','checking_trimming','ironing','finished_stock'];

// Submit a stage entry
router.post('/', auth, async (req, res) => {
  try {
    const { sku_id, stage, quantity_received, quantity_completed, quantity_rejected, remarks } = req.body;

    // Check role permission
    const allowed = STAGE_ROLES[stage] || [];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'You are not authorized for this stage' });
    }

    // Get order
    const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE sku_id=$1', [sku_id]);
    if (!orderRows.length) return res.status(404).json({ error: 'SKU not found' });
    const order = orderRows[0];

    // Check stage already exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM stage_entries WHERE order_id=$1 AND stage=$2',
      [order.id, stage]
    );

    let entry;
    if (existing.length) {
      const { rows } = await pool.query(
        `UPDATE stage_entries SET quantity_received=$1,quantity_completed=$2,quantity_rejected=$3,
          remarks=$4,operator_id=$5 WHERE id=$6 RETURNING *`,
        [quantity_received, quantity_completed, quantity_rejected, remarks, req.user.id, existing[0].id]
      );
      entry = rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO stage_entries (order_id,sku_id,stage,quantity_received,quantity_completed,quantity_rejected,remarks,operator_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [order.id, sku_id, stage, quantity_received, quantity_completed, quantity_rejected, remarks, req.user.id]
      );
      entry = rows[0];
    }

    // Auto-notify if rejection > 5%
    const rejPct = quantity_received > 0 ? (quantity_rejected / quantity_received) * 100 : 0;
    if (rejPct > 5) {
      await pool.query(
        `INSERT INTO notifications (type,title,message,related_sku,severity)
         VALUES ($1,$2,$3,$4,$5)`,
        ['high_rejection', `High rejection at ${stage}: ${sku_id}`,
         `Rejection rate ${rejPct.toFixed(1)}% exceeds 5% limit`, sku_id, 'error']
      );
    }

    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark stage as completed and advance order
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { rows: entryRows } = await pool.query('SELECT * FROM stage_entries WHERE id=$1', [req.params.id]);
    if (!entryRows.length) return res.status(404).json({ error: 'Entry not found' });
    const entry = entryRows[0];

    await pool.query(
      'UPDATE stage_entries SET is_completed=true, completed_at=NOW() WHERE id=$1',
      [req.params.id]
    );

    // Advance order to next stage
    const currentIdx = STAGE_ORDER.indexOf(entry.stage);
    const nextStage = STAGE_ORDER[currentIdx + 1];

    if (nextStage) {
      await pool.query('UPDATE orders SET current_stage=$1, updated_at=NOW() WHERE id=$2', [nextStage, entry.order_id]);
    } else {
      await pool.query("UPDATE orders SET current_stage='finished_stock', status='completed', updated_at=NOW() WHERE id=$1", [entry.order_id]);
    }

    // Get order info for notification
    const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id=$1', [entry.order_id]);
    const order = orderRows[0];

    await pool.query(
      `INSERT INTO notifications (type,title,message,related_sku,related_order,severity)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['stage_complete', `${entry.stage.replace(/_/g,' ')} completed: ${entry.sku_id}`,
       `${entry.quantity_completed} pcs moved to ${nextStage || 'finished stock'}`,
       entry.sku_id, order?.order_number, 'success']
    );

    // Check if order is delayed
    if (order && new Date(order.due_date) < new Date() && order.status === 'in_progress') {
      await pool.query(
        `INSERT INTO notifications (type,title,message,related_sku,related_order,severity)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        ['delayed', `Order delayed: ${order.order_number}`, `Due date passed, currently at ${nextStage}`,
         entry.sku_id, order.order_number, 'warning']
      );
    }

    res.json({ success: true, next_stage: nextStage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get entries by stage (for operators)
router.get('/stage/:stage', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const dateFilter = date ? `AND DATE(se.created_at)='${date}'` : '';
    const { rows } = await pool.query(
      `SELECT se.*, u.name as operator_name, o.customer_name, o.style_name, o.due_date, o.priority
       FROM stage_entries se
       LEFT JOIN users u ON se.operator_id=u.id
       LEFT JOIN orders o ON se.order_id=o.id
       WHERE se.stage=$1 ${dateFilter}
       ORDER BY se.created_at DESC LIMIT 100`,
      [req.params.stage]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
