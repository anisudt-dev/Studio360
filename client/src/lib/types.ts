export type BookingStatus = 'enquiry' | 'quoted' | 'confirmed' | 'cancelled';
export type ProjectStatus = 'confirmed' | 'shooting' | 'editing' | 'delivered';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Other';

export interface Customer {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  title: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: BookingStatus;
  project_status: ProjectStatus;
  team_size: number;
  package_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface BookingWithCustomer extends Booking {
  customer?: Pick<Customer, 'id' | 'name' | 'mobile' | 'email' | 'address'>;
}


export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaymentWithBooking extends Payment {
  booking?: Pick<Booking, 'id' | 'title' | 'event_type' | 'event_date' | 'total_amount' | 'balance'>;
}

export interface Invoice {
  id: string;
  booking_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface InvoiceWithBooking extends Invoice {
  booking?: BookingWithCustomer;
}

export interface Settings {
  id: string;
  studio_name: string;
  currency_symbol: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url?: string | null;
  gstin?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  sender_name?: string | null;
}



