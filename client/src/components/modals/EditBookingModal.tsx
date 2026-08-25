import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Select, Textarea, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useNav } from '@/lib/nav';
import { EVENT_TYPES, BOOKING_STATUSES, PROJECT_FLOW } from '@/lib/constants';
import type { Booking } from '@/lib/types';

export function EditBookingModal() {
  const { modals, closeModal } = useNav();
  const open = !!modals.editBooking;
  const id = modals.editBooking?.id;

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [projectStatus, setProjectStatus] = useState('confirmed');
  const [teamSize, setTeamSize] = useState('1');
  const [packageName, setPackageName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !id) return;
    supabase.from('bookings').select('*').eq('id', id).single().then(({ data }) => {
      const b = data as Booking | null;
      if (b) {
        setTitle(b.title || ''); setEventType(b.event_type); setEventDate(b.event_date || '');
        setStartTime(b.start_time || ''); setEndTime(b.end_time || ''); setVenue(b.venue || '');
        setTotalAmount(String(b.total_amount)); setStatus(b.status); setProjectStatus(b.project_status);
        setTeamSize(String(b.team_size)); setPackageName(b.package_name || ''); setNotes(b.notes || '');
      }
    });
  }, [open, id]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from('bookings').update({
      title: title.trim() || null,
      event_type: eventType,
      event_date: eventDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      venue: venue.trim() || null,
      total_amount: Number(totalAmount) || 0,
      status,
      project_status: projectStatus,
      team_size: Number(teamSize) || 1,
      package_name: packageName.trim() || null,
      notes: notes.trim() || null,
    }).eq('id', id);
    setSaving(false);
    if (error) { toast('Could not save changes', 'error'); return; }
    toast('Booking updated', 'success');
    closeModal('editBooking');
  }

  return (
    <Modal
      open={open}
      onClose={() => closeModal('editBooking')}
      title="Edit Booking"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => closeModal('editBooking')}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Event Type" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Event Date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Amount" type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          <Input label="Team Size" type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
        </div>
        <Input label="Package" value={packageName} onChange={(e) => setPackageName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Booking Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {BOOKING_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </Select>
          <Select label="Project Status" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)}>
            {PROJECT_FLOW.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </Select>
        </div>
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
