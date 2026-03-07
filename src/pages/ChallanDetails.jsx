import React, { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Printer, Edit2, X, FileText } from 'lucide-react';
import Barcode from 'react-barcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const ChallanDetails = () => {
    const { id } = useParams();
    const { challans, suppliers, purchaseOrders, items } = usePurchaseOrder();

    const [showBarcodes, setShowBarcodes] = useState(false);
    const [zoomImage, setZoomImage] = useState(null);
    const challan = challans.find(c => c.id === id);

    const handlePrintChallan = () => {
        if (showBarcodes) {
            setShowBarcodes(false);
            setTimeout(() => {
                window.print();
            }, 150);
        } else {
            window.print();
        }
    };

    const handlePrintBarcodes = () => {
        // Ensure regular batch print mode
        document.body.classList.remove('single-print-mode');

        if (!showBarcodes) {
            setShowBarcodes(true);
            setTimeout(() => {
                window.print();
            }, 150);
        } else {
            window.print();
        }
    };

    const handleSinglePrint = (labelId) => {
        // Function intentionally empty/removed as requested by user to avoid UI overlap
    };

    const handleDownloadPDF = async () => {
        const bales = getAllBales();
        if (bales.length === 0) return;

        try {
            // Create PDF with custom dimensions [width, height] in mm
            // 'l' for landscape, 'mm', [100, 50]
            const pdf = new jsPDF('l', 'mm', [100, 50]);

            for (let i = 0; i < bales.length; i++) {
                const labelId = `label-${i}`;
                const element = document.getElementById(labelId);
                if (!element) continue;

                const dataUrl = await toPng(element, {
                    pixelRatio: 4, // Higher quality for PDF text clarity
                    backgroundColor: '#ffffff',
                });

                if (i > 0) pdf.addPage([100, 50], 'l');

                // addImage(imageData, format, x, y, width, height)
                pdf.addImage(dataUrl, 'PNG', 0, 0, 100, 50);
            }

            pdf.save(`barcodes-challan-${challan.challanNo}.pdf`);
        } catch (err) {
            console.error('Error generating PDF:', err);
        }
    };

    const handleDownloadChallan = async () => {
        const element = document.getElementById('challan-printable-content');
        if (!element) return;

        try {
            const dataUrl = await toPng(element, { quality: 0.95, backgroundColor: 'white' });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Add Header Manually (Since it's hidden in the DOM capture)
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(28, 43, 57); // Dark Teal/Charcoal (sage-900 approx)
            pdf.text("Madan Creation", pdfWidth / 2, 20, { align: "center" });

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128); // Gray/Sage-600 approx
            pdf.text("138-139, Ashid Nagar, Oxford International Public School, Sanganer, Jaipur", pdfWidth / 2, 28, { align: "center" });

            // Add Image below header
            const imgProps = pdf.getImageProperties(dataUrl);
            const imgWidth = pdfWidth - 20; // 10mm margin each side
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

            // If content is very long, handle multi-page split simply by shrinking or letting it flow
            // For now, simpler approach: scale to fit width, start at y=35
            pdf.addImage(dataUrl, 'PNG', 10, 35, imgWidth, imgHeight);

            pdf.save(`challan-${challan.challanNo}.pdf`);
        } catch (error) {
            console.error('Error generating PDF', error);
        }
    };

    if (!challan) {
        return <div className="p-8 text-center text-sage-600">Challan not found</div>;
    }

    const supplier = suppliers.find(s => s.id === challan.supplierId);
    const po = purchaseOrders.find(p => p.id === challan.poId);

    const getItemDetails = (itemId) => items.find(i => i.id === itemId);

    // Helper to get all bales with full details for barcode labels
    const getAllBales = () => {
        const bales = [];
        if (!challan || !challan.items) return bales;

        challan.items.forEach((invItem, itemIdx) => {
            const itemMaster = items.find(i => i.id === invItem.itemId);

            // Base Master details
            const masterInfo = {
                fabricCode: itemMaster?.fabricCode || invItem.itemId || 'N/A',
                hsnCode: itemMaster?.hsnCode || '',
                materialType: itemMaster?.materialType || '',
                fabricType: itemMaster?.fabricType || '',
                fabricWidth: itemMaster?.fabricWidth || '',
                color: itemMaster?.color || '',
                fabricDesign: itemMaster?.fabricDesign || '',
                rate: itemMaster?.rate || 0,
                styleNo: invItem.styleNo || po?.styleNo || '',
                buyerPO: invItem.buyerPO || po?.buyerPO || '',
                poNumber: po?.poNumber || challan.poNumber || '',
                itemName: itemMaster?.name || 'Unknown',
                itemIndex: itemIdx + 1, // Add 1-based index for barcode uniqueness
                fabricFold: parseFloat(invItem.fabricFold) || 100
            };

            if (invItem.baleDetails && invItem.baleDetails.length > 0) {
                invItem.baleDetails.forEach(bale => {
                    const rawQty = parseFloat(bale.qty) || 0;
                    const fold = masterInfo.fabricFold;
                    bales.push({
                        ...masterInfo,
                        baleNo: bale.baleNo,
                        qty: bale.qty,
                        actualQty: fold < 100 ? (rawQty * (fold / 100)).toFixed(2) : rawQty,
                        challanNo: challan.challanNo,
                        unit: invItem.unit
                    });
                });
            } else {
                // Fallback for items without bale details
                const rawQty = parseFloat(invItem.quantity) || 0;
                const fold = masterInfo.fabricFold;
                bales.push({
                    ...masterInfo,
                    baleNo: '1',
                    qty: invItem.quantity,
                    actualQty: fold < 100 ? (rawQty * (fold / 100)).toFixed(2) : rawQty,
                    challanNo: challan.challanNo,
                    unit: invItem.unit
                });
            }
        });
        return bales;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {showBarcodes && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page {
                            size: 100mm 50mm !important;
                            margin: 0 !important;
                        }
                    }
                ` }} />
            )}
            {/* Screen Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/challans" className="text-sage-500 hover:text-sage-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-sage-800">Inward Challan Details</h1>
                </div>
                <div className="flex gap-2">
                    <Link
                        to={`/challans/edit/${challan.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </Link>
                    <button
                        onClick={() => setShowBarcodes(!showBarcodes)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-barcode"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M8 7v10" /><path d="M12 7v10" /><path d="M16 7v10" /></svg>
                        {showBarcodes ? 'Back to Challan' : 'Barcode Labels View'}
                    </button>
                    {showBarcodes ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 px-4 py-1.5 bg-sage-100 text-sage-800 rounded-lg hover:bg-sage-200 transition-colors text-sm font-medium border border-sage-200"
                            >
                                <FileText className="w-4 h-4" />
                                Download PDF
                            </button>
                            <button
                                onClick={handlePrintBarcodes}
                                className="flex items-center gap-2 px-4 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                Print Labels
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleDownloadChallan}
                                className="flex items-center gap-2 px-4 py-2 bg-sage-100 text-sage-800 rounded-lg hover:bg-sage-200 transition-colors text-sm font-medium border border-sage-200 shadow-sm"
                            >
                                <FileText className="w-4 h-4" />
                                Download PDF
                            </button>
                            <button
                                onClick={handlePrintChallan}
                                className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm font-medium"
                            >
                                <Printer className="w-4 h-4" />
                                Print Challan
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Normal Challan View */}
            {!showBarcodes && (
                <div id="challan-printable-content" className="bg-white rounded-xl shadow-sm border border-sage-100 p-8 print:p-0 print:shadow-none print:border-none">
                    {/* Header with Logo for Print */}
                    <div id="print-header-logo" className="hidden print:block mb-6 text-center border-b border-sage-200 pb-4">
                        <h1 className="text-3xl font-bold text-sage-900">Madan Creation</h1>
                        <p className="text-sage-600 text-sm">138-139, Ashid Nagar, Oxford International Public School, Sanganer, Jaipur</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                        <div>
                            <div className="flex py-1">
                                <span className="w-32 font-bold text-sage-800">GRN No:</span>
                                <span className="text-sage-900 font-bold">{challan.grnNo}</span>
                            </div>
                            <div className="flex py-1">
                                <span className="w-32 font-bold text-sage-800">Challan No:</span>
                                <span className="text-sage-900">{challan.challanNo}</span>
                            </div>
                            <div className="flex py-1">
                                <span className="w-32 font-bold text-sage-800">Date:</span>
                                <span className="text-sage-900">{challan.date ? new Date(challan.date).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="flex py-1">
                                <span className="w-32 font-bold text-sage-800">PO Ref:</span>
                                <span className="text-sage-900">{po ? po.poNumber : '-'}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex py-1">
                                <span className="w-32 font-bold text-sage-800">Supplier:</span>
                                <span className="text-sage-900 font-bold">{supplier?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex py-1">
                                <span className="w-32 font-bold text-sage-800">Vehicle No:</span>
                                <span className="text-sage-900">{challan.vehicleNo || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-8 border-collapse border border-sage-300">
                        <thead>
                            <tr className="bg-sage-100 print:bg-gray-100">
                                <th className="border border-sage-300 px-3 py-2 text-left text-xs font-bold text-sage-800">S.No</th>
                                <th className="border border-sage-300 px-3 py-2 text-center text-xs font-bold text-sage-800">Photo</th>
                                <th className="border border-sage-300 px-3 py-2 text-left text-xs font-bold text-sage-800">Style</th>
                                <th className="border border-sage-300 px-3 py-2 text-left text-xs font-bold text-sage-800">Buyer PO</th>
                                <th className="border border-sage-300 px-3 py-2 text-left text-xs font-bold text-sage-800 w-1/4">Item Description</th>
                                <th className="border border-sage-300 px-3 py-2 text-left text-xs font-bold text-sage-800">Fabric Code</th>
                                <th className="border border-sage-300 px-3 py-2 text-center text-xs font-bold text-sage-800">Rolls</th>
                                <th className="border border-sage-300 px-3 py-2 text-left text-xs font-bold text-sage-800">Lot No</th>
                                <th className="border border-sage-300 px-3 py-2 text-right text-xs font-bold text-sage-800">Qty</th>
                                <th className="border border-sage-300 px-3 py-2 text-center text-xs font-bold text-sage-800">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {challan.items && challan.items.map((item, index) => {
                                const itemDetails = getItemDetails(item.itemId);
                                return (
                                    <React.Fragment key={index}>
                                        <tr>
                                            <td className="border border-sage-300 px-3 py-2 text-sm text-center">{index + 1}</td>
                                            <td className="border border-sage-300 px-2 py-1 text-center">
                                                {(item.itemImage || itemDetails?.image) ? (
                                                    <div className="relative group flex flex-col items-center">
                                                        <img
                                                            src={item.itemImage || itemDetails?.image}
                                                            alt="item"
                                                            className="w-10 h-10 object-cover rounded mx-auto border border-sage-100 cursor-zoom-in hover:brightness-90 transition-all print:cursor-default print:hover:brightness-100"
                                                            onClick={() => setZoomImage(item.itemImage || itemDetails?.image)}
                                                        />
                                                        {!item.itemImage && itemDetails?.image && (
                                                            <span className="text-[8px] text-sage-400 italic leading-none mt-0.5 print:hidden">Master Photo</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sage-300 italic text-[10px]">No Photo</span>
                                                )}
                                            </td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm">{item.styleNo || '-'}</td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm">{item.buyerPO || '-'}</td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm font-medium">
                                                {itemDetails?.name || 'Unknown Item'}
                                                <br />
                                                <span className="text-xs text-gray-500">{itemDetails?.description}</span>
                                                {itemDetails?.hsnCode && (
                                                    <>
                                                        <br />
                                                        <span className="text-xs text-sage-600 font-mono">HSN: {itemDetails.hsnCode}</span>
                                                    </>
                                                )}
                                            </td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm font-mono">{itemDetails?.fabricCode || '-'}</td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm text-center">{item.rolls || '-'}</td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm">{item.lotNo || '-'}</td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm text-right font-bold">
                                                <div className="flex flex-col items-end">
                                                    <span>{item.quantity}</span>
                                                    {(parseFloat(item.fabricFold) || 100) < 100 && (
                                                        <span className="text-[10px] text-teal-700 mt-0.5 font-bold whitespace-nowrap">
                                                            Act: {item.actualQty || (parseFloat(item.quantity) * (parseFloat(item.fabricFold) / 100)).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="border border-sage-300 px-3 py-2 text-sm text-center">{item.unit}</td>
                                        </tr>
                                        {item.baleDetails && item.baleDetails.length > 0 && (
                                            <tr key={`${index}-details`}>
                                                <td colSpan="10" className="bg-sage-50 border border-sage-300 p-4">
                                                    <div className="text-xs font-bold text-sage-600 mb-2">Bale/Roll Breakdown:</div>
                                                    <div className="grid grid-cols-6 gap-2">
                                                        {item.baleDetails.map((bale, bIdx) => {
                                                            const rawQty = parseFloat(bale.qty) || 0;
                                                            const itemFold = parseFloat(item.fabricFold) || 100;
                                                            const actualQty = itemFold < 100 ? (rawQty * (itemFold / 100)).toFixed(2) : rawQty;
                                                            return (
                                                                <div key={bIdx} className="bg-white border border-sage-200 rounded px-2 py-1 text-xs shadow-sm flex flex-col gap-0.5">
                                                                    <div className="flex justify-between">
                                                                        <span className="font-medium text-sage-700">{bale.baleNo || `Roll ${bIdx + 1}`}</span>
                                                                        <span className="font-bold text-sage-900">{bale.qty}</span>
                                                                    </div>
                                                                    {itemFold < 100 && (
                                                                        <div className="flex justify-between border-t border-gray-50 pt-0.5">
                                                                            <span className="text-[10px] text-sage-500">Actual:</span>
                                                                            <span className="text-[10px] font-bold text-teal-700">{actualQty}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {/* Totals Row */}
                            <tr className="bg-sage-50 font-bold print:bg-gray-50">
                                <td colSpan="6" className="border border-sage-300 px-3 py-2 text-right text-sm">Totals:</td>
                                <td className="border border-sage-300 px-3 py-2 text-center text-sm">
                                    {challan.items?.reduce((sum, i) => sum + (parseInt(i.rolls) || 0), 0)}
                                </td>
                                <td className="border border-sage-300 px-3 py-2"></td>
                                <td className="border border-sage-300 px-3 py-2 text-right text-sm">
                                    <div className="flex flex-col items-end">
                                        <span>{challan.items?.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0).toFixed(2)}</span>
                                        {challan.items?.some(i => (parseFloat(i.fabricFold) || 100) < 100) && (
                                            <span className="text-[10px] text-teal-700 mt-1 whitespace-nowrap">
                                                Act: {challan.items?.reduce((sum, i) => {
                                                    const q = parseFloat(i.quantity) || 0;
                                                    const f = parseFloat(i.fabricFold) || 100;
                                                    return sum + (f < 100 ? q * (f / 100) : q);
                                                }, 0).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="border border-sage-300 px-3 py-2"></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Remarks */}
                    {challan.remarks && (
                        <div className="mb-8 border border-sage-200 p-3 rounded bg-sage-50 print:bg-transparent">
                            <p className="text-xs font-bold text-sage-700 mb-1">Remarks:</p>
                            <p className="text-sm text-sage-900">{challan.remarks}</p>
                        </div>
                    )}

                    {/* Footer Signatures */}
                    <div className="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
                        <div>
                            <div className="border-t border-sage-800 pt-2 w-3/4 mx-auto">
                                <p className="font-bold text-sage-800">Received By</p>
                                <p className="text-xs text-sage-500">(Store In-charge)</p>
                            </div>
                        </div>
                        <div>
                            <div className="border-t border-sage-800 pt-2 w-3/4 mx-auto">
                                <p className="font-bold text-sage-800">Checked By</p>
                                <p className="text-xs text-sage-500">(Quality Dept)</p>
                            </div>
                        </div>
                        <div>
                            <div className="border-t border-sage-800 pt-2 w-3/4 mx-auto">
                                <p className="font-bold text-sage-800">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>

                    {/* Attached Images */}
                    {challan.challanImage && (
                        <div className="mt-12 break-before-page">
                            <h3 className="text-lg font-bold text-sage-800 mb-6 border-b border-sage-200 pb-2">Attached Documents</h3>
                            <div className="space-y-12">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm font-semibold text-sage-600 mb-2">Vendor Challan Copy</p>
                                    <img
                                        src={challan.challanImage}
                                        alt="Vendor Challan"
                                        className="max-w-full max-h-[800px] border border-sage-200 rounded shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="mt-8 text-center text-xs text-sage-400 print:block hidden">
                        <p>Printed on: {new Date().toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Barcode View - Only visible when toggled */}
            {showBarcodes && (
                <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-8 print:p-0 print:shadow-none print:border-none">
                    <div className="flex justify-between items-center mb-6 print:hidden">
                        <h2 className="text-xl font-bold text-sage-800">Generate Barcodes</h2>
                        <button onClick={handlePrintBarcodes} className="px-4 py-2 bg-sage-600 text-white rounded hover:bg-sage-700">Print Labels</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 thermal-label-container print:block print:w-full">
                        {getAllBales().map((item, index) => (
                            <div key={index} className="print:break-inside-avoid">
                                {/* Label Container matching Invoice Style */}
                                <div
                                    id={`label-${index}`}
                                    className="thermal-label border border-sage-200 bg-white relative overflow-hidden w-full mx-auto print:border-none print:shadow-none bg-white print:bg-white min-h-[50mm] max-h-[50mm] !py-1 !px-2 flex flex-col justify-start gap-1 group"
                                >
                                    {/* Web-only action buttons removed as requested to avoid overlap */}


                                    {/* Top Section: 3-Column Header */}
                                    <div className="grid grid-cols-3 items-center gap-0.5 mb-0.5">
                                        <div className="flex flex-col">
                                            <p className="text-[7px] text-black uppercase font-black leading-none mb-0.5">Fabric Code</p>
                                            <p className="text-[11px] font-mono text-black font-black leading-none">{item.fabricCode}</p>
                                        </div>
                                        <div className="flex justify-center bg-white p-0.5 rounded shadow-[0_0_2px_rgba(0,0,0,0.1)]">
                                            <Barcode
                                                value={`${item.challanNo}-${item.itemIndex}-${item.baleNo}`}
                                                width={1.2}
                                                height={18}
                                                fontSize={7}
                                                displayValue={true}
                                                margin={0}
                                                format="CODE128"
                                                background="#ffffff"
                                                lineColor="#000000"
                                            />
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-[7px] text-black uppercase font-black leading-none mb-0.5">HSN Code</p>
                                            <p className="text-[11px] font-mono text-black font-black leading-none">{item.hsnCode || '-'}</p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-sage-200 w-full mb-0.5"></div>

                                    {/* Body Section: Dual Grid */}
                                    <div className="grid grid-cols-2 gap-4 flex-1">
                                        {/* Left Column: General Info */}
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-[9px] font-black text-black mb-0.5 pb-0.5 border-b border-sage-100">General Info</h3>
                                            <div className="space-y-0.5 text-black">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Style No</span>
                                                    <span className="text-[8px] font-bold text-right">{item.styleNo || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Buyer PO</span>
                                                    <span className="text-[8px] font-bold text-right">{item.buyerPO || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-start gap-2 border-t border-sage-50 pt-1">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Description</span>
                                                    <span className="text-[8px] font-bold text-right line-clamp-2">{item.itemName}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Material Type</span>
                                                    <span className="text-[8px] font-bold text-right">{item.materialType}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Fabric Type</span>
                                                    <span className="text-[8px] font-bold text-right">{item.fabricType || 'Cotton'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Specifications */}
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-[9px] font-black text-black mb-0.5 pb-0.5 border-b border-sage-100">Specifications</h3>
                                            <div className="space-y-0.5 text-black">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Width</span>
                                                    <span className="text-[8px] font-bold text-right">{item.fabricWidth}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[8px] font-black whitespace-nowrap">Color</span>
                                                    <span className="text-[8px] font-bold text-right">{item.color}</span>
                                                </div>

                                                {item.fabricFold < 100 && (
                                                    <div className="flex justify-between items-center bg-sage-50 px-1 py-0.5 rounded-sm border border-sage-200 mt-0.5">
                                                        <span className="text-[8px] font-black text-teal-700">Actual Qty</span>
                                                        <span className="text-[10px] font-black text-teal-700">{item.actualQty} {item.unit}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center bg-gray-100/50 px-1 py-0.5 rounded-sm mt-0.5 border border-gray-200">
                                                    <span className="text-[8px] font-black">Qty</span>
                                                    <span className="text-[10px] font-black">{item.qty} {item.unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center mt-auto">
                                        <p className="text-[9px] font-serif italic text-black font-bold">Madan Creation</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getAllBales().length === 0 && <p className="col-span-3 text-center text-gray-500 py-8">No bale details found in this Challan.</p>}
                    </div>
                </div>
            )}
            {/* Zoom Image Modal */}
            {
                zoomImage && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out print:hidden"
                        onClick={() => setZoomImage(null)}
                    >
                        <div className="relative max-w-5xl max-h-full w-full flex items-center justify-center bg-white/5 rounded-xl overflow-hidden p-2">
                            <img
                                src={zoomImage}
                                alt="Zoomed"
                                className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded"
                            />
                            <button
                                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                                onClick={() => setZoomImage(null)}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ChallanDetails;
