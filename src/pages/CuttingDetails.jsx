import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Scissors, Layers, Package, Hash, Printer, Calendar, Tag, User, CheckCircle, Zap } from 'lucide-react';
import clsx from 'clsx';
import BarcodeModal from '../components/BarcodeModal';

const CuttingDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cutting, setCutting] = useState(null);
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            // Fetch Cutting Order with related PO info
            const { data: cutData, error } = await supabase
                .from('cutting_orders')
                .select(`
                    *,
                    production_orders (
                        order_no,
                        total_qty,
                        styles (styleNo, buyerName, season, color)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching cutting order:', error);
                if (error.message?.includes('component_details') || error.message?.includes('schema cache')) {
                    alert("DATABASE CACHE ERROR: Please run the Repair SQL in 'Supabase Cloud Manager' and refresh the page.");
                }
                setLoading(false);
                return;
            }

            setCutting(cutData);

            // Fetch Bundles
            const { data: bunData } = await supabase
                .from('bundles')
                .select('*')
                .eq('cutting_order_id', id)
                .order('bundle_no', { ascending: true });

            setBundles(bunData || []);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleStatusUpdate = async (newStatus) => {
        if (!id) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('cutting_orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            setCutting(prev => ({ ...prev, status: newStatus }));
            alert(`Order marked as ${newStatus}`);
            if (newStatus === 'Completed') navigate('/cutting');
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-sage-400 italic">Initializing cutting floor...</div>;

    if (!cutting) return (
        <div className="flex flex-col items-center justify-center h-64 text-sage-500">
            <p className="text-lg font-medium">Cutting Order not found</p>
            <Link to="/cutting" className="mt-4 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700">
                Go Back to List
            </Link>
        </div>
    );

    const po = cutting.production_orders;
    const style = po?.styles;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sage-200 pb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/cutting')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-sage-800 flex items-center gap-3">
                            {cutting.cutting_no}
                            <span className={clsx(
                                "text-sm px-3 py-1 rounded-full border uppercase tracking-wider",
                                cutting.status === 'Completed' ? "bg-green-100 text-green-700 border-green-200" :
                                    cutting.status === 'Verified' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                        cutting.status === 'In-Progress' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                            "bg-amber-100 text-amber-700 border-amber-200"
                            )}>
                                {cutting.status}
                            </span>
                        </h1>
                        <p className="text-sage-500 text-sm mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Calendar size={14} /> Date: {new Date(cutting.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Scissors size={14} /> Total Cut: {cutting.total_cut_qty} pcs</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {bundles.length > 0 && (
                        <button
                            onClick={() => setShowBarcodeModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-all font-bold shadow-sm"
                        >
                            <Printer size={18} /> Print Barcodes
                        </button>
                    )}
                    {cutting.status !== 'Completed' && (
                        <>
                            <button
                                onClick={() => handleStatusUpdate('Verified')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all font-bold shadow-sm"
                            >
                                <CheckCircle size={18} /> Verify
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('Completed')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md"
                            >
                                <Zap size={18} /> Forward to Stitching
                            </button>
                        </>
                    )}
                    <Link
                        to={`/cutting/edit/${id}`}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-md font-bold"
                    >
                        <Edit size={18} /> Edit Order
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Specs */}
                <div className="space-y-6">
                    {/* Marker & Layout */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Layers size={16} className="text-sage-400" /> Marker Details
                            </h3>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase tracking-widest">
                                {cutting.cutting_type || '1 Pcs'}
                            </span>
                        </div>

                        {cutting.component_details && cutting.component_details.length > 0 ? (
                            <div className="space-y-4">
                                {cutting.component_details.map((comp, idx) => (
                                    <div key={idx} className="p-4 bg-sage-50/50 rounded-xl border border-sage-100 space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-sage-400 uppercase tracking-widest border-b border-sage-100 pb-2 mb-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                                            {comp.name}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <div className="text-[9px] font-bold text-sage-400 uppercase mb-1">Fabric</div>
                                                <div className="text-sm font-black text-sage-800">{comp.fabric}m</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-sage-400 uppercase mb-1">Marker</div>
                                                <div className="text-sm font-black text-sage-800">{comp.marker}m</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-sage-400 uppercase mb-1">Lay</div>
                                                <div className="text-sm font-black text-sage-800">{comp.lay}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                    <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Fabric Issued</span>
                                    <span className="text-lg font-black text-sage-800">{cutting.fabric_issued_qty} <small className="text-xs text-sage-500 font-bold">m</small></span>
                                </div>
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                    <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Marker Length</span>
                                    <span className="text-lg font-black text-sage-800">{cutting.marker_length} <small className="text-xs text-sage-500 font-bold">m</small></span>
                                </div>
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                    <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Lay Count</span>
                                    <span className="text-lg font-black text-sage-800">{cutting.lay_count}</span>
                                </div>
                                <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                    <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Wastage</span>
                                    <span className={clsx("text-lg font-black", cutting.wastage_percentage > 5 ? "text-red-600" : "text-green-600")}>
                                        {cutting.wastage_percentage}%
                                    </span>
                                </div>
                            </div>
                        )}

                        {cutting.component_details && cutting.component_details.length > 0 && (
                            <div className="p-3 bg-white border border-sage-200 rounded-xl flex justify-between items-center shadow-sm">
                                <span className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">Wastage %</span>
                                <span className={clsx("font-black", cutting.wastage_percentage > 5 ? "text-red-600" : "text-green-600")}>
                                    {cutting.wastage_percentage}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Order Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-4">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Tag size={16} className="text-sage-400" /> Production Context
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-sage-50">
                                <span className="text-xs font-bold text-sage-500">Order No</span>
                                <span className="font-bold text-sage-800">{po?.order_no}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-sage-50">
                                <span className="text-xs font-bold text-sage-500">Style No</span>
                                <span className="font-bold text-sage-800">{style?.styleNo}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-sage-50">
                                <span className="text-xs font-bold text-sage-500">Buyer</span>
                                <span className="font-bold text-sage-800">{style?.buyerName || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs font-bold text-sage-500">Season</span>
                                <span className="font-bold text-sage-800">{style?.season || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider mb-2">Remarks</h3>
                        <p className="text-sage-600 text-sm italic">{cutting.remarks || 'No remarks added.'}</p>
                    </div>
                </div>

                {/* Right Column: Bundles */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 h-full flex flex-col">
                        <div className="p-6 border-b border-sage-100 flex justify-between items-center">
                            <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Package size={18} className="text-sage-400" /> Bundle Breakdown
                            </h3>
                            <div className="bg-sage-100 text-sage-600 px-3 py-1 rounded-full text-xs font-black">
                                {bundles.length} Bundles
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {bundles.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-sage-50 text-sage-500 font-bold uppercase tracking-widest text-[10px]">
                                        <tr>
                                            <th className="px-6 py-3">Bundle No</th>
                                            <th className="px-6 py-3 text-blue-600">Component</th>
                                            <th className="px-6 py-3">Size</th>
                                            <th className="px-6 py-3">Color</th>
                                            <th className="px-6 py-3">Barcode</th>
                                            <th className="px-6 py-3 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sage-100">
                                        {bundles.map((bun, idx) => (
                                            <tr key={idx} className="hover:bg-sage-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-sage-800 font-mono">{bun.bundle_no}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase border border-blue-100">
                                                        {bun.component_name || 'Main'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-sage-600">{bun.size}</td>
                                                <td className="px-6 py-4 text-sage-600">{bun.color}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-sage-400">{bun.barcode}</td>
                                                <td className="px-6 py-4 text-right font-black text-sage-800">{bun.qty_per_bundle}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-sage-400 italic">No bundles generated.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Barcode Modal */}
            <BarcodeModal
                isOpen={showBarcodeModal}
                onClose={() => setShowBarcodeModal(false)}
                item={bundles.map(b => ({
                    name: `${b.bundle_no} (${b.size})`,
                    fabricCode: b.barcode,
                    id: b.barcode
                }))}
            />
        </div>
    );
};

export default CuttingDetails;
