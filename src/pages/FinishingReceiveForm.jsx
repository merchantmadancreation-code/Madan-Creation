import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, ShoppingBag, Hash, Calendar, User, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const FinishingReceiveForm = () => {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [orders, setOrders] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [orderDetails, setOrderDetails] = useState(null);
    const [receivedTotals, setReceivedTotals] = useState({});

    const [formData, setFormData] = useState({
        worker_id: '',
        production_order_id: '',
        receive_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    const [sizeQuantities, setSizeQuantities] = useState({});

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const { data: oData } = await supabase.from('production_orders').select(`
                id, order_no, 
                styles(styleNo, sizeWiseDetails)
            `);
            const { data: wData } = await supabase.from('workers').select('id, name').eq('status', 'Active');

            setOrders(oData || []);
            setWorkers(wData || []);

            if (editId) {
                const { data: receiveInfo } = await supabase
                    .from('finishing_receives')
                    .select('*, finishing_receive_items(*)')
                    .eq('id', editId)
                    .single();

                if (receiveInfo) {
                    setFormData({
                        worker_id: receiveInfo.worker_id,
                        production_order_id: receiveInfo.production_order_id,
                        receive_date: receiveInfo.receive_date,
                        remarks: receiveInfo.remarks || ''
                    });

                    const qtys = {};
                    receiveInfo.finishing_receive_items?.forEach(itm => {
                        qtys[itm.size] = itm.quantity;
                    });
                    // Will update state below since order dependency handles sizes
                    setSizeQuantities(qtys);
                }
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [editId]);

    // Handle Order Selection Effects
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
                }

                // Fetch previous finishing receives for this PO
                const { data: prevItems } = await supabase
                    .from('finishing_receive_items')
                    .select('size, quantity, finishing_receives!inner(production_order_id)')
                    .eq('finishing_receives.production_order_id', formData.production_order_id);

                // Fetch stitching sums for upper bounds
                const { data: stitchedItems } = await supabase
                    .from('stitching_receive_items')
                    .select('size, quantity, stitching_receives!inner(production_order_id)')
                    .eq('stitching_receives.production_order_id', formData.production_order_id);

                const totals = {};
                prevItems?.forEach(itm => {
                    totals[itm.size] = (totals[itm.size] || 0) + itm.quantity;
                });

                const stitchTotals = {};
                stitchedItems?.forEach(itm => {
                    stitchTotals[itm.size] = (stitchTotals[itm.size] || 0) + itm.quantity;
                });

                setReceivedTotals({
                    finishing: totals,
                    stitched: stitchTotals
                });
            }
        };

        loadOrderStats();
    }, [formData.production_order_id, orders]); // Removed editId and sizeQuantities from deps to avoid infinite loops

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
            let receiveId = editId;

            if (editId) {
                await supabase.from('finishing_receives').update({
                    worker_id: formData.worker_id,
                    production_order_id: formData.production_order_id,
                    receive_date: formData.receive_date,
                    remarks: formData.remarks
                }).eq('id', editId);

                await supabase.from('finishing_receive_items').delete().eq('receive_id', editId);
            } else {
                const receipt_no = `FIN-${Date.now().toString().slice(-6)}`;
                const { data } = await supabase.from('finishing_receives').insert([{
                    worker_id: formData.worker_id,
                    production_order_id: formData.production_order_id,
                    receive_date: formData.receive_date,
                    receipt_no,
                    remarks: formData.remarks
                }]).select().single();

                receiveId = data.id;
            }

            const itemsToInsert = [];
            for (const [size, qty] of Object.entries(sizeQuantities)) {
                const count = parseInt(qty);
                if (count > 0) {
                    itemsToInsert.push({
                        receive_id: receiveId,
                        size,
                        quantity: count
                    });
                }
            }

            if (itemsToInsert.length > 0) {
                await supabase.from('finishing_receive_items').insert(itemsToInsert);
            }

            alert(editId ? "Finishing receipt updated!" : "Finishing receipt saved successfully!");
            navigate('/finishing/receive');
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
                <button onClick={() => navigate('/finishing/receive')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                    <ArrowLeft className="text-sage-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">{editId ? 'Edit' : 'New'} Finishing Receipt</h1>
                    <p className="text-sage-500 text-sm">Receive stitched garments into finishing operations</p>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-sage-200">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Select Worker/Department</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                                <select
                                    required
                                    value={formData.worker_id}
                                    onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                >
                                    <option value="">Select Target...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Select Order / Style</label>
                            <div className="relative">
                                <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                                <select
                                    required
                                    value={formData.production_order_id}
                                    onChange={(e) => setFormData({ ...formData, production_order_id: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                    disabled={!!editId} // Typically shouldn't change PO during edit to avoid size mismatches
                                >
                                    <option value="">Select Order...</option>
                                    {orders.map(order => (
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
                                <Hash size={16} /> Received Quantity Input
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                {orderDetails.sizes.map(({ size }) => {
                                    const stitched = receivedTotals?.stitched?.[size] || 0;
                                    const finPrev = receivedTotals?.finishing?.[size] || 0;
                                    // If editing, finPrev includes the current record's amount. We ideally subtract current amount to show true 'other' previous receives, but this is a simplified view.

                                    return (
                                        <div key={size} className="space-y-1">
                                            <label className="text-[10px] font-bold text-sage-400 uppercase text-center block">{size}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={sizeQuantities[size] || ''}
                                                onChange={(e) => handleQtyChange(size, e.target.value)}
                                                className="w-full text-center py-2 bg-sage-50 border border-sage-200 rounded-lg font-bold text-sage-800 focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                                            />
                                            <div className="text-[9px] text-center font-bold">
                                                <span className="text-blue-500" title="Total Stitched">Sti: {stitched}</span>
                                                <span className="text-sage-300 mx-1">|</span>
                                                <span className="text-emerald-600" title="Already Finished">Fin: {finPrev}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center mt-4">
                                <span className="text-emerald-700 font-bold text-sm uppercase tracking-widest">Total Entry</span>
                                <span className="text-3xl font-black text-emerald-900">
                                    {Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-sage-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Receive Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={formData.receive_date}
                                    onChange={(e) => setFormData({ ...formData, receive_date: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Remarks</label>
                            <input
                                type="text"
                                placeholder="Any notes or remarks..."
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-sage-800 text-white rounded-xl font-bold text-lg hover:bg-sage-900 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save size={20} />}
                            {editId ? 'Update Finishing Receipt' : 'Save Finishing Receipt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FinishingReceiveForm;
