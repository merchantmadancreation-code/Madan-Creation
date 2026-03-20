import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Calendar, User, Tag, Layers, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const ProductionOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [productionData, setProductionData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderAndProductionData = async () => {
            setLoading(true);
            
            // 1. Fetch Production Order
            const { data: po, error } = await supabase
                .from('production_orders')
                .select('*, style:styles(styleNo, season, color), buyer:buyers(name)')
                .eq('id', id)
                .single();

            if (error || !po) {
                setLoading(false);
                return;
            }

            // 2. Fetch DPR Logs (For Cutting and Generic Overrides)
            const { data: dprData } = await supabase
                .from('dpr_logs')
                .select('*')
                .eq('order_no', po.order_no);

            // 3. Fetch Stitching
            const { data: stitchingData } = await supabase
                .from('stitching_receives')
                .select('*, stitching_receive_items(size, quantity)')
                .eq('production_order_id', id);

            // 4. Fetch Finishing
            const { data: finishingData } = await supabase
                .from('finishing_receives')
                .select('*, finishing_receive_items(size, quantity)')
                .eq('production_order_id', id);

            // 5. Fetch Packing
            const { data: packingData } = await supabase
                .from('cartons')
                .select('*, carton_items(size, quantity)')
                .eq('production_order_id', id);

            setOrder(po);
            setProductionData({ dprData, stitchingData, finishingData, packingData });
            setLoading(false);
        };
        fetchOrderAndProductionData();
    }, [id]);

    if (loading) return <div className="p-12 text-center text-sage-400 italic">Loading order details...</div>;

    if (!order) return (
        <div className="flex flex-col items-center justify-center h-64 text-sage-500">
            <p className="text-lg font-medium">Production Order not found</p>
            <Link to="/production-orders" className="mt-4 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700">
                Go Back to List
            </Link>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sage-200 pb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/production-orders')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-sage-800 flex items-center gap-3">
                            {order.order_no}
                            <span className={clsx(
                                "text-sm px-3 py-1 rounded-full border uppercase tracking-wider",
                                order.status === 'Completed' ? "bg-green-100 text-green-700 border-green-200" :
                                    order.status === 'In-Progress' ? "bg-amber-100 text-amber-700 border-amber-200" :
                                        "bg-blue-100 text-blue-700 border-blue-200"
                            )}>
                                {order.status}
                            </span>
                        </h1>
                        <p className="text-sage-500 text-sm mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Calendar size={14} /> Created: {order.order_date}</span>
                            <span className="flex items-center gap-1"><Tag size={14} /> Style: {order.style?.styleNo}</span>
                        </p>
                    </div>
                </div>
                <Link
                    to={`/production-orders/edit/${id}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-md font-bold"
                >
                    <Edit size={18} /> Edit Order
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Key Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 space-y-6">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Layers size={16} className="text-sage-400" /> At a Glance
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Total Qty</span>
                                <span className="text-xl font-black text-sage-800">{order.total_qty}</span>
                            </div>
                            <div className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                                <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Delivery</span>
                                <span className="text-sm font-bold text-sage-800">{order.delivery_date || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest block mb-1">Buyer</label>
                                <div className="flex items-center gap-2 text-sage-800 font-bold">
                                    <User size={16} className="text-sage-400" />
                                    {order.buyer?.name || 'Unknown Buyer'}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest block mb-1">Season</label>
                                <div className="text-sage-800 font-medium ml-6">
                                    {order.style?.season || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider mb-3">Remarks</h3>
                        <p className="text-sage-600 text-sm italic">{order.remarks || 'No remarks added.'}</p>
                    </div>
                </div>

                {/* Right Column: Breakdown */}
                <div className="md:col-span-2">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200 h-full">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                            <CheckCircle size={16} className="text-sage-400" /> Stage-by-Stage Size Matrix
                        </h3>

                        {(() => {
                            if (!order || !order.quantity_breakdown || !productionData) {
                                return (
                                    <div className="py-12 text-center border-2 border-dashed border-sage-100 rounded-xl">
                                        <p className="text-sage-400 italic">No breakdown details available.</p>
                                    </div>
                                );
                            }

                            const allSizes = new Set();
                            order.quantity_breakdown.forEach(row => {
                                Object.keys(row.sizes).forEach(size => allSizes.add(size));
                            });
                            
                            const sizeList = Array.from(allSizes).sort();
                            const matrix = [];

                            // 1. Planned
                            const plannedMap = {};
                            let totalPlanned = 0;
                            order.quantity_breakdown.forEach(row => {
                                Object.entries(row.sizes).forEach(([s, q]) => {
                                    const qty = Number(q) || 0;
                                    plannedMap[s] = (plannedMap[s] || 0) + qty;
                                    totalPlanned += qty;
                                });
                            });
                            matrix.push({ stage: 'Planned Target', sizes: plannedMap, total: totalPlanned });

                            // Helper for DPR Logs generic parsing
                            const parseDPR = (stageName, targetMap, currentTotal) => {
                                let tc = currentTotal;
                                let hasG = false;
                                productionData.dprData?.filter(d => d.production_stage === stageName).forEach(log => {
                                    try {
                                        if (log.bundle_start && typeof log.bundle_start === 'string' && (log.bundle_start.startsWith('{') || log.bundle_start.startsWith('['))) {
                                            const parsed = JSON.parse(log.bundle_start);
                                            if (Array.isArray(parsed)) {
                                                parsed.forEach(item => {
                                                    targetMap[item.size] = (targetMap[item.size] || 0) + (Number(item.actual) || 0);
                                                    tc += (Number(item.actual) || 0);
                                                });
                                            } else if (typeof parsed === 'object') {
                                                Object.entries(parsed).forEach(([s, q]) => {
                                                    targetMap[s] = (targetMap[s] || 0) + (Number(q) || 0);
                                                    tc += (Number(q) || 0);
                                                });
                                            }
                                        } else if (Number(log.actual_produced) > 0) {
                                            targetMap['generic'] = (targetMap['generic'] || 0) + (Number(log.actual_produced) || 0);
                                            tc += (Number(log.actual_produced) || 0);
                                            hasG = true;
                                        }
                                    } catch(err) {
                                        if (Number(log.actual_produced) > 0) {
                                            targetMap['generic'] = (targetMap['generic'] || 0) + (Number(log.actual_produced) || 0);
                                            tc += (Number(log.actual_produced) || 0);
                                            hasG = true;
                                        }
                                    }
                                });
                                return { tc, hasG };
                            };

                            // 2. Cutting
                            const cutMap = {};
                            const cutRes = parseDPR('Cutting', cutMap, 0);
                            matrix.push({ stage: 'Cutting', sizes: cutMap, total: cutRes.tc, hasGeneric: cutRes.hasG });

                            // 3. Stitching
                            const stitchMap = {};
                            let totalStitch = 0;
                            productionData.stitchingData?.forEach(batch => {
                                batch.stitching_receive_items?.forEach(item => {
                                    stitchMap[item.size] = (stitchMap[item.size] || 0) + (Number(item.quantity) || 0);
                                    totalStitch += (Number(item.quantity) || 0);
                                });
                            });
                            const stitchRes = parseDPR('Stitching', stitchMap, totalStitch);
                            matrix.push({ stage: 'Stitching', sizes: stitchMap, total: stitchRes.tc, hasGeneric: stitchRes.hasG });

                            // 4. Finishing
                            const finMap = {};
                            let totalFin = 0;
                            productionData.finishingData?.forEach(batch => {
                                batch.finishing_receive_items?.forEach(item => {
                                    finMap[item.size] = (finMap[item.size] || 0) + (Number(item.quantity) || 0);
                                    totalFin += (Number(item.quantity) || 0);
                                });
                            });
                            const finRes = parseDPR('Finishing', finMap, totalFin);
                            matrix.push({ stage: 'Finishing', sizes: finMap, total: finRes.tc, hasGeneric: finRes.hasG });

                            // 5. Packing
                            const packMap = {};
                            let totalPack = 0;
                            productionData.packingData?.forEach(batch => {
                                batch.carton_items?.forEach(item => {
                                    packMap[item.size] = (packMap[item.size] || 0) + (Number(item.quantity) || 0);
                                    totalPack += (Number(item.quantity) || 0);
                                });
                            });
                            const packRes = parseDPR('Packing', packMap, totalPack);
                            matrix.push({ stage: 'Packing', sizes: packMap, total: packRes.tc, hasGeneric: packRes.hasG });

                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-center">
                                        <thead>
                                            <tr className="border-b-2 border-sage-200 bg-sage-50/50">
                                                <th className="py-4 px-4 font-black text-slate-800 text-[11px] uppercase tracking-widest text-left rounded-tl-xl w-32">Production Stage</th>
                                                {sizeList.map(size => (
                                                    <th key={size} className="py-4 px-3 font-black text-sage-600 text-[11px] uppercase tracking-widest">{size}</th>
                                                ))}
                                                <th className="py-4 px-4 font-black text-indigo-700 text-[11px] uppercase tracking-widest text-right rounded-tr-xl">Total pcs</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-sage-100">
                                            {matrix.map((row, idx) => {
                                                const isPlanned = row.stage === 'Planned Target';
                                                return (
                                                    <tr key={idx} className={clsx(
                                                        "group transition-all hover:bg-sage-50",
                                                        isPlanned ? "bg-indigo-50/30" : "bg-white"
                                                    )}>
                                                        <td className={clsx(
                                                            "py-5 px-4 text-left font-black tracking-wider text-xs border-l-4",
                                                            isPlanned ? "border-indigo-400 text-indigo-800" :
                                                            row.stage === 'Cutting' ? "border-emerald-400 text-emerald-800" :
                                                            row.stage === 'Stitching' ? "border-blue-400 text-blue-800" :
                                                            row.stage === 'Finishing' ? "border-amber-400 text-amber-800" :
                                                            "border-teal-400 text-teal-800"
                                                        )}>
                                                            {row.stage}
                                                        </td>
                                                        {sizeList.map(size => {
                                                            const val = row.sizes[size] || 0;
                                                            return (
                                                                <td key={size} className={clsx(
                                                                    "py-5 px-3 font-semibold",
                                                                    val > 0 ? "text-sage-800" : "text-sage-300"
                                                                )}>
                                                                    {val > 0 ? val.toLocaleString() : '-'}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="py-5 px-4 text-right">
                                                            <div className="font-black text-base text-slate-800">
                                                                {row.total.toLocaleString()}
                                                            </div>
                                                            {row.hasGeneric && row.sizes['generic'] > 0 && (
                                                                <div className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1 bg-red-50/50 py-0.5 px-1 rounded inline-block">
                                                                    + {row.sizes['generic']} Unsized
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionOrderDetails;
