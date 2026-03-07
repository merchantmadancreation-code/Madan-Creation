import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import {
    Plus, Search, Edit, Trash2, Users, Calendar,
    Layers, Factory, Activity, Cpu, Briefcase, Zap,
    MoreVertical, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

const ProductionMasters = () => {
    const {
        buyers = [], seasons = [], categories = [], units = [], lines = [],
        workers = [], machineTypes = [], machines = [], operations = [],
        loading, addMaster, updateMaster, deleteMaster
    } = useProduction();

    const [activeTab, setActiveTab] = useState('buyers');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const tabs = [
        { id: 'buyers', label: 'Buyers', icon: Users, table: 'buyers' },
        { id: 'seasons', label: 'Seasons', icon: Calendar, table: 'seasons' },
        { id: 'categories', label: 'Categories', icon: Layers, table: 'garment_categories' },
        { id: 'units', label: 'Factories', icon: Factory, table: 'units' },
        { id: 'lines', label: 'Lines', icon: Activity, table: 'production_lines' },
        { id: 'workers', label: 'Workers', icon: Briefcase, table: 'workers' },
        { id: 'machines', label: 'Machines', icon: Cpu, table: 'machines' },
        { id: 'operations', label: 'Operations', icon: Zap, table: 'operations_master' },
    ];

    const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

    const getDisplayData = () => {
        let data = [];
        switch (activeTab) {
            case 'buyers': data = buyers; break;
            case 'seasons': data = seasons; break;
            case 'categories': data = categories; break;
            case 'units': data = units; break;
            case 'lines': data = lines; break;
            case 'workers': data = workers; break;
            case 'machines': data = machines; break;
            case 'operations': data = operations; break;
            default: data = [];
        }

        if (!Array.isArray(data)) return [];

        return data.filter(item => {
            if (!item) return false;
            return Object.values(item).some(val =>
                String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this master record?')) {
            const { error } = await deleteMaster(currentTab.table, id);
            if (error) alert(`Error deleting: ${error.message}`);
        }
    };

    const displayData = getDisplayData();

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);

        const formData = new FormData(e.target);
        const item = Object.fromEntries(formData.entries());

        // Cleanup empty strings to null for consistent DB handling
        Object.keys(item).forEach(key => {
            if (item[key] === '') item[key] = null;
        });

        try {
            let result;
            if (editingItem) {
                result = await updateMaster(currentTab.table, editingItem.id, item);
            } else {
                result = await addMaster(currentTab.table, item);
            }

            if (result.error) {
                setErrorMsg(result.error.message);
                console.error("Master save error:", result.error);
            } else {
                setShowModal(false);
                setEditingItem(null);
            }
        } catch (err) {
            setErrorMsg(err.message || 'An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">ERP Master Data</h1>
                    <p className="text-sage-500 text-sm">Manage core configuration for your production environment</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setErrorMsg(null); setShowModal(true); }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 transition-all shadow-md font-bold"
                >
                    <Plus size={18} /> Add {currentTab.label?.slice(0, -1)}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-sage-200 pb-px overflow-x-auto">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
                                activeTab === tab.id
                                    ? "text-sage-800 border-sage-600 bg-sage-50/50"
                                    : "text-sage-400 border-transparent hover:text-sage-600 hover:bg-sage-50/30"
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 bg-sage-50/30 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${currentTab.label?.toLowerCase() || 'data'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-sage-50 text-sage-700 font-bold border-b border-sage-200">
                                <th className="px-6 py-4">Name / Info</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sage-400 italic">
                                        Loading master data...
                                    </td>
                                </tr>
                            ) : displayData.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sage-400 italic font-medium">
                                        No {currentTab.label?.toLowerCase()} found matching your criteria.
                                    </td>
                                </tr>
                            ) : displayData.map((item) => (
                                <tr key={item.id} className="hover:bg-sage-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sage-800">{item.name || item.operation_name || item.worker_code || item.serial_no || 'Unnamed'}</div>
                                        <div className="text-[10px] text-sage-400 font-mono mt-0.5 uppercase">
                                            {item.id?.slice(0, 8) || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sage-600 text-xs">
                                            {item.email || item.description || item.address || item.category || item.designation || item.brand || 'No info'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            item.status === 'Active' || item.status === 'Available'
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        )}>
                                            {item.status === 'Active' || item.status === 'Available' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                            {item.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setEditingItem(item); setErrorMsg(null); setShowModal(true); }}
                                                className="p-1.5 rounded-lg text-sage-600 hover:bg-sage-100 transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sage-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-sage-200 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-sage-100 flex justify-between items-center bg-sage-50/50">
                            <h2 className="text-xl font-bold text-sage-800">
                                {editingItem ? 'Edit' : 'Add New'} {currentTab.label?.slice(0, -1)}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-sage-400 hover:text-sage-600 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800 text-sm">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold">Error Saving Entry</div>
                                    <div className="opacity-80">{errorMsg}</div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            {/* Dynamic Fields based on activeTab */}

                            {/* Standard Name field for most */}
                            {['buyers', 'seasons', 'categories', 'units', 'lines', 'workers'].includes(activeTab) && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Name / Title</label>
                                    <input
                                        name="name"
                                        defaultValue={editingItem?.name}
                                        required
                                        className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all font-bold"
                                    />
                                </div>
                            )}

                            {activeTab === 'buyers' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Email</label>
                                            <input name="email" defaultValue={editingItem?.email} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Contact No</label>
                                            <input name="contact_no" defaultValue={editingItem?.contact_no} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Address</label>
                                        <textarea name="address" defaultValue={editingItem?.address} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm h-20 resize-none" />
                                    </div>
                                </>
                            )}

                            {['seasons', 'categories'].includes(activeTab) && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Description</label>
                                    <textarea name="description" defaultValue={editingItem?.description} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm h-20 resize-none" />
                                </div>
                            )}

                            {activeTab === 'units' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Contact No</label>
                                        <input name="contact_no" defaultValue={editingItem?.contact_no} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Address</label>
                                        <textarea name="address" defaultValue={editingItem?.address} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm h-20 resize-none" />
                                    </div>
                                </>
                            )}

                            {activeTab === 'workers' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Worker Code</label>
                                        <input name="worker_code" defaultValue={editingItem?.worker_code} required className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Designation</label>
                                        <input name="designation" defaultValue={editingItem?.designation} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'machines' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Serial No</label>
                                            <input name="serial_no" defaultValue={editingItem?.serial_no} required className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Brand</label>
                                            <input name="brand" defaultValue={editingItem?.brand} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Model No</label>
                                        <input name="model_no" defaultValue={editingItem?.model_no} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                    </div>
                                </>
                            )}

                            {activeTab === 'operations' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Operation Name</label>
                                        <input name="operation_name" defaultValue={editingItem?.operation_name} required className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Std SMV</label>
                                            <input type="number" step="0.01" name="standard_smv" defaultValue={editingItem?.standard_smv} required className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-sage-500 uppercase tracking-wider">Cost/Op</label>
                                            <input type="number" step="0.01" name="cost_per_operation" defaultValue={editingItem?.cost_per_operation} className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white border border-sage-200 rounded-xl text-sage-600 font-bold hover:bg-sage-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 bg-sage-800 text-white rounded-xl font-bold hover:bg-sage-900 shadow-lg shadow-sage-200 transition-all disabled:opacity-50">
                                    {saving ? 'Processing...' : editingItem ? 'Save Changes' : 'Create Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionMasters;
