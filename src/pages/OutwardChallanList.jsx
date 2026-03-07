import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Plus, Search, Trash2, FileText, ArrowUpDown } from 'lucide-react';

const OutwardChallanList = () => {
    const { outwardChallans, suppliers, deleteOutwardChallan } = usePurchaseOrder();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredChallans = outwardChallans
        .filter(challan => {
            const supplierName = suppliers.find(s => s.id === challan.supplierId)?.name || '';
            const searchLower = searchTerm.toLowerCase();
            return (
                challan.outChallanNo.toLowerCase().includes(searchLower) ||
                supplierName.toLowerCase().includes(searchLower) ||
                (challan.purpose && challan.purpose.toLowerCase().includes(searchLower))
            );
        })
        .sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

    const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-sage-800">Outward Challans</h1>
                <Link
                    to="/outward-challans/new"
                    className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Outward Challan
                </Link>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-sage-100">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sage-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by Challan No, Supplier (party), Purpose..."
                        className="w-full pl-10 pr-4 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-sage-50 border-b border-sage-200">
                            <tr>
                                <th onClick={() => handleSort('date')} className="px-6 py-4 text-left text-xs font-semibold text-sage-600 uppercase tracking-wider cursor-pointer hover:text-sage-800">
                                    <div className="flex items-center gap-1">
                                        Date
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-sage-600 uppercase tracking-wider">Challan No</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-sage-600 uppercase tracking-wider">Party / Supplier</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-sage-600 uppercase tracking-wider">Purpose</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-sage-600 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-sage-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {filteredChallans.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-sage-500">
                                        No outward challans found.
                                    </td>
                                </tr>
                            ) : (
                                filteredChallans.map((challan) => (
                                    <tr key={challan.id} className="hover:bg-sage-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-sage-900 font-medium">
                                            {new Date(challan.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-sage-800 font-bold font-mono">
                                            {challan.outChallanNo}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-sage-900">
                                            {getSupplierName(challan.supplierId)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-sage-600">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${challan.purpose === 'Fabric Return' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {challan.purpose}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-sage-600">
                                            {challan.items?.length || 0} items
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                                            <Link
                                                to={`/outward-challans/${challan.id}`}
                                                className="p-1 text-sage-600 hover:text-sage-800 transition-colors"
                                                title="View / Print"
                                            >
                                                <span className="text-sm">👁️</span>
                                            </Link>
                                            <Link
                                                to={`/outward-challans/edit/${challan.id}`}
                                                className="p-1 text-sage-600 hover:text-sage-800 transition-colors"
                                                title="Edit"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => deleteOutwardChallan(challan.id)}
                                                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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

export default OutwardChallanList;
