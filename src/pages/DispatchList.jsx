import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Activity, Plus, Search, Eye, Edit, Trash2, Printer, X, Truck } from 'lucide-react';

const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
    return str.trim() || 'Zero';
};

const DispatchList = () => {
    const navigate = useNavigate();
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewItem, setViewItem] = useState(null);

    const fetchDispatches = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('dispatch_registers')
            .select(`
                *,
                buyers(name, address),
                production_orders(order_no, styles(styleNo, color)),
                dispatch_items(size, quantity)
            `)
            .order('created_at', { ascending: false });

        setDispatches(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchDispatches();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this dispatch entry?')) return;
        const { error } = await supabase.from('dispatch_registers').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchDispatches();
    };

    const handlePrintInvoice = (data) => {
        const printWindow = window.open('', '', 'width=800,height=900');
        const items = data.dispatch_items || [];
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

        const po = Array.isArray(data.production_orders) ? data.production_orders[0] : data.production_orders;
        const style = Array.isArray(po?.styles) ? po.styles[0] : po?.styles;

        const rate = data.rate || 0;
        const gstRate = data.gst_rate || 0;
        const baseAmount = totalQty * rate;
        const gstAmount = baseAmount * (gstRate / 100);
        const netAmount = baseAmount + gstAmount;
        const grandTotal = Math.round(netAmount);
        const roundOff = (grandTotal - netAmount).toFixed(2);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Tax Invoice - ${data.invoice_no}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-info h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; }
                        .company-info .address { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.4; font-weight: 500;}
                        .company-info p { margin: 8px 0 0 0; font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px; }
                        .receipt-details { text-align: right; }
                        .receipt-details h2 { margin: 0; font-size: 18px; color: #888; }
                        .receipt-details p { margin: 5px 0; font-weight: bold; }
                        
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        .info-box { background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee; break-inside: avoid; }
                        .info-label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                        .info-value { font-size: 14px; font-weight: bold; }
                        .info-address { font-size: 12px; margin-top: 5px; color: #555; white-space: pre-wrap; line-height: 1.4; }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #333; color: #fff; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                        .total-row { background: #f0f0f0; font-weight: bold; font-size: 16px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-info">
                            <h1>MADAN CREATION</h1>
                            <div class="address">
                                Jaipur, Rajasthan<br/>
                            </div>
                            <p>Tax Invoice / Delivery Note</p>
                        </div>
                        <div class="receipt-details">
                            <h2>${data.invoice_no}</h2>
                            <p>${new Date(data.dispatch_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-box">
                            <div class="info-label">Bill To / Deliver To:</div>
                            <div class="info-value text-xl">${data.buyers?.name}</div>
                            <div class="info-address">${data.buyers?.address || 'Address not provided'}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Order Details:</div>
                            <div class="info-value">PO No: ${po?.order_no || 'N/A'}</div>
                            <div class="info-value">Style: ${style?.styleNo || 'N/A'}</div>
                            <div class="info-value" style="margin-top:5px; padding-top:5px; border-top:1px solid #ddd;">Vehicle: ${data.vehicle_no || 'N/A'}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Size</th>
                                <th>Color</th>
                                <th style="text-align: center;">Qty (Pcs)</th>
                                <th style="text-align: right;">Rate (₹)</th>
                                <th style="text-align: right;">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.size}</td>
                                    <td>${style?.color || 'N/A'}</td>
                                    <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                                    <td style="text-align: right;">${rate.toFixed(2)}</td>
                                    <td style="text-align: right; font-weight: bold;">${(item.quantity * rate).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 10px;">Total Shipped / Basic Amount</td>
                                <td style="text-align: center; border-top: 2px solid #333;">${totalQty} PCS</td>
                                <td></td>
                                <td style="text-align: right; border-top: 2px solid #333;">₹${baseAmount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colspan="4" style="text-align: right; font-size: 11px; text-transform: uppercase;">GST (${gstRate}%)</td>
                                <td style="text-align: right; font-weight: bold; font-size: 13px;">₹${gstAmount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colspan="4" style="text-align: right; font-size: 11px; text-transform: uppercase;">Round Off</td>
                                <td style="text-align: right; font-weight: bold; font-size: 13px;">₹${roundOff}</td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="4" style="text-align: right; font-size: 14px; text-transform: uppercase; font-weight: 900; background: #333; color: white;">Grand Total</td>
                                <td style="text-align: right; font-weight: 900; font-size: 16px; background: #333; color: white;">₹${grandTotal.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                     <div style="margin-top: 30px; font-size: 12px; color: #555; background: #f9f9f9; padding: 15px; border-radius: 8px;">
                        <strong>Amount in Words:</strong> Rupees ${numberToWords(grandTotal)} Only.
                     </div>

                    ${data.remarks ? `
                        <div style="margin-top: 20px;">
                            <div class="info-label">Remarks / Special Instructions</div>
                            <div style="font-style: italic; color: #666; font-size: 13px;">${data.remarks}</div>
                        </div>
                    ` : ''}

                    <div style="margin-top: 80px; display: flex; justify-content: space-between;">
                        <div style="width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 10px; font-weight: bold;">Authorized Signatory<br/><span style="color:#666">For Madan Creation</span></div>
                        <div style="width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 10px; font-weight: bold;">Receiver's Signature / Seal</div>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const filteredDispatches = dispatches.filter(d => {
        const searchStr = `${d.invoice_no} ${d.buyers?.name} ${d.production_orders?.styles?.styleNo} ${d.production_orders?.order_no}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    if (loading) return <div className="p-8 text-center text-sage-500">Loading dispatch records...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                        <Activity className="text-indigo-600" /> Dispatch Register
                    </h1>
                    <p className="text-sage-500 text-sm">Manage outward shipments to buyers.</p>
                </div>
                <Link to="/dispatch/new" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Plus size={20} /> New Dispatch
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 flex items-center justify-between bg-indigo-50/30">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search invoice, buyer, style..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">{filteredDispatches.length} Entries</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-sage-50/50 text-sage-500 text-[10px] font-black uppercase tracking-widest border-b border-sage-200">
                                <th className="px-6 py-4">Invoice / Date</th>
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Style & Order</th>
                                <th className="px-6 py-4 text-center">Qty Dispatched</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {filteredDispatches.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-sage-400 italic">No dispatch records found.</td>
                                </tr>
                            ) : (
                                filteredDispatches.map(dispatch => {
                                    const totalQty = dispatch.dispatch_items?.reduce((sum, itm) => sum + itm.quantity, 0) || 0;
                                    return (
                                        <tr key={dispatch.id} className="hover:bg-indigo-50/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-indigo-900 text-sm">{dispatch.invoice_no}</div>
                                                <div className="text-[10px] text-sage-500">{new Date(dispatch.dispatch_date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-sage-800 text-sm">{dispatch.buyers?.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-sage-800">{dispatch.production_orders?.styles?.styleNo}</div>
                                                <div className="text-[10px] text-indigo-500 font-bold">{dispatch.production_orders?.order_no}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-black text-xs">
                                                    {totalQty} Pcs
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setViewItem(dispatch)} className="p-1.5 text-sage-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="View"><Eye size={16} /></button>
                                                    <button onClick={() => handlePrintInvoice(dispatch)} className="p-1.5 text-sage-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Print"><Printer size={16} /></button>
                                                    <Link to={`/dispatch/edit/${dispatch.id}`} className="p-1.5 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Edit"><Edit size={16} /></Link>
                                                    <button onClick={() => handleDelete(dispatch.id)} className="p-1.5 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            {viewItem && (
                <div className="fixed inset-0 bg-sage-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-5 border-b border-sage-100 flex justify-between items-center bg-indigo-50">
                            <div>
                                <h3 className="font-black text-indigo-900 uppercase tracking-[0.2em] text-[10px]">Dispatch Details</h3>
                                <p className="font-bold text-indigo-500 text-[9px] uppercase mt-0.5">{viewItem.invoice_no}</p>
                            </div>
                            <button onClick={() => setViewItem(null)} className="p-2 hover:bg-indigo-200 rounded-xl text-indigo-500 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6 bg-sage-50/50 p-6 rounded-2xl border border-sage-100">
                                <div>
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Buyer</label>
                                    <div className="font-black text-sage-800 text-base">{viewItem.buyers?.name}</div>
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Date</label>
                                    <div className="font-black text-sage-800">{new Date(viewItem.dispatch_date).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Style No</label>
                                    <div className="font-black text-sage-800">{viewItem.production_orders?.styles?.styleNo}</div>
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">PO Order</label>
                                    <div className="font-black text-indigo-600">{viewItem.production_orders?.order_no}</div>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-sage-200">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Vehicle No</label>
                                    <div className="font-black text-sage-800">{viewItem.vehicle_no || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Size Breakdown</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {viewItem.dispatch_items?.map((itm, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl border border-sage-200 shadow-sm text-center">
                                            <div className="text-[10px] text-sage-400 font-black mb-1">{itm.size}</div>
                                            <div className="text-lg font-black text-indigo-600">{itm.quantity}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Total Dispatched</span>
                                    <span className="text-2xl font-black text-indigo-900">
                                        {viewItem.dispatch_items?.reduce((sum, i) => sum + i.quantity, 0)} PCS
                                    </span>
                                </div>
                            </div>

                            {viewItem.remarks && (
                                <div className="bg-sage-50 p-4 rounded-xl border border-sage-100">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest block mb-1">Remarks</label>
                                    <p className="italic text-sage-600 text-sm font-medium">{viewItem.remarks}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DispatchList;
