import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  initDb,
  User,
  Customer,
  Booking,
  Payment,
  Invoice,
  Setting,
  recalculateBookingBalance,
  hashPassword,
  verifyPassword,
  Op
} from './db.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve Production Built Client Assets
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// In-memory active tokens map: token -> { id, username, name, role }
const activeTokens = new Map();

// Initialize Sequelize DB
initDb().catch(err => console.error('Failed to init Sequelize DB:', err));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ORM: 'Sequelize', timestamp: new Date().toISOString() });
});

// Root / SPA Fallback Endpoint
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.redirect('http://localhost:5173');
  }
});



// --- AUTHENTICATION ENDPOINTS ---

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ where: { username: username.trim().toLowerCase() } });
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = `token-${uuidv4()}`;
    const userData = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    activeTokens.set(token, userData);

    res.json({
      token,
      user: userData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;

    if (!token || !activeTokens.has(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json(activeTokens.get(token));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ where: { username: username.trim().toLowerCase() } });
    
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    await user.update({
      password_hash: hashPassword(newPassword),
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'name', 'username', 'role', 'created_at'] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/users', async (req, res) => {
  try {
    const { name, username, password, role = 'staff' } = req.body;
    const existing = await User.findOne({ where: { username: username.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = await User.create({
      id: uuidv4(),
      name,
      username: username.trim().toLowerCase(),
      password_hash: hashPassword(password),
      role,
    });

    res.json({ id: newUser.id, name: newUser.name, username: newUser.username, role: newUser.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS ---
app.get('/api/settings', async (req, res) => {
  try {
    const setting = await Setting.findOne();
    res.json(setting || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { studio_name, currency_symbol, phone, email, address, logo_url, gstin } = req.body;
    const setting = await Setting.create({
      id: uuidv4(),
      studio_name: studio_name || 'Studio ERP',
      currency_symbol: currency_symbol || '₹',
      phone: phone || null,
      email: email || null,
      address: address || null,
      logo_url: logo_url || null,
      gstin: gstin || null,
    });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await Setting.findByPk(id);
    if (!setting) return res.status(404).json({ error: 'Settings row not found' });

    await setting.update(req.body);
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMERS ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [['created_at', 'DESC']],
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Booking, as: 'bookings', order: [['event_date', 'DESC']] }],
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    const { name, mobile, email, address, notes } = req.body;
    const cleanName = name ? name.trim() : '';
    const cleanMobile = mobile && mobile.trim() ? mobile.trim() : null;

    if (!cleanName || /^[0-9\s+()-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Customer Name cannot be a phone number or numeric digits. Please enter a valid name.' });
    }

    if (cleanMobile && /[a-zA-Z]/.test(cleanMobile)) {
      return res.status(400).json({ error: 'Mobile number cannot contain alphabetic letters. Please enter valid phone digits.' });
    }

    if (cleanMobile) {
      const existing = await Customer.findOne({ where: { mobile: cleanMobile } });
      if (existing) {
        return res.status(400).json({ error: `Customer with mobile number '${cleanMobile}' already exists (${existing.name}).` });
      }
    }

    const customer = await Customer.create({
      id,
      name: cleanName,
      mobile: cleanMobile,
      email: email || null,
      address: address || null,
      notes: notes || null,
    });
    res.json(customer);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: `A customer with this mobile number already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { name, mobile } = req.body;
    const cleanName = name !== undefined ? name.trim() : customer.name;
    const cleanMobile = mobile !== undefined ? (mobile && mobile.trim() ? mobile.trim() : null) : customer.mobile;

    if (cleanName && /^[0-9\s+()-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Customer Name cannot be a phone number or numeric digits.' });
    }

    if (cleanMobile && /[a-zA-Z]/.test(cleanMobile)) {
      return res.status(400).json({ error: 'Mobile number cannot contain alphabetic letters.' });
    }

    if (cleanMobile && cleanMobile !== customer.mobile) {
      const existing = await Customer.findOne({
        where: {
          mobile: cleanMobile,
          id: { [Op.ne]: id },
        },
      });
      if (existing) {
        return res.status(400).json({ error: `Customer with mobile number '${cleanMobile}' already exists (${existing.name}).` });
      }
    }

    await customer.update({
      ...req.body,
      mobile: cleanMobile,
    });
    res.json(customer);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: `A customer with this mobile number already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.destroy({ where: { id } });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BOOKINGS ---
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'mobile', 'email'] }],
      order: [['event_date', 'DESC']],
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Payment, as: 'payments', order: [['payment_date', 'DESC']] },
        { model: Invoice, as: 'invoices', order: [['created_at', 'DESC']] },
      ],
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    const {
      customer_id, title, event_type, event_date, start_time, end_time, venue,
      total_amount = 0, paid_amount = 0, status = 'enquiry', project_status = 'confirmed',
      team_size = 1, package_name, notes
    } = req.body;

    const balance = total_amount - paid_amount;

    const booking = await Booking.create({
      id,
      customer_id,
      title: title || null,
      event_type: event_type || 'Other',
      event_date: event_date || null,
      start_time: start_time || null,
      end_time: end_time || null,
      venue: venue || null,
      total_amount,
      paid_amount,
      balance,
      status,
      project_status,
      team_size,
      package_name: package_name || null,
      notes: notes || null,
    });

    await recalculateBookingBalance(id);
    const updated = await Booking.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const total_amount = req.body.total_amount !== undefined ? req.body.total_amount : booking.total_amount;
    const paid_amount = req.body.paid_amount !== undefined ? req.body.paid_amount : booking.paid_amount;
    const balance = total_amount - paid_amount;

    await booking.update({
      ...req.body,
      total_amount,
      paid_amount,
      balance,
    });

    await recalculateBookingBalance(id);
    const updated = await Booking.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Booking.destroy({ where: { id } });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PAYMENTS ---
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        attributes: ['id', 'title', 'event_type', 'event_date', 'total_amount', 'balance'],
      }],
      order: [['payment_date', 'DESC']],
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    const { booking_id, amount = 0, payment_date, payment_mode = 'Cash', reference, notes } = req.body;

    const payment = await Payment.create({
      id,
      booking_id,
      amount,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_mode,
      reference: reference || null,
      notes: notes || null,
    });

    await recalculateBookingBalance(booking_id);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);
    if (payment) {
      const bookingId = payment.booking_id;
      await payment.destroy();
      await recalculateBookingBalance(bookingId);
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVOICES ---
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'mobile'] }],
      }],
      order: [['created_at', 'DESC']],
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{
        model: Booking,
        as: 'booking',
        include: [{ model: Customer, as: 'customer' }],
      }],
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    const { booking_id, invoice_number, issue_date, due_date, subtotal = 0, tax = 0, total = 0, notes } = req.body;

    const invoice = await Invoice.create({
      id,
      booking_id,
      invoice_number,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      due_date: due_date || null,
      subtotal,
      tax,
      total,
      notes: notes || null,
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Invoice.destroy({ where: { id } });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GLOBAL SEARCH ---
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.json({ customers: [], bookings: [], payments: [], invoices: [] });
    }

    const searchTerm = `%${q}%`;
    const customers = await Customer.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: searchTerm } },
          { mobile: { [Op.like]: searchTerm } },
          { email: { [Op.like]: searchTerm } },
        ],
      },
      limit: 5,
    });

    const bookings = await Booking.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: searchTerm } },
          { event_type: { [Op.like]: searchTerm } },
          { venue: { [Op.like]: searchTerm } },
        ],
      },
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'mobile'] }],
      limit: 5,
    });

    const payments = await Payment.findAll({
      where: {
        [Op.or]: [
          { reference: { [Op.like]: searchTerm } },
          { notes: { [Op.like]: searchTerm } },
        ],
      },
      limit: 5,
    });

    const invoices = await Invoice.findAll({
      where: {
        invoice_number: { [Op.like]: searchTerm },
      },
      limit: 5,
    });

    res.json({ customers, bookings, payments, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Node.js Express + Sequelize ORM server running at http://localhost:${PORT}`);
});
