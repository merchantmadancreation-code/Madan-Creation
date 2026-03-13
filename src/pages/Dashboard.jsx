import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Package, ShoppingBag, Layers, Box, Tag, Truck, ArrowUpRight, Clock, Users } from 'lucide-react';

const Dashboard = () => {
    const { suppliers, items, purchaseOrders, challans, outwardChallans, invoices, materialIssues } = usePurchaseOrder();

    // Calculate Category-wise Stock Levels and Item-wise Details
    const inventoryData = useMemo(() => {
        const stats = {};
        const itemDetails = [];

        // 1. Process all items to get current stock levels
        items.forEach(item => {
            const category = item.materialType || 'Other';
            const unit = item.unit || (category === 'Fabric' ? 'Mtrs' : 'Pcs');

            if (!stats[category]) {
                stats[category] = { total: 0, unit: unit };
            }

            // Calculation Logic (matches InventoryList.jsx)
            const opening = parseFloat(item.openingStock || 0);

            // 1. Inward from Challans
            const inwardFromChallans = challans.reduce((sum, c) => {
                const entry = c.items?.find(i => i.itemId === item.id);
                return sum + (entry ? parseFloat(entry.quantity || 0) : 0);
            }, 0);

            // 2. Inward from Direct Invoices (No Challan linked)
            const inwardFromDirectInvoices = invoices.reduce((sum, inv) => {
                // Check if invoice is linked to any challan
                const hasChallan = inv.challanIds && inv.challanIds.length > 0;
                // Some invoices might have 'None' or 'N/A' as challanNo string from legacy or manual entry
                const challanNoEmpty = !inv.challanNo || inv.challanNo === 'None' || inv.challanNo === 'N/A';

                // If NOT linked to a challan, count it as fresh stock
                if (!hasChallan || challanNoEmpty) {
                    const itemEntry = inv.items?.find(i => i.itemId === item.id);
                    return sum + (itemEntry ? parseFloat(itemEntry.qty || 0) : 0);
                }
                return sum;
            }, 0);

            const inward = inwardFromChallans + inwardFromDirectInvoices;

            // 3. Outward from Challans
            const outwardFromChallans = outwardChallans.reduce((sum, c) => {
                const entry = c.items?.find(i => i.itemId === item.id);
                if (!entry) return sum;

                if (c.purpose === 'Fabric Return') {
                    return sum + (parseFloat(entry.quantity) || 0);
                } else {
                    const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];
                    const rowTotal = SIZES.reduce((s, size) => s + (parseInt(entry[size]) || 0), 0);
                    return sum + rowTotal;
                }
            }, 0);

            // 4. Outward from Material Issues
            const outwardFromMaterialIssues = materialIssues ? materialIssues.reduce((sum, issue) => {
                const itemEntries = issue.material_issue_items?.filter(i => i.item_name === item.name) || [];
                const issueQty = itemEntries.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);
                return sum + issueQty;
            }, 0) : 0;

            const outward = outwardFromChallans + outwardFromMaterialIssues;

            const currentStock = opening + inward - outward;
            stats[category].total += currentStock;

            itemDetails.push({
                ...item,
                category,
                unit,
                currentStock
            });
        });

        const categories = Object.entries(stats).map(([name, data]) => ({
            name,
            total: data.total,
            unit: data.unit,
            icon: name === 'Fabric' ? Layers :
                name === 'Accessories' ? ShoppingBag :
                    name === 'Trims' ? Tag :
                        name === 'Packaging' ? Box :
                            name === 'Finished Goods' ? Truck : Package,
            color: name === 'Fabric' ? 'bg-blue-500' :
                name === 'Accessories' ? 'bg-purple-500' :
                    name === 'Trims' ? 'bg-amber-500' :
                        name === 'Packaging' ? 'bg-emerald-500' :
                            name === 'Finished Goods' ? 'bg-rose-500' : 'bg-slate-500'
        })).filter(c => c.total !== 0).sort((a, b) => b.total - a.total);

        return { categories, itemDetails: itemDetails.filter(i => i.currentStock > 0).sort((a, b) => b.currentStock - a.currentStock) };
    }, [items, challans, outwardChallans, invoices, materialIssues]);

    const { categories: categoryStats, itemDetails } = inventoryData;

    const mainStats = [
        { label: 'Total Suppliers', value: suppliers.length, sub: 'Vendors', path: '/suppliers' },
        { label: 'Total Items', value: items.length, sub: 'Inventory Master', path: '/items' },
        { label: 'Purchase Orders', value: purchaseOrders.length, sub: 'Active POs', path: '/purchase-orders' },
        { label: 'Inward Challans', value: challans.length, sub: 'Received', path: '/challans' },
        { label: 'Outward Challans', value: outwardChallans.length, sub: 'Dispatched', path: '/outward-challans' },
        { label: 'Total GRNs', value: invoices.length, sub: 'Billing', path: '/invoices' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div className="pt-2">
                    <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight">Dashboard</h1>
                    <p className="text-teal-600 font-semibold mt-1">System overview and key performance indicators</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/tna"
                        className="bg-[#00847d] text-white px-6 py-3 rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg shadow-teal-900/10 transition-all border border-white/10"
                    >
                        <Clock size={20} className="fill-white/20" />
                        <span className="font-bold text-sm uppercase tracking-wider">TNA</span>
                    </Link>
                    <Link
                        to="/hr"
                        className="bg-[#1d4ed8] text-white px-6 py-3 rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg shadow-blue-900/10 transition-all border border-white/10"
                    >
                        <Users size={20} className="fill-white/20" />
                        <span className="font-bold text-sm uppercase tracking-wider">HR Module</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                {mainStats.map((card, i) => (
                    <Link
                        key={i}
                        to={card.path}
                        className="group bg-white p-5 rounded-xl border border-white/60 hover:border-teal-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center text-center h-32"
                    >
                        <div className="relative z-10">
                            <h2 className="text-[10px] font-bold text-teal-600/60 uppercase tracking-widest leading-none mb-3">{card.label}</h2>
                            <p className="text-4xl font-black text-slate-900 leading-none">{card.value}</p>
                            <p className="text-[10px] font-bold text-teal-700 mt-2 uppercase tracking-tighter">{card.sub}</p>
                        </div>
                        {/* Accent Corner */}
                        <div className="absolute bottom-0 right-0 w-10 h-10 bg-gray-50 rounded-tl-3xl group-hover:bg-white transition-colors" />
                    </Link>
                ))}
            </div>

            <div className="mt-12 bg-white/20 backdrop-blur-xl p-10 rounded-[40px] border border-white/40 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[100px] pointer-events-none" />

                <div className="flex items-center gap-4 mb-10 relative z-10">
                    <div className="w-1.5 h-10 bg-teal-500 rounded-full shadow-lg shadow-teal-500/40" />
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Overview</h2>
                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50 px-4 py-1.5 rounded-full border border-teal-100 shadow-sm">Live Data</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {categoryStats.slice(0, 2).map((cat, i) => (
                        <Link
                            key={i}
                            to="/inventory"
                            className="group relative bg-white/80 p-8 rounded-3xl border border-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-8"
                        >
                            <div className={`p-6 rounded-[2rem] text-white ${cat.color} shadow-2xl transition-all group-hover:scale-110 flex-shrink-0 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                <cat.icon className="w-10 h-10 relative z-10" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1 opacity-70">{cat.name}</h3>
                                <div className="flex items-baseline gap-3">
                                    <p className="text-4xl font-black text-slate-900 tracking-tight">{cat.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</p>
                                    <span className="text-xs font-black text-teal-600 uppercase tracking-widest">{cat.unit}</span>
                                </div>
                            </div>
                            <ArrowUpRight className="text-teal-400 group-hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100" size={24} />
                        </Link>
                    ))}
                </div>
            </div>

            {/* Item-wise Details Section */}
            <div className="mt-16 relative z-10 pb-12">
                <div className="px-4 py-8 flex justify-between items-end border-b border-teal-500/10 mb-8">
                    <div>
                        <h3 className="text-sm font-black text-teal-600 uppercase tracking-[0.3em]">Item-wise Stock Details</h3>
                    </div>
                    <Link to="/inventory" className="text-xs font-black text-teal-600 hover:text-teal-800 flex items-center gap-2 group transition-all bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 shadow-sm">
                        View All <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                </div>
                <div className="bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto max-h-[600px] no-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-teal-500/10 z-10">
                                <tr className="text-[10px] font-black text-teal-600/50 uppercase tracking-[0.2em]">
                                    <th className="px-12 py-8">Item Name / Code</th>
                                    <th className="px-12 py-8 text-center">Category</th>
                                    <th className="px-12 py-8 text-right">Current Stock</th>
                                    <th className="px-12 py-8 text-center uppercase tracking-[0.2em]">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-500/5">
                                {itemDetails.length > 0 ? (
                                    itemDetails.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-teal-500/5 transition-colors group">
                                            <td className="px-12 py-6">
                                                <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors uppercase text-xs tracking-wider">{item.name}</div>
                                                {item.fabricCode && (
                                                    <div className="text-[9px] font-black text-teal-600/40 mt-1.5 flex items-center gap-1.5">
                                                        <span className="bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">SERIAL #{item.fabricCode}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-12 py-6 text-center">
                                                <span className={`text-[10px] font-black px-5 py-2 rounded-full border shadow-sm ${item.category === 'Fabric' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    item.category === 'Accessories' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        'bg-gray-50 text-gray-600 border-gray-100'
                                                    }`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-12 py-6 text-right font-black text-slate-950 text-xl tracking-tighter">
                                                {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                <span className="text-[10px] ml-1.5 opacity-30 font-bold uppercase tracking-widest">{item.unit}</span>
                                            </td>
                                            <td className="px-12 py-6 text-center text-[10px] font-black text-teal-600/40 uppercase tracking-widest">
                                                {item.unit}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-12 py-24 text-center text-teal-600/30 font-black uppercase tracking-[0.3em]">
                                            No active stock data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
