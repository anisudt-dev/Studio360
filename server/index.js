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
    res.json({
      name: 'Aishwarya Videos & Photos - Studio ERP API',
      status: 'online',
      health: '/api/health',
      timestamp: new Date().toISOString()
    });
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

// --- EMAIL DISPATCH HELPERS & ENDPOINTS ---

import nodemailer from 'nodemailer';

async function getEmailTransporter() {
  const setting = await Setting.findOne();
  const host = setting?.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(setting?.smtp_port || process.env.SMTP_PORT || 587);
  const user = setting?.smtp_user || process.env.SMTP_USER;
  const pass = setting?.smtp_pass || process.env.SMTP_PASS;
  const senderName = setting?.sender_name || setting?.studio_name || 'Aishwarya Videos & Photos';

  if (!user || !pass) {
    throw new Error('SMTP user and password are not configured. Please enter your email credentials in Studio Settings.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { transporter, from: `"${senderName}" <${user}>`, studioName: senderName };
}

// 1. Test Email Endpoint
app.post('/api/email/test', async (req, res) => {
  try {
    const { transporter, from } = await getEmailTransporter();
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Target email address is required' });

    await transporter.sendMail({
      from,
      to,
      subject: 'Test Email from Studio ERP',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #701a75;">Email Connection Successful! 🎉</h2>
          <p>Your studio email configuration is active and working properly.</p>
        </div>
      `,
    });

    res.json({ success: true, message: `Test email sent successfully to ${to}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Send Invoice Email Endpoint
app.post('/api/email/send-invoice', async (req, res) => {
  try {
    const { invoiceId, targetEmail } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'Invoice ID is required' });

    const invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: Booking, as: 'booking', include: [{ model: Customer, as: 'customer' }] }],
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const customer = invoice.booking?.customer;
    const recipient = targetEmail || customer?.email;
    if (!recipient) return res.status(400).json({ error: 'Customer email address is required' });

    const { transporter, from, studioName } = await getEmailTransporter();
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);

    await transporter.sendMail({
      from,
      to: recipient,
      subject: `Invoice ${invoice.invoice_number} from ${studioName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #1e293b;">
          <div style="text-align: center; border-bottom: 2px solid #701a75; padding-bottom: 16px; margin-bottom: 20px;">
            <h1 style="color: #701a75; margin: 0; font-size: 24px;">${studioName}</h1>
            <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: bold;">PHOTOGRAPHY & VIDEOGRAPHY</p>
          </div>

          <h2 style="font-size: 18px; margin-bottom: 4px; color: #0f172a;">INVOICE ${invoice.invoice_number}</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0;">Date: ${invoice.issue_date || ''}</p>

          <div style="background: #f8fafc; padding: 12px; border-radius: 12px; margin: 16px 0; font-size: 13px;">
            <p style="margin: 0;"><strong>Billed To:</strong> ${customer?.name || ''}</p>
            ${customer?.mobile ? `<p style="margin: 4px 0 0 0; color: #475569;">📱 ${customer.mobile}</p>` : ''}
            ${invoice.booking?.event_type ? `<p style="margin: 4px 0 0 0; color: #475569;">Shoot: ${invoice.booking.event_type} (${invoice.booking.event_date || ''})</p>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px 12px;">Description</th>
                <th style="padding: 8px 12px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 12px;">${it.description}</td>
                  <td style="padding: 10px 12px; text-align: right; font-weight: bold;">₹${(it.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; font-size: 13px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Amount:</span>
              <strong>₹${(invoice.total || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #059669;">
              <span>Amount Paid:</span>
              <strong>₹${(invoice.paid_amount || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #dc2626; font-size: 15px; margin-top: 6px;">
              <span>Balance Due:</span>
              <strong>₹${(invoice.balance_due || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div style="margin-top: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">Thank you for choosing ${studioName}!</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: `Invoice email sent successfully to ${recipient}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Send Payment Receipt Email Endpoint
app.post('/api/email/send-receipt', async (req, res) => {
  try {
    const { paymentId, targetEmail } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Booking, as: 'booking', include: [{ model: Customer, as: 'customer' }] }],
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const booking = payment.booking;
    const customer = booking?.customer;
    const recipient = targetEmail || customer?.email;
    if (!recipient) return res.status(400).json({ error: 'Customer email address is required' });

    const { transporter, from, studioName } = await getEmailTransporter();
    const receiptNo = `REC-${payment.id.slice(0, 8).toUpperCase()}`;

    await transporter.sendMail({
      from,
      to: recipient,
      subject: `Payment Receipt ${receiptNo} - ${studioName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #1e293b;">
          <div style="text-align: center; border-bottom: 2px solid #701a75; padding-bottom: 16px; margin-bottom: 20px;">
            <h1 style="color: #701a75; margin: 0; font-size: 24px;">${studioName}</h1>
            <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: bold;">PAYMENT RECEIPT VOUCHER</p>
          </div>

          <p style="font-size: 13px;">Dear <strong>${customer?.name || 'Customer'}</strong>,</p>
          <p style="font-size: 13px; color: #475569;">Thank you for your payment. Here is your payment receipt confirmation:</p>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; margin: 16px 0; text-align: center;">
            <p style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: bold; margin: 0;">Amount Received</p>
            <p style="font-size: 28px; font-weight: 900; color: #047857; margin: 4px 0 0 0;">₹${payment.amount.toLocaleString('en-IN')}</p>
          </div>

          <div style="font-size: 13px; line-height: 1.8; background: #f8fafc; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;">
            <div><strong>Receipt #:</strong> ${receiptNo}</div>
            <div><strong>Date:</strong> ${payment.payment_date}</div>
            <div><strong>Payment Mode:</strong> ${payment.payment_mode}</div>
            ${payment.reference ? `<div><strong>Ref #:</strong> ${payment.reference}</div>` : ''}
            ${booking ? `<div><strong>Remaining Balance:</strong> ₹${booking.balance.toLocaleString('en-IN')}</div>` : ''}
          </div>

          <div style="margin-top: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">Thank you for choosing ${studioName}!</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: `Payment receipt email sent successfully to ${recipient}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Node.js Express + Sequelize ORM server running at http://localhost:${PORT}`);
});

