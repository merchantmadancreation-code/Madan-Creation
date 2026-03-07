import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, User, Package, Trash2, Plus, Box } from 'lucide-react';
import clsx from 'clsx';

const MaterialIssueForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [masterItems, setMasterItems] = useState([]);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        issue_no: '',
        production_order_id: '',
        worker_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    const [items, setItems] = useState([
        { category: '', item_name: '', qty: '', unit: 'Pcs' }
    ]);

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

            // 3. Fetch Master Items
            const { data: master, error: masterError } = await supabase
                .from('items')
                .select('id, name, materialType, unit');

            if (masterError) {
                console.error("Error fetching items:", masterError);
            }

            setMasterItems(master || []);

            const uniqueCats = [...new Set(master?.map(i => i.materialType).filter(Boolean))];

            // Provide defaults if no categories found in database
            const defaultCats = ['Accessories', 'Trims', 'Packaging', 'Fabric', 'Thread', 'Label', 'Lace', 'Elastic'];
            const finalCats = uniqueCats.length > 0 ? uniqueCats : defaultCats;

            setCategories([...new Set(finalCats)].sort());

            // 4. Generate Issue No if new
            if (!id) {
                const dateCode = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2);
                const { data: lastIssue } = await supabase
                    .from('material_issues')
                    .select('issue_no')
                    .order('created_at', { ascending: false })
                    .limit(1);

                let nextNum = 1;
                if (lastIssue && lastIssue[0]?.issue_no?.includes(dateCode)) {
                    const parts = lastIssue[0].issue_no.split('-');
                    const lastNum = parseInt(parts[parts.length - 1]);
                    nextNum = lastNum + 1;
                }
                setFormData(prev => ({ ...prev, issue_no: `MAT-${dateCode}-${String(nextNum).padStart(3, '0')}` }));
            }

            // 5. Handle Edit Mode
            if (id) {
                const { data: entry } = await supabase
                    .from('material_issues')
                    .select('*, material_issue_items(*)')
                    .eq('id', id)
                    .single();

                if (entry) {
                    setFormData({
                        issue_no: entry.issue_no,
                        production_order_id: entry.production_order_id,
                        worker_id: entry.worker_id,
                        issue_date: entry.issue_date,
                        remarks: entry.remarks || ''
                    });
                    if (entry.material_issue_items?.length > 0) {
                        setItems(entry.material_issue_items.map(i => {
                            // Find category from master items
                            const mItem = master?.find(m => m.name === i.item_name);
                            return {
                                category: mItem?.materialType || '',
                                item_name: i.item_name,
                                qty: i.qty,
                                unit: i.unit || 'Pcs'
                            };
                        }));
                    }
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleAddItem = () => {
        setItems([...items, { category: '', item_name: '', qty: '', unit: 'Pcs' }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-fill unit when item name changes
        if (field === 'item_name') {
            const selectedMaster = masterItems.find(m => m.name === value);
            if (selectedMaster) {
                newItems[index].unit = selectedMaster.unit || 'Pcs';
            }
        }

        // Reset item name if category changes
        if (field === 'category') {
            newItems[index].item_name = '';
        }

        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.worker_id) return alert("Please select a worker.");
        if (items.some(i => !i.item_name || !i.qty)) return alert("Please fill all item details.");

        setSaving(true);
        try {
            let issueId = id;

            if (id) {
                const { error } = await supabase.from('material_issues').update({
                    worker_id: formData.worker_id,
                    production_order_id: formData.production_order_id,
                    issue_date: formData.issue_date,
                    remarks: formData.remarks
                }).eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('material_issues').insert([formData]).select().single();
                if (error) throw error;
                issueId = data.id;
            }

            // Update items
            if (id) {
                await supabase.from('material_issue_items').delete().eq('material_issue_id', issueId);
            }

            const itemsToInsert = items.map(item => ({
                material_issue_id: issueId,
                item_name: item.item_name,
                qty: parseFloat(item.qty),
                unit: item.unit
            }));

            const { error: itemError } = await supabase.from('material_issue_items').insert(itemsToInsert);
            if (itemError) throw itemError;

            alert("Material Issue saved successfully!");
            navigate('/production/material-issues');
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-sage-400 italic">Loading form...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/production/material-issues')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit' : 'New'} Material Issue</h1>
                        <p className="text-sage-500 text-sm">Issue trims and accessories to workers</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Issue Note'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Header Info */}
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

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Order / Style (Optional)</label>
                            <div className="relative">
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-300" size={16} />
                                <select
                                    value={formData.production_order_id}
                                    onChange={(e) => setFormData({ ...formData, production_order_id: e.target.value })}
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

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Remarks</label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                placeholder="Any notes..."
                                className="w-full px-4 py-2 bg-white border border-sage-200 rounded-lg text-sm h-20 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                        <div className="p-4 border-b border-sage-100 flex items-center justify-between">
                            <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Box size={18} className="text-sage-400" /> Material List
                            </h3>
                            <button
                                onClick={handleAddItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-50 text-sage-600 rounded-lg hover:bg-sage-100 transition-all border border-sage-200 text-xs font-bold"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <table className="w-full text-sm text-left">
                            <thead className="bg-sage-50/50 text-[10px] font-bold text-sage-400 uppercase tracking-widest border-b border-sage-100">
                                <tr>
                                    <th className="px-6 py-3 w-48">Category</th>
                                    <th className="px-6 py-3">Material Name</th>
                                    <th className="px-6 py-3 w-28">Qty</th>
                                    <th className="px-6 py-3 w-24 text-center">Unit</th>
                                    <th className="px-6 py-3 w-16 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sage-50/50">
                                {items.map((item, index) => (
                                    <tr key={index} className="hover:bg-sage-50/30 transition-colors group">
                                        <td className="px-4 py-2">
                                            <select
                                                required
                                                value={item.category}
                                                onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                                className="w-full px-2 py-2 bg-transparent border border-transparent focus:border-sage-200 focus:bg-white rounded-lg outline-none transition-all text-xs"
                                            >
                                                <option value="">Select Category...</option>
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                required
                                                disabled={!item.category}
                                                value={item.item_name}
                                                onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                                className="w-full px-3 py-2 bg-transparent border border-transparent focus:border-sage-200 focus:bg-white rounded-lg outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select Material...</option>
                                                {masterItems
                                                    .filter(m => m.materialType === item.category)
                                                    .map(m => <option key={m.id} value={m.name}>{m.name}</option>)
                                                }
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                required
                                                value={item.qty}
                                                onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2 bg-transparent border border-transparent focus:border-sage-200 focus:bg-white rounded-lg outline-none font-bold text-sage-800 transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="inline-block px-2 py-1 bg-sage-50 text-sage-600 rounded text-[10px] font-black uppercase tracking-tighter">
                                                {item.unit || 'Pcs'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-2 text-sage-300 hover:text-red-500 transition-colors"
                                                title="Remove Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {items.length === 0 && (
                            <div className="p-8 text-center text-sage-400 italic">
                                No items added. Click "Add Item" to start.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialIssueForm;
