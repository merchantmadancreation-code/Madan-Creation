import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shirt, Plus, Search, Eye, Edit, Trash2, Printer, X, Package, Calendar, User, ShoppingBag, Tag } from 'lucide-react';
import BarcodeModal from '../components/BarcodeModal';

const FinishingReceiveList = () => {
    const navigate = useNavigate();
    const [receives, setReceives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewItem, setViewItem] = useState(null);
    const [printBarcodes, setPrintBarcodes] = useState(null);

    const fetchReceives = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('finishing_receives')
            .select(`
                *,
                workers(name),
                production_orders(order_no, styles(styleNo, color)),
                finishing_receive_items(size, quantity)
            `)
            .order('created_at', { ascending: false });

        setReceives(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchReceives();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this receiving entry?')) return;
        const { error } = await supabase.from('finishing_receives').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchReceives();
    };

    const handlePrintReceipt = (data) => {
        const printWindow = window.open('', '', 'width=800,height=900');
        const items = data.finishing_receive_items || [];
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

        const po = Array.isArray(data.production_orders) ? data.production_orders[0] : data.production_orders;
        const style = Array.isArray(po?.styles) ? po.styles[0] : po?.styles;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Finishing Receipt - ${data.receipt_no}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-info h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; }
                        .company-info p { margin: 5px 0; font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px; }
                        .receipt-details { text-align: right; }
                        .receipt-details h2 { margin: 0; font-size: 18px; color: #888; }
                        .receipt-details p { margin: 5px 0; font-weight: bold; }
                        
                        .info-box { background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee; }
                        .info-label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                        .info-value { font-size: 14px; font-weight: bold; }

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
                            <p>Finishing Receipt</p>
                        </div>
                        <div class="receipt-details">
                            <h2>${data.receipt_no}</h2>
                            <p>${new Date(data.receive_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div class="info-box">
                            <div class="info-label">Finishing Department / Worker</div>
                            <div class="info-value">${data.workers?.name}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Order / Style No</div>
                            <div class="info-value">${po?.order_no} / ${style?.styleNo}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Size</th>
                                <th>Color</th>
                                <th style="text-align: right;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.size}</td>
                                    <td>${style?.color || 'N/A'}</td>
                                    <td style="text-align: right; font-weight: bold;">${item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 10px;">Total Pieces Received</td>
                                <td style="text-align: right; border-top: 2px solid #333;">${totalQty} PCS</td>
                            </tr>
                        </tfoot>
                    </table>

                    ${data.remarks ? `
                        <div style="margin-top: 30px;">
                            <div class="info-label">Remarks</div>
                            <div style="font-style: italic; color: #666; font-size: 13px;">${data.remarks}</div>
                        </div>
                    ` : ''}

                    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                        <div style="width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 10px; font-weight: bold;">Receiver Signature</div>
                        <div style="width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 10px; font-weight: bold;">Finishing Signature</div>
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

    const filteredReceives = receives.filter(r => {
        const searchStr = `${r.receipt_no} ${r.workers?.name} ${r.production_orders?.styles?.styleNo} ${r.production_orders?.order_no}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    if (loading) return <div className="p-8 text-center text-sage-500">Loading receive logs...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                        <Shirt className="text-sage-600" /> Finishing & Ironing Receipts
                    </h1>
                    <p className="text-sage-500 text-sm">Log pieces moving from stitching to finishing.</p>
                </div>
                <Link to="/finishing/receive/new" className="bg-sage-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-sage-900 transition-colors flex items-center justify-center gap-2">
                    <Plus size={20} /> New Receipt
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                <div className="p-4 border-b border-sage-100 flex items-center justify-between bg-sage-50/50">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search receipts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-sage-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 outline-none"
                        />
                    </div>
                    <span className="text-xs font-bold text-sage-500 bg-sage-100 px-3 py-1 rounded-full">{filteredReceives.length} Receipts</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-sage-50/50 text-sage-500 text-[10px] font-black uppercase tracking-widest">
                                <th className="px-6 py-4">Receipt / Date</th>
                                <th className="px-6 py-4">Worker/Dept</th>
                                <th className="px-6 py-4">Style & Order</th>
                                <th className="px-6 py-4 text-center">Qty Received</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {filteredReceives.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-sage-400 italic">No receipts found.</td>
                                </tr>
                            ) : (
                                filteredReceives.map(receive => {
                                    const totalQty = receive.finishing_receive_items?.reduce((sum, itm) => sum + itm.quantity, 0) || 0;
                                    return (
                                        <tr key={receive.id} className="hover:bg-sage-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sage-800 text-sm">{receive.receipt_no}</div>
                                                <div className="text-[10px] text-sage-500">{new Date(receive.receive_date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-sage-700 text-sm italic">{receive.workers?.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-sage-800">{receive.production_orders?.styles?.styleNo}</div>
                                                <div className="text-[10px] text-blue-500 font-bold">{receive.production_orders?.order_no}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black text-xs">
                                                    {totalQty} Pcs
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setViewItem(receive)} className="p-1.5 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye size={16} /></button>
                                                    <button onClick={() => handlePrintReceipt(receive)} className="p-1.5 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Print"><Printer size={16} /></button>
                                                    <Link to={`/finishing/receive/edit/${receive.id}`} className="p-1.5 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Edit"><Edit size={16} /></Link>
                                                    <button onClick={() => handleDelete(receive.id)} className="p-1.5 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
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
                        <div className="p-5 border-b border-sage-100 flex justify-between items-center bg-sage-50/50">
                            <div>
                                <h3 className="font-black text-sage-800 uppercase tracking-[0.2em] text-[10px]">Finishing Receipt Details</h3>
                                <p className="font-bold text-sage-400 text-[9px] uppercase mt-0.5">{viewItem.receipt_no}</p>
                            </div>
                            <button onClick={() => setViewItem(null)} className="p-2 hover:bg-sage-200 rounded-xl text-sage-500 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6 bg-sage-50/50 p-6 rounded-2xl border border-sage-100">
                                <div>
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Worker/Dept</label>
                                    <div className="font-black text-sage-800 text-base">{viewItem.workers?.name}</div>
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Date</label>
                                    <div className="font-black text-sage-800">{new Date(viewItem.receive_date).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Style No</label>
                                    <div className="font-black text-sage-800">{viewItem.production_orders?.styles?.styleNo}</div>
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] text-sage-400 font-black uppercase tracking-widest">Order</label>
                                    <div className="font-black text-blue-600">{viewItem.production_orders?.order_no}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-sage-400 uppercase tracking-widest">Size Breakdown</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {viewItem.finishing_receive_items?.map((itm, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl border border-sage-200 shadow-sm text-center">
                                            <div className="text-[10px] text-sage-400 font-black mb-1">{itm.size}</div>
                                            <div className="text-lg font-black text-blue-600">{itm.quantity}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Received</span>
                                    <span className="text-2xl font-black text-emerald-800">
                                        {viewItem.finishing_receive_items?.reduce((sum, i) => sum + i.quantity, 0)} PCS
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
                        <div className="p-4 bg-sage-50 border-t border-sage-100 flex gap-3">
                            <button onClick={() => setViewItem(null)} className="flex-1 py-3 bg-white border border-sage-200 text-sage-700 rounded-xl font-bold hover:bg-white/50 transition-all text-sm">Close</button>
                            <button onClick={() => setPrintBarcodes(viewItem)} className="flex-1 py-3 bg-white border border-sage-200 text-sage-800 rounded-xl font-bold hover:bg-sage-100 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
                                <Tag size={16} /> Print Barcodes
                            </button>
                            <button onClick={() => handlePrintReceipt(viewItem)} className="flex-1 py-3 bg-sage-800 text-white rounded-xl font-bold hover:bg-sage-900 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                                <Printer size={16} /> Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Barcodes Modal for Printing */}
            {printBarcodes && (
                <BarcodeModal
                    isOpen={!!printBarcodes}
                    onClose={() => setPrintBarcodes(null)}
                    item={printBarcodes.finishing_receive_items?.map(itm => ({
                        id: itm.id || Math.random().toString(),
                        name: `${printBarcodes.production_orders?.styles?.styleNo} (${itm.size}) - ${itm.quantity} Pcs`,
                        fabricCode: `${printBarcodes.receipt_no}-${itm.size}`
                    })) || []}
                />
            )}
        </div>
    );
};

export default FinishingReceiveList;
