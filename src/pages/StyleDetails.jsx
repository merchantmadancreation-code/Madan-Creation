import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { FileText, ExternalLink } from 'lucide-react';
import { exportStyleToExcel, generateStylePDF } from '../utils/export';

const StyleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { styles, deleteStyle } = usePurchaseOrder();
    const [style, setStyle] = useState(null);

    useEffect(() => {
        if (!styles) return;
        const foundStyle = (styles || []).find(s => s.id === id);
        if (foundStyle) {
            setStyle(foundStyle);
        }
    }, [id, styles]);

    if (!styles) return null; // Or some loading state

    if (!style && styles.length > 0 && !styles.find(s => s.id === id)) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-sage-500">
                <p className="text-lg font-medium">Style not found</p>
                <Link to="/styles" className="mt-4 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700">
                    Go Back to List
                </Link>
            </div>
        );
    }

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this style?')) {
            deleteStyle(id);
            navigate('/styles');
        }
    };

    const viewDocument = (dataUrl) => {
        if (!dataUrl) return;

        try {
            if (dataUrl.startsWith('data:')) {
                const parts = dataUrl.split(';base64,');
                const contentType = parts[0].split(':')[1];
                const raw = window.atob(parts[1]);
                const rawLength = raw.length;
                const uInt8Array = new Uint8Array(rawLength);

                for (let i = 0; i < rawLength; ++i) {
                    uInt8Array[i] = raw.charCodeAt(i);
                }

                const blob = new Blob([uInt8Array], { type: contentType });
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            } else {
                window.open(dataUrl, '_blank');
            }
        } catch (error) {
            console.error("Error opening document:", error);
            alert("Could not open document. It might be corrupted or in an unsupported format.");
        }
    };

    if (!style) {
        return (
            <div className="flex items-center justify-center h-64 text-sage-500">
                <p>Loading style details...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header - Flush Sticky */}
            <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md -mx-8 -mt-8 px-8 py-4 mb-6 border-b border-sage-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/styles" className="text-sage-500 hover:text-sage-700 transition-colors">
                        <span className="text-xl">←</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                            <span className="text-2xl">✂️</span>
                            {style.styleNo}
                            {style.pcsPerSet > 1 && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded border border-blue-200 uppercase tracking-tighter">
                                    {style.pcsPerSet} Pcs Set
                                </span>
                            )}
                        </h1>
                        <p className="text-sage-500 text-sm">{style.buyerName}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => exportStyleToExcel(style)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                        title="Export to Excel"
                    >
                        <span className="text-sm">📊</span> Excel
                    </button>
                    <button
                        onClick={() => generateStylePDF(style)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
                        title="Download PDF"
                    >
                        <span className="text-sm">📄</span> PDF
                    </button>
                    <Link
                        to={`/styles/edit/${id}`}
                        className="px-4 py-2 border border-sage-300 rounded-lg text-sage-700 hover:bg-sage-50 flex items-center gap-2 transition-colors"
                    >
                        <span className="text-sm">✏️</span> Edit
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                        <span className="text-sm">🗑️</span> Delete
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Image */}
                <div className="md:col-span-1">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-sage-100">
                        <div className="aspect-[3/4] bg-sage-50 rounded-lg overflow-hidden flex items-center justify-center border border-sage-200">
                            {style.image ? (
                                <img src={style.image} alt={style.styleNo} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-sage-300 flex flex-col items-center">
                                    <div className="text-4xl mb-2">🖼️</div>
                                    <span className="text-sm">No Image Available</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Style Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Style No</label>
                                <p className="text-sage-900 font-medium">{style.styleNo}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Buyer</label>
                                <p className="text-sage-900 font-medium">{style.buyerName || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Season / Collection</label>
                                <p className="text-sage-900 font-medium">{style.season || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Color</label>
                                <p className="text-sage-900 font-medium">{style.color || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Category</label>
                                <p className="text-sage-900 font-medium">{style.category || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Section</label>
                                <p className="text-sage-900 font-medium">{style.section || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Order Type</label>
                                <p className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                                    {style.orderType || 'New'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Style Status</label>
                                <p className={clsx(
                                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase",
                                    style.status === 'Complete' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                        style.status === 'Deactive' ? "bg-red-100 text-red-700 border-red-200" :
                                            "bg-green-100 text-green-700 border-green-200"
                                )}>
                                    {style.status || 'Active'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Stitching Rate</label>
                                <p className="text-sage-900 font-bold">₹ {style.stitchingRate || '0.00'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Per pcs Avg. (Fabric)</label>
                                <p className="text-sage-900 font-bold">{style.perPcsAvg ? `${style.perPcsAvg} m` : '0.00'}</p>
                            </div>
                        </div>
                        <div className="sm:col-span-2 border-t border-sage-100 pt-4 mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Buyer PO No</label>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sage-900 font-medium">{style.buyerPO || '-'}</p>
                                        {style.buyerPOCopy && (
                                            <button
                                                type="button"
                                                onClick={() => viewDocument(style.buyerPOCopy)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-50 text-sage-600 rounded border border-sage-200 hover:bg-sage-100 transition-colors text-[10px] font-bold"
                                            >
                                                <FileText className="w-3 h-3" />
                                                View PO Copy
                                                <ExternalLink className="w-2 h-2" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Received Date</label>
                                    <p className="text-sage-900 font-medium">{style.buyerPOReceivedDate ? new Date(style.buyerPOReceivedDate).toLocaleDateString() : '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Expired Date</label>
                                    <p className="text-sage-900 font-medium">{style.poExpiredDate ? new Date(style.poExpiredDate).toLocaleDateString() : '-'}</p>
                                </div>
                                <div className="bg-sage-50 p-2 rounded border border-sage-100">
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Lead Time</label>
                                    <p className="text-sage-800 font-bold">{style.leadTime || 0} Days</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Ext. Date</label>
                                    <p className="text-red-600 font-bold">{style.poExtensionDate ? new Date(style.poExtensionDate).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Set Component Details */}
                    {style.pcsPerSet > 1 && style.setDetails && style.setDetails.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
                            <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Set Component Breakdown</h3>
                            </div>
                            <div className="overflow-hidden border border-blue-100 rounded-lg shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-blue-100/50 text-blue-800 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-2">Piece Name</th>
                                            <th className="px-4 py-2 w-32">Stitching Rate</th>
                                            <th className="px-4 py-2 w-32">Fabric Avg</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50 bg-white/80">
                                        {style.setDetails.map((piece, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-4 py-2 font-medium text-blue-900">{piece.name || `Component ${idx + 1}`}</td>
                                                <td className="px-4 py-2 font-bold text-blue-700">₹ {parseFloat(piece.rate || 0).toFixed(2)}</td>
                                                <td className="px-4 py-2 font-bold text-blue-600">{parseFloat(piece.avg || 0).toFixed(2)} m</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Size Wise Summary - MOVED HERE for better visibility */}
                    {style.sizeWiseDetails && style.sizeWiseDetails.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                            <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2 uppercase tracking-wide text-sm">Size Wise Order Summary</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-sage-50 text-sage-600 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-3 py-2">Size</th>
                                            <th className="px-3 py-2">SKU Code</th>
                                            <th className="px-3 py-2">Order Qty</th>
                                            <th className="px-3 py-2">Rate</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sage-100">
                                        {style.sizeWiseDetails.map((detail, idx) => (
                                            <tr key={idx} className="hover:bg-sage-50/50">
                                                <td className="px-3 py-2 font-bold text-sage-700">{detail.size}</td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-sage-500">{detail.sku || '-'}</td>
                                                <td className="px-3 py-2">{detail.qty || 0}</td>
                                                <td className="px-3 py-2">₹ {detail.rate || '0.00'}</td>
                                                <td className="px-3 py-2 text-right font-bold text-sage-900">₹ {detail.amount || '0.00'}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-sage-50/30 font-bold">
                                            <td colSpan="2" className="px-3 py-2 text-right uppercase text-[10px]">Grand Total</td>
                                            <td className="px-3 py-2">
                                                {style.sizeWiseDetails.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0)}
                                            </td>
                                            <td></td>
                                            <td className="px-3 py-2 text-right text-sage-800">
                                                ₹ {style.sizeWiseDetails.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Fabric Details & Notes - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 h-full">
                            <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Fabric Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Fabric Name</label>
                                    <p className="text-sage-900 font-medium">{style.fabricName || '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Content</label>
                                    <p className="text-sage-900 font-medium">{style.fabricContent || '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Width</label>
                                    <p className="text-sage-900 font-medium">{style.fabricWidth || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 h-full">
                            <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Notes</h3>
                            <p className="text-sage-700 whitespace-pre-wrap text-sm">{style.notes || 'No additional notes.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default StyleDetails;
