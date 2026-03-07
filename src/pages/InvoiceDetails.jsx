import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, CheckCircle, Printer, FileText, Edit2 } from 'lucide-react';
import clsx from 'clsx';

const InvoiceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { invoices, suppliers, purchaseOrders, items, verifyInvoice } = usePurchaseOrder();
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        if (id && invoices.length > 0) {
            const found = invoices.find(i => i.id === id);
            if (found) {
                setInvoice(found);
            } else {
                navigate('/invoices');
            }
        }
    }, [id, invoices, navigate]);

    if (!invoice) return <div className="p-8 text-center text-sage-500">Loading...</div>;

    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const isVerified = invoice.status === 'Verified';

    const getDisplayGRN = (inv) => {
        if (inv.grnNo) return inv.grnNo;
        const dateObj = new Date(inv.date);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yy = String(dateObj.getFullYear()).slice(-2);

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

    const getDisplayItemCode = (invItem) => {
        if (invItem.fabricCode && invItem.fabricCode !== '-') return invItem.fabricCode;
        const masterItem = items.find(i => i.id === invItem.itemId);
        return masterItem?.fabricCode || masterItem?.name || '-';
    };

    // Calculate Reconciliation Data
    const purchaseOrder = purchaseOrders.find(po => po.poNumber === invoice.poNumber);
    const reconciliationData = purchaseOrder?.items?.map(poItem => {
        const invoiceItem = invoice.items?.find(i => i.itemId === poItem.itemId);
        const invoiceQty = invoiceItem ? Number(invoiceItem.qty || 0) : 0;
        const poQty = Number(poItem.qty || 0);
        const diff = invoiceQty - poQty;
        const ratio = poQty > 0 ? ((diff / poQty) * 100).toFixed(2) : '0.00';
        return {
            description: poItem.description,
            ordered: poQty,
            invoiced: invoiceQty,
            diff: diff,
            ratio: ratio,
            status: diff === 0 ? 'Matched' : diff > 0 ? 'Excess' : 'Short'
        };
    }) || [];

    const handleVerify = () => {
        if (window.confirm('Are you sure you want to verify this GRN? This will lock the record for editing.')) {
            verifyInvoice(id);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/invoices" className="text-sage-500 hover:text-sage-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800 flex items-center gap-3">
                            GRN #{getDisplayGRN(invoice)}
                            <span className={clsx(
                                "px-3 py-1 text-sm rounded-full border",
                                isVerified ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            )}>
                                {invoice.status || 'Draft'}
                            </span>
                        </h1>
                        <p className="text-sage-500 text-sm mt-1">
                            {supplier?.name} • {invoice.date} • Inv: {invoice.invoiceNo}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!isVerified && (
                        <>
                            <Link
                                to={`/invoices/edit/${id}`}
                                className="px-4 py-2 border border-sage-300 rounded-lg text-sage-700 hover:bg-sage-50 flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" /> Edit
                            </Link>
                            <button
                                onClick={handleVerify}
                                className="px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 shadow-sm flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> Verify
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 shadow-sm flex items-center gap-2"
                        title="Print or Save as PDF"
                    >
                        <Printer className="w-4 h-4" /> Print / Download
                    </button>
                    <Link
                        to={`/invoices/${id}/barcodes`}
                        className="px-4 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 shadow-sm flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" /> Generate Barcodes
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-sage-100 bg-sage-50">
                            <h3 className="font-semibold text-sage-800">GRN Items</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-sage-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Style No</th>
                                        <th className="px-6 py-3 font-medium">Buyer PO</th>
                                        <th className="px-6 py-3 font-medium">Item Code</th>
                                        <th className="px-6 py-3 font-medium">Description</th>
                                        <th className="px-6 py-3 font-medium text-center">Rolls</th>
                                        <th className="px-6 py-3 font-medium text-right">Qty</th>
                                        <th className="px-6 py-3 font-medium text-right">Rate</th>
                                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sage-100 bg-white">
                                    {invoice.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-3 text-sage-800 font-medium">{item.styleNo || '-'}</td>
                                            <td className="px-6 py-3 text-sage-600 font-mono text-xs">{item.buyerPO || '-'}</td>
                                            <td className="px-6 py-3 text-sage-600 font-mono text-xs">{getDisplayItemCode(item)}</td>
                                            <td className="px-6 py-3 text-sage-800">{item.description}</td>
                                            <td className="px-6 py-3 text-center text-sage-600">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.rolls || 1}</span>
                                                    <Link
                                                        to={`/invoices/${id}/barcodes?itemId=${item.itemId}`}
                                                        title="Print Barcodes for this item"
                                                        className="text-sage-400 hover:text-sage-700 transition-colors"
                                                    >
                                                        <Printer className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right text-sage-600">{item.qty} {item.uom}</td>
                                            <td className="px-6 py-3 text-right text-sage-600">{item.rate}</td>
                                            <td className="px-6 py-3 text-right font-mono text-sage-900">
                                                {((item.qty || 0) * (item.rate || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Attachment */}
                    {invoice.attachment && (
                        <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                            <h3 className="font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">GRN Copy</h3>
                            <div className="bg-sage-50 rounded-lg p-2 border border-sage-200 inline-block">
                                <img src={invoice.attachment} alt="Attachment" className="max-h-96 rounded" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Commercials */}
                    <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                        <h3 className="font-semibold text-sage-800 mb-4">Payment Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-sage-600">
                                <span>Items Total</span>
                                <span>₹{invoice.calculations?.itemsTotal?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sage-600">
                                <span>Discount</span>
                                <span>- {invoice.commercials?.discount}</span>
                            </div>
                            <div className="flex justify-between text-sage-600">
                                <span>Freight</span>
                                <span>+ {invoice.commercials?.freight}</span>
                            </div>
                            <div className="flex justify-between font-medium text-sage-800 pt-2 border-t border-sage-100">
                                <span>Taxable</span>
                                <span>₹{invoice.calculations?.taxableAmount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sage-600">
                                <span>GST ({invoice.commercials?.gstRate}%)</span>
                                <span>+ {invoice.calculations?.gstAmount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sage-600">
                                <span>Round Off</span>
                                <span>{invoice.commercials?.roundOff}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xl text-sage-900 pt-3 border-t border-sage-100">
                                <span>Total</span>
                                <span>₹{invoice.totalAmount?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6 text-sm text-sage-600 space-y-2">
                        <div>
                            <span className="block text-xs uppercase text-sage-400 font-semibold">System GRN No</span>
                            <span className="text-sage-800 font-mono text-xs">{getDisplayGRN(invoice)}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase text-sage-400 font-semibold">Vendor Inv No</span>
                            <span className="text-sage-800 font-mono text-xs">{invoice.invoiceNo}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase text-sage-400 font-semibold">PO Reference</span>
                            <span className="text-sage-800">{invoice.poNumber || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase text-sage-400 font-semibold">Remarks</span>
                            <p className="text-sage-800 mt-1">{invoice.remarks || 'No remarks'}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Printable Content (Hidden on Screen) */}
            <div className="hidden print:block p-4 bg-white text-black text-xs">
                <div className="flex justify-between items-start mb-4 border-b pb-2 border-gray-300">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wide text-gray-800">Goods Received Note (GRN)</h1>
                        <p className="text-gray-500 mt-1">Original Receipt</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-800">Madan Creation</h2>
                        <p className="text-sm text-gray-600">
                            123, Industrial Area, Phase 1<br />
                            New Delhi, India - 110020<br />
                            GSTIN: 07AABCU9603R1Z2
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-4">
                    <div>
                        <h3 className="text-sm font-bold uppercase text-gray-500 mb-1">Bill To</h3>
                        <div className="text-gray-800 font-medium">
                            {supplier?.name}<br />
                            {supplier?.contactPerson && <span className="text-sm font-normal text-gray-600">Attn: {supplier.contactPerson}<br /></span>}
                            {supplier?.gstNum && <span className="text-sm font-normal text-gray-600">GSTIN: {supplier.gstNum}</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-gray-500 font-bold uppercase text-xs">System GRN No</span>
                            <span className="font-mono font-bold text-black">{getDisplayGRN(invoice)}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 font-bold uppercase text-xs">Vendor Inv No</span>
                            <span className="font-mono text-gray-800">{invoice.invoiceNo}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 font-bold uppercase text-xs">Date</span>
                            <span className="font-mono text-gray-800">{invoice.date}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 font-bold uppercase text-xs">PO Reference</span>
                            <span className="font-mono text-gray-800">{invoice.poNumber || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 font-bold uppercase text-xs">Inward Challan No</span>
                            <span className="font-mono text-gray-800">{invoice.challanNo || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 font-bold uppercase text-xs">Status</span>
                            <span className="font-bold text-gray-800 uppercase">{invoice.status}</span>
                        </div>
                    </div>
                </div>

                <table className="w-full mb-4 text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-800 text-[9px]">
                            <th className="py-2 text-left font-bold uppercase text-gray-600 w-24">Style No</th>
                            <th className="py-2 text-left font-bold uppercase text-gray-600 w-24">Buyer PO</th>
                            <th className="py-2 text-left font-bold uppercase text-gray-600 w-20">Item Code</th>
                            <th className="py-2 text-left font-bold uppercase text-gray-600">Description</th>
                            <th className="py-2 text-center font-bold uppercase text-gray-600 w-12">Rolls</th>
                            <th className="py-2 text-right font-bold uppercase text-gray-600 w-20">Qty</th>
                            <th className="py-2 text-right font-bold uppercase text-gray-600 w-20">Rate</th>
                            <th className="py-2 text-right font-bold uppercase text-gray-600 w-24">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoice.items?.map((item, idx) => (
                            <tr key={idx} className="align-top">
                                <td className="py-3 pr-2 text-gray-800 font-medium break-all">{item.styleNo || '-'}</td>
                                <td className="py-3 pr-2 text-gray-600 font-mono text-[9px] break-all">{item.buyerPO || '-'}</td>
                                <td className="py-3 pr-2 text-gray-600 font-mono text-[9px] break-all">{getDisplayItemCode(item)}</td>
                                <td className="py-3 pr-2 text-gray-800 leading-tight">{item.description}</td>
                                <td className="py-3 text-center text-gray-600">{item.rolls || '-'}</td>
                                <td className="py-3 text-right text-gray-600 font-mono">
                                    <div className="flex flex-col items-end">
                                        <span>{item.qty}</span>
                                        <span className="text-[8px] uppercase tracking-tighter">{item.uom}</span>
                                    </div>
                                </td>
                                <td className="py-3 text-right text-gray-600 font-mono">{item.rate || '0.00'}</td>
                                <td className="py-3 text-right font-bold text-gray-800 font-mono">
                                    {((item.qty || 0) * (item.rate || 0)).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-4">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-mono">{invoice.calculations?.itemsTotal?.toFixed(2)}</span>
                        </div>
                        {invoice.commercials?.discount > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Discount</span>
                                <span className="font-mono">- {invoice.commercials.discount}</span>
                            </div>
                        )}
                        {invoice.commercials?.freight > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Freight</span>
                                <span className="font-mono">+ {invoice.commercials.freight}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-300">
                            <span>Taxable Value</span>
                            <span className="font-mono">{invoice.calculations?.taxableAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>GST ({invoice.commercials?.gstRate}%)</span>
                            <span className="font-mono">+ {invoice.calculations?.gstAmount?.toFixed(2)}</span>
                        </div>
                        {invoice.commercials?.roundOff !== 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Round Off</span>
                                <span className="font-mono">{invoice.commercials?.roundOff}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-xl text-black pt-2 border-t-2 border-gray-800">
                            <span>Total</span>
                            <span className="font-mono">₹{invoice.totalAmount?.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-300 pt-4 mb-8">
                    <p className="text-gray-600 text-sm"><strong>Remarks:</strong> {invoice.remarks || 'None'}</p>
                </div>

                {/* PO Reconciliation Table */}
                {reconciliationData.length > 0 && (
                    <div className="mb-12 print:block hidden">
                        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">PO Reconciliation</h3>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="py-1 text-left font-semibold text-gray-600">Item</th>
                                    <th className="py-1 text-right font-semibold text-gray-600">Ordered</th>
                                    <th className="py-1 text-right font-semibold text-gray-600">GRN Qty</th>
                                    <th className="py-1 text-right font-semibold text-gray-600">Diff</th>
                                    <th className="py-1 text-right font-semibold text-gray-600">Ratio %</th>
                                    <th className="py-1 text-center font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reconciliationData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="py-1 text-gray-800">{row.description}</td>
                                        <td className="py-1 text-right text-gray-600">{row.ordered}</td>
                                        <td className="py-1 text-right text-gray-600">{row.invoiced}</td>
                                        <td className={clsx("py-1 text-right font-medium", row.diff < 0 ? "text-red-600" : "text-green-600")}>
                                            {row.diff > 0 ? '+' : ''}{Number(row.diff).toFixed(2)}
                                        </td>
                                        <td className="py-1 text-right text-gray-600 font-mono">{row.ratio}%</td>
                                        <td className="py-1 text-center">
                                            <span className={clsx(
                                                "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                                row.status === 'Matched' ? "bg-green-50 text-green-700 border-green-200" :
                                                    row.status === 'Excess' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        "bg-red-50 text-red-700 border-red-200"
                                            )}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-[10px] text-gray-500">
                    <div>
                        <p>Authorized Signatory</p>
                        <p className="mt-6 font-bold text-gray-800 uppercase">Madan Creation</p>
                    </div>
                    <div className="text-right">
                        <p>This is a computer generated GRN.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;
