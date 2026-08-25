import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BookingWithCustomer, PaymentWithBooking, Customer, InvoiceWithBooking, Settings } from '@/lib/types';

export function useBookings() {
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, customer:customers(id,name,mobile)')
      .order('event_date', { ascending: false });
    setBookings((data as BookingWithCustomer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { bookings, loading, refresh };
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { customers, loading, refresh };
}

export function usePayments() {
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, booking:bookings(id,title,event_type,event_date,total_amount,balance)')
      .order('payment_date', { ascending: false });
    setPayments((data as PaymentWithBooking[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { payments, loading, refresh };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceWithBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, booking:bookings(*, customer:customers(id,name,mobile))')
      .order('created_at', { ascending: false });
    setInvoices((data as InvoiceWithBooking[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { invoices, loading, refresh };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    supabase.from('settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      setSettings(data as Settings | null);
    });
  }, []);

  return settings;
}
