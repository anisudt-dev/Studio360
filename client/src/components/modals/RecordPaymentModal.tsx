import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Select, Textarea, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useNav } from '@/lib/nav';
import { PAYMENT_MODES } from '@/lib/constants';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import type { Booking, BookingWithCustomer } from '@/lib/types';

export function RecordPaymentModal() {
  const { modals, closeModal, navigate } = useNav();
  const open = !!modals.recordPayment;
  const presetBookingId = modals.recordPayment?.bookingId;

  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [bookingId, setBookingId] = useState<string>(presetBookingId || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [mode, setMode] = useState<string>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBookingId(presetBookingId || '');
      setAmount(''); setPaymentDate(todayISO()); setMode('Cash');
      setReference(''); setNotes(''); setSaving(false);
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

  async function handleSave() {
    if (!bookingId) { toast('Please select a booking', 'error'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('payments').insert({
      booking_id: bookingId,
      amount: Number(amount),
      payment_date: paymentDate,
      payment_mode: mode,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast('Could not record payment', 'error'); return; }
    toast('Payment recorded', 'success');
    closeModal('recordPayment');
    if (presetBookingId) navigate({ page: 'booking', id: presetBookingId });
  }

  return (
    <Modal
      open={open}
      onClose={() => closeModal('recordPayment')}
      title="Record Payment"
      subtitle="The booking balance updates automatically"
      footer={
        <>
          <Button variant="secondary" onClick={() => closeModal('recordPayment')}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Payment</Button>
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
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selected.customer?.name}</p>
              <p className="text-xs text-gray-500">{selected.event_type} · {formatDate(selected.event_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Balance</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(selected.balance)}</p>
            </div>
          </div>
        )}

        <Input label="Amount" type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={!!presetBookingId} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <Select label="Payment Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
        <Input label="Reference" placeholder="e.g. UPI/98765 (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
