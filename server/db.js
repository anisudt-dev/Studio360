import { Sequelize, DataTypes, Op } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crypto helpers for secure password hashing
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Flexible connection setup: default to SQLite file, but configurable for PostgreSQL/MySQL/etc.
const dialect = process.env.DB_DIALECT || 'sqlite';
const storage = process.env.DB_STORAGE || path.join(__dirname, 'database.sqlite');

export const sequelize = new Sequelize({
  dialect: dialect,
  storage: dialect === 'sqlite' ? storage : undefined,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: false, // Set to console.log for SQL query debugging
});

// --- MODELS ---

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'admin',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'users',
  timestamps: false,
});

export const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mobile: {
    type: DataTypes.STRING,
    unique: true,
  },
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'customers',
  timestamps: false,
});

export const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: DataTypes.STRING,
  event_type: {
    type: DataTypes.STRING,
    defaultValue: 'Other',
  },
  event_date: DataTypes.STRING,
  start_time: DataTypes.STRING,
  end_time: DataTypes.STRING,
  venue: DataTypes.TEXT,
  total_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  paid_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'enquiry',
  },
  project_status: {
    type: DataTypes.STRING,
    defaultValue: 'confirmed',
  },
  team_size: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  package_name: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'bookings',
  timestamps: false,
});

export const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  booking_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  payment_date: {
    type: DataTypes.STRING,
    defaultValue: () => new Date().toISOString().split('T')[0],
  },
  payment_mode: {
    type: DataTypes.STRING,
    defaultValue: 'Cash',
  },
  reference: DataTypes.STRING,
  notes: DataTypes.TEXT,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'payments',
  timestamps: false,
});

export const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  booking_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  issue_date: {
    type: DataTypes.STRING,
    defaultValue: () => new Date().toISOString().split('T')[0],
  },
  due_date: DataTypes.STRING,
  subtotal: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  tax: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  total: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  notes: DataTypes.TEXT,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'invoices',
  timestamps: false,
});

export const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  studio_name: {
    type: DataTypes.STRING,
    defaultValue: 'Studio ERP',
  },
  currency_symbol: {
    type: DataTypes.STRING,
    defaultValue: '₹',
  },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  logo_url: DataTypes.TEXT,
  gstin: DataTypes.STRING,
}, {
  tableName: 'settings',
  timestamps: false,
});


// --- RELATIONSHIPS / ASSOCIATIONS ---

Customer.hasMany(Booking, { foreignKey: 'customer_id', as: 'bookings', onDelete: 'CASCADE' });
Booking.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Booking.hasMany(Payment, { foreignKey: 'booking_id', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasMany(Invoice, { foreignKey: 'booking_id', as: 'invoices', onDelete: 'CASCADE' });
Invoice.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// --- INITIALIZATION & HELPERS ---

export async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();

  // Clean up any existing duplicate customer entries by mobile (keeping oldest record & reassigning bookings)
  try {
    const customers = await Customer.findAll({ order: [['created_at', 'ASC']] });
    const mobileMap = new Map();
    for (const c of customers) {
      if (c.mobile && c.mobile.trim()) {
        const key = c.mobile.trim();
        if (mobileMap.has(key)) {
          const primaryId = mobileMap.get(key);
          await Booking.update({ customer_id: primaryId }, { where: { customer_id: c.id } });
          await c.destroy();
        } else {
          mobileMap.set(key, c.id);
        }
      }
    }
  } catch (err) {
    console.error('Deduplication error:', err);
  }

  // Seed or update default settings row with Aishwarya Videos & Photos brand profile
  const existingSetting = await Setting.findOne();
  if (!existingSetting) {
    await Setting.create({
      id: 'default-settings-1',
      studio_name: 'Aishwarya Videos & Photos',
      currency_symbol: '₹',
      logo_url: '/logo.svg',
    });
  } else if (!existingSetting.logo_url || existingSetting.studio_name === 'Studio ERP') {
    await existingSetting.update({
      studio_name: 'Aishwarya Videos & Photos',
      logo_url: '/logo.svg',
    });
  }


  // Seed default admin user if empty
  const userCount = await User.count();
  if (userCount === 0) {
    await User.create({
      id: 'admin-user-1',
      name: 'Studio Owner',
      username: 'admin',
      password_hash: hashPassword('admin123'),
      role: 'admin',
    });
    console.log('👤 Seeded default admin user (username: admin, password: admin123)');
  }

  console.log(`⚡ Sequelize ORM initialized successfully! (Dialect: ${dialect})`);
}

// Utility to recompute paid_amount & balance for a booking using Sequelize
export async function recalculateBookingBalance(bookingId) {
  if (!bookingId) return;

  const totalPaid = await Payment.sum('amount', { where: { booking_id: bookingId } }) || 0;
  const booking = await Booking.findByPk(bookingId);

  if (booking) {
    const balance = (booking.total_amount || 0) - totalPaid;
    await booking.update({
      paid_amount: totalPaid,
      balance: balance,
    });
  }
}

export { Op };
