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
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-sage-900">Dashboard</h1>
                    <p className="text-sage-500 mt-1">System overview and key performance indicators</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 md:mt-0">
                    <Link
                        to="/tna"
                        className="w-full sm:w-auto bg-sage-800 text-white px-5 py-2.5 rounded-xl hover:bg-sage-900 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all border border-sage-700/50"
                    >
                        <Clock size={18} />
                        <span className="font-bold text-sm tracking-wide">TNA</span>
                    </Link>
                    <Link
                        to="/hr"
                        className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all border border-blue-500/50"
                    >
                        <Users size={18} />
                        <span className="font-bold text-sm tracking-wide">HR Module</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {mainStats.map((card, i) => (
                    <Link
                        key={i}
                        to={card.path}
                        className="group bg-white p-6 rounded-xl border border-sage-100 hover:border-sage-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="relative z-10 text-center">
                            <h2 className="text-[10px] font-bold text-sage-400 uppercase tracking-widest group-hover:text-sage-600 transition-colors">{card.label}</h2>
                            <p className="text-3xl font-extrabold text-sage-900 mt-2">{card.value}</p>
                            <p className="text-[10px] font-bold text-sage-500 mt-1 uppercase tracking-tighter opacity-70">{card.sub}</p>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-sage-50 rounded-full group-hover:bg-sage-100 transition-colors" />
                    </Link>
                ))}
            </div>

            <div className="mt-12 bg-white/50 p-8 rounded-3xl border border-sage-100/50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-1.5 h-8 bg-sage-500 rounded-full shadow-sm shadow-sage-500/50" />
                    <h2 className="text-xl font-bold text-sage-800">Inventory Overview</h2>
                    <span className="text-xs font-bold text-sage-400 uppercase tracking-widest bg-sage-50 px-3 py-1 rounded-full border border-sage-100 italic">Live Data</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryStats.map((cat, i) => (
                        <Link
                            key={i}
                            to="/inventory"
                            className="group relative overflow-hidden bg-white rounded-2xl border border-sage-100 p-6 flex items-center gap-6 hover:border-sage-500/20 hover:shadow-2xl hover:shadow-sage-900/5 transition-all"
                        >
                            <div className={`p-4 rounded-2xl text-white ${cat.color} shadow-lg transition-all group-hover:rotate-6 flex-shrink-0`}>
                                <cat.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center overflow-hidden">
                                <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-wider truncate">{cat.name}</h3>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-2xl font-black text-sage-900 truncate">{cat.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                    <span className="text-[10px] font-bold text-sage-400 uppercase flex-shrink-0">{cat.unit}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>

            {/* Item-wise Details Section */}
            <div className="mt-8 bg-white rounded-2xl border border-sage-100 overflow-hidden shadow-sm">
                <div className="bg-sage-50 px-6 py-4 border-b border-sage-100 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-sage-800 uppercase tracking-wider">Item-wise Stock Details</h3>
                    <Link to="/inventory" className="text-xs font-bold text-sage-500 hover:text-sage-800 flex items-center gap-1 transition-colors">
                        View All <ArrowUpRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b border-sage-100 shadow-sm z-10">
                            <tr className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Item Name / Code</th>
                                <th className="px-6 py-4 text-center">Category</th>
                                <th className="px-6 py-4 text-right">Current Stock</th>
                                <th className="px-6 py-4 text-center">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-50">
                            {itemDetails.length > 0 ? (
                                itemDetails.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-sage-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-sage-900 group-hover:text-sage-700 transition-colors">{item.name}</div>
                                            {item.fabricCode && (
                                                <div className="text-[10px] font-mono text-sage-400 mt-0.5">#{item.fabricCode}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.category === 'Fabric' ? 'bg-blue-50 text-blue-600' :
                                                item.category === 'Accessories' ? 'bg-purple-50 text-purple-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-sage-900">
                                            {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center text-[10px] font-bold text-sage-400 uppercase tracking-wider">
                                            {item.unit}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-sage-400 font-medium">
                                        No active stock data available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
