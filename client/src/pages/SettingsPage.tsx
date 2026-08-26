import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, PageHeader, Input, Button, Skeleton, Badge, Select } from '@/components/ui';
import { toast } from '@/components/Toast';
import { UserPlus, Shield, KeyRound, UserCheck, Lock, Upload, Image as ImageIcon, Camera, Mail, Send } from 'lucide-react';


import type { Settings as SettingsType } from '@/lib/types';

interface UserRecord {
  id: string;
  name: string;
  username: string;
  role: string;
  created_at?: string;
}

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Form states
  const [form, setForm] = useState({
    studio_name: '',
    currency_symbol: '₹',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    logo_url: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    sender_name: 'Aishwarya Videos & Photos',
  });
  const [testingEmail, setTestingEmail] = useState(false);
  
  // New User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'staff' });
  const [creatingUser, setCreatingUser] = useState(false);

  // Change Password Form State
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingPwd, setUpdatingPwd] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsData, usersData] = await Promise.all([
          api.getSettings(),
          api.getUsers().catch(() => []),
        ]);

        if (settingsData) {
          setSettings(settingsData);
          setForm({
            studio_name: settingsData.studio_name || '',
            currency_symbol: settingsData.currency_symbol || '₹',
            phone: settingsData.phone || '',
            email: settingsData.email || '',
            address: settingsData.address || '',
            gstin: settingsData.gstin || '',
            logo_url: settingsData.logo_url || '',
            smtp_host: settingsData.smtp_host || 'smtp.gmail.com',
            smtp_port: settingsData.smtp_port || 587,
            smtp_user: settingsData.smtp_user || '',
            smtp_pass: settingsData.smtp_pass || '',
            sender_name: settingsData.sender_name || settingsData.studio_name || 'Aishwarya Videos & Photos',
          });
        }
        setUsersList(usersData || []);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleTestEmail() {
    if (!form.smtp_user || !form.smtp_pass) {
      toast('Please enter your SMTP Username and Password first', 'error');
      return;
    }
    const target = prompt('Enter recipient email address to send test email:', form.email || form.smtp_user);
    if (!target) return;

    setTestingEmail(true);
    try {
      // First save current settings so backend picks up the latest SMTP credentials
      await api.updateSettings(settings?.id || 'default-settings-1', form);
      const res = await api.testEmail(target);
      toast(res.message || 'Test email sent successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to send test email', 'error');
    } finally {
      setTestingEmail(false);
    }
  }


  function handleLogoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setForm((prev) => ({ ...prev, logo_url: event.target!.result as string }));
        toast('Logo image loaded. Click "Save Studio Profile" to apply.', 'success');
      }
    };
    reader.readAsDataURL(file);
  }


  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      if (settings?.id) {
        await api.updateSettings(settings.id, form);
      } else {
        await api.createSettings(form);
      }
      toast('Studio details saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Could not save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.username.trim() || !newUser.password) {
      toast('Please fill in all required fields for the new user', 'error');
      return;
    }

    setCreatingUser(true);
    try {
      const created = await api.createUser({
        name: newUser.name.trim(),
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
      });

      toast(`Staff account created for ${created.name}`, 'success');
      setUsersList((prev) => [...prev, created]);
      setNewUser({ name: '', username: '', password: '', role: 'staff' });
      setShowAddUser(false);
    } catch (err: any) {
      toast(err.message || 'Could not create staff user', 'error');
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      toast('Please enter your current and new password', 'error');
      return;
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }

    if (!user?.username) return;

    setUpdatingPwd(true);
    try {
      await api.changePassword({
        username: user.username,
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });

      toast('Password updated successfully', 'success');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast(err.message || 'Could not update password', 'error');
    } finally {
      setUpdatingPwd(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings & User Management" subtitle="Manage studio profile, staff accounts & security" />

      {/* 1. Studio Profile Card */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          Studio Profile Details
        </h3>
        <div className="space-y-4">
          <Input label="Studio Name" value={form.studio_name} onChange={(e) => setForm({ ...form, studio_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Currency Symbol" value={form.currency_symbol} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {/* Studio Logo Section */}
          <div className="border-t border-b border-gray-100 py-4 my-2">
            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Studio Logo (Appears on Invoices & Statements)
            </label>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-40 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-2 shrink-0 overflow-hidden relative group">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Studio Logo Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center text-gray-400">
                    <Camera size={24} className="mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] font-medium">No Logo Uploaded</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors shadow-2xs">
                    <Upload size={14} /> Upload Logo File
                    <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, logo_url: '/logo.svg', studio_name: 'Aishwarya Videos & Photos' }));
                      toast('Applied Aishwarya Videos & Photos brand profile', 'info');
                    }}
                    className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    Set Aishwarya Logo
                  </button>
                </div>

                <Input
                  label="OR Logo Image URL"
                  placeholder="e.g. /logo.svg or https://example.com/logo.png"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="GSTIN (Optional)" placeholder="e.g. 33ABCDE1234F1Z5" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} loading={savingSettings}>Save Studio Profile</Button>
        </div>
      </Card>

      {/* 2. Studio Email Dispatch Settings (SMTP) Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Mail size={18} className="text-teal-600" />
              Studio Email Configuration (SMTP)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Send official Invoices, Receipts, and Shoot Reminders to clients via email</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleTestEmail} loading={testingEmail}>
            <Send size={14} /> Send Test Email
          </Button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Sender Name"
              placeholder="e.g. Aishwarya Videos & Photos"
              value={form.sender_name}
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
            />
            <Input
              label="SMTP Host"
              placeholder="e.g. smtp.gmail.com"
              value={form.smtp_host}
              onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="SMTP Port"
              type="number"
              placeholder="587"
              value={String(form.smtp_port)}
              onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value) })}
            />
            <Input
              label="SMTP Username / Email"
              placeholder="your-email@gmail.com"
              value={form.smtp_user}
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
            />
            <Input
              label="SMTP Password / App Password"
              type="password"
              placeholder="••••••••••••••••"
              value={form.smtp_pass}
              onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
            💡 <strong>Gmail Users:</strong> Use <code className="bg-amber-100 px-1 py-0.5 rounded">smtp.gmail.com</code> port <code className="bg-amber-100 px-1 py-0.5 rounded">587</code> with a 16-character <strong>Gmail App Password</strong> (generated from your Google Account &gt; Security &gt; App Passwords).
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} loading={savingSettings}>Save Email Credentials</Button>
        </div>
      </Card>


      {/* 2. User & Staff Management Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <UserCheck size={18} className="text-teal-600" />
              Staff Accounts & Authorization
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage users authorized to access this studio ERP</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowAddUser((v) => !v)}>
            <UserPlus size={15} /> Add Staff Account
          </Button>
        </div>

        {/* Existing Users Table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 border-b border-gray-100">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Name</th>
                <th className="py-2.5 px-4 text-left font-medium">Username</th>
                <th className="py-2.5 px-4 text-left font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    {u.name} {user?.username === u.username && <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-medium">(You)</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-600 text-xs">@{u.username}</td>
                  <td className="py-3 px-4">
                    <Badge className={u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                      <Shield size={10} className="mr-1 inline" /> {u.role}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add User Form */}
        {showAddUser && (
          <form onSubmit={handleCreateUser} className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-4 animate-slide-up">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">New Staff Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Full Name" placeholder="e.g. Rahul Sharma" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              <Input label="Username" placeholder="e.g. rahul" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              <Input label="Password" type="password" placeholder="••••••••" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role / Permission</label>
                <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full py-2 text-sm">
                  <option value="staff">Staff (Standard Access)</option>
                  <option value="admin">Admin (Full Access)</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button type="submit" size="sm" loading={creatingUser}>Create Account</Button>
            </div>
          </form>
        )}
      </Card>

      {/* 3. Security & Change Password Card */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <KeyRound size={18} className="text-amber-600" />
          Change Password (@{user?.username})
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <Input label="Current Password" type="password" placeholder="••••••••" value={pwdForm.currentPassword} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} />
          <Input label="New Password" type="password" placeholder="••••••••" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
          <Input label="Confirm New Password" type="password" placeholder="••••••••" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
          <div className="pt-2">
            <Button type="submit" loading={updatingPwd}>Update Password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
