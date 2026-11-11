const express = require('express');
const path = require('path');
const { randomUUID: uuidv4 } = require('node:crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== SERVICES API ====================
app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY category, name').all();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WORK ORDERS API ====================

// Get all work orders with vehicle info
app.get('/api/work-orders', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
    `;
    const conditions = [];
    const params = [];

    if (status && status !== 'semua') {
      conditions.push('wo.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(v.customer_name LIKE ? OR v.plate_number LIKE ? OR v.motorcycle_type LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY wo.created_at DESC';

    const orders = db.prepare(query).all(...params);
    
    // Parse service_ids and attach service details
    const getService = db.prepare('SELECT * FROM services WHERE id = ?');
    const enrichedOrders = orders.map(order => {
      const serviceIds = JSON.parse(order.service_ids || '[]');
      const services = serviceIds.map(id => getService.get(id)).filter(Boolean);
      return { ...order, services };
    });

    res.json(enrichedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single work order
app.get('/api/work-orders/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      WHERE wo.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const serviceIds = JSON.parse(order.service_ids || '[]');
    const getService = db.prepare('SELECT * FROM services WHERE id = ?');
    const services = serviceIds.map(id => getService.get(id)).filter(Boolean);
    
    res.json({ ...order, services });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new work order (register vehicle)
app.post('/api/work-orders', (req, res) => {
  try {
    const { 
      customer_name, customer_phone, motorcycle_brand, motorcycle_type,
      plate_number, year, color, service_ids, complaint, mechanic_name 
    } = req.body;

    if (!customer_name || !motorcycle_brand || !motorcycle_type || !service_ids || service_ids.length === 0) {
      return res.status(400).json({ error: 'Data wajib tidak lengkap' });
    }

    const vehicleId = uuidv4();
    const workOrderId = uuidv4();

    // Calculate total cost from selected services
    const getService = db.prepare('SELECT * FROM services WHERE id = ?');
    let totalCost = 0;
    for (const sid of service_ids) {
      const svc = getService.get(sid);
      if (svc) totalCost += svc.price;
    }

    // Insert vehicle
    db.prepare(`
      INSERT INTO vehicles (id, customer_name, customer_phone, motorcycle_brand, motorcycle_type, plate_number, year, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(vehicleId, customer_name, customer_phone || '', motorcycle_brand, motorcycle_type, plate_number || '', year || '', color || '');

    // Insert work order
    db.prepare(`
      INSERT INTO work_orders (id, vehicle_id, service_ids, complaint, status, mechanic_name, total_cost)
      VALUES (?, ?, ?, ?, 'antrian', ?, ?)
    `).run(workOrderId, vehicleId, JSON.stringify(service_ids), complaint || '', mechanic_name || '', totalCost);

    const order = db.prepare(`
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      WHERE wo.id = ?
    `).get(workOrderId);

    const services = service_ids.map(id => getService.get(id)).filter(Boolean);

    res.status(201).json({ ...order, services });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update work order status
app.patch('/api/work-orders/:id/status', (req, res) => {
  try {
    const { status, mechanic_name, notes } = req.body;
    const validStatuses = ['antrian', 'dikerjakan', 'menunggu_part', 'selesai', 'diambil'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (mechanic_name !== undefined) {
      updates.push('mechanic_name = ?');
      params.push(mechanic_name);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (status === 'selesai' || status === 'diambil') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }

    params.push(req.params.id);

    db.prepare(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const order = db.prepare(`
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      WHERE wo.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const serviceIds = JSON.parse(order.service_ids || '[]');
    const getService = db.prepare('SELECT * FROM services WHERE id = ?');
    const services = serviceIds.map(id => getService.get(id)).filter(Boolean);

    res.json({ ...order, services });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update work order additional costs
app.patch('/api/work-orders/:id/costs', (req, res) => {
  try {
    const { additional_cost, additional_notes } = req.body;

    db.prepare(`
      UPDATE work_orders 
      SET additional_cost = ?, additional_notes = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(additional_cost || 0, additional_notes || '', req.params.id);

    const order = db.prepare(`
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      WHERE wo.id = ?
    `).get(req.params.id);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete work order
app.delete('/api/work-orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Delete receipt if exists
    db.prepare('DELETE FROM receipts WHERE work_order_id = ?').run(req.params.id);
    // Delete work order
    db.prepare('DELETE FROM work_orders WHERE id = ?').run(req.params.id);
    // Delete vehicle
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(order.vehicle_id);

    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENT & RECEIPT API ====================

// Process payment
app.post('/api/work-orders/:id/pay', (req, res) => {
  try {
    const { payment_method } = req.body;
    const workOrderId = req.params.id;

    const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(workOrderId);
    if (!order) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    if (order.is_paid) {
      return res.status(400).json({ error: 'Sudah dibayar' });
    }

    // Generate receipt number: NRG-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const receiptCount = db.prepare("SELECT COUNT(*) as count FROM receipts WHERE receipt_number LIKE ?").get(`NRG-${dateStr}%`);
    const seqNum = String(receiptCount.count + 1).padStart(4, '0');
    const receiptNumber = `NRG-${dateStr}-${seqNum}`;

    const receiptId = uuidv4();
    const totalAmount = order.total_cost + (order.additional_cost || 0);

    // Update work order
    db.prepare(`
      UPDATE work_orders 
      SET is_paid = 1, payment_method = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(payment_method || 'cash', workOrderId);

    // Create receipt
    db.prepare(`
      INSERT INTO receipts (id, work_order_id, receipt_number, total_amount, payment_method)
      VALUES (?, ?, ?, ?, ?)
    `).run(receiptId, workOrderId, receiptNumber, totalAmount, payment_method || 'cash');

    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    
    // Get full order details for receipt
    const fullOrder = db.prepare(`
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      WHERE wo.id = ?
    `).get(workOrderId);

    const serviceIds = JSON.parse(fullOrder.service_ids || '[]');
    const getService = db.prepare('SELECT * FROM services WHERE id = ?');
    const services = serviceIds.map(id => getService.get(id)).filter(Boolean);

    res.json({ receipt, order: { ...fullOrder, services } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get receipt for work order
app.get('/api/work-orders/:id/receipt', (req, res) => {
  try {
    const receipt = db.prepare('SELECT * FROM receipts WHERE work_order_id = ?').get(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const fullOrder = db.prepare(`
      SELECT wo.*, v.customer_name, v.customer_phone, v.motorcycle_brand, 
             v.motorcycle_type, v.plate_number, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      WHERE wo.id = ?
    `).get(req.params.id);

    const serviceIds = JSON.parse(fullOrder.service_ids || '[]');
    const getService = db.prepare('SELECT * FROM services WHERE id = ?');
    const services = serviceIds.map(id => getService.get(id)).filter(Boolean);

    res.json({ receipt, order: { ...fullOrder, services } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD STATS API ====================
app.get('/api/stats', (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM work_orders').get().count;
    const activeOrders = db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('antrian', 'dikerjakan', 'menunggu_part')").get().count;
    const completedToday = db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('selesai', 'diambil') AND date(completed_at) = date('now')").get().count;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM receipts').get().total;
    const todayRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM receipts WHERE date(created_at) = date('now')").get().total;
    const pendingPayment = db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'selesai' AND is_paid = 0").get().count;

    const statusCounts = {
      antrian: db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'antrian'").get().count,
      dikerjakan: db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'dikerjakan'").get().count,
      menunggu_part: db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'menunggu_part'").get().count,
      selesai: db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'selesai'").get().count,
      diambil: db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'diambil'").get().count,
    };

    res.json({
      totalOrders, activeOrders, completedToday,
      totalRevenue, todayRevenue, pendingPayment, statusCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║     🏍️  Ngawi Rusdi Garage - Server         ║
  ║     🌐  http://localhost:${PORT}               ║
  ║     📊  Sistem Manajemen Bengkel Motor       ║
  ╚══════════════════════════════════════════════╝
  `);
});
