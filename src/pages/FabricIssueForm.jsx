import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Plus, Box, Trash2, Layers } from 'lucide-react';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';

const FabricIssueForm = () => {
    const navigate = useNavigate();
    const { invoices, items: allItems, styles, challans } = usePurchaseOrder(); // Get styles from context
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fabricItems, setFabricItems] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        issue_no: '',
        styleId: '',
        styleNo: '',
        buyerPO: '',
        remarks: ''
    });

    const [items, setItems] = useState([
        { item_id: '', item_name: '', quantity: '', unit: 'Mtrs', roll_no: '' }
    ]);

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);

            // 1. Filter Fabric Items from Context
            const fabrics = allItems.filter(i => i.materialType === 'Fabric');
            setFabricItems(fabrics);

            if (id) {
                // Fetch Existing Issue
                const { data: issue, error: fetchError } = await supabase
                    .from('fabric_issues')
                    .select('*, fabric_issue_items(*)')
                    .eq('id', id)
                    .single();

                if (issue) {
                    setFormData({
                        issue_no: issue.issue_no,
                        styleId: issue.style_id || '',
                        styleNo: issue.style_no,
                        buyerPO: issue.buyer_po,
                        remarks: issue.remarks || ''
                    });

                    if (issue.fabric_issue_items && issue.fabric_issue_items.length > 0) {
                        setItems(issue.fabric_issue_items.map(i => ({
                            item_id: i.item_id,
                            item_name: i.item_name,
                            quantity: i.quantity,
                            unit: i.unit,
                            roll_no: i.roll_no || ''
                        })));
                    }
                }
            } else {
                // 2. Generate Issue No
                const dateCode = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2);
                const { data: lastIssue } = await supabase
                    .from('fabric_issues')
                    .select('issue_no')
                    .order('created_at', { ascending: false })
                    .limit(1);

                let nextNum = 1;
                if (lastIssue && lastIssue.length > 0 && lastIssue[0].issue_no) {
                    const parts = lastIssue[0].issue_no.split('-');
                    const lastNum = parseInt(parts[parts.length - 1]);
                    if (!isNaN(lastNum)) nextNum = lastNum + 1;
                }
                const newIssueNo = `FAB-${dateCode}-${String(nextNum).padStart(3, '0')}`;
                setFormData(prev => ({ ...prev, issue_no: newIssueNo }));
            }

            setLoading(false);
        };

        if (allItems?.length > 0 && styles?.length > 0) {
            initialize();
        }

    }, [allItems, styles, id]);

    const handleStyleChange = (e) => {
        const selectedStyleNo = e.target.value;
        const selectedStyle = styles.find(s => s.styleNo === selectedStyleNo);

        setFormData(prev => ({
            ...prev,
            styleNo: selectedStyleNo,
            styleId: selectedStyle?.id || '',
            buyerPO: selectedStyle?.buyerPO || ''
        }));
    };

    const handleAddItem = () => {
        setItems([...items, { item_id: '', item_name: '', quantity: '', unit: 'Mtrs', roll_no: '' }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'item_id') {
            const selected = allItems.find(i => String(i.id).trim() === String(value).trim());
            if (selected) {
                newItems[index].item_name = selected.name;
                newItems[index].unit = selected.unit || 'Mtrs';
            }
        }

        setItems(newItems);
    };

    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processBarcode(barcodeInput);
            setBarcodeInput('');
        }
    };

    const processBarcode = (scannedCodeRaw) => {
        if (!scannedCodeRaw) return;
        const scannedCode = scannedCodeRaw.trim();

        // Parse Barcode: DocNo-ItemIdx-BaleIdx (e.g. 871-1-Roll 1 or INV-101-1-1)
        const lastDash = scannedCode.lastIndexOf('-');
        const secondLastDash = scannedCode.substring(0, lastDash).lastIndexOf('-');

        if (lastDash === -1 || secondLastDash === -1) {
            alert("Invalid barcode format. Expected DocNo-ItemIdx-RollNo.");
            return;
        }

        const baleIdxStr = scannedCode.substring(lastDash + 1).trim();
        const itemIdxStr = scannedCode.substring(secondLastDash + 1, lastDash).trim();
        const docNo = scannedCode.substring(0, secondLastDash).trim();

        const itemIdx = parseInt(itemIdxStr);
        if (isNaN(itemIdx)) {
            alert("Invalid barcode format. Item index must be a number.");
            return;
        }

        // 1. Try Finding in Invoices
        let sourceDoc = invoices.find(inv =>
            String(inv.invoiceNo).trim().toLowerCase() === docNo.toLowerCase() ||
            String(inv.grnNo).trim().toLowerCase() === docNo.toLowerCase()
        );
        let isChallan = false;

        // 2. If not found, Try Finding in Challans
        if (!sourceDoc) {
            sourceDoc = challans.find(ch =>
                String(ch.challanNo).trim().toLowerCase() === docNo.toLowerCase() ||
                String(ch.grnNo).trim().toLowerCase() === docNo.toLowerCase()
            );
            isChallan = !!sourceDoc;
        }

        if (!sourceDoc) {
            alert(`Document (Invoice/Challan) not found for No: ${docNo}`);
            return;
        }

        // Find Item (1-based index)
        const docItem = sourceDoc.items && sourceDoc.items[itemIdx - 1];

        if (!docItem) {
            alert(`Item #${itemIdx} not found in document ${docNo}.`);
            return;
        }

        // Normalize Bale Details
        const balesRaw = isChallan ? docItem.baleDetails : docItem.bales;
        if (!balesRaw || !Array.isArray(balesRaw)) {
            alert(`No rolls/bales found for item #${itemIdx} in ${docNo}.`);
            return;
        }

        // Robust Bale Lookup: Match by 1-based index OR by baleNo string
        let bale = null;
        const potentialIdx = parseInt(baleIdxStr);
        
        if (!isNaN(potentialIdx) && potentialIdx > 0 && potentialIdx <= balesRaw.length) {
            bale = balesRaw[potentialIdx - 1];
        } else {
            // Match by string (case-insensitive)
            bale = balesRaw.find(b => 
                String(b.baleNo || "").trim().toLowerCase() === baleIdxStr.toLowerCase()
            );
        }

        if (!bale) {
            alert(`Roll/Bale "${baleIdxStr}" not found for item #${itemIdx} in ${docNo}.`);
            return;
        }

        const qty = parseFloat(bale.qty);
        const rollNo = bale.baleNo || `Roll-${baleIdxStr}`;

        // Now find matching Fabric Item ID
        const fabricId = String(docItem.itemId).trim();

        // Check for duplicates
        const isDuplicate = items.some(item =>
            String(item.item_id).trim() === fabricId &&
            String(item.roll_no).trim() === String(rollNo).trim()
        );

        if (isDuplicate) {
            alert(`This roll/bale (${rollNo}) has already been scanned/added.`);
            return;
        }

        const lastRowIdx = items.length - 1;
        const lastRow = items[lastRowIdx];
        let targetIdx = -1;

        if (String(lastRow.item_id).trim() === fabricId && (!lastRow.quantity || parseFloat(lastRow.quantity) === 0) && !lastRow.roll_no) {
            targetIdx = lastRowIdx;
        } else if (!lastRow.item_id) {
            const selectedFabric = allItems.find(f => String(f.id).trim() === fabricId);
            if (!selectedFabric) {
                alert(`Fabric ID ${fabricId} not found in active items list.`);
                return;
            }
            const newItems = [...items];
            newItems[lastRowIdx] = {
                ...lastRow,
                item_id: fabricId,
                item_name: selectedFabric.name,
                unit: selectedFabric.unit || 'Mtrs',
                quantity: qty,
                roll_no: rollNo
            };
            setItems(newItems);
            return;
        } else {
            targetIdx = items.length;
        }

        if (targetIdx !== -1 && targetIdx < items.length) {
            const newItems = [...items];
            newItems[targetIdx] = {
                ...newItems[targetIdx],
                quantity: qty,
                roll_no: rollNo
            };
            setItems(newItems);
        } else {
            const selectedFabric = allItems.find(f => String(f.id).trim() === fabricId);
            if (!selectedFabric) {
                alert(`Fabric ID ${fabricId} not found in active items list.`);
                return;
            }
            setItems(prev => [...prev, {
                item_id: fabricId,
                item_name: selectedFabric.name,
                unit: selectedFabric.unit || 'Mtrs',
                quantity: qty,
                roll_no: rollNo
            }]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.some(i => !i.item_id || !i.quantity)) {
            alert("Please select a fabric and enter quantity for all rows.");
            return;
        }
        if (!formData.styleNo) {
            alert("Please select a Style No.");
            return;
        }

        setSaving(true);
        try {
            let issueId = id;

            if (id) {
                const { error: updateError } = await supabase
                    .from('fabric_issues')
                    .update({
                        style_no: formData.styleNo,
                        buyer_po: formData.buyerPO,
                        remarks: formData.remarks
                    })
                    .eq('id', id);
                if (updateError) throw updateError;

                // Delete old items
                await supabase.from('fabric_issue_items').delete().eq('fabric_issue_id', id);
            } else {
                const { data: issueData, error: issueError } = await supabase
                    .from('fabric_issues')
                    .insert([{
                        issue_no: formData.issue_no,
                        style_no: formData.styleNo,
                        buyer_po: formData.buyerPO,
                        remarks: formData.remarks,
                        status: 'Pending'
                    }])
                    .select()
                    .single();

                if (issueError) throw issueError;
                issueId = issueData.id;
            }

            // 2. Create Issue Items
            const itemsToInsert = items.map(item => ({
                fabric_issue_id: issueId,
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: parseFloat(item.quantity),
                unit: item.unit,
                roll_no: item.roll_no
            }));

            const { error: itemsError } = await supabase
                .from('fabric_issue_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            alert(`Fabric Issue ${id ? 'updated' : 'created'} successfully!`);
            window.location.href = '/cutting/fabric-issue';

        } catch (err) {
            console.error(err);
            alert(`Error creating issue: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-sage-400 italic">Loading form...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/cutting/fabric-issue')} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
                        <ArrowLeft className="text-sage-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit' : 'New'} Fabric Issue</h1>
                        <p className="text-sage-500 text-sm">{id ? 'Update fabric issue details' : 'Issue fabric to Cutting Department'}</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'Saving...' : (id ? 'Update Issue Note' : 'Save Issue Note')}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Issue No</label>
                            <input
                                readOnly
                                value={formData.issue_no}
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-100 rounded-lg text-sm font-mono font-bold text-sage-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Style No</label>
                            <select
                                value={formData.styleNo}
                                onChange={handleStyleChange}
                                className="w-full px-4 py-2 bg-white border border-sage-200 rounded-lg text-sm focus:border-sage-500 focus:ring-1 focus:ring-sage-500 outline-none"
                            >
                                <option value="">Select Style...</option>
                                {(styles || []).map(s => <option key={s.id} value={s.styleNo}>{s.styleNo}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Buyer PO</label>
                            <input
                                readOnly
                                value={formData.buyerPO}
                                placeholder="Auto-filled"
                                className="w-full px-4 py-2 bg-sage-50 border border-sage-100 rounded-lg text-sm font-mono text-sage-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Rem / Ref</label>
                            <input
                                type="text"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                placeholder="Optional"
                                className="w-full px-4 py-2 bg-white border border-sage-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Scan Section */}
                <div className="bg-sage-800 p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Layers size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Scan Barcode</h3>
                            <p className="text-sage-300 text-xs">Scan fabric roll/bale to auto-add</p>
                        </div>
                    </div>
                    <div className="flex-1 max-w-md relative">
                        <input
                            type="text"
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyDown={handleBarcodeScan}
                            placeholder="Click here & Scan Barcode..."
                            className="w-full pl-4 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 focus:ring-0 outline-none transition-all font-mono font-bold"
                            autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect width="10" height="6" x="7" y="9" rx="1" /><path d="M10 12h.01" /><path d="M14 12h.01" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                    <div className="p-4 border-b border-sage-100 flex items-center justify-between bg-sage-50/30">
                        <h3 className="font-bold text-sage-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Layers size={18} className="text-sage-400" /> Fabric List
                        </h3>
                        <button
                            onClick={handleAddItem}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sage-50 text-sage-600 rounded-lg hover:bg-sage-100 transition-all border border-sage-200 text-xs font-bold"
                        >
                            <Plus size={14} /> Add Fabric
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-sage-50/50 text-[10px] font-bold text-sage-400 uppercase tracking-widest border-b border-sage-100">
                                <tr>
                                    <th className="px-6 py-3">Fabric Name</th>
                                    <th className="px-6 py-3 w-32">Roll No (Opt)</th>
                                    <th className="px-6 py-3 w-32">Quantity</th>
                                    <th className="px-6 py-3 w-24 text-center">Unit</th>
                                    <th className="px-6 py-3 w-16 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sage-50/50">
                                {items.map((item, index) => (
                                    <tr key={index} className="hover:bg-sage-50/30 transition-colors">
                                        <td className="px-4 py-2">
                                            <select
                                                required
                                                value={item.item_id}
                                                onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                                                className="w-full px-3 py-2 bg-transparent border border-transparent focus:border-sage-200 focus:bg-white rounded-lg outline-none transition-all"
                                            >
                                                <option value="">Select Fabric...</option>
                                                {fabricItems.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={item.roll_no}
                                                onChange={(e) => handleItemChange(index, 'roll_no', e.target.value)}
                                                placeholder="Roll #"
                                                className="w-full px-3 py-2 bg-transparent border border-transparent focus:border-sage-200 focus:bg-white rounded-lg outline-none transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2 bg-transparent border border-transparent focus:border-sage-200 focus:bg-white rounded-lg outline-none font-bold text-sage-800 transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="inline-block px-2 py-1 bg-sage-50 text-sage-600 rounded text-[10px] font-black uppercase tracking-tighter">
                                                {item.unit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="p-2 text-sage-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FabricIssueForm;
