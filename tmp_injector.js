const fs = require('fs');

const exportFile = 'src/utils/export.js';
const content = fs.readFileSync(exportFile, 'utf8');

// Find the start of generatePDF
const startIndex = content.indexOf('export const generatePDF = (po, print = false, suppliers = []) => {');

// Find the end of it (just before export const generateStylePDF)
const endIndex = content.indexOf('export const generateStylePDF = (style) => {');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end index.");
    process.exit(1);
}

const newFunction = `export const generatePDF = (po, print = false, suppliers = []) => {
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

        if (compGSTIN) {
            doc.setFont("helvetica", "bold");
            doc.text(\`GSTIN : \${compGSTIN}\`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }

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
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);

        const gridY = currentY;
        const gridH = 45; // Fixed height for top info block // INCREASE THIS LATER IF RENDER IS CLIPPED
        doc.setFillColor(255,255,255);
        doc.rect(margin, gridY, width, gridH, 'FD'); // Outer box

        const col1W = width * 0.48;
        const col2W = width * 0.32;
        const col3W = width - col1W - col2W;

        const line1X = margin + col1W;
        const line2X = line1X + col2W;

        doc.line(line1X, gridY, line1X, gridY + gridH); // Separator 1
        doc.line(line2X, gridY, line2X, gridY + gridH); // Separator 2

        // -- Col 1: Vendor details --
        doc.setFontSize(8);
        doc.setTextColor(0);
        let leftY = gridY + 4;
        const leftLabelX = margin + 2;
        const leftValX = margin + 20;

        const addRowLeft = (lbl, val) => {
            if (!val && lbl !== "Remarks :") return;
            doc.setFont("helvetica", "bold");
            doc.text(lbl, leftLabelX, leftY);
            doc.setFont("helvetica", "normal");
            const splitVal = doc.splitTextToSize(getVal(val, "-"), col1W - 24);
            doc.text(splitVal, leftValX, leftY);
            leftY += (splitVal.length * 4.5);
        };

        const sup = normalizedPO.supplierDetails;
        addRowLeft("Vendor Name :", getVal(sup.name, getVal(normalizedPO.supplierName)));
        addRowLeft("Contact Name :", getVal(sup.contact));
        addRowLeft("Address :", getVal(sup.address));
        addRowLeft("GST No. :", getVal(sup.gstin));
        addRowLeft("Mobile No. :", getVal(sup.mobile));
        addRowLeft("Email :", getVal(sup.email));
        addRowLeft("Remarks :", getVal(normalizedPO.terms?.generalTerms));

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
        addRowMid("Lead Time :", normalizedPO.terms?.leadTime ? \`\${normalizedPO.terms.leadTime} (Days)\` : '-');
        addRowMid("Ref. PO No. :", normalizedPO.refPoNo || '-');
        addRowMid("Expiry Date :", formatDate(normalizedPO.validity));

        // -- Col 3: Attached Image --
        if (normalizedPO.attachment && normalizedPO.attachment.startsWith('data:image')) {
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
                1: { cellWidth: 35 },
                2: { cellWidth: 25 },
                3: { cellWidth: 40 },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 20, halign: 'right' },
                7: { cellWidth: 27, halign: 'right' },
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
            doc.text(\`Payment terms \${normalizedPO.terms.paymentTerms}\`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        } else {
            // Default based on screenshot
            doc.text(\`Payment terms 60 days from the date of GRN on fortnightly basis.\`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }

        // Default or Custom Terms
        let mainTerms = normalizedPO.terms?.generalTerms;
        const defaultTerms = \`Note : Any delay in delivery of goods as per the PO accepted by Licensee will attract discount of 3% for 1st week & 3% for 2nd week and in 3rd week PO will be automatically stands cancelled along with a debit note of 10% on the value of actual order quantity.

1) Delivery date shall be the date as specified in the PO herein & Delivery shall mean delivery of goods to the preferred transporter of the company with the Valid LR copy attached herein.
2) Delivery date should be strictly adhered to and early delivery will be accepted maximum 7 days prior to delivery date. No goods will be inspected and shall be delivered more than 15 days prior at the warehouse.
3) Additional goods will be accepted only as per the PO quantity criteria. This is applicable to size ratio.
4) Consignment to be sent with proper LR/Docket on which invoice number & number of boxes/bales against each invoice should be clearly mentioned. Packing slip to be pasted on each box/package.
5) If consignment of multiple PO send in one LR, we require proper identification of boxes - (LR #, Vendor Name, PO #, Box # etc.)
6) Any addition, alteration, modification, variation and amendment or other changes in this order will not be valid unless confirmed by the Licensor in writing.
7) Bills to be submitted in Duplicate & should bear the Licensee's GST registration number of the supplying location.
8) Main Label, Wash care, Tags, Disclaimer Tags to be procured from nominated supplier as applicable upon payment.
9) This Purchase order and its interpretation, enforcement, application, validity, and effects are subject to the applicable laws.
10) Order has to be completed in maximum 2 parts. And the first part should contain atleast 50% of the order quantity.\`;

        const finalTerms = (mainTerms && mainTerms.trim().length > 10) ? mainTerms : defaultTerms;
        const termsLinesArray = finalTerms.split('\\n');

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
            if (/^\\d+\\)/.test(line.trim() || /^\\d+\\./.test(line.trim()))) {
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
            doc.text(\`Page 1 of 1\`, pageWidth - margin, pageHeight - 8, { align: 'right' }); 
            // the screenshot just says Page 1 of 1
        }

        if (print) {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(\`PO_\${normalizedPO.poNumber || 'New'}.pdf\`);
        }
    } catch (error) {
        console.error("PDF Critical Error:", error);
        alert(\`Failed to generate PDF: \${error.message}\`);
    }
};
`;

const updatedContent = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
fs.writeFileSync(exportFile, updatedContent, 'utf8');
console.log("Successfully replaced generatePDF function");
