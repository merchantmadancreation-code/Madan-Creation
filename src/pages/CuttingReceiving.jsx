import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Box, CheckCircle, AlertCircle, Search } from 'lucide-react';

const CuttingReceiving = () => {
    const navigate = useNavigate();
    const inputRef = useRef(null); // Ref for auto-focus
    const [barcode, setBarcode] = useState('');
    const [lastScannedBundle, setLastScannedBundle] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleScan = async (e) => {
        e.preventDefault();
        if (!barcode) return;

        setLoading(true);
        setError('');
        setSuccess('');
        // Don't clear lastScannedBundle yet, keep it visible until new one succeeds or fails? 
        // Actually, if we scan a new one, we should probably verify first.

        try {
            // 1. Fetch Bundle Details
            const { data, error: fetchError } = await supabase
                .from('bundles')
                .select(`
                    *,
                    cutting_orders (
                        cutting_no,
                        production_orders (
                            order_no,
                            styles (styleNo, buyerName)
                        )
                    )
                `)
                .eq('barcode', barcode)
                .single();

            if (fetchError) throw new Error('Bundle not found or invalid barcode.');

            // Always set the last scanned bundle so details are shown regardless of status
            setLastScannedBundle(data);

            if (data.status === 'In-Sewing' || data.status === 'Received') {
                throw new Error(`Bundle ${data.bundle_no} has already been received.`);
            }

            // 2. Auto-Receive (Update Status)
            const { error: updateError } = await supabase
                .from('bundles')
                .update({ status: 'Received' })
                .eq('id', data.id);

            if (updateError) throw updateError;

            // 3. Success State
            setSuccess(`Bundle ${data.bundle_no} Received Successfully!`);
            setLastScannedBundle(data);
            setBarcode(''); // Clear input for next scan

            // Keep focus
            if (inputRef.current) {
                inputRef.current.focus();
            }

        } catch (err) {
            setError(err.message);
            // setLastScannedBundle(null); // Optional: clear last scanned if error? No, helpful to keep history.
        } finally {
            setLoading(false);
        }
    };

    // Removed handleConfirmReceive as it's now automated

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/stitching')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                    <ArrowLeft className="text-sage-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Cutting Receiving</h1>
                    <p className="text-sage-500 text-sm">Scan bundles to receive them into the sewing floor</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-6">
                <form onSubmit={handleScan} className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Scan Bundle Barcode..."
                        className="w-full pl-12 pr-4 py-4 bg-sage-50 border border-sage-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all font-mono"
                    />
                    <button
                        type="submit"
                        disabled={loading || !barcode}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-sage-800 text-white rounded-lg font-bold hover:bg-sage-900 transition-colors disabled:opacity-50"
                    >
                        Scan
                    </button>
                </form>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
                        <AlertCircle />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle />
                        <span className="font-bold">{success}</span>
                    </div>
                )}

                {lastScannedBundle && (
                    <div className="border border-green-200 bg-green-50/30 rounded-xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="bg-green-100/50 p-4 border-b border-green-100 flex justify-between items-center">
                            <span className="font-bold text-green-800 flex items-center gap-2">
                                <CheckCircle size={18} /> Last Received Bundle
                            </span>
                            <span className="text-xs font-mono text-green-700">
                                {new Date().toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-green-600 uppercase tracking-widest">Bundle No</label>
                                    <div className="text-xl font-mono font-black text-green-900">{lastScannedBundle.bundle_no}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-green-600 uppercase tracking-widest">Quantity</label>
                                    <div className="text-xl font-black text-green-900">{lastScannedBundle.qty_per_bundle} <span className="text-sm font-bold opacity-70">pcs</span></div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-green-600 uppercase tracking-widest">Size / Color</label>
                                    <div className="font-bold text-green-800">{lastScannedBundle.size} - {lastScannedBundle.color}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-green-600 uppercase tracking-widest">Style</label>
                                    <div className="font-bold text-green-800">{lastScannedBundle.cutting_orders?.production_orders?.styles?.styleNo}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CuttingReceiving;
