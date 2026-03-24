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
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 10;
        const width = pageWidth - (margin * 2);

        // Normalize PO Data
        const comm = po.commercials || {};
        let supplierSnapshot = po.supplierDetails || comm.supplierDetails || {};
        if ((!supplierSnapshot || !supplierSnapshot.address) && po.supplierId && suppliers.length > 0) {
            const foundSupplier = suppliers.find(s => s.id === po.supplierId);
            if (foundSupplier) {
                supplierSnapshot = {
                    name: foundSupplier.name,
                    address: foundSupplier.address,
                    gstin: foundSupplier.gstin,
                    contact: foundSupplier.contactPerson,
                    mobile: foundSupplier.mobile || foundSupplier.phone,
                    email: foundSupplier.email
                };
            }
        }

        const normalizedPO = {
            ...po,
            buyerDetails: po.buyerDetails || comm.buyerDetails || {},
            supplierDetails: supplierSnapshot,
            terms: po.terms || comm.terms || {},
            calculations: po.calculations || comm.calculations || {},
            attachment: po.attachment || comm.attachment
        };

        const getVal = (val, fallback = '') => val ? val.toString().trim() : fallback;

        let currentY = margin;

        // --- 1. Top Header (Buyer Info) ---
        const compName = getVal(normalizedPO.buyerDetails?.companyName, "THREAD BUCKET STUDIO LLP").toUpperCase();
        const compAddress = getVal(normalizedPO.buyerDetails?.address, "A/15-4 BESIDE SAIBABA TEMPLE, ROAD NO.8, UDHANA UDHYOG NAGAR - 394210").toUpperCase();
        const compGSTIN = getVal(normalizedPO.buyerDetails?.gstin, "24AAKFT0982E1Z6").toUpperCase();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(compName, pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const addLines = doc.splitTextToSize(compAddress, width - 20);
        doc.text(addLines, pageWidth / 2, currentY, { align: 'center' });
        currentY += (addLines.length * 3.5);

        doc.setFont("helvetica", "bold");
        doc.text(`GSTIN : ${compGSTIN}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;

        doc.setFontSize(14);
        doc.text("Purchase Order", pageWidth / 2, currentY, { align: 'center' });

        // Date timestamp in top right
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const printDate = new Date().toLocaleString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        doc.text(printDate, pageWidth - margin, margin, { align: 'right' });

        currentY += 4;

        // --- 2. Information Grid (Vendor, PO Details, Image) ---
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);

        const gridY = currentY;
        const col1W = width * 0.48;
        const col2W = width * 0.32;
        const col3W = width - col1W - col2W;

        const line1X = margin + col1W;
        const line2X = line1X + col2W;

        doc.setFontSize(8);

        // Pre-calculate heights
        const sup = normalizedPO.supplierDetails;
        const vendRows = [
            { l: "Vendor Name :", v: getVal(sup.name, getVal(normalizedPO.supplierName)) },
            { l: "Contact Name :", v: getVal(sup.contact) },
            { l: "Address :", v: getVal(sup.address) },
            { l: "GST No. :", v: getVal(sup.gstin) },
            { l: "Mobile No. :", v: getVal(sup.mobile) },
            { l: "Email :", v: getVal(sup.email) },
            { l: "Remarks :", v: getVal(normalizedPO.terms?.generalTerms) }
        ];

        let leftH = 6; // padding
        vendRows.forEach(r => {
            if (!r.v && r.l !== "Remarks :") return;
            const split = doc.splitTextToSize(getVal(r.v, "-"), col1W - 25);
            leftH += (split.length * 4.5);
        });

        // PO Details are mostly 1-liners
        let midH = 6 + (7 * 5.5);

        // Calculate dynamic grid height
        const gridH = Math.max(45, leftH, midH);

        doc.rect(margin, gridY, width, gridH); // Outer box
        doc.line(line1X, gridY, line1X, gridY + gridH); // Separator 1
        doc.line(line2X, gridY, line2X, gridY + gridH); // Separator 2

        // -- Col 1: Vendor details --
        doc.setTextColor(0);
        let leftY = gridY + 4;
        const leftLabelX = margin + 2;
        const leftValX = margin + 22; // Extended spacing for label

        const addRowLeft = (lbl, val) => {
            if (!val && lbl !== "Remarks :") return;
            doc.setFont("helvetica", "bold");
            doc.text(lbl, leftLabelX, leftY);
            doc.setFont("helvetica", "normal");
            const splitVal = doc.splitTextToSize(getVal(val, "-"), col1W - 25);
            doc.text(splitVal, leftValX, leftY);
            leftY += (splitVal.length * 4.5);
        };
        vendRows.forEach(r => addRowLeft(r.l, r.v));

        // -- Col 2: PO details --
        let midY = gridY + 5;
        const midLabelX = line1X + 2;
        const midValX = line1X + 26;

        const addRowMid = (lbl, val) => {
            doc.setFont("helvetica", "bold");
            doc.text(lbl, midLabelX, midY);
            doc.setFont("helvetica", "normal");
            doc.text(getVal(val, "-"), midValX, midY);
            midY += 5.5;
        };

        const formatDate = (dateString) => {
            if (!dateString) return '-';
            try { return new Date(dateString).toLocaleDateString('en-GB'); } catch(e) { return '-'; }
        };

        addRowMid("PO No. :", normalizedPO.poNumber || 'Draft');
        addRowMid("PO Date :", formatDate(normalizedPO.poDate || normalizedPO.date));
        addRowMid("Nature of Supply :", "GOODS");
        addRowMid("Order Type :", "New");
        addRowMid("Lead Time :", normalizedPO.terms?.leadTime ? `${normalizedPO.terms.leadTime} (Days)` : '-');
        addRowMid("Ref. PO No. :", normalizedPO.refPoNo || '-');
        addRowMid("Expiry Date :", formatDate(normalizedPO.validity));

        // -- Col 3: Attached Image --
        if (normalizedPO.attachment && typeof normalizedPO.attachment === 'string' && normalizedPO.attachment.startsWith('data:image')) {
            try {
                // Determine layout: Fill box preserving some margin
                const imgBoxW = col3W - 2;
                const imgBoxH = gridH - 2;
                doc.addImage(normalizedPO.attachment, 'JPEG', line2X + 1, gridY + 1, imgBoxW, imgBoxH, undefined, 'FAST');
            } catch (e) {
                console.warn("Could not add image rendering", e);
            }
        }

        currentY = gridY + gridH + 4; // Space below grid

        // --- 3. Items Table ---
        const tableColumn = ["#", "SKU Code / Style", "Category / PO", "Colour / Desc", "Qty.", "Section/UOM", "Rate", "Amount"];
        const tableRows = [];
        let totalQty = 0;
        let itemsTotal = 0;

        if (normalizedPO.items && Array.isArray(normalizedPO.items)) {
            normalizedPO.items.forEach((item, index) => {
                const qty = Number(item.qty || 0);
                const rate = Number(item.rate || 0);
                const amount = Number(item.amount) || (qty * rate);
                
                totalQty += qty;
                itemsTotal += amount;
                
                let desc = item.description || "";
                if(item.fabricDetails) desc += " " + item.fabricDetails;
                if(item.color || item.colour) desc += " " + (item.color || item.colour);

                tableRows.push([
                    index + 1,
                    item.styleNo || item.articleCode || item.sku || '-',
                    item.category || item.buyerPO || '-',
                    desc.trim() || '-',
                    qty,
                    item.uom || item.unit || '-',
                    rate.toFixed(2),
                    amount.toFixed(2)
                ]);
            });
        }
        
        // Take commercial calculations if items array is missing/discrepant
        if (normalizedPO.calculations && normalizedPO.calculations.itemsTotal > 0) {
            itemsTotal = normalizedPO.calculations.itemsTotal;
        }

        // Add Total Row
        tableRows.push([
            { content: 'Total', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: totalQty.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
            { content: '', colSpan: 2 },
            { content: itemsTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [200, 200, 200], textColor: 0, lineWidth: 0.1, lineColor: 150, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { lineWidth: 0.1, lineColor: 150, textColor: 0, fontSize: 8 },
            footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 32 },
                2: { cellWidth: 25 },
                3: { cellWidth: 44 },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 22, halign: 'center' },
                6: { cellWidth: 20, halign: 'right' },
                7: { cellWidth: 24, halign: 'right' },
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => { currentY = data.cursor.y; }
        });

        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
            currentY = doc.lastAutoTable.finalY + 4;
        }

        // --- 4. Terms and conditions ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("** Term and conditions **", pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;
        
        if (normalizedPO.terms?.paymentTerms) {
            doc.text(`Payment terms ${normalizedPO.terms.paymentTerms}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        } else {
            // Default based on screenshot
            doc.text(`Payment terms 60 days from the date of GRN on fortnightly basis.`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }

        // Default or Custom Terms
        let mainTerms = normalizedPO.terms?.generalTerms;
        const defaultTerms = `Note : Any delay in delivery of goods as per the PO accepted by Licensee will attract discount of 3% for 1st week & 3% for 2nd week and in 3rd week PO will be automatically stands cancelled along with a debit note of 10% on the value of actual order quantity.

1) Delivery date shall be the date as specified in the PO herein & Delivery shall mean delivery of goods to the preferred transporter of the company with the Valid LR copy attached herein.
2) Delivery date should be strictly adhered to and early delivery will be accepted maximum 7 days prior to delivery date. No goods will be inspected and shall be delivered more than 15 days prior at the warehouse.
3) Additional goods will be accepted only as per the PO quantity criteria. This is applicable to size ratio.
4) Consignment to be sent with proper LR/Docket on which invoice number & number of boxes/bales against each invoice should be clearly mentioned. Packing slip to be pasted on each box/package.
5) If consignment of multiple PO send in one LR, we require proper identification of boxes - (LR #, Vendor Name, PO #, Box # etc.)
6) Any addition, alteration, modification, variation and amendment or other changes in this order will not be valid unless confirmed by the Licensor in writing.
7) Bills to be submitted in Duplicate & should bear the Licensee's GST registration number of the supplying location.
8) Main Label, Wash care, Tags, Disclaimer Tags to be procured from nominated supplier as applicable upon payment.
9) This Purchase order and its interpretation, enforcement, application, validity, and effects are subject to the applicable laws.
10) Order has to be completed in maximum 2 parts. And the first part should contain atleast 50% of the order quantity.`;

        const finalTerms = (mainTerms && mainTerms.trim().length > 10) ? mainTerms : defaultTerms;
        const termsLinesArray = finalTerms.split('\n');

        doc.setFontSize(8);
        
        termsLinesArray.forEach(line => {
            if (line.trim() === '') return;
            
            // Auto Page break logic before printing a line
            if (currentY > pageHeight - 15) {
                doc.addPage();
                currentY = margin;
            }

            const isNote = line.toLowerCase().startsWith('note');
            doc.setFont("helvetica", isNote ? "bold" : "normal");
            
            // Add margin for terms (list numbers)
            let xPos = margin;
            if (/^\d+\)/.test(line.trim() || /^\d+\./.test(line.trim()))) {
                xPos = margin + 3; // indent list slightly
            }

            const processedLine = doc.splitTextToSize(line.trim(), width - (xPos - margin));
            doc.text(processedLine, xPos, currentY);
            currentY += (processedLine.length * 4) + 1; // paragraph spacing
        });

        // Add Footer text on every page
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            
            // Subtle separating line at the bottom
            doc.setDrawColor(200);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
            
            doc.text("*This is an system generated document & No Stump or Signature is required", margin, pageHeight - 8);
            doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 8, { align: 'right' }); 
            // the screenshot just says Page 1 of 1
        }

        if (print) {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(`PO_${normalizedPO.poNumber || 'New'}.pdf`);
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
