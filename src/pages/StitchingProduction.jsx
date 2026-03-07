import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, ShoppingBag, Hash, Calendar, User, Printer, CheckCircle, Package, Search, Eye, Edit, Trash2, X, Tag } from 'lucide-react';
import clsx from 'clsx';
import BarcodeModal from '../components/BarcodeModal';

const StitchingProduction = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [entries, setEntries] = useState([]); // Recent receives
    const [orderDetails, setOrderDetails] = useState(null);
    const [receivedTotals, setReceivedTotals] = useState({}); // { 'S': 40, 'M': 50 }
    const [generatedBarcodes, setGeneratedBarcodes] = useState(null); // For printing after save

    const [formData, setFormData] = useState({
        worker_id: '',
        production_order_id: '',
        receive_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    const [sizeQuantities, setSizeQuantities] = useState({}); // { 'S': 5, 'M': 10 }
    const [searchTerm, setSearchTerm] = useState('');
    const [viewItem, setViewItem] = useState(null);
    const [editId, setEditId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: oData } = await supabase.from('production_orders').select(`
                id, order_no, 
                styles(styleNo, sizeWiseDetails, stitchingRate, color)
            `);
            const { data: wData } = await supabase.from('workers').select('id, name').eq('status', 'Active');

            setOrders(oData || []);
            setWorkers(wData || []);
            fetchRecentReceives();
            setLoading(false);
        };
        fetchData();
    }, []);

    const fetchRecentReceives = async () => {
        const { data } = await supabase
            .from('stitching_receives')
            .select(`
                *,
                workers(name),
                production_orders(order_no, styles(styleNo, stitchingRate, color)),
                stitching_receive_items(size, color, quantity)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        setEntries(data || []);
    };

    // Handle Order Selection: Load sizes & previous receives
    useEffect(() => {
        const loadOrderStats = async () => {
            if (!formData.production_order_id) {
                setOrderDetails(null);
                setSizeQuantities({});
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

                // Reset current quantities
                const initialQty = {};
                sizes.forEach(s => initialQty[s.size] = '');
                setSizeQuantities(initialQty);

                // Fetch previous receives for this order to show progress
                const { data: prevItems } = await supabase
                    .from('stitching_receive_items')
                    .select('size, quantity, stitching_receives!inner(production_order_id)')
                    .eq('stitching_receives.production_order_id', formData.production_order_id);

                const totals = {};
                prevItems?.forEach(itm => {
                    totals[itm.size] = (totals[itm.size] || 0) + itm.quantity;
                });
                setReceivedTotals(totals);
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

    const handleDeleteReceive = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setSaving(true);
        const { error } = await supabase.from('stitching_receives').delete().eq('id', deleteId);
        if (error) alert("Error: " + error.message);
        else fetchRecentReceives();
        setDeleteId(null);
        setSaving(false);
    };

    const handleEditReceive = (entry) => {
        setEditId(entry.id);
        setFormData({
            worker_id: entry.worker_id || '',
            production_order_id: entry.production_order_id || '',
            receive_date: entry.receive_date,
            remarks: entry.remarks || ''
        });

        const qtys = {};
        entry.stitching_receive_items?.forEach(itm => {
            qtys[itm.size] = itm.quantity;
        });
        setSizeQuantities(qtys);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrintReceipt = (data) => {
        const printWindow = window.open('', '', 'width=800,height=900');
        const items = data.stitching_receive_items || [];
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

        // Robust access for joined data
        const po = Array.isArray(data.production_orders) ? data.production_orders[0] : data.production_orders;
        const style = Array.isArray(po?.styles) ? po.styles[0] : po?.styles;
        const rate = style?.stitchingRate || style?.stitching_rate || 0;

        const totalAmount = totalQty * rate;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Production Receipt - ${data.receipt_no}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-info h1 { margin: 0; font-size: 28px; font-weight: 900; }
                        .company-info p { margin: 5px 0; font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px; }
                        .receipt-details { text-align: right; }
                        .receipt-details h2 { margin: 0; font-size: 18px; color: #888; }
                        
                        .info-box { background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee; margin-bottom: 10px; }
                        .info-label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                        .info-value { font-size: 14px; font-weight: bold; }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #333; color: #fff; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                        .total-row { background: #f0f0f0; font-weight: bold; }
                        
                        .price-info { font-family: monospace; font-weight: bold; color: #666; }
                        .amount { font-weight: 900; color: #000; }

                        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                        .signature-box { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-info"><h1>MADAN CREATION</h1><p>Worker Production Receipt</p></div>
                        <div class="receipt-details"><h2>${data.receipt_no}</h2><p>${new Date(data.receive_date).toLocaleDateString()}</p></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div class="info-box"><div class="info-label">Produced By</div><div class="info-value">${data.workers?.name}</div></div>
                        <div class="info-box"><div class="info-label">Style / Order</div><div class="info-value">${style?.styleNo} / ${po?.order_no}</div></div>
                    </div>
                    <table>
                        <thead><tr><th>Size</th><th>Color</th><th style="text-align: right;">Rate/Pcs</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Amount</th></tr></thead>
                        <tbody>${items.map(i => `<tr><td>${i.size}</td><td>${i.color || style?.color || '-'}</td><td style="text-align: right;" class="price-info">₹ ${parseFloat(rate).toFixed(2)}</td><td style="text-align: right; font-weight: bold;">${i.quantity}</td><td style="text-align: right;" class="amount">₹ ${(i.quantity * rate).toFixed(2)}</td></tr>`).join('')}</tbody>
                        <tfoot><tr class="total-row"><td colspan="3" style="text-align: right;">Total Pieces & Wages</td><td style="text-align: right;">${totalQty} PCS</td><td style="text-align: right;">₹ ${totalAmount.toFixed(2)}</td></tr></tfoot>
                    </table>
                    <div class="footer"><div class="signature-box">Receiver Signature</div><div class="signature-box">Worker Signature</div></div>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const handleReprintBarcodes = async (receiptId) => {
        // Fetch items first to get IDs
        const { data: items } = await supabase.from('stitching_receive_items').select('id').eq('receive_id', receiptId);
        if (!items?.length) return alert("No items found.");

        const { data: barcodes, error } = await supabase
            .from('garment_barcodes')
            .select('*')
            .in('receive_item_id', items.map(i => i.id));

        if (error) alert(error.message);
        else if (!barcodes?.length) alert("No barcodes generated for this receipt.");
        else setGeneratedBarcodes(barcodes);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const totalQty = Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
        if (totalQty === 0) return alert("Please enter quantity for at least one size.");

        setSaving(true);
        try {
            // 1. Generate Receipt No
            const receipt_no = `REC-${Date.now().toString().slice(-6)}`;

            // 2. Create/Update Receive Header
            let receive;
            if (editId) {
                const { data, error } = await supabase
                    .from('stitching_receives')
                    .update({
                        worker_id: formData.worker_id,
                        production_order_id: formData.production_order_id,
                        receive_date: formData.receive_date,
                        remarks: formData.remarks
                    })
                    .eq('id', editId)
                    .select()
                    .single();
                if (error) throw error;
                receive = data;

                // For simplified editing, we delete old items and re-insert 
                // (Note: This might affect barcode associations if we don't handle it carefully,
                // but for a correction tool it's often preferred to cleanup and restart or just allow editing of header)
                // Actually, if we delete items, barcodes with ON DELETE CASCADE will vanish.
                // Let's only allow editing existing quantities if barcodes are not yet "moved" to next stage?
                // For now, to keep it functional, let's just update the header and items.
                await supabase.from('stitching_receive_items').delete().eq('receive_id', editId);
            } else {
                const { data, error } = await supabase
                    .from('stitching_receives')
                    .insert([{
                        worker_id: formData.worker_id,
                        production_order_id: formData.production_order_id,
                        receive_date: formData.receive_date,
                        receipt_no,
                        remarks: formData.remarks
                    }])
                    .select()
                    .single();
                if (error) throw error;
                receive = data;
            }

            // 3. Create Items & Generate Barcodes
            const barcodesToBatch = [];

            for (const [size, qty] of Object.entries(sizeQuantities)) {
                const count = parseInt(qty);
                if (count > 0) {
                    // Create receive item
                    const { data: item, error: iError } = await supabase
                        .from('stitching_receive_items')
                        .insert([{
                            receive_id: receive.id,
                            size,
                            color: orders.find(o => o.id === formData.production_order_id)?.styles?.color || null,
                            quantity: count
                        }])
                        .select()
                        .single();

                    if (iError) throw iError;

                    // GenerateIndividual Barcodes
                    for (let i = 1; i <= count; i++) {
                        const randomTail = Math.random().toString(36).substring(2, 5).toUpperCase();
                        const barcodeValue = `${receipt_no}-${size}-${i}-${randomTail}`;
                        barcodesToBatch.push({
                            receive_item_id: item.id,
                            production_order_id: receive.production_order_id,
                            barcode: barcodeValue,
                            size: size,
                            status: 'Stitched'
                        });
                    }
                }
            }

            // Batch insert barcodes
            if (barcodesToBatch.length > 0) {
                const { data: savedBarcodes, error: bError } = await supabase
                    .from('garment_barcodes')
                    .insert(barcodesToBatch)
                    .select();

                if (bError) throw bError;
                setGeneratedBarcodes(savedBarcodes);
            }

            alert(editId ? "Production updated successfully!" : `Production received successfully! ${barcodesToBatch.length} barcodes generated.`);
            setFormData({ ...formData, remarks: '', worker_id: '', production_order_id: '' });
            setSizeQuantities({});
            setEditId(null);
            fetchRecentReceives();

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-sage-500">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/stitching')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">Worker Production Receiving</h1>
                        <p className="text-sage-500 text-sm">Receive stitched pieces and generate barcodes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Form Section */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Select Worker</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                                        <select
                                            required
                                            value={formData.worker_id}
                                            onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                        >
                                            <option value="">Select Worker...</option>
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

                            {/* Size Breakdown Grid */}
                            {orderDetails && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center justify-between border-b border-sage-100 pb-2">
                                        <h3 className="text-sm font-bold text-sage-700 uppercase tracking-wider flex items-center gap-2">
                                            <Hash size={16} /> Size-Wise Quantity Input
                                        </h3>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Enter Pcs from Worker</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                        {orderDetails.sizes.map(({ size, qty: orderedQty }) => (
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
                                                    <span className="text-sage-400">Ord: {orderedQty}</span>
                                                    <span className="text-sage-300 mx-1">|</span>
                                                    <span className={clsx(
                                                        "transition-colors",
                                                        (receivedTotals[size] || 0) >= orderedQty ? "text-emerald-600" : "text-blue-500"
                                                    )}>Rec: {receivedTotals[size] || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex justify-between items-center mt-4">
                                        <span className="text-blue-700 font-bold text-sm uppercase">Total Receiving:</span>
                                        <span className="text-2xl font-black text-blue-900">
                                            {Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0)} Pcs
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        placeholder="Optional notes..."
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-sage-800 text-white rounded-xl font-bold text-lg hover:bg-sage-900 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> Saving...</> : <><Save size={20} /> {editId ? "Update Receive" : "Save & Generate Barcodes"}</>}
                            </button>
                            {editId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditId(null);
                                        setFormData({ worker_id: '', production_order_id: '', receive_date: new Date().toISOString().split('T')[0], remarks: '' });
                                        setSizeQuantities({});
                                    }}
                                    className="w-full py-2 text-sage-500 font-bold hover:bg-sage-100 rounded-xl transition-colors"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {/* Comprehensive Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-6 border-b border-sage-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-sage-800 flex items-center gap-2">
                            <Package className="text-emerald-600" size={20} /> Production Receive Log
                        </h2>
                        <p className="text-sage-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Manage and Search Recent Entries</p>
                    </div>

                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by Worker, Style, Order, Receipt..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-sage-50 border border-sage-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/10 transition-all font-bold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-sage-50/50 text-sage-500 text-[10px] font-black uppercase tracking-widest">
                                <th className="px-6 py-4">Receipt / Date</th>
                                <th className="px-6 py-4">Worker</th>
                                <th className="px-6 py-4">Style & Order</th>
                                <th className="px-6 py-4">Breakdown</th>
                                <th className="px-6 py-4 text-center">Total</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {entries
                                .filter(e => {
                                    const searchStr = `${e.receipt_no} ${e.workers?.name} ${e.production_orders?.styles?.styleNo} ${e.production_orders?.order_no}`.toLowerCase();
                                    return searchStr.includes(searchTerm.toLowerCase());
                                })
                                .map(entry => {
                                    const totalQty = entry.stitching_receive_items?.reduce((sum, itm) => sum + itm.quantity, 0);
                                    return (
                                        <tr key={entry.id} className="hover:bg-sage-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-sage-800 text-sm">{entry.receipt_no}</div>
                                                <div className="text-[10px] text-sage-400 font-bold">{new Date(entry.receive_date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-sage-700 text-sm italic">{entry.workers?.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-sage-800">{entry.production_orders?.styles?.styleNo}</div>
                                                <div className="text-[10px] text-blue-500 font-bold">{entry.production_orders?.order_no}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {entry.stitching_receive_items?.map((itm, idx) => (
                                                        <span key={idx} className="bg-sage-50 px-1.5 py-0.5 rounded border border-sage-100 text-[9px] font-black text-sage-600">
                                                            {itm.size}: {itm.quantity}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black text-xs">
                                                    {totalQty} Pcs
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 transition-all">
                                                    <button onClick={() => setViewItem(entry)} className="p-2 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View"><Eye size={16} /></button>
                                                    <button onClick={() => handlePrintReceipt(entry)} className="p-2 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Print Receipt"><Printer size={16} /></button>
                                                    <button onClick={() => handleReprintBarcodes(entry.id)} className="p-2 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Print Barcodes"><Tag size={16} /></button>
                                                    <button onClick={() => handleEditReceive(entry)} className="p-2 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteReceive(entry.id)} className="p-2 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                    {entries.length === 0 && (
                        <div className="p-20 text-center text-sage-400 italic font-medium">No production entries found.</div>
                    )}
                </div>
            </div>

            {/* View Modal */}
            {
                viewItem && (
                    <div className="fixed inset-0 bg-sage-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                            <div className="p-5 border-b border-sage-100 flex justify-between items-center bg-sage-50/50">
                                <div>
                                    <h3 className="font-black text-sage-800 uppercase tracking-[0.2em] text-[10px]">Worker Receiving Details</h3>
                                    <p className="font-bold text-sage-400 text-[9px] uppercase mt-0.5">{viewItem.receipt_no}</p>
                                </div>
                                <button onClick={() => setViewItem(null)} className="p-2 hover:bg-sage-200 rounded-xl text-sage-500 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6 bg-sage-50/50 p-6 rounded-2xl border border-sage-100">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Worker</label>
                                        <div className="font-black text-sage-800 text-base">{viewItem.workers?.name}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Date</label>
                                        <div className="font-black text-sage-800">{new Date(viewItem.receive_date).toLocaleDateString()}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Style No</label>
                                        <div className="font-black text-sage-800">{viewItem.production_orders?.styles?.styleNo}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Color</label>
                                        <div className="font-black text-emerald-600">{(Array.isArray(viewItem.production_orders?.styles) ? viewItem.production_orders.styles[0] : viewItem.production_orders?.styles)?.color || 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Order</label>
                                        <div className="font-black text-blue-600 underline decoration-blue-100">{viewItem.production_orders?.order_no}</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-sage-400 uppercase tracking-widest flex items-center gap-2">
                                            <Hash size={12} /> Size Breakdown
                                        </h4>
                                        <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                            RATE: ₹ {(Array.isArray(viewItem.production_orders?.styles) ? viewItem.production_orders.styles[0] : viewItem.production_orders?.styles)?.stitchingRate || 0} / PCS
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {viewItem.stitching_receive_items?.map((itm, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-xl border border-sage-200 shadow-sm text-center">
                                                <div className="text-[10px] text-sage-400 font-black mb-1">{itm.size}</div>
                                                <div className="text-lg font-black text-blue-600">{itm.quantity}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Total Produced</span>
                                            <span className="text-2xl font-black text-emerald-800">{viewItem.stitching_receive_items?.reduce((sum, i) => sum + i.quantity, 0)} PCS</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Total Wages</span>
                                            <span className="text-2xl font-black text-emerald-800">₹ {(viewItem.stitching_receive_items?.reduce((sum, i) => sum + i.quantity, 0) * ((Array.isArray(viewItem.production_orders?.styles) ? viewItem.production_orders.styles[0] : viewItem.production_orders?.styles)?.stitchingRate || 0)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {viewItem.remarks && (
                                    <div className="bg-cream/30 p-4 rounded-xl border border-sage-100">
                                        <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest block mb-1">Remarks</label>
                                        <p className="italic text-sage-600 text-sm font-medium">{viewItem.remarks}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-sage-50 border-t border-sage-100 flex gap-3">
                                <button onClick={() => setViewItem(null)} className="flex-1 py-3 bg-white border border-sage-200 text-sage-700 rounded-xl font-bold hover:bg-white/50 transition-all text-sm">Close</button>
                                <button onClick={() => handlePrintReceipt(viewItem)} className="flex-2 py-3 bg-sage-800 text-white rounded-xl font-bold hover:bg-sage-900 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                                    <Printer size={16} /> Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteId && (
                    <div className="fixed inset-0 bg-sage-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                            <div className="p-5 border-b border-sage-100 flex justify-between items-center bg-red-50/50">
                                <h3 className="font-black text-red-800 uppercase tracking-[0.2em] text-[10px]">Confirm Deletion</h3>
                                <button onClick={() => setDeleteId(null)} className="p-2 hover:bg-red-200 rounded-xl text-red-500 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 text-center space-y-4">
                                <Trash2 size={48} className="text-red-500 mx-auto" />
                                <p className="text-sage-700 font-medium">Are you sure you want to delete this receive entry?</p>
                                <p className="text-sm text-red-600 font-bold">This action will also delete all associated items and barcodes and cannot be undone.</p>
                            </div>
                            <div className="p-4 bg-sage-50 border-t border-sage-100 flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-white border border-sage-200 text-sage-700 rounded-xl font-bold hover:bg-white/50 transition-all text-sm">Cancel</button>
                                <button onClick={confirmDelete} disabled={saving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Trash2 size={16} />} Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Generated Barcodes Modal for Printing */}
            {
                generatedBarcodes && (
                    <BarcodeModal
                        isOpen={!!generatedBarcodes}
                        onClose={() => setGeneratedBarcodes(null)}
                        item={generatedBarcodes.map(b => ({
                            id: b.id,
                            name: `${orderDetails?.styleNo} (${b.size})`,
                            fabricCode: b.barcode
                        }))}
                    />
                )
            }
        </div >
    );
};

export default StitchingProduction;
