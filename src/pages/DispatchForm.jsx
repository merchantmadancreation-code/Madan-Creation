import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, ShoppingBag, Hash, Calendar, Truck, UserCircle } from 'lucide-react';

const DispatchForm = () => {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [orders, setOrders] = useState([]);
    const [buyers, setBuyers] = useState([]);
    const [orderDetails, setOrderDetails] = useState(null);
    const [receivedTotals, setReceivedTotals] = useState({});

    const [formData, setFormData] = useState({
        buyer_id: '',
        production_order_id: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        invoice_no: '',
        vehicle_no: '',
        rate: '',
        gst_rate: 5,
        remarks: ''
    });

    const [sizeQuantities, setSizeQuantities] = useState({});

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const { data: oData } = await supabase.from('production_orders').select(`
                id, order_no, buyer_id,
                styles(styleNo, sizeWiseDetails, perPcsAvg, stitchingRate)
            `);
            const { data: bData } = await supabase.from('buyers').select('id, name');

            setOrders(oData || []);
            setBuyers(bData || []);

            if (editId) {
                const { data: dispatchInfo } = await supabase
                    .from('dispatch_registers')
                    .select('*, dispatch_items(*)')
                    .eq('id', editId)
                    .single();

                if (dispatchInfo) {
                    setFormData({
                        buyer_id: dispatchInfo.buyer_id,
                        production_order_id: dispatchInfo.production_order_id,
                        dispatch_date: dispatchInfo.dispatch_date,
                        invoice_no: dispatchInfo.invoice_no || '',
                        vehicle_no: dispatchInfo.vehicle_no || '',
                        rate: dispatchInfo.rate || '',
                        gst_rate: dispatchInfo.gst_rate ?? 5,
                        remarks: dispatchInfo.remarks || ''
                    });

                    const qtys = {};
                    dispatchInfo.dispatch_items?.forEach(itm => {
                        qtys[itm.size] = itm.quantity;
                    });
                    setSizeQuantities(qtys);
                }
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [editId]);

    // Handle Order Selection Effects - dynamically filter order drop down based on buyer
    const filteredOrders = formData.buyer_id
        ? orders.filter(o => o.buyer_id === formData.buyer_id)
        : orders;

    // Clear order if buyer changes and order doesn't belong to buyer
    useEffect(() => {
        if (formData.buyer_id && formData.production_order_id) {
            const orderBelongsToBuyer = orders.find(o => o.id === formData.production_order_id)?.buyer_id === formData.buyer_id;
            if (!orderBelongsToBuyer && !editId) {
                setFormData(prev => ({ ...prev, production_order_id: '' }));
            }
        }
    }, [formData.buyer_id, orders]);

    useEffect(() => {
        const loadOrderStats = async () => {
            if (!formData.production_order_id) {
                setOrderDetails(null);
                if (!editId) setSizeQuantities({});
                setReceivedTotals({});
                return;
            }

            const order = orders.find(o => o.id === formData.production_order_id);
            if (order) {
                const rawSizes = order.styles?.sizeWiseDetails || [];
                const sizes = Array.isArray(rawSizes) ? rawSizes.filter(s => s.size && s.size !== 'TOTAL') : [];

                setOrderDetails({
                    styleNo: order.styles?.styleNo,
                    order_no: order.order_no,
                    sizes: sizes
                });

                if (!editId || Object.keys(sizeQuantities).length === 0) {
                    const initialQty = {};
                    sizes.forEach(s => initialQty[s.size] = '');
                    setSizeQuantities(initialQty);

                    // Auto-fill rate from style if available
                    let styleRate = '';
                    const sizeWithRate = rawSizes.find(s => s.rate && parseFloat(s.rate) > 0);

                    if (sizeWithRate) {
                        styleRate = sizeWithRate.rate;
                    } else if (order.styles?.stitchingRate) {
                        styleRate = order.styles.stitchingRate;
                    } else if (order.styles?.perPcsAvg) {
                        styleRate = order.styles.perPcsAvg;
                    }
                    if (styleRate && !formData.rate) {
                        setFormData(prev => ({ ...prev, rate: styleRate }));
                    }
                }

                // Dispatched so far
                const { data: prevDispatches } = await supabase
                    .from('dispatch_items')
                    .select('size, quantity, dispatch_registers!inner(production_order_id)')
                    .eq('dispatch_registers.production_order_id', formData.production_order_id);

                // Finished received totals
                const { data: finItems } = await supabase
                    .from('finishing_receive_items')
                    .select('size, quantity, finishing_receives!inner(production_order_id)')
                    .eq('finishing_receives.production_order_id', formData.production_order_id);

                const dispatchTot = {};
                prevDispatches?.forEach(itm => {
                    dispatchTot[itm.size] = (dispatchTot[itm.size] || 0) + itm.quantity;
                });

                const finTot = {};
                finItems?.forEach(itm => {
                    finTot[itm.size] = (finTot[itm.size] || 0) + itm.quantity;
                });

                setReceivedTotals({
                    finishing: finTot,
                    dispatched: dispatchTot
                });
            }
        };

        loadOrderStats();
    }, [formData.production_order_id, orders]);

    const handleQtyChange = (size, value) => {
        setSizeQuantities(prev => ({
            ...prev,
            [size]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const totalQty = Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
        if (totalQty === 0) return alert("Please enter quantity for at least one size.");

        setSaving(true);
        try {
            let dispatchId = editId;
            let finalInvoiceNo = formData.invoice_no.trim();
            if (!finalInvoiceNo) {
                finalInvoiceNo = `INV-${Date.now().toString().slice(-6)}`;
            }

            if (editId) {
                await supabase.from('dispatch_registers').update({
                    buyer_id: formData.buyer_id,
                    production_order_id: formData.production_order_id,
                    dispatch_date: formData.dispatch_date,
                    invoice_no: finalInvoiceNo,
                    vehicle_no: formData.vehicle_no,
                    rate: formData.rate || 0,
                    gst_rate: formData.gst_rate || 5,
                    remarks: formData.remarks
                }).eq('id', editId);

                await supabase.from('dispatch_items').delete().eq('dispatch_id', editId);
            } else {
                const { data } = await supabase.from('dispatch_registers').insert([{
                    buyer_id: formData.buyer_id,
                    production_order_id: formData.production_order_id,
                    dispatch_date: formData.dispatch_date,
                    invoice_no: finalInvoiceNo,
                    vehicle_no: formData.vehicle_no,
                    rate: formData.rate || 0,
                    gst_rate: formData.gst_rate || 5,
                    remarks: formData.remarks
                }]).select().single();

                dispatchId = data.id;
            }

            const itemsToInsert = [];
            for (const [size, qty] of Object.entries(sizeQuantities)) {
                const count = parseInt(qty);
                if (count > 0) {
                    itemsToInsert.push({
                        dispatch_id: dispatchId,
                        size,
                        quantity: count
                    });
                }
            }

            if (itemsToInsert.length > 0) {
                await supabase.from('dispatch_items').insert(itemsToInsert);
            }

            alert(editId ? "Dispatch updated!" : "Dispatch saved successfully!");
            navigate('/dispatch');
        } catch (err) {
            console.error(err);
            alert("Error saving: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-sage-500">Loading form data...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/dispatch')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                    <ArrowLeft className="text-sage-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">{editId ? 'Edit' : 'New'} Dispatch</h1>
                    <p className="text-sage-500 text-sm">Send finished goods out to buyers</p>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-sage-200">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Select Buyer</label>
                            <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                <select
                                    required
                                    value={formData.buyer_id}
                                    onChange={(e) => setFormData({ ...formData, buyer_id: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-indigo-50/30 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="">Select Buyer...</option>
                                    {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Select Order / Style</label>
                            <div className="relative">
                                <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                                <select
                                    required
                                    value={formData.production_order_id}
                                    onChange={(e) => setFormData({ ...formData, production_order_id: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-indigo-50/30 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    disabled={!!editId} // Typically shouldn't change PO during edit
                                >
                                    <option value="">Select Order...</option>
                                    {filteredOrders.map(order => (
                                        <option key={order.id} value={order.id}>
                                            {order.styles?.styleNo} — {order.order_no}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {orderDetails && (
                        <div className="space-y-4 pt-4 border-t border-sage-100 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-sm font-bold text-sage-700 uppercase tracking-wider flex items-center gap-2">
                                <Hash size={16} /> Dispatched Quantity Input
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                {orderDetails.sizes.map(({ size }) => {
                                    const finPcs = receivedTotals?.finishing?.[size] || 0;
                                    const dispPrev = receivedTotals?.dispatched?.[size] || 0;

                                    return (
                                        <div key={size} className="space-y-1">
                                            <label className="text-[10px] font-bold text-sage-400 uppercase text-center block">{size}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={sizeQuantities[size] || ''}
                                                onChange={(e) => handleQtyChange(size, e.target.value)}
                                                className="w-full text-center py-2 bg-sage-50 border border-sage-200 rounded-lg font-bold text-sage-800 border-indigo-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            />
                                            <div className="text-[9px] text-center font-bold">
                                                <span className="text-emerald-500" title="Finished Stock">Fin: {finPcs}</span>
                                                <span className="text-sage-300 mx-1">|</span>
                                                <span className="text-indigo-400" title="Already Dispatched">Dsp: {dispPrev}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex justify-between items-center mt-4">
                                <span className="text-indigo-700 font-bold text-sm uppercase tracking-widest">Total Dispatching</span>
                                <span className="text-3xl font-black text-indigo-900">
                                    {Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-sage-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Dispatch Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={formData.dispatch_date}
                                    onChange={(e) => setFormData({ ...formData, dispatch_date: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Invoice / DC No (Optional)</label>
                            <input
                                type="text"
                                placeholder="Leave blank to auto-generate"
                                value={formData.invoice_no}
                                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest flex items-center gap-1">
                                <Truck size={14} /> Vehicle No
                            </label>
                            <input
                                type="text"
                                placeholder="E.g. PB-10-XX-1234"
                                value={formData.vehicle_no}
                                onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Rate / Pcs</label>
                            <input
                                type="number"
                                placeholder="E.g. 550"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">GST %</label>
                            <input
                                type="number"
                                placeholder="5"
                                value={formData.gst_rate}
                                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Remarks</label>
                            <input
                                type="text"
                                placeholder="Any notes or remarks..."
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save size={20} />}
                            {editId ? 'Update Dispatch' : 'Complete Dispatch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DispatchForm;
