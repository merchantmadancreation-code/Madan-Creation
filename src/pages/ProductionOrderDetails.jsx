import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Calendar, User, Tag, Layers, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const ProductionOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from('production_orders')
                .select('*, style:styles(styleNo, season, color), buyer:buyers(name)')
                .eq('id', id)
                .single();

            if (!error) setOrder(data);
            setLoading(false);
        };
        fetchOrder();
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
                            <CheckCircle size={16} className="text-sage-400" /> Color & Size Breakdown
                        </h3>

                        {order.quantity_breakdown && order.quantity_breakdown.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-sage-100">
                                            <th className="py-3 font-bold text-sage-400 text-[10px] uppercase tracking-widest w-1/4">Fabric Color</th>
                                            {Object.keys(order.quantity_breakdown[0].sizes).map(size => (
                                                <th key={size} className="py-3 font-bold text-sage-400 text-[10px] uppercase tracking-widest text-center">{size}</th>
                                            ))}
                                            <th className="py-3 font-bold text-sage-400 text-[10px] uppercase tracking-widest text-right">Row Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sage-50">
                                        {order.quantity_breakdown.map((row, idx) => (
                                            <tr key={idx} className="group hover:bg-sage-50/50 transition-colors">
                                                <td className="py-4 font-bold text-sage-800 pl-2 border-l-4 border-transparent group-hover:border-sage-400">{row.color}</td>
                                                {Object.entries(row.sizes).map(([size, qty]) => (
                                                    <td key={size} className="py-4 text-center font-medium text-sage-600">
                                                        {qty > 0 ? qty : <span className="text-sage-200">-</span>}
                                                    </td>
                                                ))}
                                                <td className="py-4 text-right font-bold text-sage-900 pr-2 bg-sage-50/30">
                                                    {Object.values(row.sizes).reduce((a, b) => a + Number(b), 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center border-2 border-dashed border-sage-100 rounded-xl">
                                <p className="text-sage-400 italic">No breakdown details available.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionOrderDetails;
