import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Plus, Search, Trash2, Edit, Eye } from 'lucide-react';

const CostingList = () => {
    const { costings, loading, deleteCosting } = usePurchaseOrder();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCostings = costings.filter(costing => {
        const term = searchTerm.toLowerCase();
        return (
            (costing.styleNo || '').toLowerCase().includes(term) ||
            (costing.buyerName || '').toLowerCase().includes(term) ||
            (costing.productName || '').toLowerCase().includes(term)
        );
    });

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this Costing Sheet?")) {
            await deleteCosting(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Garment Costings</h1>
                    <p className="text-gray-500 text-sm">Manage product costing sheets and calculations</p>
                </div>
                <Link to="/costing/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus className="w-5 h-5" />
                    New Costing
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by Style No, Buyer, or Product..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Style No / Product</th>
                                <th className="px-6 py-4">Buyer / Season</th>
                                <th className="px-6 py-4 text-center">Qty</th>
                                <th className="px-6 py-4 text-right">Prod. Cost</th>
                                <th className="px-6 py-4 text-right">FOB Price</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading costings...</td>
                                </tr>
                            ) : filteredCostings.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                                        No costing sheets found. Create your first one!
                                    </td>
                                </tr>
                            ) : (
                                filteredCostings.map((costing) => (
                                    <tr key={costing.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{costing.styleNo}</div>
                                            <div className="text-xs text-gray-500">{costing.productName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-800">{costing.buyerName}</div>
                                            <div className="text-xs text-gray-500">{costing.season}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm">
                                            {costing.orderQty}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-600">
                                            ₹ {Number(costing.totalProductionCost || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-sm font-bold border border-emerald-100">
                                                ₹ {Number(costing.finalFOB || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
                                                Saved
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                <Link to={`/costing/${costing.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Details">
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link to={`/costing/edit/${costing.id}`} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => handleDelete(costing.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CostingList;
