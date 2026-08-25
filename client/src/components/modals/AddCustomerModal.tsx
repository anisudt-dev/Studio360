import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Textarea, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useNav } from '@/lib/nav';
import { ChevronDown } from 'lucide-react';

export function AddCustomerModal() {
  const { modals, closeModal, navigate } = useNav();
  const open = !!modals.addCustomer;
  const onDone = modals.addCustomer?.onDone;

  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (open) {
      setMobile(''); setName(''); setEmail(''); setAddress(''); setNotes('');
      setCreatedId(null); setSaving(false); setShowOptional(false);
    }
  }, [open]);

  async function handleSave() {
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();

    if (!cleanName) {
      toast('Please enter a customer name', 'error');
      return;
    }

    if (/^[0-9\s+()-]+$/.test(cleanName)) {
      toast('Customer Name cannot be phone digits or numeric numbers. Please enter a valid name.', 'error');
      return;
    }

    if (cleanMobile && /[a-zA-Z]/.test(cleanMobile)) {
      toast('Mobile number cannot contain alphabetic letters. Please enter valid phone digits.', 'error');
      return;
    }

    if (cleanMobile) {
      const cleanDigits = cleanMobile.replace(/\D/g, '').slice(-10);
      if (cleanDigits.length >= 7) {
        const { data: existingList } = await supabase.from('customers').select('*');
        if (existingList && Array.isArray(existingList)) {
          const dup = existingList.find((c: any) => c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === cleanDigits);
          if (dup) {
            toast(`Duplicate mobile number! A customer with mobile number '${cleanMobile}' already exists (${dup.name}).`, 'error');
            return;
          }
        }
      }
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: cleanName, mobile: cleanMobile || null, email: email.trim() || null, address: address.trim() || null, notes: notes.trim() || null })
      .select('id')
      .single();
    setSaving(false);
    if (error) { toast(typeof error === 'string' ? error : (error.message || error.error || 'Could not create customer'), 'error'); return; }
    toast('Customer created', 'success');
    setCreatedId(data.id);
  }

  function handleClose() {
    closeModal('addCustomer');
    if (createdId && onDone) onDone(createdId);
  }

  if (createdId) {
    return (
      <Modal open={open} onClose={handleClose} title="Customer Created" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <p className="text-base text-gray-700 mb-5">{name} has been added.</p>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => { const id = createdId; handleClose(); navigate({ page: 'customer', id }); }}>
              View Profile
            </Button>
            <Button className="flex-1" onClick={() => { const id = createdId; handleClose(); if (onDone) onDone(id); else navigate({ page: 'bookings' }); }}>
              Create Booking
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Customer"
      subtitle="Enter customer name and mobile number"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Customer</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Customer Name" name="name" placeholder="e.g. Arun Kumar" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input label="Mobile Number" name="mobile" placeholder="e.g. 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} />

        <button
          onClick={() => setShowOptional((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors mt-1"
        >
          <ChevronDown size={15} className={`transition-transform ${showOptional ? 'rotate-180' : ''}`} />
          More details (optional)
        </button>

        {showOptional && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <Input label="Email" name="email" type="email" placeholder="optional" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Address" name="address" placeholder="optional" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Textarea label="Notes" name="notes" placeholder="optional" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}
