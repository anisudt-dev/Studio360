import { api } from './api';

class QueryBuilder {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private eqConditions: Record<string, any> = {};
  private searchQuery: string = '';
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string) {
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = Array.isArray(payload) ? payload[0] : payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    return this;
  }

  eq(field: string, value: any) {
    this.eqConditions[field] = value;
    return this;
  }

  or(condition: string) {
    return this;
  }

  ilike(field: string, pattern: string) {
    this.searchQuery = pattern.replace(/%/g, '');
    return this;
  }

  limit(count: number) {
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Promise thenable implementation for seamless await support across all query chains
  async then(resolve?: (val: { data: any; error: any }) => any, reject?: (reason: any) => any) {
    try {
      let data: any = null;
      const id = this.eqConditions['id'];
      const customerId = this.eqConditions['customer_id'] || this.eqConditions['booking.customer_id'];
      const bookingId = this.eqConditions['booking_id'];

      if (this.action === 'insert') {
        if (this.tableName === 'customers') data = await api.createCustomer(this.payload);
        else if (this.tableName === 'bookings') data = await api.createBooking(this.payload);
        else if (this.tableName === 'payments') data = await api.createPayment(this.payload);
        else if (this.tableName === 'invoices') data = await api.createInvoice(this.payload);
        else if (this.tableName === 'settings') data = await api.createSettings(this.payload);
      } else if (this.action === 'update') {
        if (this.tableName === 'customers') data = await api.updateCustomer(id, this.payload);
        else if (this.tableName === 'bookings') data = await api.updateBooking(id, this.payload);
        else if (this.tableName === 'settings') data = await api.updateSettings(id || 'default-settings-1', this.payload);
      } else if (this.action === 'delete') {
        if (this.tableName === 'customers') data = await api.deleteCustomer(id);
        else if (this.tableName === 'bookings') data = await api.deleteBooking(id);
        else if (this.tableName === 'payments') data = await api.deletePayment(id);
        else if (this.tableName === 'invoices') data = await api.deleteInvoice(id);
      } else {
        // SELECT
        if (this.searchQuery) {
          const searchRes = await api.search(this.searchQuery);
          data = searchRes[this.tableName] || [];
        } else if (id) {
          if (this.tableName === 'customers') data = await api.getCustomer(id);
          else if (this.tableName === 'bookings') data = await api.getBooking(id);
          else if (this.tableName === 'invoices') data = await api.getInvoice(id);
          else if (this.tableName === 'settings') data = await api.getSettings();
        } else if (customerId && this.tableName === 'bookings') {
          const custData = await api.getCustomer(customerId);
          data = custData?.bookings || [];
        } else if (bookingId && this.tableName === 'payments') {
          const b = await api.getBooking(bookingId);
          data = b?.payments || [];
        } else if (bookingId && this.tableName === 'invoices') {
          const b = await api.getBooking(bookingId);
          data = b?.invoices || [];
        } else {
          if (this.tableName === 'customers') data = await api.getCustomers();
          else if (this.tableName === 'bookings') data = await api.getBookings();
          else if (this.tableName === 'payments') data = await api.getPayments();
          else if (this.tableName === 'invoices') data = await api.getInvoices();
          else if (this.tableName === 'settings') data = await api.getSettings();
        }

        if ((this.isSingle || this.isMaybeSingle) && Array.isArray(data)) {
          data = data[0] || null;
        }
      }

      const res = { data, error: null };
      return resolve ? resolve(res) : res;
    } catch (error: any) {
      console.error(`API Error in ${this.tableName} [${this.action}]:`, error);
      const res = { data: null, error };
      if (reject) return reject(error);
      return resolve ? resolve(res) : res;
    }
  }
}

export const supabase = {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  },
};
