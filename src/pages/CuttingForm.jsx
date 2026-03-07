import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Save, ArrowLeft, Scissors, FileText,
    Layers, Plus, Trash2, Tag, Hash,
    Printer, Package, CheckCircle, Zap
} from 'lucide-react';
import clsx from 'clsx';
import BarcodeModal from '../components/BarcodeModal';

const CuttingForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [productionOrders, setProductionOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        order_id: '',
        cutting_no: '',
        fabric_issued_qty: 0,
        marker_length: 0,
        lay_count: 0,
        total_cut_qty: 0,
        wastage_percentage: 0,
        total_fabric_received: 0,
        total_fabric_used: 0,
        cutting_type: '1 Pcs',
        component_details: [{ name: 'Main', fabric: 0, marker: 0, lay: 0 }],
        status: 'Pending',
        remarks: ''
    });

    // Fetch Fabric Received when Order/Style changes
    useEffect(() => {
        const fetchFabricReceived = async () => {
            const selectedPO = productionOrders.find(po => po.id === formData.order_id);
            if (!selectedPO || !selectedPO.styles?.styleNo) return;

            const { data, error } = await supabase
                .from('fabric_issue_items')
                .select(`
                    quantity,
                    fabric_issues!inner (style_no)
                `)
                .eq('fabric_issues.style_no', selectedPO.styles.styleNo);

            if (!error && data) {
                const totalRec = data.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                setFormData(prev => ({ ...prev, total_fabric_received: totalRec }));
            }
        };

        if (formData.order_id) {
            fetchFabricReceived();
        }
    }, [formData.order_id, productionOrders]);

    const handleTypeChange = (type) => {
        let components = [];
        if (type === '1 Pcs') {
            components = [{ name: 'Main', fabric: 0, marker: 0, lay: 0 }];
        } else if (type === '2 Pcs Set') {
            components = [
                { name: 'Top', fabric: 0, marker: 0, lay: 0 },
                { name: 'Bottom', fabric: 0, marker: 0, lay: 0 }
            ];
        } else if (type === '3 Pcs Set') {
            components = [
                { name: 'Top', fabric: 0, marker: 0, lay: 0 },
                { name: 'Bottom', fabric: 0, marker: 0, lay: 0 },
                { name: 'Dupatta', fabric: 0, marker: 0, lay: 0 }
            ];
        }
        setFormData(prev => ({ ...prev, cutting_type: type, component_details: components }));
    };

    const handleComponentUpdate = (index, field, value) => {
        const newComponents = [...formData.component_details];
        newComponents[index][field] = value;
        setFormData(prev => ({ ...prev, component_details: newComponents }));
    };

    const [bundles, setBundles] = useState([]); // [{ bundle_no: '', size: '', qty: 0, color: '' }]
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: po } = await supabase
                .from('production_orders')
                .select('id, order_no, total_qty, quantity_breakdown, styles(styleNo, buyerPO)')
                .eq('status', 'Planned');
            setProductionOrders(po || []);

            if (id) {
                const { data: cut } = await supabase.from('cutting_orders').select('*').eq('id', id).single();
                if (cut) {
                    setFormData(cut);
                    const { data: bun } = await supabase.from('bundles').select('*').eq('cutting_order_id', id);
                    setBundles(bun || []);
                }
            } else {
                setFormData(prev => ({ ...prev, cutting_no: `CUT-${Date.now().toString().slice(-6)}` }));
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleGenerateBundles = () => {
        const selectedPO = productionOrders.find(po => po.id === formData.order_id);
        if (!selectedPO || !selectedPO.quantity_breakdown) {
            alert('Please select a Production Order with a breakdown first.');
            return;
        }

        const newBundles = [];
        let globalBundleCounter = 1;

        formData.component_details.forEach(comp => {
            let componentBundleIndex = 1;
            selectedPO.quantity_breakdown.forEach(row => {
                Object.entries(row.sizes).forEach(([size, totalQty]) => {
                    if (totalQty > 0) {
                        const compAbbr = comp.name === 'Main' ? '' : `-${comp.name.substring(0, 3).toUpperCase()}`;
                        const compShort = comp.name.substring(0, 1).toUpperCase();

                        newBundles.push({
                            bundle_no: `${formData.cutting_no}${compAbbr}-B${String(componentBundleIndex).padStart(3, '0')}`,
                            size: size,
                            color: row.color,
                            qty_per_bundle: Number(totalQty),
                            status: 'Cut',
                            component_name: comp.name,
                            barcode: `${formData.cutting_no}${compShort}${String(globalBundleCounter).padStart(3, '0')}`
                        });
                        componentBundleIndex++;
                        globalBundleCounter++;
                    }
                });
            });
        });

        setBundles(newBundles);
        setFormData(prev => ({
            ...prev,
            total_cut_qty: parseFloat(newBundles.reduce((sum, b) => sum + b.qty_per_bundle, 0).toFixed(2))
        }));
    };

    const handleBundleQtyUpdate = (index, newQty) => {
        const updatedBundles = [...bundles];
        updatedBundles[index].qty_per_bundle = Number(newQty);
        setBundles(updatedBundles);

        // Recalculate total
        const newTotal = updatedBundles.reduce((sum, b) => sum + (Number(b.qty_per_bundle) || 0), 0);
        setFormData(prev => ({
            ...prev,
            total_cut_qty: parseFloat(newTotal.toFixed(2))
        }));
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('cutting_orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            setFormData(prev => ({ ...prev, status: newStatus }));
            alert(`Order marked as ${newStatus}`);
            if (newStatus === 'Completed') navigate('/cutting');
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: cutData, error: cutError } = id
                ? await supabase.from('cutting_orders').update(formData).eq('id', id).select().single()
                : await supabase.from('cutting_orders').insert([formData]).select().single();

            if (cutError) throw cutError;

            if (!id && bundles.length > 0) {
                const bundlesToInsert = bundles.map(b => ({ ...b, cutting_order_id: cutData.id }));
                const { error: bunError } = await supabase.from('bundles').insert(bundlesToInsert);
                if (bunError) throw bunError;
            }

            navigate(`/cutting/${cutData.id}`);
        } catch (err) {
            console.error(err);
            if (err.message?.includes('component_details') || err.message?.includes('schema cache')) {
                alert("SCHEMA ERROR: Your database is missing the 'component_details' column or the API needs to be refreshed.\n\nPlease go to 'Supabase Cloud Manager' (Migration Tool) and run the 'Repair' script to fix this permanently.");
            } else {
                alert(err.message);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-sage-500 italic">Initializing cutting floor...</div>;

    const selectedPO = productionOrders.find(po => po.id === formData.order_id);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit' : 'New'} Cutting Order</h1>
                        <p className="text-sage-500 text-sm">Marker planning and automated bundle generation</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {bundles.length > 0 && (
                        <button
                            onClick={() => setShowBarcodeModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-all font-bold shadow-sm"
                        >
                            <Printer size={18} /> Print All Barcodes
                        </button>
                    )}
                    {id && (
                        <>
                            <button
                                onClick={() => handleStatusUpdate('Verified')}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition-all font-bold shadow-sm disabled:opacity-50"
                            >
                                <CheckCircle size={18} /> Verify
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('Completed')}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md disabled:opacity-50"
                            >
                                <Zap size={18} /> Forward to Stitching
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold disabled:opacity-50"
                    >
                        <Save size={18} /> {saving ? 'Saving...' : 'Save Order'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Scissors size={16} className="text-sage-400" /> Marker & Lay Details
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Cutting No</label>
                            <input
                                required
                                value={formData.cutting_no}
                                onChange={(e) => setFormData({ ...formData, cutting_no: e.target.value })}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Production Order</label>
                            <select
                                required
                                value={formData.order_id}
                                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                            >
                                <option value="">Select Order</option>
                                {productionOrders.map(po => (
                                    <option key={po.id} value={po.id}>{po.order_no} ({po.styles?.styleNo})</option>
                                ))}
                            </select>
                            {selectedPO && (
                                <div className="mt-2 space-y-3">
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Buyer PO No</span>
                                            <span className="text-base font-black text-blue-900 drop-shadow-sm">{selectedPO.styles?.buyerPO || 'N/A'}</span>
                                        </div>

                                        <div className="space-y-2 border-t border-blue-100/50 pt-3">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Order QTY (Size Wise)</span>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {Object.entries(
                                                    selectedPO.quantity_breakdown?.reduce((acc, row) => {
                                                        Object.entries(row.sizes || {}).forEach(([size, qty]) => {
                                                            acc[size] = (acc[size] || 0) + Number(qty);
                                                        });
                                                        return acc;
                                                    }, {}) || {}
                                                ).map(([size, qty]) => qty > 0 && (
                                                    <div key={size} className="flex flex-col items-center py-1.5 px-1 bg-white/80 backdrop-blur-sm rounded-lg border border-blue-200 shadow-sm">
                                                        <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">{size}</span>
                                                        <span className="text-xs font-black text-blue-800">{qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-2 bg-sage-50/50 rounded-lg flex items-center justify-between text-[10px] font-bold text-sage-500 border border-sage-100 italic">
                                        <span className="flex items-center gap-1"><Layers size={12} /> Plan: {selectedPO.total_qty}</span>
                                        <span>Color Rows: {selectedPO.quantity_breakdown?.length || 0}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest text-blue-600">Cutting Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['1 Pcs', '2 Pcs Set', '3 Pcs Set'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleTypeChange(type)}
                                        className={clsx(
                                            "py-2 rounded-lg text-xs font-bold border transition-all",
                                            formData.cutting_type === type
                                                ? "bg-sage-800 text-white border-sage-800 shadow-md"
                                                : "bg-white text-sage-600 border-sage-200 hover:bg-sage-50"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-sage-100">
                            {formData.component_details?.map((comp, idx) => (
                                <div key={idx} className="p-4 bg-sage-50/50 rounded-xl border border-sage-200 space-y-3">
                                    <h4 className="text-[10px] font-black text-sage-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                                        {comp.name} Details
                                    </h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-sage-500 uppercase tracking-widest">Fabric (m)</label>
                                            <input
                                                type="number"
                                                value={comp.fabric}
                                                onChange={(e) => handleComponentUpdate(idx, 'fabric', e.target.value)}
                                                className="w-full px-3 py-1.5 bg-white border border-sage-200 rounded text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-sage-500 uppercase tracking-widest">Marker (m)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={comp.marker}
                                                onChange={(e) => handleComponentUpdate(idx, 'marker', e.target.value)}
                                                className="w-full px-3 py-1.5 bg-white border border-sage-200 rounded text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-sage-500 uppercase tracking-widest">Lay Count</label>
                                        <input
                                            type="number"
                                            value={comp.lay}
                                            onChange={(e) => handleComponentUpdate(idx, 'lay', e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-sage-200 rounded text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Wastage %</label>
                            <input
                                type="number"
                                value={formData.wastage_percentage}
                                onChange={(e) => setFormData({ ...formData, wastage_percentage: e.target.value })}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                            />
                        </div>

                        {/* Fabric Consumption Details */}
                        <div className="space-y-4 pt-4 border-t border-sage-100">
                            <h4 className="text-[10px] font-black text-sage-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Fabric Consumption
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-sage-500 uppercase tracking-widest">Received (M)</label>
                                    <div className="w-full px-3 py-2 bg-sage-50 border border-sage-100 rounded text-sm font-bold text-sage-700">
                                        {formData.total_fabric_received?.toFixed(2)}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-sage-500 uppercase tracking-widest text-blue-600">Used (M)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.total_fabric_used}
                                        onChange={(e) => setFormData({ ...formData, total_fabric_used: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-400 rounded text-sm font-bold text-blue-900"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-sage-50 rounded-xl border border-sage-200 flex items-center justify-between">
                                <div>
                                    <div className="text-[9px] font-bold text-sage-400 uppercase tracking-widest">Balance (M)</div>
                                    <div className={clsx(
                                        "text-xl font-black",
                                        (formData.total_fabric_received - formData.total_fabric_used) < 0 ? "text-red-500" : "text-sage-800"
                                    )}>
                                        {(formData.total_fabric_received - formData.total_fabric_used).toFixed(2)}
                                    </div>
                                </div>
                                {(formData.total_fabric_received - formData.total_fabric_used) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const balance = (formData.total_fabric_received - formData.total_fabric_used).toFixed(2);
                                            const balanceBarcodeItem = {
                                                name: `Balance Fabric - ${formData.cutting_no}`,
                                                fabricCode: `${formData.cutting_no}-BAL`,
                                                id: `${formData.cutting_no}-BAL`,
                                                qty: balance,
                                                isBalance: true
                                            };
                                            // Make sure BarcodeModal can handle single item or we assume bundles array
                                            // The existing modal takes 'item' prop as array. 
                                            // We'll trick it by temporarily setting bundles to just this item? 
                                            // Better to pass a custom prop or just override.
                                            // Actually, let's just use the existing modal prop structure.
                                        }}
                                        className="px-3 py-1.5 bg-white border border-sage-200 text-sage-600 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-sage-50 shadow-sm"
                                    >
                                        <Printer size={14} className="inline mr-1" /> Label
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGenerateBundles}
                            className="w-full py-3 bg-sage-100 text-sage-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sage-200 transition-colors border-2 border-dashed border-sage-300 flex items-center justify-center gap-2"
                        >
                            <Layers size={16} /> Generate Bundle Breakdown
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-sage-400 uppercase tracking-widest">
                            <span>Final Summary</span>
                            <Hash size={14} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                                <div className="text-2xl font-black text-sage-800">{formData.total_cut_qty}</div>
                                <div className="text-[10px] font-bold text-sage-400 uppercase">Total Pieces Cut</div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <CheckCircle size={12} /> Sync Ready
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-sage-100 bg-sage-50/30 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Package size={18} className="text-sage-400" /> Generated Bundles ({bundles.length})
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-sage-400">
                                <Hash size={14} /> Auto-Incremented Barcoding
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[600px]">
                            {bundles.length === 0 ? (
                                <div className="p-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-sage-50 rounded-full flex items-center justify-center mx-auto text-sage-200">
                                        <Layers size={32} />
                                    </div>
                                    <p className="text-sage-400 text-sm italic">No bundles generated yet. Plan your lays and click "Generate".</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-sage-100">
                                    {bundles.map((bun, index) => (
                                        <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-sage-50/50 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white border border-sage-200 rounded flex items-center justify-center font-mono text-[10px] font-black text-sage-400 group-hover:border-sage-400 transition-colors">
                                                    {String(index + 1).padStart(3, '0')}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sage-800 text-sm whitespace-nowrap">{bun.bundle_no}</div>
                                                    <div className="text-[10px] text-sage-400 font-mono flex items-center gap-2 flex-wrap">
                                                        <span className="px-1.5 py-0.5 bg-sage-100 text-sage-600 rounded font-bold uppercase text-[8px]">{bun.component_name}</span>
                                                        <span className="font-bold text-sage-500">{bun.color}</span> • <span>Size: {bun.size}</span> • <span>Barcode: {bun.barcode}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <input
                                                    type="number"
                                                    value={bun.qty_per_bundle}
                                                    onChange={(e) => handleBundleQtyUpdate(index, e.target.value)}
                                                    className="w-20 px-2 py-1 bg-white border border-sage-200 rounded text-right font-black text-sage-800 focus:ring-2 focus:ring-sage-500/20 focus:border-sage-400 outline-none transition-all"
                                                />
                                                <div className="text-[10px] font-bold text-sage-400 uppercase mt-1">Pieces</div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            placeholder="Add cutting floor notes (e.g., fabric roll defects, marker shift)..."
                            className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm h-24 resize-none"
                        />
                    </div>
                </div>
            </div>
            <BarcodeModal
                isOpen={showBarcodeModal}
                onClose={() => setShowBarcodeModal(false)}
                item={bundles.map(b => ({
                    name: `${b.bundle_no} (${b.size})`,
                    fabricCode: b.barcode,
                    id: b.barcode
                }))}
            />
        </div >
    );
};

export default CuttingForm;
