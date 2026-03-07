import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, User, Scissors, Package, Check, Trash2, Printer, Search } from 'lucide-react';
import clsx from 'clsx';

const StitchingIssueForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [availableBundles, setAvailableBundles] = useState([]);
    const [selectedBundleIds, setSelectedBundleIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        issue_no: '',
        production_order_id: '',
        worker_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // 1. Fetch Active Orders
            const { data: ords } = await supabase
                .from('production_orders')
                .select('id, order_no, styles(styleNo)')
                .neq('status', 'Completed');
            setOrders(ords || []);

            // 2. Fetch Active Workers
            const { data: wrks } = await supabase
                .from('workers')
                .select('id, name, worker_code')
                .eq('status', 'Active');
            setWorkers(wrks || []);

            // 3. Generate Issue No if new
            if (!id && !location.state?.editEntry) {
                const dateCode = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2);
                const { data: lastIssue } = await supabase
                    .from('stitching_issues')
                    .select('issue_no')
                    .order('created_at', { ascending: false })
                    .limit(1);

                let nextNum = 1;
                if (lastIssue && lastIssue[0]?.issue_no?.includes(dateCode)) {
                    const lastNum = parseInt(lastIssue[0].issue_no.split('-').pop());
                    nextNum = lastNum + 1;
                }
                setFormData(prev => ({ ...prev, issue_no: `ISS-${dateCode}-${String(nextNum).padStart(3, '0')}` }));
            }

            // 4. Handle Edit Mode
            if (id || location.state?.editEntry) {
                const entry = location.state?.editEntry || await (async () => {
                    const { data } = await supabase.from('stitching_issues').select('*').eq('id', id).single();
                    return data;
                })();

                if (entry) {
                    setFormData({
                        issue_no: entry.issue_no,
                        production_order_id: entry.production_order_id,
                        worker_id: entry.worker_id,
                        issue_date: entry.issue_date,
                        remarks: entry.remarks || ''
                    });

                    // Fetch existing items
                    const { data: items } = await supabase
                        .from('stitching_issue_items')
                        .select('bundle_id')
                        .eq('stitching_issue_id', id || entry.id);
                    setSelectedBundleIds(items?.map(i => i.bundle_id) || []);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        const fetchBundles = async () => {
            if (!formData.production_order_id) {
                setAvailableBundles([]);
                return;
            }

            // Fetch bundles that are 'Received' but not already issued 
            // OR are already part of this specific issue (if editing)
            const { data: bundles } = await supabase
                .from('bundles')
                .select(`
                    *,
                    cutting_orders!inner(order_id)
                `)
                .eq('cutting_orders.order_id', formData.production_order_id)
                .or(`status.eq.Received,id.in.(${selectedBundleIds.length > 0 ? selectedBundleIds.join(',') : '\"00000000-0000-0000-0000-000000000000\"'})`);

            setAvailableBundles(bundles || []);
        };
        fetchBundles();
    }, [formData.production_order_id, selectedBundleIds]);

    const handleToggleBundle = (bundleId) => {
        setSelectedBundleIds(prev =>
            prev.includes(bundleId) ? prev.filter(i => i !== bundleId) : [...prev, bundleId]
        );
    };

    const handleSelectAll = () => {
        if (selectedBundleIds.length === filteredBundles.length) {
            setSelectedBundleIds([]);
        } else {
            setSelectedBundleIds(filteredBundles.map(b => b.id));
        }
    };

    const filteredBundles = availableBundles.filter(b =>
        b.bundle_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.size?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedBundleIds.length === 0) return alert("Please select at least one bundle.");

        setSaving(true);
        try {
            const issueData = { ...formData };
            let issueId = id;

            if (id) {
                const { error } = await supabase.from('stitching_issues').update(issueData).eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('stitching_issues').insert([issueData]).select().single();
                if (error) throw error;
                issueId = data.id;
            }

            // Update items
            await supabase.from('stitching_issue_items').delete().eq('stitching_issue_id', issueId);
            const itemsToInsert = selectedBundleIds.map(bId => ({
                stitching_issue_id: issueId,
                bundle_id: bId,
                qty: availableBundles.find(b => b.id === bId)?.qty_per_bundle || 0
            }));
            const { error: itemError } = await supabase.from('stitching_issue_items').insert(itemsToInsert);
            if (itemError) throw itemError;

            alert("Cutting Issue saved successfully!");
            navigate('/stitching');
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-sage-400 italic">Loading issue form...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/stitching')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit' : 'New'} Cutting Issue</h1>
                        <p className="text-sage-500 text-sm">Issue received bundles to stitching workers</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Saving...' : 'Save & Close'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* General Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Issue No</label>
                            <input
                                readOnly
                                value={formData.issue_no}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-100 rounded-lg text-sm font-mono font-bold text-sage-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Issue Date</label>
                            <input
                                type="date"
                                value={formData.issue_date}
                                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                className="w-full px-4 py-2 bg-white border border-sage-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Worker</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-300" size={16} />
                                <select
                                    required
                                    value={formData.worker_id}
                                    onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-500/20"
                                >
                                    <option value="">Select Worker...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.worker_code})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1 pt-4 border-t border-sage-100">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Select Order / Style</label>
                            <div className="relative">
                                <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-300" size={16} />
                                <select
                                    required
                                    value={formData.production_order_id}
                                    onChange={(e) => {
                                        setFormData({ ...formData, production_order_id: e.target.value });
                                        setSelectedBundleIds([]);
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-500/20"
                                >
                                    <option value="">Select Order...</option>
                                    {orders.map(o => (
                                        <option key={o.id} value={o.id}>
                                            {o.styles?.styleNo} — {o.order_no}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Remarks</label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                placeholder="Any special instructions..."
                                className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl text-sm h-24 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Bundle Selection */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 flex flex-col h-[500px]">
                        <div className="p-4 border-b border-sage-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Package size={18} className="text-sage-400" /> Select Bundles
                                </h3>
                                <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                                    {selectedBundleIds.length} Selected
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-sage-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filter by bundle or size..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 pr-4 py-1.5 bg-sage-50 border border-sage-100 rounded-lg text-xs w-48 focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-[10px] font-bold text-sage-500 hover:text-sage-800 border border-sage-200 px-2.5 py-1.5 rounded-lg hover:bg-sage-50 transition-colors"
                                >
                                    {selectedBundleIds.length === filteredBundles.length ? 'Deselect All' : 'Select All Filtered'}
                                </button>
                            </div>
                        </div>

                        {!formData.production_order_id ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-sage-400 space-y-4">
                                <div className="p-4 bg-sage-50 rounded-full border border-sage-100">
                                    <Scissors size={40} className="text-sage-200" />
                                </div>
                                <p className="text-sm font-medium italic">Please select a Production Order to see available bundles</p>
                            </div>
                        ) : filteredBundles.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-sage-400">
                                <p className="text-sm font-medium italic">No available (received) bundles found for this order.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-sage-50/50 sticky top-0 z-10 text-[10px] font-bold text-sage-400 uppercase tracking-widest border-b border-sage-100">
                                        <tr>
                                            <th className="px-6 py-3 w-10">Select</th>
                                            <th className="px-6 py-3">Bundle No</th>
                                            <th className="px-6 py-3">Size</th>
                                            <th className="px-6 py-3">Color</th>
                                            <th className="px-6 py-3 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sage-50/50">
                                        {filteredBundles.map(bundle => (
                                            <tr
                                                key={bundle.id}
                                                onClick={() => handleToggleBundle(bundle.id)}
                                                className={clsx(
                                                    "cursor-pointer transition-colors group",
                                                    selectedBundleIds.includes(bundle.id) ? "bg-blue-50/30" : "hover:bg-sage-50/30"
                                                )}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className={clsx(
                                                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                        selectedBundleIds.includes(bundle.id) ? "bg-sage-800 border-sage-800 text-white" : "bg-white border-sage-200 group-hover:border-sage-400"
                                                    )}>
                                                        {selectedBundleIds.includes(bundle.id) && <Check size={12} />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-sage-800 font-mono text-xs">{bundle.bundle_no}</td>
                                                <td className="px-6 py-4 font-black">{bundle.size}</td>
                                                <td className="px-6 py-4 text-sage-500 font-medium">{bundle.color}</td>
                                                <td className="px-6 py-4 text-right font-black text-sage-800">{bundle.qty_per_bundle}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="p-4 bg-sage-50/50 border-t border-sage-100 flex justify-between items-center text-xs">
                            <div className="text-sage-500">
                                Selected: <span className="font-bold text-sage-800">{selectedBundleIds.length} Bundles</span>
                            </div>
                            <div className="text-sage-500">
                                Total Issued Pcs: <span className="font-black text-blue-600">
                                    {selectedBundleIds.reduce((sum, id) => sum + (availableBundles.find(b => b.id === id)?.qty_per_bundle || 0), 0)} PCS
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StitchingIssueForm;
