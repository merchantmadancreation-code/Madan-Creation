import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Eye, Filter, Calendar, User, Tag, Clock, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const ProductionOrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('production_orders')
                .select('*, style:styles(styleNo), buyer:buyers(name), tna_plans(id)');

            if (error) {
                console.error("Error fetching production orders:", error);
            } else {
                setOrders(data || []);
            }
            setLoading(false);
        };
        fetchOrders();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Production Order? This action cannot be undone.")) return;
        
        try {
            const { error } = await supabase
                .from('production_orders')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Remove from local state
            setOrders(orders.filter(order => order.id !== id));
            alert("Production Order deleted successfully.");
        } catch (error) {
            console.error("Error deleting production order:", error);
            alert("Failed to delete the Production Order. It may be linked to existing production logs.");
        }
    };

    const filteredOrders = orders.filter(o => {
        const orderNo = o.order_no || '';
        const styleNo = o.style?.styleNo || '';
        const buyerName = o.buyer?.name || '';
        const search = searchTerm.toLowerCase();

        return orderNo.toLowerCase().includes(search) ||
            styleNo.toLowerCase().includes(search) ||
            buyerName.toLowerCase().includes(search);
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Planned': return 'bg-blue-100 text-blue-700';
            case 'In-Progress': return 'bg-amber-100 text-amber-700';
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'Shipped': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Production Orders</h1>
                    <p className="text-sage-500 text-sm">Manage manufacturing batches and track their progress</p>
                </div>
                <Link
                    to="/production-orders/new"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 transition-all shadow-md font-bold"
                >
                    <Plus size={18} /> New Production Order
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 bg-sage-50/30 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search orders, styles, or buyers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-sage-50 text-sage-700 font-bold border-b border-sage-200">
                                <th className="px-6 py-4">Order No</th>
                                <th className="px-6 py-4">Style & Buyer</th>
                                <th className="px-6 py-4">Total Qty</th>
                                <th className="px-6 py-4">Delivery Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sage-400 italic">Loading production orders...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sage-400 italic">No orders found.</td></tr>
                            ) : filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-sage-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sage-800">{order.order_no}</div>
                                        <div className="text-[10px] text-sage-400 font-mono mt-0.5">{order.order_date}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-sage-700 font-medium">
                                                <Tag size={12} className="text-sage-400" /> {order.style?.styleNo || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sage-500 text-xs">
                                                <User size={12} className="text-sage-400" /> {order.buyer?.name || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-sage-800">
                                        {order.total_qty?.toLocaleString() || 0} pcs
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-sage-600">
                                            <Calendar size={14} className="text-sage-400" />
                                            {order.delivery_date || 'Not set'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            getStatusColor(order.status)
                                        )}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.tna_plans && order.tna_plans.length > 0 ? (
                                                <Link to={`/tna/${order.tna_plans[0].id}`} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="View TNA">
                                                    <Clock size={16} />
                                                </Link>
                                            ) : (
                                                <Link to={`/tna/new?orderId=${order.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-sage-600 hover:bg-sage-50 transition-colors" title="Create TNA">
                                                    <Clock size={16} />
                                                </Link>
                                            )}
                                            <Link to={`/production-orders/${order.id}`} className="p-1.5 rounded-lg text-sage-600 hover:bg-sage-100 transition-colors">
                                                <Eye size={16} />
                                            </Link>
                                            <Link to={`/production-orders/edit/${order.id}`} className="p-1.5 rounded-lg text-sage-600 hover:bg-sage-100 transition-colors" title="Edit">
                                                <Edit size={16} />
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(order.id)} 
                                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductionOrderList;
