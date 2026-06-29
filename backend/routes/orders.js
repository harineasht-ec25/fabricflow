const router = require('express').Router();
const { pool } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const ADMIN_MANAGER = ['admin', 'production_manager'];

// Get all orders with filters
router.get('/', auth, async (req, res) => {
  try {
    const { stage, status, priority, customer, search, from, to, page = 1, limit = 50 } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (stage) { conditions.push(`current_stage=$${i++}`); params.push(stage); }
    if (status) { conditions.push(`status=$${i++}`); params.push(status); }
    if (priority) { conditions.push(`priority=$${i++}`); params.push(priority); }
    if (customer) { conditions.push(`customer_name ILIKE $${i++}`); params.push(`%${customer}%`); }
    if (from) { conditions.push(`production_date>=$${i++}`); params.push(from); }
    if (to) { conditions.push(`production_date<=$${i++}`); params.push(to); }
    if (search) {
      conditions.push(`(sku_id ILIKE $${i} OR order_number ILIKE $${i} OR customer_name ILIKE $${i} OR style_name ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT o.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM stage_entries WHERE order_id=o.id AND is_completed=true) as stages_done
       FROM orders o
       LEFT JOIN users u ON o.created_by=u.id
       ${where} ORDER BY o.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM orders ${where}`, params);
    res.json({ orders: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order with full stage history
router.get('/:skuId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE sku_id=$1 OR order_number=$1', [req.params.skuId]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];

    const { rows: stages } = await pool.query(
      `SELECT se.*, u.name as operator_name
       FROM stage_entries se
       LEFT JOIN users u ON se.operator_id=u.id
       WHERE se.order_id=$1 ORDER BY se.created_at ASC`,
      [order.id]
    );

    // Calculate quantities per stage
    const stageMap = {};
    stages.forEach(s => { stageMap[s.stage] = s; });

    const stageOrder = ['cutting','stitching','button_attachment','checking_trimming','ironing','finished_stock'];
    let totalRejected = stages.reduce((sum, s) => sum + (s.quantity_rejected || 0), 0);
    let finished = stageMap['finished_stock']?.quantity_completed || 0;
    let completedStages = stages.filter(s => s.is_completed).length;
    let pct = Math.round((completedStages / 6) * 100);

    res.json({
      ...order,
      stages,
      stageMap,
      total_rejected: totalRejected,
      finished_quantity: finished,
      completion_pct: pct,
      remaining: order.quantity - finished - totalRejected
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order
router.post('/', auth, requireRole(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { order_number, sku_id, style_name, product_name, color, size, customer_name,
            quantity, production_date, due_date, priority, remarks } = req.body;

    if (!sku_id || sku_id.trim().length === 0)
      return res.status(400).json({ error: 'SKU ID is required' });
    if (sku_id.trim().length > 50)
      return res.status(400).json({ error: 'SKU ID must be 50 characters or less' });

    const { rows } = await pool.query(
      `INSERT INTO orders (order_number,sku_id,style_name,product_name,color,size,customer_name,
        quantity,production_date,due_date,priority,remarks,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [order_number, sku_id, style_name, product_name, color, size, customer_name,
       quantity, production_date, due_date, priority || 'medium', remarks, req.user.id]
    );

    // Auto-create notification
    await pool.query(
      `INSERT INTO notifications (type,title,message,related_sku,related_order,severity)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['new_order', `New order created: ${sku_id}`, `${quantity} pcs for ${customer_name}`, sku_id, order_number, 'info']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update order
router.put('/:id', auth, requireRole(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { style_name, product_name, color, size, customer_name, quantity,
            production_date, due_date, priority, remarks, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE orders SET style_name=$1,product_name=$2,color=$3,size=$4,customer_name=$5,
        quantity=$6,production_date=$7,due_date=$8,priority=$9,remarks=$10,status=$11,updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [style_name, product_name, color, size, customer_name, quantity,
       production_date, due_date, priority, remarks, status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dashboard summary
router.get('/meta/dashboard', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totals, todayProd, stageWip, delayed] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status='in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status='completed') as completed,
        SUM(quantity) FILTER (WHERE status='completed') as total_completed_qty
       FROM orders`),
      pool.query(`SELECT SUM(quantity_completed) as today_production FROM stage_entries WHERE DATE(created_at)=$1`, [today]),
      pool.query(`SELECT current_stage, COUNT(*) as count, SUM(o.quantity) as qty
                  FROM orders o WHERE status='in_progress'
                  GROUP BY current_stage`),
      pool.query(`SELECT COUNT(*) as delayed FROM orders WHERE due_date < NOW() AND status='in_progress'`)
    ]);

    const wipByStage = {};
    stageWip.rows.forEach(r => { wipByStage[r.current_stage] = { count: r.count, qty: r.qty }; });

    res.json({
      ...totals.rows[0],
      today_production: todayProd.rows[0].today_production || 0,
      delayed_orders: delayed.rows[0].delayed,
      wip_by_stage: wipByStage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
