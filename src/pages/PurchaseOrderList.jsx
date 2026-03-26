import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, FileSpreadsheet, Printer, Edit2, Trash2, Download } from 'lucide-react';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { exportToExcel, generatePDF } from '../utils/export';

const PurchaseOrderList = () => {
    const { purchaseOrders, deletePurchaseOrder, updatePOStatus, suppliers } = usePurchaseOrder();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-sage-800">Purchase Orders (v4)</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportToExcel(purchaseOrders)}
                        className="bg-cream text-sage-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-50 transition-colors border border-sage-300"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export All
                    </button>
                    <Link to="/purchase-orders/new" className="bg-sage-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-700 shadow-sm transition-colors">
                        <Plus className="w-4 h-4" />
                        Create PO
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                {purchaseOrders.length === 0 ? (
                    <div className="p-8 text-center text-sage-500">
                        No purchase orders found. Create one to get started.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-sage-50 border-b border-sage-200 text-xs uppercase text-sage-600 font-semibold">
                                <th className="px-6 py-4">PO Number</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {purchaseOrders.map((po) => (
                                <tr key={po.id} className="hover:bg-cream transition-colors">
                                    <td className="px-6 py-4 font-medium text-sage-900">{po.poNumber}</td>
                                    <td className="px-6 py-4 text-sage-600">{po.poDate || po.date}</td>
                                    <td className="px-6 py-4 text-sage-600 font-medium">{po.supplierDetails?.name || po.supplierName}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sage-900">
                                        ₹{(po.commercials?.calculations?.finalTotal || po.calculations?.finalTotal || po.total || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${po.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                            po.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                po.status === 'Hold' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {po.status || 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            {/* Status Actions */}
                                            {(!po.status || po.status === 'Draft' || po.status === 'Hold') && (
                                                <>
                                                    <button onClick={() => updatePOStatus(po.id, 'Approved')} className="p-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 rounded border border-green-200" title="Approve">Approve</button>
                                                    <button onClick={() => updatePOStatus(po.id, 'Hold')} className="p-1 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 rounded border border-orange-200" title="Hold">Hold</button>
                                                    <button onClick={() => updatePOStatus(po.id, 'Rejected')} className="p-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200" title="Reject">Reject</button>
                                                </>
                                            )}

                                            <div className="w-px bg-sage-200 mx-1"></div>

                                            <Link
                                                to={`/purchase-orders/edit/${po.id}`}
                                                className="p-2 text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this purchase order?')) {
                                                        deletePurchaseOrder(po.id);
                                                    }
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="w-px bg-sage-200 mx-1"></div>
                                            <button
                                                onClick={() => generatePDF(po, false, suppliers)}
                                                className="p-2 text-sage-600 hover:bg-sage-100 rounded-lg transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => exportToExcel([po])}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Export Excel"
                                            >
                                                <FileSpreadsheet className="w-4 h-4" />
                                            </button>
                                            {/* Print is essentially PDF in browser */}
                                            <button
                                                onClick={() => generatePDF(po, true, suppliers)}
                                                className="p-2 text-sage-600 hover:bg-sage-100 rounded-lg transition-colors"
                                                title="Print"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderList;
