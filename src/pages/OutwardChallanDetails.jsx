import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Printer, Edit2, Download, FileText, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

const OutwardChallanDetails = () => {
    const { id } = useParams();
    const { outwardChallans, suppliers, items } = usePurchaseOrder();

    const challan = outwardChallans.find(c => c.id === id);

    if (!challan) {
        return <div className="p-8 text-center text-sage-600">Outward Challan not found</div>;
    }

    const supplier = suppliers.find(s => s.id === challan.supplierId);

    const getItemDetails = (itemId) => items.find(i => i.id === itemId);

    const [isDownloading, setIsDownloading] = React.useState(false);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('printable-challan');
        if (!element) return;

        try {
            setIsDownloading(true);

            // Hide everything else or clone? html-to-image handles it well.
            const dataUrl = await toPng(element, {
                pixelRatio: 4, // Higher quality
                backgroundColor: '#ffffff',
                // Filter out any elements with print:hidden class if necessary, 
                // but usually better to let CSS classes work
            });

            // A4 size in mm: 210 x 297
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`challan-${challan.outChallanNo}.pdf`);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try printing to PDF instead.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Screen Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/outward-challans" className="text-sage-500 hover:text-sage-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-sage-800">
                        Outward Challan {challan.outChallanNo}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Link
                        to={`/outward-challans/edit/${challan.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </Link>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-100 text-sage-800 rounded-lg hover:bg-sage-200 transition-colors shadow-sm border border-sage-200 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        PDF
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Print Layout */}
            <div
                id="printable-challan"
                className="bg-white p-8 shadow-sm border border-sage-200 print:shadow-none print:border-0 print:p-0"
            >
                {/* Header */}
                <div className="border-b-2 border-sage-800 pb-4 mb-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-sage-900 uppercase tracking-wide">Madan Creation</h1>
                        <div className="text-sage-600 text-sm mt-1">
                            <p>138-139, Ashid Nagar, Oxford International Public School, Sanganer, Jaipur - 302029</p>
                        </div>
                        <h2 className="text-xl font-bold text-sage-800 mt-4 border-2 border-sage-800 inline-block px-4 py-1">OUTWARD CHALLAN</h2>
                        <p className="mt-2 text-sm font-semibold uppercase">({challan.purpose})</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                    <div>
                        <div className="flex py-1">
                            <span className="w-32 font-bold text-sage-800">Challan No:</span>
                            <span className="text-sage-900 font-bold">{challan.outChallanNo}</span>
                        </div>
                        <div className="flex py-1">
                            <span className="w-32 font-bold text-sage-800">Date:</span>
                            <span className="text-sage-900">{new Date(challan.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex py-1">
                            <span className="w-32 font-bold text-sage-800">Ref No:</span>
                            <span className="text-sage-900">{challan.referenceNo || '-'}</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex py-1">
                            <span className="w-32 font-bold text-sage-800">Party/To:</span>
                            <span className="text-sage-900 font-bold text-lg">{supplier?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex py-1">
                            <span className="w-32 font-bold text-sage-800">Vehicle No:</span>
                            <span className="text-sage-900">{challan.vehicleNo || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Dynamic Table based on Purpose */}
                {challan.purpose === 'Cutting/Stitching' ? (
                    <>
                        <table className="w-full mb-4 border-collapse border border-sage-300 text-xs">
                            <thead>
                                <tr className="bg-sage-100 print:bg-gray-100">
                                    <th className="border border-sage-300 px-2 py-2 text-left">Item / Fabric</th>
                                    <th className="border border-sage-300 px-2 py-2 text-left">Style No</th>
                                    <th className="border border-sage-300 px-2 py-2 text-left">PO No</th>
                                    {SIZES.map(size => (
                                        <th key={size} className="border border-sage-300 px-1 py-2 text-center w-8">{size}</th>
                                    ))}
                                    <th className="border border-sage-300 px-2 py-2 text-center font-bold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(challan.items?.filter(i => !i.isRawMaterial) || []).map((item, index) => {
                                    const itemDetails = getItemDetails(item.itemId);
                                    const totalQty = SIZES.reduce((sum, size) => sum + (parseInt(item[size]) || 0), 0);
                                    return (
                                        <tr key={index}>
                                            <td className="border border-sage-300 px-2 py-2 font-medium">
                                                {itemDetails?.name} {itemDetails?.fabricCode && `(${itemDetails.fabricCode})`}
                                            </td>
                                            <td className="border border-sage-300 px-2 py-2">{item.styleNo || '-'}</td>
                                            <td className="border border-sage-300 px-2 py-2">{item.poNo || '-'}</td>
                                            {SIZES.map(size => (
                                                <td key={size} className="border border-sage-300 px-1 py-2 text-center">
                                                    {item[size] || ''}
                                                </td>
                                            ))}
                                            <td className="border border-sage-300 px-2 py-2 text-center font-bold bg-sage-50 print:bg-gray-50">
                                                {totalQty}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {/* Grand Totals */}
                                <tr className="font-bold bg-sage-100 print:bg-gray-100">
                                    <td colSpan="3" className="border border-sage-300 px-2 py-2 text-right">Grand Total:</td>
                                    {SIZES.map(size => (
                                        <td key={size} className="border border-sage-300 px-1 py-2 text-center">
                                            {(challan.items?.filter(i => !i.isRawMaterial) || []).reduce((sum, item) => sum + (parseInt(item[size]) || 0), 0)}
                                        </td>
                                    ))}
                                    <td className="border border-sage-300 px-2 py-2 text-center">
                                        {(challan.items?.filter(i => !i.isRawMaterial) || []).reduce((sum, item) => sum + SIZES.reduce((s, z) => s + (parseInt(item[z]) || 0), 0), 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Raw Materials Table */}
                        {challan.items?.filter(i => i.isRawMaterial).length > 0 && (
                            <div className="mb-8">
                                <h3 className="font-bold text-sage-800 text-xs mb-2 uppercase border-b-2 border-sage-400 inline-block">Raw Materials Issued</h3>
                                <table className="w-full border-collapse border border-sage-300 text-xs">
                                    <thead>
                                        <tr className="bg-sage-100 print:bg-gray-100">
                                            <th className="border border-sage-300 px-2 py-1 text-left w-12">S.No</th>
                                            <th className="border border-sage-300 px-2 py-1 text-left w-32">Category</th>
                                            <th className="border border-sage-300 px-2 py-1 text-left">Material Name</th>
                                            <th className="border border-sage-300 px-2 py-1 text-center w-24">Qty</th>
                                            <th className="border border-sage-300 px-2 py-1 text-center w-24">Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {challan.items.filter(i => i.isRawMaterial).map((item, index) => {
                                            const itemDetails = getItemDetails(item.itemId);
                                            return (
                                                <tr key={index}>
                                                    <td className="border border-sage-300 px-2 py-1 text-center">{index + 1}</td>
                                                    <td className="border border-sage-300 px-2 py-1">{item.category}</td>
                                                    <td className="border border-sage-300 px-2 py-1 font-medium">{itemDetails?.name || 'Unknown'}</td>
                                                    <td className="border border-sage-300 px-2 py-1 text-center font-bold">{item.quantity}</td>
                                                    <td className="border border-sage-300 px-2 py-1 text-center">{item.unit}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : (
                    // Fabric Return Table
                    <table className="w-full mb-8 border-collapse border border-sage-300 text-sm">
                        <thead>
                            <tr className="bg-sage-100 print:bg-gray-100 text-xs">
                                <th className="border border-sage-300 px-4 py-3 text-left w-16">S.No</th>
                                <th className="border border-sage-300 px-4 py-3 text-left w-48">Fabric Code</th>
                                <th className="border border-sage-300 px-4 py-3 text-left w-64">Fabric Description</th>
                                <th className="border border-sage-300 px-4 py-3 text-left w-64">Bales / Barcodes</th>
                                <th className="border border-sage-300 px-4 py-3 text-center w-32">Qty</th>
                                <th className="border border-sage-300 px-4 py-3 text-center w-32">Unit</th>
                                <th className="border border-sage-300 px-4 py-3 text-right w-40">Rate</th>
                                <th className="border border-sage-300 px-4 py-3 text-right w-40">Gross Amt</th>
                                <th className="border border-sage-300 px-4 py-3 text-center w-28">GST %</th>
                                <th className="border border-sage-300 px-4 py-3 text-right w-40">GST Amt</th>
                                <th className="border border-sage-300 px-4 py-3 text-right w-40">Net Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {challan.items && challan.items.map((item, index) => {
                                const itemDetails = getItemDetails(item.itemId);
                                const gross = (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0));
                                const tax = gross * ((parseFloat(item.gstRate) || 0) / 100);
                                const net = gross + tax;

                                return (
                                    <tr key={index}>
                                        <td className="border border-sage-300 px-4 py-3 text-center">{index + 1}</td>
                                        <td className="border border-sage-300 px-4 py-3 font-mono text-xs">{itemDetails?.fabricCode || '-'}</td>
                                        <td className="border border-sage-300 px-4 py-3">
                                            <span className="font-medium text-sm">{itemDetails?.name}</span>
                                            {itemDetails?.fabricCode && <div className="text-[10px] text-gray-500">Code: {itemDetails.fabricCode}</div>}
                                            {itemDetails?.description && <div className="text-[10px] text-gray-500 line-clamp-1">{itemDetails.description}</div>}
                                        </td>
                                        <td className="border border-sage-300 px-4 py-3">
                                            {item.bales && item.bales.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.bales.map((b, bIdx) => (
                                                        <span key={bIdx} className="bg-gray-50 text-[10px] px-1 py-0.5 rounded border border-gray-200">
                                                            {b.barcode} ({b.qty})
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Manual Qty</span>
                                            )}
                                        </td>
                                        <td className="border border-sage-300 px-4 py-3 text-center font-medium">{item.quantity}</td>
                                        <td className="border border-sage-300 px-4 py-3 text-center">{item.unit}</td>
                                        <td className="border border-sage-300 px-4 py-3 text-right">{item.rate}</td>
                                        <td className="border border-sage-300 px-4 py-3 text-right">{gross.toFixed(2)}</td>
                                        <td className="border border-sage-300 px-4 py-3 text-center">{item.gstRate}%</td>
                                        <td className="border border-sage-300 px-4 py-3 text-right">{tax.toFixed(2)}</td>
                                        <td className="border border-sage-300 px-4 py-3 text-right font-bold text-sage-900">{net.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                            {/* Footer for Amounts */}
                            <tr className="bg-sage-50 font-bold print:bg-gray-50">
                                <td colSpan="10" className="border border-sage-300 px-4 py-3 text-right text-base">Total Amount:</td>
                                <td className="border border-sage-300 px-4 py-3 text-right text-base font-bold text-sage-900">
                                    {challan.items?.reduce((sum, item) => {
                                        const gross = (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0));
                                        const tax = gross * ((parseFloat(item.gstRate) || 0) / 100);
                                        return sum + gross + tax;
                                    }, 0).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {/* Remarks */}
                {challan.remarks && (
                    <div className="mb-8 border border-sage-200 p-3 rounded bg-sage-50 print:bg-transparent">
                        <p className="text-xs font-bold text-sage-700 mb-1">Remarks:</p>
                        <p className="text-sm text-sage-900">{challan.remarks}</p>
                    </div>
                )}

                {/* Footer Signatures */}
                <div className="mt-20 grid grid-cols-2 gap-8 text-center text-sm">
                    <div>
                        <div className="border-t border-sage-800 pt-2 w-2/3 mx-auto">
                            <p className="font-bold text-sage-800">Receiver's Signature</p>
                        </div>
                    </div>
                    <div>
                        <div className="border-t border-sage-800 pt-2 w-2/3 mx-auto">
                            <p className="font-bold text-sage-800">Authorized Signatory</p>
                            <p className="text-xs text-sage-500">(Madan Creation)</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-sage-400 print:block hidden">
                    <p>Printed on: {new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

export default OutwardChallanDetails;
