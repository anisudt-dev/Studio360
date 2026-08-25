import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Select, Textarea, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useNav } from '@/lib/nav';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import type { BookingWithCustomer, Invoice } from '@/lib/types';

export function AddInvoiceModal() {
  const { modals, closeModal, navigate } = useNav();
  const open = !!modals.addInvoice;
  const presetBookingId = modals.addInvoice?.bookingId;

  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [bookingId, setBookingId] = useState<string>(presetBookingId || '');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBookingId(presetBookingId || '');
      setIssueDate(todayISO()); setDueDate(''); setTax('');
      setNotes(''); setSaving(false);
    }
  }, [open, presetBookingId]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('bookings')
      .select('*, customer:customers(id,name,mobile)')
      .order('event_date', { ascending: false })
      .then(({ data }) => { if (data) setBookings(data as BookingWithCustomer[]); });
  }, [open]);

  const selected = bookings.find((b) => b.id === bookingId);
  const subtotal = selected ? Number(selected.total_amount) : 0;
  const taxNum = tax ? Number(tax) : 0;
  const total = subtotal + taxNum;

  async function handleSave() {
    if (!bookingId) { toast('Please select a booking', 'error'); return; }
    setSaving(true);
    // generate invoice number: INV-YYYYMMDD-RRRR
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const invoiceNumber = `INV-${datePart}-${rand}`;
    const payload: Partial<Invoice> = {
      booking_id: bookingId,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate || null,
      subtotal,
      tax: taxNum,
      total,
      notes: notes.trim() || null,
    };
    const { data, error } = await supabase.from('invoices').insert(payload).select('id').single();
    setSaving(false);
    if (error) { toast('Could not create invoice', 'error'); return; }
    toast('Invoice generated', 'success');
    closeModal('addInvoice');
    navigate({ page: 'invoice', id: data.id });
  }

  return (
    <Modal
      open={open}
      onClose={() => closeModal('addInvoice')}
      title="Create Invoice"
      subtitle="Details are pulled from the booking automatically"
      footer={
        <>
          <Button variant="secondary" onClick={() => closeModal('addInvoice')}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Generate Invoice</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!presetBookingId && (
          <Select label="Booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
            <option value="">Select a booking...</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.customer?.name} — {b.event_type} ({formatDate(b.event_date)})
              </option>
            ))}
          </Select>
        )}

        {selected && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{selected.customer?.name}</p>
              <p className="text-xs text-gray-500">{selected.event_type}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Booking amount</span>
              <span className="font-semibold text-gray-900">{formatCurrency(selected.total_amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Already paid</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(selected.paid_amount)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} hint="optional" />
        </div>

        <Input label="Tax / Charges" type="number" placeholder="0" value={tax} onChange={(e) => setTax(e.target.value)} hint="Additional amount on top of booking total" />

        {selected && (
          <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-teal-800">Invoice Total</span>
            <span className="text-lg font-bold text-teal-800">{formatCurrency(total)}</span>
          </div>
        )}

        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
