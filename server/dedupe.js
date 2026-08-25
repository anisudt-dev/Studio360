import { sequelize, Customer, Booking } from './db.js';

async function cleanupDuplicates() {
  console.log('--- Cleaning Duplicate Customers ---');
  await sequelize.sync();

  const customers = await Customer.findAll();
  console.log(`Total customer records in database: ${customers.length}`);

  const mobileMap = new Map();
  const duplicateIds = [];

  for (const c of customers) {
    if (!c.mobile) continue;
    const cleanMob = c.mobile.replace(/\D/g, '').slice(-10);

    if (mobileMap.has(cleanMob)) {
      // Found duplicate!
      const primary = mobileMap.get(cleanMob);
      console.log(`Found Duplicate: Primary = ${primary.name} (${primary.id}), Duplicate = ${c.name} (${c.id}) - Mobile: ${cleanMob}`);

      // Re-assign any bookings linked to duplicate customer to point to primary customer ID
      const bookingsToUpdate = await Booking.findAll({ where: { customer_id: c.id } });
      for (const b of bookingsToUpdate) {
        console.log(`Reassigning booking ${b.id} from customer ${c.id} to ${primary.id}`);
        await b.update({ customer_id: primary.id });
      }

      duplicateIds.push(c.id);
    } else {
      mobileMap.set(cleanMob, c);
    }
  }

  if (duplicateIds.length > 0) {
    for (const id of duplicateIds) {
      await Customer.destroy({ where: { id } });
      console.log(`Deleted duplicate customer record ${id}`);
    }
    console.log(`SUCCESSFULLY DELETED ${duplicateIds.length} DUPLICATE CUSTOMER RECORDS!`);
  } else {
    console.log('No duplicate customers found.');
  }

  const remaining = await Customer.findAll();
  console.log(`Remaining unique customer records: ${remaining.length}`);
  process.exit(0);
}

cleanupDuplicates().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
