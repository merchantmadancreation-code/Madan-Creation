import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Box, Package, Plus, Printer, Save, ScanLine, Trash2, X, Eye, Edit } from 'lucide-react';

const CartonPacking = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [cartons, setCartons] = useState([]);
    const [activeCarton, setActiveCarton] = useState(null);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [packedItems, setPackedItems] = useState([]);

    useEffect(() => {
        fetchCartons();
    }, []);

    const fetchCartons = async () => {
        setLoading(true);
        // Fetch open cartons
        const { data, error } = await supabase
            .from('cartons')
            .select('*')
            .eq('status', 'Open')
            .order('created_at', { ascending: false });

        if (!error) setCartons(data || []);
        setLoading(false);
    };

    const createCarton = async () => {
        const cartonNo = `CTN-${Date.now().toString().slice(-6)}`;
        const { data, error } = await supabase
            .from('cartons')
            .insert([{ carton_no: cartonNo, status: 'Open' }])
            .select()
            .single();

        if (error) {
            alert("Error creating carton: " + error.message);
        } else {
            setCartons([data, ...cartons]);
            setActiveCarton(data);
            setPackedItems([]);
        }
    };

    const deleteCarton = async (id) => {
        if (!window.confirm('Are you sure you want to delete this carton? Packed bundles will be unpacked.')) return;
        setLoading(true);
        // Delete items first to satisfy foreign keys if no cascade
        await supabase.from('carton_items').delete().eq('carton_id', id);
        const { error } = await supabase.from('cartons').delete().eq('id', id);
        if (error) {
            alert("Error deleting carton: " + error.message);
        } else {
            if (activeCarton?.id === id) {
                setActiveCarton(null);
                setPackedItems([]);
            }
            fetchCartons();
        }
        setLoading(false);
    };

    const handleScan = async (e) => {
        e.preventDefault();
        const inputVal = barcodeInput?.trim().toUpperCase();
        if (!inputVal || !activeCarton) return;

        let bundleData = null;

        // 1. Verify bundle exists and passed QC
        if (inputVal.startsWith('FIN-')) {
            const parts = inputVal.split('-');
            if (parts.length >= 3) {
                const receipt_no = `${parts[0]}-${parts[1]}`;
                const size = parts.slice(2).join('-');

                const { data, error } = await supabase
                    .from('finishing_receive_items')
                    .select(`
                        id, size, quantity,
                        qc_inspections!inner(passed_qty),
                        finishing_receives!inner(
                            receipt_no,
                            production_orders(styles(styleNo))
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
                        quantity: data.qc_inspections?.length > 0 ? data.qc_inspections[0].passed_qty : data.quantity, // taking passed if available
                        cutting_orders: {
                            production_orders: data.finishing_receives.production_orders
                        },
                        isFinishing: true
                    };
                }
            }
        } else {
            const { data, error } = await supabase
                .from('bundles')
                .select(`
                    *,
                    qc_inspections!inner(passed_qty),
                    cutting_orders(production_orders(styles(styleNo)))
                `)
                .eq('bundle_no', inputVal)
                .single();
            if (!error && data) {
                bundleData = data;
            }
        }

        if (!bundleData) {
            alert("Bundle/Item not found or has not passed QC yet!");
            return;
        }

        // 2. Check if already packed
        const fieldName = bundleData.isFinishing ? 'finishing_receipt_item_id' : 'bundle_id';
        const { data: existing } = await supabase
            .from('carton_items')
            .select('id')
            .eq(fieldName, bundleData.id)
            .maybeSingle();

        if (existing) {
            alert("Item is already packed!");
            return;
        }

        // 3. Add to carton
        const insertPayload = { carton_id: activeCarton.id };
        insertPayload[fieldName] = bundleData.id;

        const { data: item, error: iError } = await supabase
            .from('carton_items')
            .insert([insertPayload])
            .select()
            .single();

        if (iError) {
            alert("Error packing item: " + iError.message);
        } else {
            setPackedItems([{ ...bundleData, carton_item_id: item.id }, ...packedItems]);
            setBarcodeInput('');
        }
    };

    const sealCarton = async () => {
        if (!activeCarton) return;
        if (!window.confirm("Are you sure you want to seal this carton? You won't be able to add more items.")) return;

        const { error } = await supabase
            .from('cartons')
            .update({ status: 'Sealed' })
            .eq('id', activeCarton.id);

        if (error) {
            alert("Error sealing carton: " + error.message);
        } else {
            alert("Carton Sealed Successfully!");
            setActiveCarton(null);
            setPackedItems([]);
            fetchCartons();
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/finishing')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                    <ArrowLeft className="text-sage-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Carton Packing</h1>
                    <p className="text-sage-500 text-sm">Pack finished goods into cartons</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Panel: Carton Management */}
                <div className="md:col-span-1 space-y-4">
                    <button
                        onClick={createCarton}
                        className="w-full py-4 bg-sage-800 text-white rounded-xl font-bold text-lg hover:bg-sage-900 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> New Carton
                    </button>

                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                        <div className="p-4 bg-sage-50 border-b border-sage-100 font-bold text-sage-600 text-sm uppercase tracking-wider">
                            Open Cartons
                        </div>
                        <div className="divide-y divide-sage-100 max-h-[500px] overflow-y-auto">
                            {cartons.length === 0 ? (
                                <div className="p-8 text-center text-sage-400 italic text-sm">No open cartons</div>
                            ) : (
                                cartons.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setActiveCarton(c);
                                            // Ideally fetch items for this carton here
                                            setPackedItems([]);
                                        }}
                                        className={`p-4 cursor-pointer transition-colors ${activeCarton?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-sage-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-sage-800">{c.carton_no}</div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveCarton(c); setPackedItems([]); }}
                                                    className="p-1 hover:bg-white rounded text-sage-400 hover:text-blue-600 transition-colors"
                                                    title="View"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveCarton(c); setPackedItems([]); }}
                                                    className="p-1 hover:bg-white rounded text-sage-400 hover:text-emerald-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteCarton(c.id); }}
                                                    className="p-1 hover:bg-white rounded text-sage-400 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-sage-400 font-mono mt-1">{new Date(c.created_at).toLocaleString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Packing Area */}
                <div className="md:col-span-2">
                    {activeCarton ? (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-sage-800">{activeCarton.carton_no}</h2>
                                        <p className="text-green-600 font-bold text-xs uppercase tracking-widest bg-green-50 px-2 py-1 rounded-md inline-block mt-1">Status: Open</p>
                                    </div>
                                    <button
                                        onClick={sealCarton}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Package size={16} /> Seal Carton
                                    </button>
                                </div>

                                <form onSubmit={handleScan} className="flex gap-2 mb-6">
                                    <div className="relative flex-1">
                                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Scan Bundle Barcode..."
                                            value={barcodeInput}
                                            onChange={(e) => setBarcodeInput(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl font-bold text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                                            autoFocus
                                        />
                                    </div>
                                    <button type="submit" className="px-6 py-3 bg-sage-800 text-white rounded-xl font-bold hover:bg-sage-900 transition-colors">
                                        Add
                                    </button>
                                </form>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-sage-500 uppercase tracking-widest flex items-center gap-2">
                                        Packed Items <span className="bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full text-xs">{packedItems.length}</span>
                                    </h3>

                                    <div className="bg-sage-50 rounded-xl border border-sage-100 min-h-[200px] p-4">
                                        {packedItems.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-sage-400 space-y-2">
                                                <Box size={40} className="opacity-20" />
                                                <p className="text-sm italic">Scan bundles to add them to this carton</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {packedItems.map((item, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-sage-200 flex justify-between items-center shadow-sm animate-in slide-in-from-left-2">
                                                        <div>
                                                            <div className="font-bold text-sage-800">{item.bundle_no}</div>
                                                            <div className="text-[10px] text-sage-500">{item.cutting_orders?.production_orders?.styles?.styleNo} - {item.size}</div>
                                                        </div>
                                                        <div className="font-black text-blue-600">{item.quantity} PCS</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-2xl shadow-sm border border-sage-200 text-center space-y-4 flex flex-col items-center justify-center h-full opacity-60">
                            <Box size={64} className="text-sage-300" />
                            <h3 className="text-xl font-bold text-sage-400">Select or Create a Carton</h3>
                            <p className="text-sage-400">Choose an open carton from the left or create a new one to start packing.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CartonPacking;
