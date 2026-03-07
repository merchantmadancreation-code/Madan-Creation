import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import Barcode from 'react-barcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const BarcodeGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { invoices, challans, items: allItems } = usePurchaseOrder();
    const [documentData, setDocumentData] = useState(null);
    const [isChallan, setIsChallan] = useState(false);

    useEffect(() => {
        if (id) {
            let found = invoices.find(i => i.id === id);
            if (found) {
                setDocumentData(found);
                setIsChallan(false);
            } else {
                found = challans.find(c => c.id === id);
                if (found) {
                    setDocumentData(found);
                    setIsChallan(true);
                } else {
                    navigate('/invoices'); // Or some error page
                }
            }
        }
    }, [id, invoices, challans, navigate]);

    if (!documentData) return <div className="p-8 text-center text-sage-500">Loading...</div>;

    const docNo = isChallan ? documentData.challanNo : documentData.invoiceNo;

    // Enhance invoice/challan items with details from Item Master (like fabricCode, hsnCode)
    const barcodeItems = documentData.items.flatMap((docItem, itemIdx) => {
        const itemMaster = allItems.find(i => i.id === docItem.itemId);

        const baseItem = {
            ...docItem,
            fabricCode: itemMaster?.fabricCode || docItem.articleCode || 'N/A',
            hsnCode: itemMaster?.hsnCode || docItem.hsnCode || '',
            materialType: itemMaster?.materialType || '',
            fabricType: itemMaster?.fabricType || '',
            fabricWidth: itemMaster?.fabricWidth || '',
            color: itemMaster?.color || docItem.color || '',
            fabricDesign: itemMaster?.fabricDesign || '',
            unit: itemMaster?.unit || docItem.uom,
            styleNo: docItem.styleNo || '',
            buyerPO: docItem.buyerPO || '',
            docNo: docNo, // Generic doc no
            itemIdx: itemIdx + 1, // 1-based index
        };

        // Normalize Bales vs BaleDetails
        const balesRaw = isChallan ? docItem.baleDetails : docItem.bales;

        // If bales exist, create a label for each bale
        if (balesRaw && balesRaw.length > 0) {
            return balesRaw.map((bale, baleIdx) => ({
                ...baseItem,
                qty: bale.qty, // Override total qty with bale qty
                baleIdx: baleIdx + 1 // 1-based index
            }));
        }

        // Fallback: Just one label for the line item
        return [{ ...baseItem, baleIdx: 1 }];
    });

    const handlePrintBarcodes = () => {
        // Ensure regular batch print mode
        document.body.classList.remove('single-print-mode');
        window.print();
    };

    const handleSinglePrint = (labelId) => {
        // Function intentionally empty/removed as requested by user to avoid UI overlap
    };


    const handleDownloadPDF = async () => {
        if (barcodeItems.length === 0) return;

        try {
            // Create PDF with custom dimensions [width, height] in mm
            // 'l' for landscape, 'mm', [100, 50]
            const pdf = new jsPDF('l', 'mm', [100, 50]);

            for (let i = 0; i < barcodeItems.length; i++) {
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

            pdf.save(`barcodes-invoice-${invoice.invoiceNo}.pdf`);
        } catch (err) {
            console.error('Error generating PDF:', err);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: 100mm 50mm !important;
                        margin: 0 !important;
                    }
                }
            ` }} />
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link to={`/invoices/${id}`} className="text-sage-500 hover:text-sage-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-sage-800">
                        Generate Barcodes
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-2 bg-sage-100 text-sage-800 rounded-lg hover:bg-sage-200 transition-colors shadow-sm font-medium border border-sage-200"
                    >
                        <FileText className="w-4 h-4" />
                        Download PDF
                    </button>
                    <button
                        onClick={handlePrintBarcodes}
                        className="flex items-center gap-2 px-6 py-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0d9488] transition-colors shadow-sm font-medium"
                    >
                        <Printer className="w-4 h-4" />
                        Print Labels
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6 print:hidden">
                <p className="text-sage-600 mb-4">
                    Preview of barcodes for Document <strong>#{docNo}</strong>.
                    Click "Print Labels" to print. Ensure your printer is set to the correct label size (e.g., 4"x6" or custom).
                </p>
            </div>

            {/* Print Area - Visible on Screen (as preview) and Print */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 thermal-label-container print:block print:w-full">
                {barcodeItems.map((item, index) => (
                    <div key={index} className="print:break-inside-avoid">
                        {/* Label Container */}
                        <div
                            id={`label-${index}`}
                            className="thermal-label border border-sage-200 bg-white relative overflow-hidden w-full mx-auto print:border-none print:shadow-none bg-white print:bg-white min-h-[50mm] max-h-[50mm] !py-1 !px-2 flex flex-col justify-start gap-1 group"
                        >
                            {/* Top Section: 3-Column Header */}
                            <div className="grid grid-cols-3 items-center gap-0.5 mb-0.5">
                                <div className="flex flex-col">
                                    <p className="text-[7px] text-black uppercase font-black leading-none mb-0.5">Fabric Code</p>
                                    <p className="text-[11px] font-mono text-black font-black leading-none">{item.fabricCode}</p>
                                </div>
                                <div className="flex justify-center bg-white p-0.5 rounded shadow-[0_0_2px_rgba(0,0,0,0.1)]">
                                    <Barcode
                                        value={`${item.docNo}-${item.itemIdx}-${item.baleIdx}`}
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
                                    <div className="space-y-0.5">
                                        <div className="flex justify-between items-center gap-2 text-black">
                                            <span className="text-[8px] font-black whitespace-nowrap">Style No</span>
                                            <span className="text-[8px] font-bold text-right">{item.styleNo || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2 text-black">
                                            <span className="text-[8px] font-black whitespace-nowrap">Buyer PO</span>
                                            <span className="text-[8px] font-bold text-right">{item.buyerPO || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2 text-black border-t border-sage-50 pt-1">
                                            <span className="text-[8px] font-black whitespace-nowrap">Description</span>
                                            <span className="text-[8px] font-bold text-right line-clamp-2">{item.description || item.itemName}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[8px] text-black font-black whitespace-nowrap">Material Type</span>
                                            <span className="text-[8px] text-black font-medium text-right">{item.materialType}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[8px] text-black font-black whitespace-nowrap">Fabric Type</span>
                                            <span className="text-[8px] text-black font-medium text-right">{item.fabricType || 'Cotton'}</span>
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
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[8px] font-black whitespace-nowrap">Design</span>
                                            <span className="text-[8px] font-bold text-right">{item.fabricDesign}</span>
                                        </div>

                                        <div className="flex justify-between items-center bg-gray-100/50 px-1 py-0.5 rounded-sm mt-0.5 border border-gray-200">
                                            <span className="text-[8px] font-black">Qty</span>
                                            <span className="text-[10px] font-black">{item.qty} {item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Branding Footer */}
                            <div className="text-center mt-auto">
                                <p className="text-[9px] font-serif italic text-black font-bold">Madan Creation</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
};

export default BarcodeGenerator;
