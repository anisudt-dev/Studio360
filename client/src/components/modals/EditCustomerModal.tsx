import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Textarea, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useNav } from '@/lib/nav';
import type { Customer } from '@/lib/types';

export function EditCustomerModal() {
  const { modals, closeModal } = useNav();
  const open = !!modals.editCustomer;
  const id = modals.editCustomer?.id;

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    supabase.from('customers').select('*').eq('id', id).single().then(({ data }) => {
      const c = data as Customer | null;
      if (c) {
        setName(c.name || ''); setMobile(c.mobile || ''); setEmail(c.email || '');
        setAddress(c.address || ''); setNotes(c.notes || '');
      }
    });
  }, [open, id]);

  async function handleSave() {
    if (!id) return;
    if (!name.trim()) { toast('Please enter a name', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('customers').update({
      name: name.trim(), mobile: mobile.trim() || null, email: email.trim() || null,
      address: address.trim() || null, notes: notes.trim() || null,
    }).eq('id', id);
    setSaving(false);
    if (error) { toast(typeof error === 'string' ? error : (error.message || error.error || 'Could not save changes'), 'error'); return; }
    toast('Customer updated', 'success');
    closeModal('editCustomer');
  }

  return (
    <Modal
      open={open}
      onClose={() => closeModal('editCustomer')}
      title="Edit Customer"
      footer={
        <>
          <Button variant="secondary" onClick={() => closeModal('editCustomer')}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Customer Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
