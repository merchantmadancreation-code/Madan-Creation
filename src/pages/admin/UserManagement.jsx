import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Shield, Mail, Trash2, Edit2, CheckCircle, XCircle, Activity, X } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', full_name: '', role: 'viewer' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
        } else {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setShowInstructions(true);
        setIsAdding(false);
    };

    const copySignupLink = () => {
        const link = `${window.location.origin}/login?mode=signup`;
        navigator.clipboard.writeText(link);
        setSuccess("Signup link copied to clipboard! Send this to your user.");
    };

    const updateRole = async (userId, newRole) => {
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            setError(error.message);
        } else {
            setSuccess("Role updated successfully");
            fetchUsers();
        }
        setLoading(false);
    };

    const deleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            setError(error.message);
        } else {
            setSuccess("User deleted successfully");
            fetchUsers();
        }
        setLoading(false);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: editingUser.full_name,
                role: editingUser.role,
                status: editingUser.status
            })
            .eq('id', editingUser.id);

        if (error) {
            setError(error.message);
        } else {
            setSuccess("User updated successfully");
            setEditingUser(null);
            fetchUsers();
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-sage-900">User Management</h1>
                    <p className="text-sage-500">Manage ERP users and their access levels</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${isAdding
                        ? 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                        : 'bg-sage-800 text-white hover:bg-sage-900 shadow-lg shadow-sage-200'
                        }`}
                >
                    {isAdding ? <X size={20} /> : <UserPlus size={20} />}
                    <span>{isAdding ? 'Close Form' : 'Invite User'}</span>
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-4 text-sage-800">
                        <UserPlus size={20} className="text-sage-500" />
                        <h3 className="font-bold">New User Invitation</h3>
                    </div>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-sage-500 uppercase">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-sage-50 border border-sage-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sage-500 outline-none transition-all"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-sage-500 uppercase">Email Address</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-sage-50 border border-sage-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sage-500 outline-none transition-all"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-sage-500 uppercase">Default Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-sage-50 border border-sage-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sage-500 outline-none transition-all"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <button
                                type="submit"
                                className="bg-sage-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-sage-900 transition-all flex items-center gap-2"
                            >
                                <Shield size={16} />
                                Create Invitation
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-center gap-3">
                    <XCircle className="text-red-400 w-5 h-5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {showInstructions && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Mail className="text-blue-600 w-6 h-6" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-blue-900">How to Onboard {formData.full_name || 'New User'}</h3>
                                <p className="text-sm text-blue-700 leading-relaxed max-w-2xl">
                                    For security, Supabase doesn't allow one user to create passwords for another from the browser.
                                    Please follow these 2 simple steps:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div className="bg-white/50 p-3 rounded border border-blue-100">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Step 1</span>
                                        <p className="text-xs text-blue-800 font-medium mb-2">Send the signup link to <strong>{formData.email}</strong></p>
                                        <button
                                            onClick={copySignupLink}
                                            className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-all flex items-center gap-1"
                                        >
                                            <Activity size={10} /> Copy Signup Link
                                        </button>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded border border-blue-100">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Step 2</span>
                                        <p className="text-xs text-blue-800 font-medium">Once they register, they will appear in the table below. You can then change their role from <strong>Viewer</strong> to <strong>{formData.role}</strong>.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setShowInstructions(false)} className="text-blue-400 hover:text-blue-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-400 w-5 h-5 flex-shrink-0" />
                        <p className="text-sm text-green-700 font-medium">{success}</p>
                    </div>
                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-sage-100 overflow-hidden">
                <div className="p-4 bg-sage-50 border-b border-sage-100 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-sage-700 uppercase tracking-widest">Active Users</h2>
                    <button
                        onClick={fetchUsers}
                        className="text-xs text-sage-500 hover:text-sage-800 flex items-center gap-1 transition-colors"
                    >
                        <Activity size={12} />
                        Refresh List
                    </button>
                </div>
                <table className="min-w-full divide-y divide-sage-100">
                    <thead className="bg-sage-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-sage-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-sage-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-sage-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-sage-500 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-sage-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-50">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-sage-400 italic">Loading users...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-sage-400 italic">No users found.</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className="hover:bg-sage-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-xs uppercase">
                                            {user.full_name?.[0] || user.email[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-sage-900">{user.full_name || 'No Name'}</div>
                                            <div className="text-xs text-sage-500 flex items-center gap-1">
                                                <Mail size={12} />
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.role}
                                        onChange={(e) => updateRole(user.id, e.target.value)}
                                        className="text-xs font-bold bg-white border border-sage-200 rounded px-2 py-1 focus:ring-1 focus:ring-sage-500 outline-none"
                                    >
                                        <option value="admin">Admin (Full Access)</option>
                                        <option value="manager">Manager (HR + Masters)</option>
                                        <option value="editor">Editor (Production Entry)</option>
                                        <option value="viewer">Viewer (Read Only)</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-sage-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-1">
                                    <button
                                        onClick={() => setViewingUser(user)}
                                        className="p-2 text-sage-400 hover:text-sage-600 transition-colors"
                                        title="View Details"
                                    >
                                        <Activity size={16} />
                                    </button>
                                    <button
                                        onClick={() => setEditingUser({ ...user })}
                                        className="p-2 text-sage-400 hover:text-sage-600 transition-colors"
                                        title="Edit User"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteUser(user.id)}
                                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-sage-900/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-sage-100 flex justify-between items-center bg-sage-50">
                            <h3 className="text-lg font-bold text-sage-900 flex items-center gap-2">
                                <Edit2 size={20} className="text-sage-500" />
                                Edit User
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-sage-400 hover:text-sage-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditUser} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-sage-500 uppercase">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingUser.full_name || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                    className="w-full bg-sage-50 border border-sage-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sage-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-sage-500 uppercase">Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full bg-sage-50 border border-sage-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sage-500 outline-none"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-sage-500 uppercase">Status</label>
                                <select
                                    value={editingUser.status || 'Active'}
                                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                                    className="w-full bg-sage-50 border border-sage-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sage-500 outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-2 border border-sage-200 text-sage-600 rounded-lg font-bold text-sm hover:bg-sage-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-sage-800 text-white rounded-lg font-bold text-sm hover:bg-sage-900 transition-all shadow-lg shadow-sage-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View User Modal */}
            {viewingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-sage-900/60 backdrop-blur-sm" onClick={() => setViewingUser(null)} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-sage-100 bg-sage-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-sage-900">User Details</h3>
                            <button onClick={() => setViewingUser(null)} className="text-sage-400 hover:text-sage-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-2xl mx-auto border-2 border-sage-50">
                                {viewingUser.full_name?.[0] || viewingUser.email[0]}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-sage-900">{viewingUser.full_name || 'No Name'}</h4>
                                <p className="text-sage-500 font-medium">{viewingUser.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left pt-4">
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                    <p className="text-[10px] uppercase font-bold text-sage-400">Current Role</p>
                                    <p className="font-bold text-sage-800 capitalize">{viewingUser.role}</p>
                                </div>
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                    <p className="text-[10px] uppercase font-bold text-sage-400">Account Status</p>
                                    <p className="font-bold text-sage-800">{viewingUser.status || 'Active'}</p>
                                </div>
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100 col-span-2">
                                    <p className="text-[10px] uppercase font-bold text-sage-400">Member Since</p>
                                    <p className="font-bold text-sage-800">{new Date(viewingUser.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingUser(null)}
                                className="w-full mt-6 py-2 bg-sage-800 text-white rounded-lg font-bold text-sm hover:bg-sage-900 transition-all shadow-lg"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
