import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, PageHeader, Input, Button, Skeleton, Badge, Select } from '@/components/ui';
import { toast } from '@/components/Toast';
import { UserPlus, Shield, KeyRound, UserCheck, Lock } from 'lucide-react';
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
  const [form, setForm] = useState({ studio_name: '', currency_symbol: '₹', phone: '', email: '', address: '' });
  
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
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} loading={savingSettings}>Save Studio Profile</Button>
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
