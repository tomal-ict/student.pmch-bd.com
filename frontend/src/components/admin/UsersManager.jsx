import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, User, AlertCircle, X, Check } from 'lucide-react';
import api from '../../services/api';

const AVAILABLE_PERMISSIONS = [
  { key: 'students.view', label: 'View Students' },
  { key: 'students.manage', label: 'Manage / Edit Students' },
  { key: 'results.view', label: 'View Results' },
  { key: 'results.manage', label: 'Create & Edit Marks' },
  { key: 'admissions.view', label: 'View Admissions' },
  { key: 'admissions.manage', label: 'Approve & Reject Admissions' },
  { key: 'reports.view', label: 'View & Download Reports' },
  { key: 'users.manage', label: 'Manage Users & Permissions' },
  { key: 'settings.manage', label: 'Manage System Settings' },
];

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    role_name: 'staff',
    password: '',
    permissions: ['students.view', 'results.view', 'admissions.view'],
    is_active: true,
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      display_name: '',
      role_name: 'staff',
      password: '',
      permissions: ['students.view', 'results.view', 'admissions.view'],
      is_active: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      display_name: u.display_name || '',
      role_name: u.role_name,
      password: '',
      permissions: Array.isArray(u.permissions_json) ? u.permissions_json : [],
      is_active: Boolean(u.is_active),
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const togglePermission = (key) => {
    if (formData.permissions.includes(key)) {
      setFormData({ ...formData, permissions: formData.permissions.filter((k) => k !== key) });
    } else {
      setFormData({ ...formData, permissions: [...formData.permissions, key] });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err.response?.data?.errors) {
        setModalError(Object.values(err.response.data.errors)[0]?.[0]);
      } else {
        setModalError(err.response?.data?.message || 'Failed to save user');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user account "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Control & Staff Accounts</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage user credentials, roles, and granular system permissions.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Active Permissions</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10">
                    <span className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-slate-900 block">{u.display_name || u.username}</span>
                    <span className="text-xs text-slate-500 font-mono">@{u.username}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      u.role_name === 'super_admin'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role_name === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role_name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {u.role_name === 'super_admin' ? (
                      <span className="font-semibold text-purple-700">Full System Access (*)</span>
                    ) : (
                      <span>{(u.permissions_json?.length || 0)} permission(s) granted</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="Edit User"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User Privileges' : 'Create Staff / Admin Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Role *</label>
                  <select
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Password {editingUser ? '(leave blank to keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              {formData.role_name !== 'super_admin' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                    Custom Permissions Matrix
                  </label>
                  <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          className="rounded text-indigo-600"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="user_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="user_active" className="text-xs text-slate-700 font-semibold">
                  Account is Active & Permitted to Login
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60"
                >
                  {modalLoading ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
