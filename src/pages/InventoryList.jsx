import React, { useState, useMemo } from 'react';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Search, Filter, Warehouse, Plus, Download, Upload, FileSpreadsheet, Printer, ScanBarcode, History } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { generateInventoryTemplate, exportInventoryToExcel } from '../utils/export';
import { parseInventoryExcel } from '../utils/import';
import BarcodeModal from '../components/BarcodeModal';
import TransactionHistoryModal from '../components/TransactionHistoryModal';

const InventoryList = () => {
    const { items, challans, outwardChallans, invoices, materialIssues, fabricIssues, suppliers, purchaseOrders, addItem } = usePurchaseOrder();
    console.log("Inventory Items Debug:", items); // Debug log to check data structure
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
    const [selectedItemForBarcode, setSelectedItemForBarcode] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedItemForHistory, setSelectedItemForHistory] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const fileInputRef = React.useRef(null);
    const navigate = useNavigate();

    const getDisplayGRN = (inv) => {
        if (!inv) return '-';
        if (inv.grnNo) return inv.grnNo;
        // Global Fallback for legacy records
        const dateObj = new Date(inv.date);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yy = String(dateObj.getFullYear()).slice(-2);

        // Find global order of this invoice
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

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const parsedItems = await parseInventoryExcel(file);
            if (parsedItems && parsedItems.length > 0) {
                let successCount = 0;
                for (const item of parsedItems) {
                    await addItem(item);
                    successCount++;
                }
                alert(`Successfully imported ${successCount} items!`);
            } else {
                alert("No valid items found in the file.");
            }
        } catch (error) {
            console.error("Import Error:", error);
            alert("Failed to import items. " + error.message);
        } finally {
            e.target.value = null; // Reset input
        }
    };

    const openBarcodeModal = (item) => {
        setSelectedItemForBarcode(item);
        setBarcodeModalOpen(true);
    };

    const openHistoryModal = (item) => {
        setSelectedItemForHistory(item);
        setHistoryModalOpen(true);
    };

    const toggleSelectItem = (itemId) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === filteredInventory.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredInventory.map(item => item.id));
        }
    };

    const handleBulkBarcode = () => {
        const bulkItems = inventory.filter(item => selectedItems.includes(item.id));
        setSelectedItemForBarcode(bulkItems); // Passing array instead of single item
        setBarcodeModalOpen(true);
    };

    // Calculate Stock for each item
    const inventory = useMemo(() => {
        return items.map(item => {
            const opening = parseFloat(item.openingStock || 0);

            // 1. Inward from Challans (JSONB: itemId/item_id)
            const inwardFromChallans = challans.reduce((sum, challan) => {
                const itemEntry = challan.items?.find(i => String(i.itemId || i.item_id) === String(item.id) || i.item_name?.trim() === item.name?.trim());
                return sum + (itemEntry ? parseFloat(itemEntry.quantity || 0) : 0);
            }, 0);

            // 2. Inward from Direct Invoices (No Challan linked)
            const inwardFromDirectInvoices = invoices.reduce((sum, inv) => {
                const hasChallan = inv.challanIds && inv.challanIds.length > 0;
                const challanNoEmpty = !inv.challanNo || inv.challanNo === 'None' || inv.challanNo === 'N/A';

                if (!hasChallan || challanNoEmpty) {
                    const itemEntry = inv.items?.find(i => String(i.itemId || i.item_id) === String(item.id) || i.item_name?.trim() === item.name?.trim());
                    return sum + (itemEntry ? parseFloat(itemEntry.quantity || itemEntry.qty || 0) : 0);
                }
                return sum;
            }, 0);

            const totalInward = inwardFromChallans + inwardFromDirectInvoices;

            // 3. Outward from Outward Challans (JSONB: itemId/item_id)
            const outwardFromChallans = outwardChallans.reduce((sum, challan) => {
                const itemEntry = challan.items?.find(i => String(i.itemId || i.item_id) === String(item.id) || i.item_name?.trim() === item.name?.trim());
                if (!itemEntry) return sum;

                let qty = 0;
                if (challan.purpose === 'Fabric Return') {
                    qty = parseFloat(itemEntry.quantity) || 0;
                } else {
                    const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];
                    qty = SIZES.reduce((s, size) => s + (parseInt(itemEntry[size]) || 0), 0);
                    if (qty === 0) qty = parseFloat(itemEntry.quantity || 0); // Fallback
                }
                return sum + qty;
            }, 0);

            // 4. Outward from Material Issues (Children: item_id/itemId)
            const outwardFromMaterialIssues = materialIssues.reduce((sum, issue) => {
                const itemEntries = issue.material_issue_items?.filter(i => 
                    String(i.item_id || i.itemId) === String(item.id) || i.item_name?.trim() === item.name?.trim()
                ) || [];
                const issueQty = itemEntries.reduce((s, i) => s + (parseFloat(i.qty || i.quantity || 0)), 0);
                return sum + issueQty;
            }, 0);

            // 5. Outward from Fabric Issues (Children: item_id/itemId)
            const outwardFromFabricIssues = fabricIssues.reduce((sum, issue) => {
                const itemEntries = issue.fabric_issue_items?.filter(i =>
                    String(i.item_id || i.itemId) === String(item.id) || i.item_name?.trim() === item.name?.trim()
                ) || [];
                const issueQty = itemEntries.reduce((s, i) => s + (parseFloat(i.quantity || i.qty || 0)), 0);
                return sum + issueQty;
            }, 0);

            const totalOutward = outwardFromChallans + outwardFromMaterialIssues + outwardFromFabricIssues;

            // --- Metadata for New Columns (Last Transaction Details) ---

            // 1. Last Inward Info
            const lastChallan = challans.find(c => c.items?.some(i => i.itemId === item.id));
            const lastInvoice = invoices.find(inv => {
                const hasChallan = inv.challanIds && inv.challanIds.length > 0;
                const challanNoEmpty = !inv.challanNo || inv.challanNo === 'None' || inv.challanNo === 'N/A';
                return ((!hasChallan || challanNoEmpty) && inv.items?.some(i => i.itemId === item.id));
            });

            // Determine which is more recent (if both exist)
            let lastInwardRecord = null;
            if (lastChallan && lastInvoice) {
                lastInwardRecord = new Date(lastChallan.created_at) > new Date(lastInvoice.created_at) ? { type: 'Challan', data: lastChallan } : { type: 'Invoice', data: lastInvoice };
            } else if (lastChallan) {
                lastInwardRecord = { type: 'Challan', data: lastChallan };
            } else if (lastInvoice) {
                lastInwardRecord = { type: 'Invoice', data: lastInvoice };
            }

            const vendorId = lastInwardRecord?.data?.supplierId;
            const vendor = suppliers.find(s => s.id === vendorId)?.name || '-';

            const poId = lastInwardRecord?.data?.poId;
            const poNo = lastInwardRecord?.type === 'Invoice' ? (lastInwardRecord.data.poNumber || '-') : (purchaseOrders.find(p => p.id === poId)?.poNumber || '-');

            const inwardNo = lastInwardRecord?.type === 'Challan' ? lastInwardRecord.data.challanNo : (lastInwardRecord?.data?.invoiceNo || '-');

            // Find linked GRN (System No)
            let lastGRN = '-';
            if (lastInwardRecord?.type === 'Invoice') {
                lastGRN = getDisplayGRN(lastInwardRecord.data);
            } else if (lastInwardRecord?.type === 'Challan') {
                const linkedInv = invoices.find(inv => inv.challanIds?.includes(lastInwardRecord.data.id));
                if (linkedInv) lastGRN = getDisplayGRN(linkedInv);
            }

            // 2. Last Outward Info
            const lastOutChallan = outwardChallans?.find(c => c.items?.some(i => i.itemId === item.id));
            const lastIssue = materialIssues?.find(iss =>
                iss.material_issue_items?.some(i => i.item_name?.trim().toLowerCase() === item.name?.trim().toLowerCase())
            );
            const lastFabricIssue = fabricIssues?.find(iss =>
                iss.fabric_issue_items?.some(i => String(i.item_id) === String(item.id) || i.item_name?.trim() === item.name?.trim())
            );

            // Compare dates to find the absolute latest "Outward" record
            const dates = [];
            if (lastOutChallan) dates.push({ type: 'Challan', data: lastOutChallan, date: new Date(lastOutChallan.created_at || 0) });
            if (lastIssue) dates.push({ type: 'Issue', data: lastIssue, date: new Date(lastIssue.created_at || 0) });
            if (lastFabricIssue) dates.push({ type: 'FabricIssue', data: lastFabricIssue, date: new Date(lastFabricIssue.created_at || 0) });

            dates.sort((a, b) => b.date - a.date);
            const lastOutwardRecord = dates.length > 0 ? dates[0] : null;

            const outwardNo = lastOutwardRecord?.type === 'Challan'
                ? (lastOutwardRecord.data.outChallanNo || lastOutwardRecord.data.challanNo || '-')
                : lastOutwardRecord?.type === 'FabricIssue'
                    ? (lastOutwardRecord.data.issue_no || '-')
                    : (lastOutwardRecord?.data?.issue_no || '-');

            // Style No extraction - Robust handle for potential array/object from joins
            let styleNo = '-';
            if (lastOutwardRecord?.type === 'Challan') {
                const itemInChallan = lastOutwardRecord.data.items?.find(i => i.itemId === item.id);
                styleNo = itemInChallan?.styleNo || itemInChallan?.style_no || '-';
            } else if (lastOutwardRecord?.type === 'Issue') {
                const po = lastOutwardRecord.data.production_orders;
                const poData = Array.isArray(po) ? po[0] : po;
                const style = poData?.styles;
                const styleData = Array.isArray(style) ? style[0] : style;
                styleNo = styleData?.styleNo || '-';
            } else if (lastOutwardRecord?.type === 'FabricIssue') {
                styleNo = lastOutwardRecord.data.style_no || '-';
            }

            return {
                ...item,
                opening,
                inward: totalInward,
                outward: totalOutward,
                current: opening + totalInward - totalOutward,
                lastVendor: vendor,
                lastPO: poNo,
                lastInward: inwardNo,
                lastGRN: lastGRN,
                lastOutward: outwardNo,
                lastStyle: styleNo
            };
        });
    }, [items, challans, outwardChallans, invoices, materialIssues, fabricIssues, suppliers, purchaseOrders]);

    // Filter and Search
    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.fabricCode && item.fabricCode.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'All' || item.materialType === filterType;

        return matchesSearch && matchesType;
    });

    const categories = ['All', 'Fabric', 'Accessories', 'Trims', 'Finished Goods', 'Packaging'];

    return (
        <div className="max-w-[98%] mx-auto pb-12">
            {/* STICKY TOP SECTION */}
            <div className="sticky top-0 z-50 bg-sage-50/95 backdrop-blur-md pt-4 pb-3 px-2 -mx-2 border-b border-sage-200">
                <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-sage-600 rounded-lg shadow-sm">
                                <Warehouse className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-sage-800 leading-tight">Inventory Management</h1>
                                <p className="text-sage-500 text-xs">Manage stock, imports, and barcodes</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
                            <button onClick={handleImportClick} className="btn-secondary px-3 py-1.5 flex items-center gap-1.5 text-sm bg-white border border-sage-200 rounded-lg hover:bg-sage-50 shadow-xs transition-all">
                                <Upload className="w-4 h-4" /> Import
                            </button>
                            <button onClick={generateInventoryTemplate} className="btn-secondary px-3 py-1.5 flex items-center gap-1.5 text-sm bg-white border border-sage-200 rounded-lg hover:bg-sage-50 shadow-xs transition-all">
                                <FileSpreadsheet className="w-4 h-4" /> Template
                            </button>
                            <button onClick={() => exportInventoryToExcel(inventory)} className="btn-secondary px-3 py-1.5 flex items-center gap-1.5 text-sm bg-white border border-sage-200 rounded-lg hover:bg-sage-50 shadow-xs transition-all">
                                <Download className="w-4 h-4" /> Export
                            </button>
                            <Link to="/items/new" className="px-4 py-1.5 bg-sage-600 text-white rounded-lg hover:bg-sage-700 flex items-center gap-1.5 text-sm font-medium shadow-sm transition-all active:scale-95">
                                <Plus className="w-4 h-4" /> New Item
                            </Link>
                        </div>
                    </div>

                    {/* Filter & Search Row */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/50 p-2 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Quick search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white/80 border border-sage-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/10 focus:border-sage-600 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterType(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${filterType === cat
                                        ? 'bg-sage-700 text-white shadow-md'
                                        : 'bg-white text-sage-600 border border-sage-100 hover:border-sage-200 hover:bg-sage-50'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions (Floating overlay style to avoid offset math) */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-sage-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom duration-300">
                    <span className="text-sm font-bold border-r border-white/20 pr-6">
                        {selectedItems.length} selected
                    </span>
                    <div className="flex gap-4">
                        <button onClick={handleBulkBarcode} className="flex items-center gap-2 text-sm font-bold hover:text-sage-200 transition-colors">
                            <ScanBarcode className="w-4 h-4" /> Print Barcodes
                        </button>
                        <button onClick={() => setSelectedItems([])} className="text-xs hover:underline text-white/60">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* TABLE CONTAINER */}
            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 mt-2 flex flex-col">
                <div className="overflow-auto h-[calc(100vh-220px)] min-h-[400px]">
                    <table className="w-full border-separate border-spacing-0">
                        <thead className="sticky top-0 z-30 bg-white shadow-sm">
                            <tr className="bg-sage-50/50 text-left text-[10px] font-bold text-sage-600 uppercase tracking-tighter">
                                <th className="p-3 w-10 border-b border-sage-100">
                                    <input
                                        type="checkbox"
                                        className="rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                                        checked={selectedItems.length > 0 && selectedItems.length === filteredInventory.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-3 border-b border-sage-100">Item</th>
                                <th className="p-3 border-b border-sage-100">Vendor</th>
                                <th className="p-3 border-b border-sage-100">PO</th>
                                <th className="p-3 border-b border-sage-100">GRN</th>
                                <th className="p-3 border-b border-sage-100">Style</th>
                                <th className="p-3 text-center border-b border-sage-100">In (Ref)</th>
                                <th className="p-3 text-center border-b border-sage-100">Out (Ref)</th>
                                <th className="p-3 text-center border-b border-sage-100">Type</th>
                                <th className="p-3 text-center border-b border-sage-100">Unit</th>
                                <th className="p-3 text-right border-b border-sage-100">Rate</th>
                                <th className="p-3 text-right border-b border-sage-100">Open</th>
                                <th className="p-3 text-right text-indigo-600 border-b border-sage-100">In (+)</th>
                                <th className="p-3 text-right text-rose-500 border-b border-sage-100">Out (-)</th>
                                <th className="p-3 text-right font-black text-sage-900 border-b border-sage-100">Stock</th>
                                <th className="p-3 text-center border-b border-sage-100"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map((item) => (
                                    <tr key={item.id} className={`hover:bg-sage-50/50 transition-colors ${selectedItems.includes(item.id) ? 'bg-sage-50' : ''}`}>
                                        <td className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={() => toggleSelectItem(item.id)}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-sage-900 text-sm whitespace-nowrap">{item.name}</div>
                                            <div className="text-[10px] text-sage-400 font-mono mt-0.5">Code: {item.fabricCode || '-'}</div>
                                        </td>
                                        <td className="p-3 text-xs text-sage-600 truncate max-w-[120px]" title={item.lastVendor}>
                                            {item.lastVendor}
                                        </td>
                                        <td className="p-3 text-xs text-sage-500 font-mono">
                                            {item.lastPO}
                                        </td>
                                        <td className="p-3 text-xs text-sage-600 font-bold font-mono">
                                            {item.lastGRN}
                                        </td>
                                        <td className="p-3 text-xs text-sage-600 font-medium">
                                            {item.lastStyle}
                                        </td>
                                        <td className="p-3 text-center text-[10px] text-sage-500 font-mono">
                                            {item.lastInward}
                                        </td>
                                        <td className="p-3 text-center text-[10px] text-sage-500 font-mono">
                                            {item.lastOutward}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.materialType === 'Fabric' ? 'bg-blue-100 text-blue-700' :
                                                item.materialType === 'Finished Goods' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                {item.materialType}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-xs text-sage-600">{item.unit}</td>
                                        <td className="p-3 text-right font-mono text-xs">
                                            {item.rate !== undefined && item.rate !== null ? `₹${item.rate}` : '-'}
                                        </td>
                                        <td className="p-3 text-right font-mono text-xs text-sage-500">{item.opening.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono text-xs text-indigo-600 bg-indigo-50/20">
                                            {item.inward > 0 ? `+${item.inward.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-3 text-right font-mono text-xs text-rose-500 bg-rose-50/20">
                                            {item.outward > 0 ? `-${item.outward.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-3 text-right font-mono font-black text-sm text-sage-900 bg-sage-50/50">
                                            {item.current.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center gap-1 justify-center">
                                                <button
                                                    onClick={() => openHistoryModal(item)}
                                                    className="p-1.5 text-sage-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="View Transaction History"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openBarcodeModal(item)}
                                                    className="p-1.5 text-sage-400 hover:text-sage-800 hover:bg-sage-100 rounded-lg transition-all"
                                                    title="Print Barcode"
                                                >
                                                    <ScanBarcode className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="16" className="p-8 text-center text-sage-400">
                                        No items found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Barcode Modal */}
            <BarcodeModal
                isOpen={barcodeModalOpen}
                onClose={() => setBarcodeModalOpen(false)}
                item={selectedItemForBarcode}
            />

            {/* Transaction History Modal */}
            <TransactionHistoryModal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                item={selectedItemForHistory}
            />
        </div>
    );
};

export default InventoryList;
