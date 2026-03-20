import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProduction } from '../context/ProductionContext';
import { Save, ArrowLeft, Plus, Trash2, Tag, User, Calendar, Layers } from 'lucide-react';
import clsx from 'clsx';

const ProductionOrderForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { buyers, seasons, refresh } = useProduction();

    const [styles, setStyles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        order_no: '',
        style_id: '',
        buyer_id: '',
        season_id: '',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        total_qty: 0,
        remarks: '',
        quantity_breakdown: [] // [{ color: '', sizes: { 'S': 0, 'M': 0... } }]
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: st } = await supabase
                .from('styles')
                .select('id, styleNo, buyerId, buyerName, buyerPO, color, sizeWiseDetails, season_id, season');
            setStyles(st || []);

            if (id) {
                const { data: ord } = await supabase.from('production_orders').select('*').eq('id', id).single();
                if (ord) setFormData(ord);
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleStyleChange = (styleId) => {
        const style = styles.find(s => s.id === styleId);
        if (!style) return;

        // Map season if possible (by name match)
        const matchedSeason = seasons.find(s =>
            s.id === style.season_id || // if direct link exists
            s.name.toLowerCase() === style.season?.toLowerCase() // name match fallback
        );

        // Map buyer if possible
        const matchedBuyer = buyers.find(b =>
            b.id === style.buyerId || // if direct link exists
            b.name.toLowerCase() === style.buyerName?.toLowerCase() // name match fallback
        );

        // Generate a suggested Order No from Style's PO or Style No
        const suggestedOrderNo = style.buyerPO || `PRO-${style.styleNo}-${new Date().getFullYear()}`;

        // Convert Style sizeWiseDetails to Production breakdown format
        const breakdown = [{
            color: style.color || '',
            sizes: (style.sizeWiseDetails || []).reduce((acc, curr) => {
                acc[curr.size] = Number(curr.qty) || 0;
                return acc;
            }, {})
        }];

        // Calculate total Qty
        const total = parseFloat(Object.values(breakdown[0].sizes).reduce((sum, q) => sum + q, 0).toFixed(3));

        setFormData(prev => ({
            ...prev,
            style_id: styleId,
            order_no: prev.order_no || suggestedOrderNo, // Only fill if empty
            buyer_id: matchedBuyer?.id || style.buyerId || prev.buyer_id,
            season_id: matchedSeason?.id || prev.season_id,
            quantity_breakdown: breakdown,
            total_qty: total
        }));
    };

    const handleAddBreakdown = () => {
        setFormData(prev => ({
            ...prev,
            quantity_breakdown: [...prev.quantity_breakdown, { color: '', sizes: {} }]
        }));
    };

    const handleUpdateBreakdown = (index, field, value) => {
        const newBreakdown = [...formData.quantity_breakdown];
        newBreakdown[index][field] = value;

        // Recalculate total qty
        let total = 0;
        newBreakdown.forEach(b => {
            Object.values(b.sizes).forEach(q => total += Number(q || 0));
        });

        setFormData({ ...formData, quantity_breakdown: newBreakdown, total_qty: parseFloat(total.toFixed(3)) });
    };

    const handleUpdateSizeQty = (index, size, qty) => {
        const newBreakdown = [...formData.quantity_breakdown];
        newBreakdown[index].sizes[size] = Number(qty);

        // Recalculate total
        let total = 0;
        newBreakdown.forEach(b => {
            Object.values(b.sizes).forEach(q => total += Number(q || 0));
        });

        setFormData({ ...formData, quantity_breakdown: newBreakdown, total_qty: parseFloat(total.toFixed(3)) });
    };

    const sanitizeData = (data) => {
        const cleaned = { ...data };
        if (cleaned.buyer_id === '') cleaned.buyer_id = null;
        if (cleaned.style_id === '') cleaned.style_id = null;
        if (cleaned.season_id === '') cleaned.season_id = null;
        if (cleaned.delivery_date === '') cleaned.delivery_date = null;

        // Remove joined objects if any were accidentally pulled in
        delete cleaned.style;
        delete cleaned.buyer;
        delete cleaned.season;

        return cleaned;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.order_no || !formData.style_id) {
            alert("Order No and Style are required.");
            return;
        }

        setSaving(true);
        try {
            const cleanData = sanitizeData(formData);
            const { error } = id
                ? await supabase.from('production_orders').update(cleanData).eq('id', id)
                : await supabase.from('production_orders').insert([cleanData]);

            if (!error) {
                alert(`Production Order ${id ? 'updated' : 'saved'} successfully!`);
                refresh();
                navigate('/production-orders');
            } else {
                console.error("Supabase Error:", error);
                alert(error.message);
            }
        } catch (err) {
            console.error("Submission Error:", err);
            alert("An unexpected error occurred. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const selectedStyle = styles.find(s => s.id === formData.style_id);
    const availableSizes = selectedStyle?.sizeWiseDetails?.map(s => s.size) || ['S', 'M', 'L', 'XL', 'XXL'];

    if (loading) return <div className="p-8 text-center text-sage-500 italic">Initializing form...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit' : 'New'} Production Order</h1>
                        <p className="text-sage-500 text-sm">Plan and break down your production batch</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Order'}
                </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* General Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Layers size={16} className="text-sage-400" /> General Details
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Order No</label>
                            <input
                                required
                                value={formData.order_no}
                                onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                                placeholder="e.g. PRO-2024-001"
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-500/20"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Style No</label>
                            <select
                                required
                                value={formData.style_id}
                                onChange={(e) => handleStyleChange(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-sage-300 rounded-lg text-sm font-bold shadow-sm focus:ring-2 focus:ring-sage-500/20"
                            >
                                <option value="">Select Style</option>
                                {styles.map(s => <option key={s.id} value={s.id}>{s.styleNo}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Buyer</label>
                            <select
                                required
                                value={formData.buyer_id}
                                onChange={(e) => setFormData({ ...formData, buyer_id: e.target.value })}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                            >
                                <option value="">Select Buyer</option>
                                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Season</label>
                            <select
                                value={formData.season_id}
                                onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                            >
                                <option value="">Select Season</option>
                                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.order_date}
                                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                    className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Delivery</label>
                                <input
                                    type="date"
                                    value={formData.delivery_date}
                                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                                    className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-xs"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-sage-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-sage-400">Total Planned Qty</span>
                            <span className="text-xl font-black text-sage-800">{formData.total_qty} <small className="text-[10px] font-bold text-sage-400 uppercase">pcs</small></span>
                        </div>
                    </div>
                </div>

                {/* Quantity Breakdown */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Tag size={16} className="text-sage-400" /> Color & Size Breakdown
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddBreakdown}
                                className="text-xs font-bold text-sage-600 hover:text-sage-800 flex items-center gap-1 px-3 py-1.5 bg-sage-50 rounded-lg transition-colors border border-sage-200"
                            >
                                <Plus size={14} /> Add Color Row
                            </button>
                        </div>

                        {formData.quantity_breakdown.length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-sage-100 rounded-xl text-center">
                                <p className="text-sage-400 text-sm italic">No breakdown added. Click "Add Color Row" to begin planning.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.quantity_breakdown.map((row, idx) => (
                                    <div key={idx} className="p-4 bg-sage-50/50 rounded-xl border border-sage-100 space-y-3 relative group">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nb = formData.quantity_breakdown.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, quantity_breakdown: nb });
                                            }}
                                            className="absolute -top-2 -right-2 p-1 bg-white border border-red-200 text-red-500 rounded-lg transition-opacity shadow-sm"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 max-w-[150px]">
                                                <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1 block">Fabric Color</label>
                                                <input
                                                    value={row.color}
                                                    onChange={(e) => handleUpdateBreakdown(idx, 'color', e.target.value)}
                                                    placeholder="e.g. Navy Blue"
                                                    className="w-full px-3 py-1.5 bg-white border border-sage-200 rounded text-xs font-bold"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-wrap gap-3">
                                                {availableSizes.map(size => (
                                                    <div key={size} className="w-16">
                                                        <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1 block text-center">{size}</label>
                                                        <input
                                                            type="number"
                                                            value={row.sizes[size] || ''}
                                                            onChange={(e) => handleUpdateSizeQty(idx, size, e.target.value)}
                                                            placeholder="0"
                                                            className="w-full px-2 py-1.5 bg-white border border-sage-200 rounded text-xs text-center focus:border-sage-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider">Production Notes</h3>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            placeholder="Add any special instructions for the production line..."
                            className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm h-32 resize-none"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductionOrderForm;
