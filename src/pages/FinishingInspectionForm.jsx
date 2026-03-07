import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Box, ShieldCheck, AlertOctagon, Search, ScanLine } from 'lucide-react';

const FinishingInspectionForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [barcodeInput, BarcodeInput] = useState('');
    const [scannedBundle, setScannedBundle] = useState(null);
    const [inspectionData, setInspectionData] = useState({
        passed_qty: '',
        failed_qty: '',
        remarks: ''
    });

    const handleSearch = async (e) => {
        e.preventDefault();
        const inputVal = barcodeInput.trim().toUpperCase();
        if (!inputVal) return;

        setLoading(true);
        let bundleData = null;

        if (inputVal.startsWith('FIN-')) {
            // Finishing Receipt Item scanning
            const parts = inputVal.split('-');
            if (parts.length >= 3) {
                const receipt_no = `${parts[0]}-${parts[1]}`;
                const size = parts.slice(2).join('-');

                const { data, error } = await supabase
                    .from('finishing_receive_items')
                    .select(`
                        id, size, quantity,
                        finishing_receives!inner(
                            receipt_no,
                            production_orders (
                                order_no,
                                styles (styleNo)
                            )
                        )
                    `)
                    .eq('finishing_receives.receipt_no', receipt_no)
                    .eq('size', size)
                    .single();

                if (!error && data) {
                    bundleData = {
                        id: data.id,
                        bundle_no: barcodeInput,
                        size: data.size,
                        quantity: data.quantity,
                        cutting_orders: {
                            production_orders: data.finishing_receives.production_orders
                        },
                        isFinishing: true
                    };
                }
            }
        } else {
            // Normal bundle logic
            const { data, error } = await supabase
                .from('bundles')
                .select(`
                    *,
                    cutting_orders (
                        production_orders (
                            order_no,
                            styles (styleNo)
                        )
                    )
                `)
                .eq('bundle_no', inputVal)
                .single();
            if (!error && data) bundleData = data;
        }

        if (!bundleData) {
            alert("Bundle or Finishing Receipt not found! Ensure the barcode is valid.");
            setScannedBundle(null);
        } else {
            setScannedBundle(bundleData);
            setInspectionData({
                passed_qty: bundleData.quantity,
                failed_qty: 0,
                remarks: ''
            });
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!scannedBundle) return;

        const passed = parseInt(inspectionData.passed_qty) || 0;
        const failed = parseInt(inspectionData.failed_qty) || 0;

        if (passed + failed > scannedBundle.quantity) {
            alert(`Error: Total inspected (${passed + failed}) cannot exceed bundle quantity (${scannedBundle.quantity})`);
            return;
        }

        setSaving(true);
        try {
            const insertPayload = {
                passed_qty: passed,
                failed_qty: failed,
                remarks: inspectionData.remarks,
                inspector_id: null // Set to current user if auth available
            };

            if (scannedBundle.isFinishing) {
                insertPayload.finishing_receipt_item_id = scannedBundle.id;
            } else {
                insertPayload.bundle_id = scannedBundle.id;
            }

            const { error } = await supabase
                .from('qc_inspections')
                .insert([insertPayload]);

            if (error) throw error;

            alert("Inspection saved successfully!");
            navigate('/finishing');
        } catch (err) {
            console.error(err);
            alert("Error saving inspection: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/finishing')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                    <ArrowLeft className="text-sage-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">New QC Inspection</h1>
                    <p className="text-sage-500 text-sm">Scan bundle and record quality results</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Scan Bundle Barcode..."
                            value={barcodeInput}
                            onChange={(e) => BarcodeInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                            autoFocus
                        />
                    </div>
                    <button type="submit" disabled={loading} className="px-6 py-3 bg-sage-800 text-white rounded-xl font-bold hover:bg-sage-900 transition-colors">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {scannedBundle && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-sage-50/50 p-4 rounded-xl border border-sage-100 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Bundle No</label>
                                <div className="font-black text-sage-800 text-lg">{scannedBundle.bundle_no}</div>
                            </div>
                            <div className="text-right">
                                <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Size</label>
                                <div className="font-black text-sage-800 text-lg">{scannedBundle.size}</div>
                            </div>
                            <div>
                                <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Style</label>
                                <div className="font-bold text-sage-800">{scannedBundle.cutting_orders?.production_orders?.styles?.styleNo}</div>
                            </div>
                            <div className="text-right">
                                <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Total Qty</label>
                                <div className="font-black text-blue-600 text-xl">{scannedBundle.quantity} PCS</div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={16} /> Passed Qty
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={inspectionData.passed_qty}
                                        onChange={(e) => setInspectionData({ ...inspectionData, passed_qty: e.target.value })}
                                        className="w-full px-4 py-3 bg-green-50/50 border border-green-200 rounded-xl font-black text-green-800 text-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                                        <AlertOctagon size={16} /> Failed Qty
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={inspectionData.failed_qty}
                                        onChange={(e) => setInspectionData({ ...inspectionData, failed_qty: e.target.value })}
                                        className="w-full px-4 py-3 bg-red-50/50 border border-red-200 rounded-xl font-black text-red-800 text-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-sage-500 uppercase tracking-widest">Remarks</label>
                                <input
                                    type="text"
                                    placeholder="Defect details or comments..."
                                    value={inspectionData.remarks}
                                    onChange={(e) => setInspectionData({ ...inspectionData, remarks: e.target.value })}
                                    className="w-full px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-sage-800 text-white rounded-xl font-bold text-lg hover:bg-sage-900 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                            >
                                {saving ? 'Saving...' : <><Save size={20} /> Save Inspection Result</>}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinishingInspectionForm;
