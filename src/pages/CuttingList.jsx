import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Search, Scissors, FileText, Calendar, Tag, Edit, Trash2, Eye } from 'lucide-react';
import clsx from 'clsx';

const CuttingList = () => {
    const [cuttings, setCuttings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCuttings();
    }, []);

    const fetchCuttings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cutting_orders')
            .select(`
                *,
                production_orders (
                    order_no,
                    total_qty,
                    styles (styleNo)
                )
            `)
            .order('created_at', { ascending: false });

        if (!error) setCuttings(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this cutting order? This will also delete all associated bundles.')) return;

        try {
            // Delete bundles first (client-side cascade if not set in DB)
            await supabase.from('bundles').delete().eq('cutting_order_id', id);

            // Delete cutting order
            const { error } = await supabase.from('cutting_orders').delete().eq('id', id);

            if (error) throw error;

            // Refresh list
            fetchCuttings();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete cutting order');
        }
    };

    const filteredCuttings = cuttings.filter(c =>
        c.cutting_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.production_orders?.order_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-700';
            case 'Verified': return 'bg-emerald-100 text-emerald-700';
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'In-Progress': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Cutting Orders</h1>
                    <p className="text-sage-500 text-sm">Manage fabric cutting, marker planning, and bundle generation</p>
                </div>
                <Link
                    to="/cutting/new"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold"
                >
                    <Plus size={18} /> New Cutting Order
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 bg-sage-50/30 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search cutting no or order no..."
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
                                <th className="px-6 py-4">Cutting No</th>
                                <th className="px-6 py-4">Prod. Order / Style</th>
                                <th className="px-6 py-4">Fabric Issued</th>
                                <th className="px-6 py-4">Total Cut Qty</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sage-400 italic">Loading cutting orders...</td></tr>
                            ) : filteredCuttings.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sage-400 italic font-medium">No cutting orders found.</td></tr>
                            ) : filteredCuttings.map((cut) => (
                                <tr key={cut.id} className="hover:bg-sage-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-sage-100 text-sage-600 rounded-lg group-hover:bg-sage-200 transition-colors">
                                                <Scissors size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sage-800">{cut.cutting_no}</div>
                                                <div className="text-[10px] text-sage-400 font-mono mt-0.5 uppercase tracking-wider">{new Date(cut.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-sage-700 font-medium">
                                                <FileText size={12} className="text-sage-400" /> {cut.production_orders?.order_no}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sage-500 text-[11px] font-bold">
                                                <Tag size={12} className="text-sage-400" /> {cut.production_orders?.styles?.styleNo}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sage-800 font-medium">{cut.fabric_issued_qty} m</div>
                                        <div className="text-[10px] text-sage-400">Marker: {cut.marker_length}m • Lays: {cut.lay_count}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-sage-800">
                                        {cut.total_cut_qty?.toLocaleString()} <small className="text-[10px] text-sage-400 uppercase">pcs</small>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            getStatusColor(cut.status)
                                        )}>
                                            {cut.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to={`/cutting/${cut.id}`} className="p-1.5 text-sage-600 hover:bg-sage-100 rounded-lg transition-colors" title="View Details">
                                                <Eye size={16} />
                                            </Link>
                                            <Link to={`/cutting/edit/${cut.id}`} className="p-1.5 text-sage-600 hover:bg-sage-100 rounded-lg transition-colors" title="Edit">
                                                <Edit size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(cut.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
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
        </div>
    );
};

export default CuttingList;
