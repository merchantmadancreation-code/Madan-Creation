import React, { useMemo } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Clock, User, Package, Hash, Calendar } from 'lucide-react';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { format } from 'date-fns';

const TransactionHistoryModal = ({ isOpen, onClose, item }) => {
    const { challans, inwardInvoices, outwardChallans, materialIssues, fabricIssues, purchaseOrders, suppliers, invoices } = usePurchaseOrder();

    const transactions = useMemo(() => {
        if (!item) return [];

        const allTrans = [];

        // 1. Opening Balance
        if (parseFloat(item.openingStock) > 0) {
            allTrans.push({
                date: item.created_at || new Date(0).toISOString(),
                type: 'Opening',
                id: 'OPEN',
                party: 'Initial Stock',
                in: parseFloat(item.openingStock),
                out: 0,
                department: 'Store'
            });
        }

        // 2. Inwards from Challans
        challans.forEach(c => {
            const entry = c.items?.find(i => String(i.itemId) === String(item.id));
            if (entry) {
                allTrans.push({
                    date: c.date || c.created_at,
                    type: 'GRN (Challan)',
                    id: c.challanNo || c.grnNo || 'N/A',
                    party: suppliers.find(s => s.id === c.supplierId)?.name || 'Supplier',
                    in: parseFloat(entry.quantity || 0),
                    out: 0,
                    department: 'Store Inward'
                });
            }
        });

        // 3. Inwards from Direct Invoices
        invoices.forEach(inv => {
            const hasChallan = inv.challanIds && inv.challanIds.length > 0;
            const challanNoEmpty = !inv.challanNo || inv.challanNo === 'None' || inv.challanNo === 'N/A';
            if (!hasChallan || challanNoEmpty) {
                const entry = inv.items?.find(i => String(i.itemId) === String(item.id));
                if (entry) {
                    allTrans.push({
                        date: inv.date || inv.created_at,
                        type: 'GRN (Direct)',
                        id: inv.invoiceNo || inv.grnNo || 'N/A',
                        party: suppliers.find(s => s.id === inv.supplierId)?.name || 'Supplier',
                        in: parseFloat(entry.qty || 0),
                        out: 0,
                        department: 'Store Inward'
                    });
                }
            }
        });

        // 4. Outwards from Outward Challans
        outwardChallans.forEach(oc => {
            const entry = oc.items?.find(i => String(i.itemId) === String(item.id));
            if (entry) {
                let qty = 0;
                if (oc.purpose === 'Fabric Return') {
                    qty = parseFloat(entry.quantity) || 0;
                } else {
                    const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];
                    qty = SIZES.reduce((s, size) => s + (parseInt(entry[size]) || 0), 0);
                }

                allTrans.push({
                    date: oc.date || oc.created_at,
                    type: oc.purpose || 'Outward Challan',
                    id: oc.outChallanNo || oc.challanNo || 'N/A',
                    party: suppliers.find(s => s.id === oc.supplierId)?.name || 'Recipient',
                    in: 0,
                    out: qty,
                    department: 'Store Outward'
                });
            }
        });

        // 5. Outwards from Material Issues
        materialIssues.forEach(iss => {
            const entries = iss.material_issue_items?.filter(i => 
                String(i.item_id) === String(item.id) || i.item_name?.trim() === item.name?.trim()
            ) || [];
            
            entries.forEach(entry => {
                allTrans.push({
                    date: iss.issue_date || iss.created_at,
                    type: 'Material Issue',
                    id: iss.issue_no || 'N/A',
                    party: iss.worker?.name || 'Worker',
                    in: 0,
                    out: parseFloat(entry.qty || 0),
                    department: 'Production'
                });
            });
        });

        // 6. Outwards from Fabric Issues
        fabricIssues.forEach(iss => {
            const entries = iss.fabric_issue_items?.filter(i => 
                String(i.item_id) === String(item.id) || i.item_name?.trim() === item.name?.trim()
            ) || [];
            
            entries.forEach(entry => {
                allTrans.push({
                    date: iss.created_at,
                    type: 'Fabric Issue',
                    id: iss.issue_no || 'N/A',
                    party: `Style: ${iss.style_no || 'N/A'}`,
                    in: 0,
                    out: parseFloat(entry.quantity || 0),
                    department: 'Cutting'
                });
            });
        });

        // Sort by date then type
        allTrans.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate Running Balance
        let balance = 0;
        return allTrans.map(t => {
            balance += (t.in - t.out);
            return { ...t, balance };
        }).reverse(); // Latest first for display

    }, [item, challans, invoices, outwardChallans, materialIssues, fabricIssues, suppliers]);

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sage-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 bg-sage-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold leading-tight">{item.name}</h2>
                            <p className="text-sage-300 text-xs font-medium uppercase tracking-widest">{item.fabricCode || 'No Code'} • Transaction History</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Sub Header / Stats */}
                <div className="grid grid-cols-4 gap-px bg-sage-100 border-b border-sage-100">
                    <div className="bg-white p-4 text-center">
                        <p className="text-[10px] text-sage-400 font-bold uppercase tracking-wider mb-1">Opening Stock</p>
                        <p className="text-lg font-black text-sage-800">{parseFloat(item.openingStock).toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-4 text-center">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Total Inward</p>
                        <p className="text-lg font-black text-indigo-600">+{item.inward?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="bg-white p-4 text-center">
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">Total Outward</p>
                        <p className="text-lg font-black text-rose-500">-{item.outward?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="bg-white p-4 text-center bg-sage-50/50">
                        <p className="text-[10px] text-sage-500 font-bold uppercase tracking-wider mb-1">Current Balance</p>
                        <p className="text-lg font-black text-sage-900">{item.current?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto p-6 bg-sage-50/20">
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-white text-[10px] font-black text-sage-400 uppercase tracking-widest">
                                <th className="px-4 py-3 border-b border-sage-100 rounded-tl-xl">Date</th>
                                <th className="px-4 py-3 border-b border-sage-100">Type / ID</th>
                                <th className="px-4 py-3 border-b border-sage-100">Party / Dept</th>
                                <th className="px-4 py-3 border-b border-sage-100 text-right">In (+)</th>
                                <th className="px-4 py-3 border-b border-sage-100 text-right">Out (-)</th>
                                <th className="px-4 py-3 border-b border-sage-100 text-right rounded-tr-xl">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-50">
                            {transactions.length > 0 ? (
                                transactions.map((t, idx) => (
                                    <tr key={idx} className="bg-white hover:bg-sage-50/50 transition-colors group">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-sage-300" />
                                                <span className="text-sage-600 font-medium">
                                                    {format(new Date(t.date), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-sage-800 text-xs">{t.type}</div>
                                            <div className="text-[10px] text-sage-400 font-mono mt-0.5">{t.id}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sage-700 font-medium">{t.party}</div>
                                            <div className="text-[10px] px-1.5 py-0.5 bg-sage-100 text-sage-500 rounded inline-block mt-1 font-bold uppercase tracking-tighter italic">
                                                {t.department}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {t.in > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-indigo-600 font-black">
                                                    <ArrowUpRight size={14} /> {t.in.toFixed(2)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {t.out > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-rose-500 font-black">
                                                    <ArrowDownRight size={14} /> {t.out.toFixed(2)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-right bg-sage-50/30 font-black text-sage-900">
                                            {t.balance.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-sage-400 italic">
                                        No transactions found for this item.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 bg-sage-50 border-t border-sage-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-sage-800 text-white rounded-xl font-bold hover:bg-sage-900 transition-all shadow-md active:scale-95 text-sm"
                    >
                        Close History
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionHistoryModal;
