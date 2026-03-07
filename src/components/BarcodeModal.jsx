import React, { useRef } from 'react';
import Barcode from 'react-barcode';

const BarcodeModal = ({ item, isOpen, onClose }) => {
    const isBulk = Array.isArray(item);
    const items = isBulk ? item : [item];

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write('<html><head><title>Print Barcodes</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @media print {
                @page { margin: 5mm; size: auto; }
                body { margin: 0; }
            }
            body { 
                font-family: sans-serif; 
                padding: 10px;
            }
            .barcode-label {
                border: 1px dashed #ccc;
                padding: 4px;
                text-align: center;
                break-inside: avoid;
                display: inline-block;
                vertical-align: top;
                width: 32%;
                margin: 2px;
                height: auto;
                box-sizing: border-box;
            }
            .barcode-content-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
            }
            .item-name {
                font-weight: bold;
                font-size: 10px;
                margin-bottom: 1px;
                white-space: nowrap;
                overflow: hidden;
                width: 100%;
            }
            .barcode-value {
                font-size: 9px;
                margin-top: 1px;
                font-family: monospace;
            }
            svg {
                max-width: 100%;
                height: 35px !important;
                margin: 0 !important;
            }
        `);
        printWindow.document.write('</style></head><body>');

        items.forEach((itm, idx) => {
            const val = itm.fabricCode || itm.id || 'UNKNOWN';
            const svgId = `barcode-svg-${idx}`;
            const svgElement = document.getElementById(svgId);
            const svgHtml = svgElement ? svgElement.outerHTML : '';

            printWindow.document.write(`
                <div class="barcode-label">
                    <div class="barcode-content-wrapper">
                        <div class="item-name">${itm.name}</div>
                        ${svgHtml}
                        <div class="barcode-value">${val}</div>
                    </div>
                </div>
            `);
        });

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                    {isBulk ? `Bulk Barcode Printing (${items.length} items)` : 'Barcode Generation'}
                </h2>

                <div className="flex-1 overflow-y-auto pr-2 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((itm, idx) => {
                            const val = itm.fabricCode || itm.id || 'UNKNOWN';
                            return (
                                <div key={itm.id} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="font-semibold text-gray-700 text-xs mb-2 truncate w-full text-center">{itm.name}</p>
                                    <Barcode
                                        value={val}
                                        width={1.5}
                                        height={40}
                                        fontSize={12}
                                        margin={0}
                                        format="CODE128"
                                        displayValue={false}
                                    />
                                    {/* SVG for print extraction */}
                                    <div style={{ display: 'none' }}>
                                        <Barcode
                                            value={val}
                                            width={1.5}
                                            height={40}
                                            margin={0}
                                            format="CODE128"
                                            renderer="svg"
                                            id={`barcode-svg-${idx}`}
                                        />
                                    </div>
                                    <p className="font-mono text-[10px] text-gray-500 mt-1">{val}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors flex items-center justify-center gap-2 font-bold"
                    >
                        <span>🖨️</span> Print {isBulk ? 'All Labels' : 'Label'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BarcodeModal;
