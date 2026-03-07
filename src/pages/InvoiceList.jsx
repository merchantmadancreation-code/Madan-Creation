import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Plus, Search, FileText, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const InvoiceList = () => {
    const { invoices, suppliers, deleteInvoice } = usePurchaseOrder();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || 'Unknown';

    const getDisplayGRN = (inv) => {
        if (inv.grnNo && inv.grnNo !== 'Auto-generated') return inv.grnNo;
        // Global Fallback for legacy records
        const dateObj = new Date(inv.date);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yy = String(dateObj.getFullYear()).slice(-2);

        // Find global order of this invoice
        const sortedAll = [...invoices].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA - dateB !== 0) return dateA - dateB;
            return new Date(a.created_at) - new Date(b.created_at);
        });
        const index = sortedAll.findIndex(i => i.id === inv.id);
        const seq = index >= 0 ? index + 1 : 1;
        return `GRN-${dd}${mm}${yy}${String(seq).padStart(2, '0')}`;
    };

    const filteredInvoices = invoices.filter(inv => {
        if (!inv) return false;
        const search = (searchTerm || '').toLowerCase();
        const grnNo = (inv.grnNo || '').toString().toLowerCase();

        return (
            grnNo.includes(search) ||
            invoiceNo.includes(search) ||
            supplierName.includes(search) ||
            poNumber.includes(search)
        );
    });

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this GRN?')) {
            deleteInvoice(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800">Goods Received Notes (GRN)</h1>
                    <p className="text-sage-600 mt-1">Manage vendor GRNs against Purchase Orders</p>
                </div>
                <Link
                    to="/invoices/new"
                    className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    New GRN
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-sage-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search GRNs by number, supplier, or PO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-sage-50 text-sage-900 font-semibold uppercase text-xs border-b border-sage-200">
                                <th className="px-6 py-4 w-32">Date</th>
                                <th className="px-6 py-4">System GRN No</th>
                                <th className="px-6 py-4">Vendor Inv No</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4 text-center">PO Ref</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 w-32 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-sage-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sage-600 font-medium">
                                            {invoice.date}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sage-800 font-bold">
                                            {getDisplayGRN(invoice)}
                                        </td>
                                        <td className="px-6 py-4 text-sage-600">
                                            {invoice.invoiceNo}
                                        </td>
                                        <td className="px-6 py-4 text-sage-800">
                                            {getSupplierName(invoice.supplierId)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {invoice.poNumber || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-sage-900">
                                            ₹{parseFloat(invoice.totalAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                                                    className="p-1.5 text-sage-500 hover:text-sage-700 hover:bg-sage-100 rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <span className="text-sm">👁️</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                                                    disabled={invoice.status === 'Verified'}
                                                    className={clsx(
                                                        "p-1.5 rounded transition-colors",
                                                        invoice.status === 'Verified'
                                                            ? "text-gray-300 cursor-not-allowed"
                                                            : "text-sage-500 hover:text-sage-700 hover:bg-sage-100"
                                                    )}
                                                    title={invoice.status === 'Verified' ? "Cannot edit verified GRN" : "Edit"}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(invoice.id)}
                                                    className="p-1.5 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-sage-400">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No GRNs found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoiceList;
