import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

console.log("export.js module loaded"); // Debug log

export const exportToExcel = (purchaseOrders) => {
    try {
        const data = purchaseOrders.map(po => {
            const calcs = po.commercials?.calculations || po.calculations || {};
            const isNew = !!calcs.finalTotal;
            return {
                'PO Number': po.poNumber,
                'Date': po.poDate || po.date,
                'Supplier': po.supplierDetails?.name || po.supplierName,
                'Items Total': isNew ? calcs.itemsTotal : po.subtotal,
                'Tax': isNew ? calcs.gstAmount : po.taxAmount,
                'Grand Total': isNew ? calcs.finalTotal : po.total,
                'Status': po.status || 'Draft'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Orders");
        XLSX.writeFile(workbook, `PurchaseOrders_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error("Excel Export Error:", error);
        alert("Failed to export Excel. Please check console.");
    }
};

export const exportStyleToExcel = (style) => {
    try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Overview
        const overviewData = [
            ['Style Details Report'],
            ['Generated Date', new Date().toLocaleDateString()],
            [],
            ['Style No', style.styleNo],
            ['Buyer Name', style.buyerName],
            ['Season', style.season],
            ['Color', style.color],
            ['Category', style.category],
            ['Section', style.section],
            ['Order Type', style.orderType],
            ['Status', style.status || 'Active'],
            [],
            ['Fabric Details'],
            ['Fabric Name', style.fabricName],
            ['Content', style.fabricContent],
            ['Width', style.fabricWidth],
            ['Per Pcs Avg', style.perPcsAvg],
            [],
            ['PO Details'],
            ['Buyer PO', style.buyerPO],
            ['Received Date', style.buyerPOReceivedDate],
            ['Expired Date', style.poExpiredDate],
            ['Extension Date', style.poExtensionDate],
            ['Lead Time (Days)', style.leadTime],
            ['Stitching Rate', style.stitchingRate],
            [],
            ['Notes', style.notes]
        ];
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, "Style Overview");

        // Sheet 2: Size Breakdown
        if (style.sizeWiseDetails && style.sizeWiseDetails.length > 0) {
            const sizeData = style.sizeWiseDetails.map(d => ({
                'Size': d.size,
                'SKU Code': d.sku,
                'Order Qty': d.qty,
                'Rate': d.rate,
                'Amount': d.amount
            }));
            const wsSizes = XLSX.utils.json_to_sheet(sizeData);

            // Add Total Row
            const totalQty = style.sizeWiseDetails.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
            const totalAmount = style.sizeWiseDetails.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            XLSX.utils.sheet_add_aoa(wsSizes, [['Grand Total', '', totalQty, '', totalAmount]], { origin: -1 });

            // Fit column width roughly
            wsSizes['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, wsSizes, "Size Breakdown");
        }

        XLSX.writeFile(wb, `Style_${style.styleNo}_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Style Excel Export Error:", error);
        alert("Failed to export Style Excel. Please check console.");
    }
};

export const exportAllStylesToExcel = (styles) => {
    try {
        if (!styles || styles.length === 0) {
            alert("No styles to export.");
            return;
        }

        const data = styles.map(style => {
            const totalQty = style.sizeWiseDetails
                ? style.sizeWiseDetails.reduce((sum, d) => sum + (Number(d.qty) || 0), 0)
                : 0;

            return {
                'Style No': style.styleNo,
                'Buyer': style.buyerName,
                'Season': style.season,
                'Color': style.color,
                'Category': style.category,
                'Section': style.section,
                'Order Type': style.orderType,
                'Total Order Qty': totalQty,
                'Fabric Name': style.fabricName,
                'Fabric Content': style.fabricContent,
                'Fabric Width': style.fabricWidth,
                'Per Pcs Avg': style.perPcsAvg,
                'Buyer PO': style.buyerPO,
                'PO Received': style.buyerPOReceivedDate ? new Date(style.buyerPOReceivedDate).toLocaleDateString() : '',
                'PO Expired': style.poExpiredDate ? new Date(style.poExpiredDate).toLocaleDateString() : '',
                'Extension Date': style.poExtensionDate ? new Date(style.poExtensionDate).toLocaleDateString() : '',
                'Lead Time': style.leadTime,
                'Stitching Rate': style.stitchingRate,
                'Status': style.status || 'Active',
                'Notes': style.notes
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "All Styles");

        // Auto-width columns
        const objectMaxLength = [];
        data.forEach(obj => {
            Object.values(obj).forEach((v, i) => {
                let len = (v ? v.toString().length : 0);
                if (len > (objectMaxLength[i] || 0)) {
                    objectMaxLength[i] = len;
                }
            });
        });
        worksheet['!cols'] = objectMaxLength.map(w => ({ wch: w + 2 }));


        // --- Sheet 2: Size Matrix (Horizontal Qty) ---
        // 1. Find all unique sizes across all styles and sort them
        const allSizes = new Set();
        styles.forEach(s => {
            if (s.sizeWiseDetails) {
                s.sizeWiseDetails.forEach(d => allSizes.add(d.size));
            }
        });

        const sizeOrder = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL", "FS", "Free Size"];
        const sortedSizes = Array.from(allSizes).sort((a, b) => {
            const indexA = sizeOrder.indexOf(a);
            const indexB = sizeOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        const matrixData = styles.map(style => {
            const row = {
                'Style No': style.styleNo,
                'Buyer': style.buyerName,
                'Season': style.season,
                'Color': style.color,
                'Fabric': style.fabricName
            };

            let totalQty = 0;
            sortedSizes.forEach(size => {
                const detail = style.sizeWiseDetails?.find(d => d.size === size);
                const qty = detail ? (Number(detail.qty) || 0) : 0;
                row[size] = qty > 0 ? qty : ''; // Show nothing if 0 for cleaner look
                totalQty += qty;
            });

            row['Total Qty'] = totalQty;
            return row;
        });

        const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
        // Adjust column widths for Matrix
        const matrixCols = [
            { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, // Metadata
            ...sortedSizes.map(() => ({ wch: 8 })), // Size cols
            { wch: 12 } // Total
        ];
        wsMatrix['!cols'] = matrixCols;
        XLSX.utils.book_append_sheet(workbook, wsMatrix, "Size Matrix (Qty)");


        // --- Sheet 3: SKU List (Vertical) ---
        // Columns: Style No, Size, SKU Code, Qty, Rate
        const skuData = [];
        styles.forEach(style => {
            if (style.sizeWiseDetails && style.sizeWiseDetails.length > 0) {
                style.sizeWiseDetails.forEach(d => {
                    const qty = Number(d.qty) || 0;
                    if (qty > 0) {
                        skuData.push({
                            'Style No': style.styleNo,
                            'Buyer': style.buyerName,
                            'Size': d.size,
                            'SKU Code': d.sku || `${style.styleNo}-${d.size}`,
                            'Qty': qty,
                            'Rate': Number(d.rate) || 0,
                            'Amount': Number(d.amount) || 0
                        });
                    }
                });
            }
        });

        if (skuData.length > 0) {
            const wsSKU = XLSX.utils.json_to_sheet(skuData);
            wsSKU['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(workbook, wsSKU, "SKU List");
        }


        XLSX.writeFile(workbook, `All_Styles_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Bulk Export Error:", error);
        alert("Failed to export styles. Please check console.");
    }
};

export const generateInventoryTemplate = () => {
    try {
        const headers = [
            'Item Name', 'Fabric Code', 'HSN Code', 'Description',
            'Material Type', 'Opening Stock', 'Unit', 'Item Rate', 'Rate Type'
        ];
        const data = [
            ['Sample Fabric', 'FABC001', '5208', '100% Cotton', 'Fabric', 100, 'Meter', 150, 'Per Meter'], // Example row
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");

        // Add dropdown validation instruction as a note? No validation for now, simple template.
        ws['!cols'] = headers.map(() => ({ wch: 20 }));

        XLSX.writeFile(wb, "Inventory_Upload_Template.xlsx");
    } catch (error) {
        console.error("Template Error:", error);
        alert("Failed to generate template.");
    }
};

export const exportInventoryToExcel = (inventory) => {
    try {
        if (!inventory || inventory.length === 0) {
            alert("No inventory data to export.");
            return;
        }

        const data = inventory.map(item => ({
            'Item Name': item.name,
            'Fabric Code': item.fabricCode,
            'HSN Code': item.hsnCode,
            'Description': item.description,
            'Material Type': item.materialType,
            'Opening Stock': item.opening,
            'Inward Qty': item.inward,
            'Outward Qty': item.outward,
            'Current Stock': item.current,
            'Unit': item.unit,
            'Item Rate': item.rate,
            'Rate Type': item.rateType
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Report");

        // Simple column auto-width
        const objectMaxLength = [];
        data.forEach(obj => {
            Object.values(obj).forEach((v, i) => {
                let len = (v ? v.toString().length : 0);
                if (len > (objectMaxLength[i] || 0)) objectMaxLength[i] = len;
            });
        });
        ws['!cols'] = objectMaxLength.map(w => ({ wch: w + 5 }));

        XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Inventory Export Error:", error);
        alert("Failed to export inventory.");
    }
};

export const generatePDF = (po, print = false, suppliers = []) => {
    try {
        const doc = new jsPDF({ orientation: "landscape" });

        // --- Config & Helpers ---
        const pageWidth = doc.internal.pageSize.width; // ~297mm
        const pageHeight = doc.internal.pageSize.height; // ~210mm
        const margin = 14;
        const width = pageWidth - (margin * 2);

        // Normalize PO Data: Unpack 'commercials' if needed
        const comm = po.commercials || {};

        // Lookup Supplier Details if missing in PO but ID exists
        let supplierSnapshot = po.supplierDetails || comm.supplierDetails || {};
        if ((!supplierSnapshot || !supplierSnapshot.address) && po.supplierId && suppliers.length > 0) {
            const foundSupplier = suppliers.find(s => s.id === po.supplierId);
            if (foundSupplier) {
                supplierSnapshot = {
                    name: foundSupplier.name,
                    address: foundSupplier.address,
                    gstin: foundSupplier.gstin,
                    contact: foundSupplier.contactPerson,
                    mobile: foundSupplier.mobile || foundSupplier.phone
                };
            }
        }

        const normalizedPO = {
            ...po,
            buyerDetails: po.buyerDetails || comm.buyerDetails || {},
            supplierDetails: supplierSnapshot,
            terms: po.terms || comm.terms || {},
            calculations: po.calculations || comm.calculations || {},
            authorization: po.authorization || comm.authorization || {},
            attachment: po.attachment || comm.attachment
        };

        const getVal = (val, fallback = '') => val != null ? val : fallback;
        const drawVLine = (x, y, h) => doc.line(x, y, x, y + h);

        let currentY = margin;

        // --- 1. Title ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("PURCHASE ORDER", pageWidth / 2, currentY + 8, { align: 'center' });
        currentY += 15;

        // --- 2. Header Details ---
        doc.setFontSize(10);
        doc.setDrawColor(0);
        doc.rect(margin, currentY, width, 25);

        // Left: Company
        doc.setFont("helvetica", "bold");
        doc.text(getVal(normalizedPO.buyerDetails?.companyName, "Madan Creation"), margin + 4, currentY + 6);
        doc.setFont("helvetica", "normal");
        const compAddress = doc.splitTextToSize(getVal(normalizedPO.buyerDetails?.address, "138-139, Ashid Nagar, \nOxford International Public School, \nSanganer, Jaipur - 3020239"), width / 2 - 10);
        doc.text(compAddress, margin + 4, currentY + 11);

        // Right: PO Details
        const midX = pageWidth / 2;
        drawVLine(midX, currentY, 25);
        let rightY = currentY + 6;
        doc.text(`PO No: ${normalizedPO.poNumber || 'Draft'}`, midX + 4, rightY); rightY += 5;
        doc.text(`Date: ${normalizedPO.poDate || normalizedPO.date || new Date().toLocaleDateString()}`, midX + 4, rightY); rightY += 5;
        if (normalizedPO.validity) doc.text(`Validity: ${normalizedPO.validity}`, midX + 4, rightY);
        currentY += 25;

        // --- 3. Parties ---
        const partiesHeight = 40; // Slightly compact
        doc.rect(margin, currentY, width, partiesHeight);
        drawVLine(midX, currentY, partiesHeight);

        doc.setFont("helvetica", "bold");
        doc.text("Supplier:", margin + 4, currentY + 5);
        doc.text("Bill To / Buyer Details:", midX + 4, currentY + 5);
        doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

        doc.setFont("helvetica", "normal");
        const hasBuyer = normalizedPO.buyerDetails && (normalizedPO.buyerDetails.companyName || normalizedPO.buyerDetails.address);
        const hasSupplier = normalizedPO.supplierDetails && normalizedPO.supplierDetails.name;

        // Supplier
        let supY = currentY + 12;
        if (hasSupplier) {
            doc.text(getVal(normalizedPO.supplierDetails.name), margin + 4, supY);
            const supAddr = doc.splitTextToSize(getVal(normalizedPO.supplierDetails.address), (width / 2) - 8);
            doc.text(supAddr, margin + 4, supY + 5);
            let nextY = supY + 5 + (supAddr.length * 4);
            if (normalizedPO.supplierDetails.gstin) { doc.text(`GSTIN: ${normalizedPO.supplierDetails.gstin}`, margin + 4, nextY); nextY += 5; }
            if (normalizedPO.supplierDetails.contact) { doc.text(`Contact: ${normalizedPO.supplierDetails.contact}`, margin + 4, nextY); nextY += 5; }
            if (normalizedPO.supplierDetails.mobile) { doc.text(`Mobile: ${normalizedPO.supplierDetails.mobile}`, margin + 4, nextY); }
        } else {
            doc.text(getVal(normalizedPO.supplierName), margin + 4, supY);
        }

        // Buyer
        let buyY = currentY + 12;
        if (hasBuyer) {
            doc.text(getVal(normalizedPO.buyerDetails.companyName), midX + 4, buyY);
            const buyAddr = doc.splitTextToSize(getVal(normalizedPO.buyerDetails.address), (width / 2) - 8);
            doc.text(buyAddr, midX + 4, buyY + 5);
            let nextY = buyY + 5 + (buyAddr.length * 4);
            if (normalizedPO.buyerDetails.gstin) { doc.text(`GSTIN: ${normalizedPO.buyerDetails.gstin}`, midX + 4, nextY); nextY += 5; }
            if (normalizedPO.buyerDetails.contactPerson) { doc.text(`Contact: ${normalizedPO.buyerDetails.contactPerson}`, midX + 4, nextY); nextY += 5; }
            if (normalizedPO.buyerDetails.mobile) { doc.text(`Contact No: ${normalizedPO.buyerDetails.mobile}`, midX + 4, nextY); }
        } else {
            const delAddress = getVal(normalizedPO.terms?.deliveryAddress) || getVal(normalizedPO.buyerDetails?.address) || "Madan Creation\n138-139, Ashid Nagar, \nSanganer, Jaipur";
            doc.text(doc.splitTextToSize(delAddress, (width / 2) - 8), midX + 4, buyY);
        }
        currentY += partiesHeight;

        // --- 4. Items Table ---
        const tableColumn = ["#", "Style No", "Buyer PO", "Item Description", "HSN/Code", "Qty", "UOM", "Rate", "Amount"];
        const tableRows = [];
        if (normalizedPO.items && Array.isArray(normalizedPO.items)) {
            normalizedPO.items.forEach((item, index) => {
                const qty = Number(item.qty || 0);
                const rate = Number(item.rate || 0);
                const amount = Number(item.amount) || (qty * rate);
                tableRows.push([
                    index + 1,
                    item.styleNo || '',
                    item.buyerPO || '',
                    `${item.articleCode ? `Code: ${item.articleCode} ` : ''}${item.description || ''} ${item.fabricDetails || ''}`,
                    item.hsnCode || '',
                    qty,
                    item.uom || item.unit || '',
                    rate.toFixed(2),
                    amount.toFixed(2)
                ]);
            });
        }

        // Landscape Column Widths
        // Landscape Column Widths
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: 0, fontStyle: 'bold' },
            bodyStyles: { lineWidth: 0.1, lineColor: 0, textColor: 0 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 'auto' }, // Description gets remaining space
                4: { cellWidth: 25 },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 20, halign: 'center' },
                7: { cellWidth: 25, halign: 'right' },
                8: { cellWidth: 30, halign: 'right' },
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => { currentY = data.cursor.y; }
        });

        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
            currentY = doc.lastAutoTable.finalY;
        }

        // --- 5. Footer Layout: Side-by-Side ---
        // Left Column: Terms & Conditions
        // Right Column: Totals + Signatures

        // Calculate Totals Pre-render
        let itemsTotal = 0;
        if (normalizedPO.items && Array.isArray(normalizedPO.items)) {
            itemsTotal = normalizedPO.items.reduce((sum, item) => {
                const qty = Number(item.qty || 0);
                const rate = Number(item.rate || 0);
                const amount = Number(item.amount) || (qty * rate);
                return sum + amount;
            }, 0);
        }
        if (normalizedPO.calculations && normalizedPO.calculations.itemsTotal > 0) {
            itemsTotal = normalizedPO.calculations.itemsTotal;
        }

        // --- Logic Start ---
        // Ensure we have space. 
        // We need about 60-70 units for the footer block.
        const footerHeight = 70;
        if (currentY + footerHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }

        const startY = currentY + 5;

        // --- RIGHT COLUMN: Totals & Signatures ---
        const rightColStart = pageWidth - margin - 80; // 80mm wide right column
        const rightColEnd = pageWidth - margin;
        let footerRightY = startY;

        doc.setFont("helvetica", "normal");

        // Totals
        const valX = rightColEnd;
        const labelX = rightColStart;

        doc.text("Items Total:", labelX, footerRightY);
        doc.text(Number(itemsTotal).toFixed(2), valX, footerRightY, { align: 'right' }); footerRightY += 5;

        if (normalizedPO.commercials?.discount > 0) {
            doc.text("Discount:", labelX, footerRightY);
            doc.text(`-${Number(normalizedPO.commercials.discount).toFixed(2)}`, valX, footerRightY, { align: 'right' }); footerRightY += 5;
            itemsTotal -= Number(normalizedPO.commercials.discount);
        }
        if (normalizedPO.commercials?.freight > 0) {
            doc.text("Freight:", labelX, footerRightY);
            doc.text(Number(normalizedPO.commercials.freight).toFixed(2), valX, footerRightY, { align: 'right' }); footerRightY += 5;
            itemsTotal += Number(normalizedPO.commercials.freight);
        }
        if (normalizedPO.commercials?.gstRate > 0) {
            const gstRate = Number(normalizedPO.commercials.gstRate);
            const gstAmount = (itemsTotal * gstRate) / 100;
            doc.text(`GST (${gstRate}%):`, labelX, footerRightY);
            doc.text(Number(gstAmount).toFixed(2), valX, footerRightY, { align: 'right' }); footerRightY += 5;
            itemsTotal += gstAmount;
        }

        doc.line(labelX, footerRightY, rightColEnd, footerRightY); footerRightY += 5;
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("Grand Total:", labelX, footerRightY);
        doc.text(`Rs. ${Number(itemsTotal).toFixed(2)}`, valX, footerRightY, { align: 'right' });
        footerRightY += 15; // Gap for Signatures

        // Signatures (Right aligned under Totals)
        doc.setFontSize(10);
        doc.text("For Madan Creation", rightColEnd - 50, footerRightY); footerRightY += 15;
        doc.setFont("helvetica", "normal");
        doc.text("Authorized Signatory", rightColEnd - 50, footerRightY);
        const approver = normalizedPO.authorization?.approvedBy || "Kuldeep Singh Naruka";
        doc.setFont("helvetica", "bold");
        doc.text(approver, rightColEnd - 50, footerRightY - 8);

        const rightBlockBottom = footerRightY;


        // --- LEFT COLUMN: Terms ---
        const termsWidth = (width * 0.65); // 65% Width
        let termsY = startY;

        // Calculate dynamic height for box
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        // Header height included in content calculation

        const termsLines = [];
        if (normalizedPO.terms?.paymentTerms) termsLines.push(`1. Payment: ${normalizedPO.terms.paymentTerms}`);
        if (normalizedPO.terms?.transportMode) termsLines.push(`2. Transport: ${normalizedPO.terms.transportMode}`);

        let genLines = [];
        if (normalizedPO.terms?.generalTerms) {
            const prefix = termsLines.length > 0 ? '3. ' : '';
            doc.setFontSize(9); // Measure with correct font
            genLines = doc.splitTextToSize(`${prefix}${normalizedPO.terms.generalTerms}`, termsWidth - 8);
        }

        const lineHeight = 4.5;
        const termsContentHeight = 10 + (termsLines.length * lineHeight) + (genLines.length * lineHeight) + 5;

        // Determine Box Height: Match Right Block height OR Content Height
        const rightBlockHeight = rightBlockBottom - startY;
        const finalBoxHeight = Math.max(rightBlockHeight, termsContentHeight, 45);

        // Draw Box
        doc.setDrawColor(0);
        doc.rect(margin, startY, termsWidth, finalBoxHeight);

        // Render Terms
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text("Terms & Conditions:", margin + 4, termsY + 5);

        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        let textY = termsY + 11;
        termsLines.forEach(line => {
            doc.text(line, margin + 4, textY);
            textY += lineHeight;
        });
        if (genLines.length > 0) {
            doc.text(genLines, margin + 4, textY);
        }

        // Prepared By (Left Bottom of Box)
        const prepY = startY + finalBoxHeight + 8;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("Prepared By", margin, prepY);
        if (normalizedPO.authorization?.preparedBy) {
            doc.setFont("helvetica", "bold");
            doc.text(normalizedPO.authorization.preparedBy, margin, prepY + 5);
        }

        // --- 7. Image Handling ---
        if (po.attachment) {
            if (typeof po.attachment === 'string' && po.attachment.startsWith('data:image')) {
                try {
                    doc.addPage();
                    doc.text("Reference Image", margin, 20);
                    doc.addImage(po.attachment, 'JPEG', margin, 30, 150, 150, undefined, 'FAST');
                } catch (imgError) {
                    console.warn("Could not add image to PDF:", imgError);
                }
            }
        }

        // --- Output ---
        if (print) {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(`PO_${po.poNumber || 'New'}.pdf`);
        }
    } catch (error) {
        console.error("PDF Critical Error:", error);
        alert(`Failed to generate PDF: ${error.message}`);
    }
};

export const generateStylePDF = (style) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        let currentY = margin;

        // --- Header ---
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(style.styleNo || "Style Details", pageWidth / 2, currentY, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Madan Creation", pageWidth / 2, currentY + 6, { align: 'center' });
        currentY += 15;

        // --- Image & Info Grid ---
        // Image on Left (if exists), Info on Right
        // Or if no image, Info takes full width

        const infoX = style.image ? 80 : margin; // Shift info if image exists
        const infoWidth = pageWidth - infoX - margin;

        // Draw Image
        if (style.image) {
            try {
                // Determine layout: Left side image
                // Aspect Ratio 3:4 usually
                const imgW = 60;
                const imgH = 80;
                doc.addImage(style.image, 'JPEG', margin, currentY, imgW, imgH, undefined, 'FAST');
                doc.setDrawColor(200);
                doc.rect(margin, currentY, imgW, imgH); // Border
            } catch (e) {
                console.warn("Could not add image", e);
                doc.rect(margin, currentY, 60, 80);
                doc.text("Image Error", margin + 15, currentY + 40);
            }
        }

        // --- Info Block (Right Side) ---
        let infoY = currentY;
        const lineHeight = 7;

        doc.setFontSize(11);

        const addInfoLine = (label, value) => {
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, infoX, infoY);
            doc.setFont("helvetica", "normal");
            doc.text(`${value || '-'}`, infoX + 35, infoY);
            infoY += lineHeight;
        };

        addInfoLine("Buyer", style.buyerName);
        addInfoLine("Season", style.season);
        addInfoLine("Category", style.category);
        addInfoLine("Fabric", style.fabricName);
        addInfoLine("Color", style.color);
        addInfoLine("Order Type", style.orderType);

        infoY += 2;
        addInfoLine("Stitching Rate", `Rs. ${style.stitchingRate || '0'}`);
        addInfoLine("Fabric Avg", `${style.perPcsAvg || '0'} m`);

        infoY += 2;
        addInfoLine("Buyer PO", style.buyerPO);
        addInfoLine("Lead Time", `${style.leadTime || 0} Days`);

        // Move cursor below image or info, whichever is taller
        currentY = Math.max(currentY + 85, infoY + 10);

        // --- Fabric & Notes ---
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 5;

        doc.setFont("helvetica", "bold");
        doc.text("Fabric Details:", margin, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const fabText = `Content: ${style.fabricContent || '-'} | Width: ${style.fabricWidth || '-'}`;
        doc.text(fabText, margin, currentY);
        currentY += 8;

        if (style.notes) {
            doc.setFont("helvetica", "bold");
            doc.text("Notes:", margin, currentY);
            currentY += 5;
            doc.setFont("helvetica", "normal");
            const splitNotes = doc.splitTextToSize(style.notes, pageWidth - (margin * 2));
            doc.text(splitNotes, margin, currentY);
            currentY += (splitNotes.length * 5) + 5;
        }

        // --- Size Wise Table ---
        currentY += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Size Wise Order Details", margin, currentY);
        currentY += 2;

        const tableColumn = ["Size", "SKU Code", "Order Qty", "Rate", "Amount"];
        const tableRows = [];
        let totalQty = 0;
        let totalAmount = 0;

        if (style.sizeWiseDetails) {
            style.sizeWiseDetails.forEach(d => {
                const q = Number(d.qty) || 0;
                const r = Number(d.rate) || 0;
                const a = Number(d.amount) || 0;
                totalQty += q;
                totalAmount += a;
                tableRows.push([
                    d.size,
                    d.sku,
                    q,
                    r.toFixed(2),
                    a.toFixed(2)
                ]);
            });
        }

        // Footer Row
        tableRows.push([
            { content: 'Grand Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: totalQty, styles: { fontStyle: 'bold' } },
            '',
            { content: totalAmount.toFixed(2), styles: { fontStyle: 'bold' } }
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY + 2,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: 255 },
            margin: { left: margin, right: margin }
        });

        // Save
        doc.save(`Style_${style.styleNo}.pdf`);

    } catch (error) {
        console.error("PDF Gen Error:", error);
        alert("Failed to generate PDF");
    }
};
