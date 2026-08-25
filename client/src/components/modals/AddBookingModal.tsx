import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Select, Textarea, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useNav } from '@/lib/nav';
import { EVENT_TYPES } from '@/lib/constants';
import type { Customer, Booking } from '@/lib/types';
import { ChevronDown, Check, UserPlus } from 'lucide-react';

export function AddBookingModal() {
  const { modals, closeModal, navigate } = useNav();
  const open = !!modals.addBooking;
  const presetCustomerId = modals.addBooking?.presetCustomerId;

  const [mobile, setMobile] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [customerId, setCustomerId] = useState<string>(presetCustomerId || '');

  const [eventType, setEventType] = useState<string>('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [packageName, setPackageName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teamSize, setTeamSize] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMobile(''); setMatchedCustomer(null); setNewCustomerName('');
      setCreatingNew(false); setCustomerId(presetCustomerId || '');
      setEventType('Wedding'); setEventDate(''); setTotalAmount('');
      setShowOptional(false); setTitle(''); setVenue(''); setPackageName('');
      setStartTime(''); setEndTime(''); setTeamSize('1'); setNotes('');
      setSaving(false);
    }
  }, [open, presetCustomerId]);

  useEffect(() => {
    if (!open) return;
    supabase.from('customers').select('*').order('name').then(({ data }) => {
      if (data) setCustomers(data as Customer[]);
    });
  }, [open]);

  // Auto-match customer by mobile number
  useEffect(() => {
    if (!mobile.trim() || mobile.trim().length < 4) {
      setMatchedCustomer(null);
      setCreatingNew(false);
      setCustomerId(presetCustomerId || '');
      return;
    }
    const clean = mobile.replace(/\D/g, '');
    const match = customers.find((c) => {
      const cm = (c.mobile || '').replace(/\D/g, '');
      return cm && (cm === clean || cm.endsWith(clean) || clean.endsWith(cm));
    });
    if (match) {
      setMatchedCustomer(match);
      setCustomerId(match.id);
      setCreatingNew(false);
    } else {
      setMatchedCustomer(null);
      setCustomerId('');
      setCreatingNew(true);
    }
  }, [mobile, customers, presetCustomerId]);

  async function handleSave() {
    let finalCustomerId = customerId;

    // If creating new customer inline
    if (creatingNew && !finalCustomerId) {
      if (!newCustomerName.trim()) {
        toast('Please enter a customer name', 'error');
        return;
      }
      if (/^[0-9\s+()-]+$/.test(newCustomerName.trim())) {
        toast('Customer Name cannot be phone digits or numeric values. Please enter a valid name.', 'error');
        return;
      }
      if (mobile.trim() && /[a-zA-Z]/.test(mobile.trim())) {
        toast('Mobile number cannot contain alphabetic letters. Please enter valid phone digits.', 'error');
        return;
      }

      // Check if customer with this mobile ALREADY exists in database
      const cleanMob = mobile.replace(/\D/g, '').slice(-10);
      const existingCust = cleanMob ? customers.find((c) => c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === cleanMob) : null;

      if (existingCust) {
        finalCustomerId = existingCust.id;
      } else {
        setSaving(true);
        const { data: custData, error: custError } = await supabase
          .from('customers')
          .insert({ name: newCustomerName.trim(), mobile: mobile.trim() || null })
          .select('id')
          .single();
        setSaving(false);
        if (custError) {
          toast(typeof custError === 'string' ? custError : (custError.message || custError.error || 'Could not create customer'), 'error');
          return;
        }
        finalCustomerId = custData.id;
      }
    }

    if (!finalCustomerId) { toast('Please enter a mobile number', 'error'); return; }
    if (!totalAmount || isNaN(Number(totalAmount))) { toast('Please enter a total amount', 'error'); return; }

    setSaving(true);
    const payload: Partial<Booking> = {
      customer_id: finalCustomerId,
      title: title.trim() || null,
      event_type: eventType,
      event_date: eventDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      venue: venue.trim() || null,
      total_amount: Number(totalAmount),
      team_size: Number(teamSize) || 1,
      package_name: packageName.trim() || null,
      notes: notes.trim() || null,
      status: 'confirmed',
      project_status: 'confirmed',
    };
    const { data, error } = await supabase.from('bookings').insert(payload).select('id').single();
    setSaving(false);
    if (error) { toast('Could not create booking', 'error'); return; }
    toast('Booking created', 'success');
    closeModal('addBooking');
    navigate({ page: 'booking', id: data.id });
  }

  return (
    <Modal
      open={open}
      onClose={() => closeModal('addBooking')}
      title="New Booking"
      subtitle="Enter mobile number — we'll find or create the customer"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => closeModal('addBooking')}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Create Booking</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Mobile number — the entry point */}
        <Input
          label="Mobile Number"
          placeholder="e.g. 9876543210"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          autoFocus
        />

        {/* Customer match status */}
        {matchedCustomer && (
          <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
              {matchedCustomer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-teal-800">{matchedCustomer.name}</p>
              <p className="text-xs text-teal-600">Existing customer found</p>
            </div>
            <Check size={18} className="text-teal-600 shrink-0" />
          </div>
        )}

        {creatingNew && mobile.trim().length >= 4 && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={16} className="text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">New customer</p>
            </div>
            <Input
              label="Customer Name"
              placeholder="e.g. Arun Kumar"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
          </div>
        )}

        {/* Essential fields */}
        <div className="grid grid-cols-2 gap-4">
          <Select label="Event Type" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Event Date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <Input label="Total Amount" type="number" placeholder="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />

        {/* Optional fields */}
        <button
          onClick={() => setShowOptional((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronDown size={15} className={`transition-transform ${showOptional ? 'rotate-180' : ''}`} />
          More details (optional)
        </button>

        {showOptional && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <Input label="Title" placeholder="e.g. Arun & Priya" value={title} onChange={(e) => setTitle(e.target.value)} hint="Display name shown on cards" />
            <Input label="Venue" placeholder="e.g. ABC Convention Hall" value={venue} onChange={(e) => setVenue(e.target.value)} />
            <Input label="Package" placeholder="e.g. Premium Wedding" value={packageName} onChange={(e) => setPackageName(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <Input label="Team Size" type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}
