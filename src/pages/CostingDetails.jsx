import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Printer, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CostingDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { costings } = usePurchaseOrder();
    const [costing, setCosting] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const getImageBase64 = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    };

    useEffect(() => {
        if (id && costings.length > 0) {
            const found = costings.find(c => c.id === id);
            if (found) setCosting(found);
        }
    }, [id, costings]);

    if (!costing) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Loading details...</p>
            </div>
        );
    }

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header Section
            doc.setFontSize(18);
            doc.setTextColor(30, 41, 59); // Slate 800
            doc.text("Madan Creation", pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text("Garment Costing Sheet", pageWidth / 2, 21, { align: 'center' });

            doc.setDrawColor(226, 232, 240); // Slate 200
            doc.line(14, 25, pageWidth - 14, 25);

            let startY = 32;

            // Image handling
            if (costing.image) {
                try {
                    const base64Img = await getImageBase64(costing.image);
                    const imgWidth = 35; // Reduced from 45
                    const imgHeight = 45; // Reduced from 60
                    doc.addImage(base64Img, 'JPEG', pageWidth - 14 - imgWidth, startY, imgWidth, imgHeight);
                } catch (err) {
                    console.error("Failed to load image for PDF:", err);
                }
            }

            // Product Information Table
            doc.autoTable({
                startY: startY,
                margin: { right: costing.image ? 55 : 14 },
                head: [['Key Information', 'Details']],
                body: [
                    ['Style No', costing.styleNo],
                    ['Product', costing.productName || '-'],
                    ['Buyer', costing.buyerName || '-'],
                    ['Season', costing.season || '-'],
                    ['Category', costing.category || '-'],
                    ['Order Qty', `${costing.orderQty || 0} pcs`],
                    ['Target Price', `Rs. ${costing.targetPrice || 0}`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                styles: { fontSize: 7.5, cellPadding: 1.5 },
                columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 30 } }
            });

            startY = Math.max(doc.lastAutoTable.finalY + 8, costing.image ? startY + 50 : 0);

            // Fabric Details Table
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text("1. FABRIC COSTING", 14, startY - 2);
            doc.autoTable({
                startY: startY,
                head: [['Fabric Type', 'GSM', 'Cons.', 'Rate', 'Amount']],
                body: costing.fabricDetails?.map(row => [
                    row.type,
                    row.gsm,
                    row.cons,
                    row.rate,
                    `Rs. ${((parseFloat(row.cons) || 0) * (parseFloat(row.rate) || 0)).toFixed(2)}`
                ]) || [],
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
                styles: { fontSize: 7, cellPadding: 1.5 },
                foot: [['', '', '', 'Total Fabric', `Rs. ${Number(costing.totalFabricCost || 0).toFixed(2)}`]],
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 }
            });

            startY = doc.lastAutoTable.finalY + 8;

            // Component Breakdown
            doc.setFontSize(10);
            doc.text("2. COMPONENT BREAKDOWN", 14, startY - 2);

            // Trims & Labor side by side
            const halfWidth = (pageWidth - 38) / 2;

            // Trims
            doc.autoTable({
                startY: startY,
                margin: { right: pageWidth / 2 + 5 },
                head: [['Trim Item', 'Amount']],
                body: costing.trimsDetails?.map(row => [row.item, `Rs. ${Number(row.amount || 0).toFixed(2)}`]) || [],
                theme: 'striped',
                headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
                styles: { fontSize: 7, cellPadding: 1.5 },
                foot: [['Total Trims', `Rs. ${Number(costing.totalTrimsCost || 0).toFixed(2)}`]],
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 }
            });

            const trimsFinalY = doc.lastAutoTable.finalY;

            // Labor
            doc.autoTable({
                startY: startY,
                margin: { left: pageWidth / 2 + 5 },
                head: [['Labor/Operation', 'Rate']],
                body: costing.laborDetails?.map(row => [row.operation, `Rs. ${Number(row.rate || 0).toFixed(2)}`]) || [],
                theme: 'striped',
                headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
                styles: { fontSize: 7, cellPadding: 1.5 },
                foot: [['Total Labor', `Rs. ${Number(costing.totalLaborCost || 0).toFixed(2)}`]],
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 }
            });

            startY = Math.max(trimsFinalY, doc.lastAutoTable.finalY) + 10;

            // Summary Table
            doc.setFontSize(10);
            doc.text("3. COST SUMMARY", 14, startY - 2);
            doc.autoTable({
                startY: startY,
                head: [['Cost Component', 'Amount per Piece']],
                body: [
                    ['Total Fabric Cost', `Rs. ${Number(costing.totalFabricCost || 0).toFixed(2)}`],
                    ['Total Trims & Accessories', `Rs. ${Number(costing.totalTrimsCost || 0).toFixed(2)}`],
                    ['Total Labor/Stitching', `Rs. ${Number(costing.totalLaborCost || 0).toFixed(2)}`],
                    ['Total Overhead Expenses', `Rs. ${Number(costing.totalOverheadCost || 0).toFixed(2)}`],
                    ['Total Production Cost', `Rs. ${Number(costing.totalProductionCost || 0).toFixed(2)}`],
                    [`Profit Margin (${costing.profitMargin}%)`, `Rs. ${(Number(costing.finalFOB || 0) - Number(costing.totalProductionCost || 0)).toFixed(2)}`],
                    ['FINAL FOB PRICE (PER PIECE)', `Rs. ${Number(costing.finalFOB || 0).toFixed(2)}`],
                    ['NET ORDER VALUE', `Rs. ${Number(costing.totalOrderValue || 0).toFixed(2)}`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [22, 163, 74], halign: 'center', fontSize: 8.5 },
                styles: { fontSize: 8, cellPadding: 1.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 105 },
                    1: { halign: 'right', fontStyle: 'bold', cellPadding: { right: 4 } }
                },
                didParseCell: function (data) {
                    if (data.row.index === 6) { // Final FOB Piece row
                        data.cell.styles.fillColor = [220, 252, 231];
                    }
                }
            });

            // Footer
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            const date = new Date().toLocaleDateString();
            doc.text(`Generated on ${date} | Madan Creation Internal Document`, pageWidth / 2, pageHeight - 10, { align: 'center' });

            doc.save(`Costing_${costing.styleNo}.pdf`);
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/costing')} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            {costing.styleNo}
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {costing.season}
                            </span>
                        </h1>
                        <p className="text-gray-500">{costing.buyerName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link to={`/costing/edit/${costing.id}`} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Edit className="w-4 h-4" /> Edit
                    </Link>
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:bg-indigo-400"
                    >
                        {isPrinting ? (
                            <>Loading PDF...</>
                        ) : (
                            <><Printer className="w-4 h-4" /> Print / PDF</>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Image & Summary */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="aspect-[3/4] bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-100">
                            {costing.image ? (
                                <img src={costing.image} alt={costing.styleNo} className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-gray-400 text-sm">No Image</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg space-y-4">
                        <div className="flex justify-between items-center text-slate-300 text-sm border-b border-slate-700 pb-2">
                            <span>Production Cost</span>
                            <span>₹ {Number(costing.totalProductionCost).toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-emerald-400 uppercase font-bold mb-1">Final FOB Price</span>
                            <span className="text-3xl font-bold tracking-tight">₹ {Number(costing.finalFOB).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-700 text-sm flex justify-between">
                            <span className="text-slate-400">Profit Margin</span>
                            <span className="font-mono">{costing.profitMargin}%</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Basic Info Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-100">
                                <tr className="bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-600 w-1/3">Product Name</td>
                                    <td className="px-4 py-3 text-gray-900">{costing.productName}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-600">Category</td>
                                    <td className="px-4 py-3 text-gray-900">{costing.category}</td>
                                </tr>
                                <tr className="bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-600">Order Qty</td>
                                    <td className="px-4 py-3 text-gray-900">{costing.orderQty} pcs</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-600">Target Price</td>
                                    <td className="px-4 py-3 text-gray-900">₹ {costing.targetPrice}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Cost Breakdowns */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2">Fabric Details</h3>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Type</th>
                                        <th className="px-4 py-2 text-center">GSM</th>
                                        <th className="px-4 py-2 text-center">Cons.</th>
                                        <th className="px-4 py-2 text-right">Rate</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {costing.fabricDetails?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2">{item.type}</td>
                                            <td className="px-4 py-2 text-center">{item.gsm}</td>
                                            <td className="px-4 py-2 text-center">{item.cons}</td>
                                            <td className="px-4 py-2 text-right">{item.rate}</td>
                                            <td className="px-4 py-2 text-right font-medium">
                                                {((parseFloat(item.cons) || 0) * (parseFloat(item.rate) || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 font-bold">
                                        <td colSpan="4" className="px-4 py-2 text-right">Total</td>
                                        <td className="px-4 py-2 text-right">{Number(costing.totalFabricCost).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Trims */}
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-800 border-b pb-2 text-sm">Trims & Accessories</h3>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Item</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {costing.trimsDetails?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">{item.item}</td>
                                                <td className="px-3 py-2 text-right">{Number(item.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="px-3 py-2 text-right">Total</td>
                                            <td className="px-3 py-2 text-right">{Number(costing.totalTrimsCost).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Labor */}
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-800 border-b pb-2 text-sm">Labor Cost</h3>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Operation</th>
                                            <th className="px-3 py-2 text-right">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {costing.laborDetails?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">{item.operation}</td>
                                                <td className="px-3 py-2 text-right">{Number(item.rate).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="px-3 py-2 text-right">Total</td>
                                            <td className="px-3 py-2 text-right">{Number(costing.totalLaborCost).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CostingDetails;
