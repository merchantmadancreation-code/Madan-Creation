import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Scissors, Shirt, ChevronRight, Clock, CheckCircle, Eye, Trash2, Printer, X, Package, Tag, User, Edit } from 'lucide-react';
import BarcodeModal from '../components/BarcodeModal';

const StitchingList = () => {
    const navigate = useNavigate();
    const [recentBundles, setRecentBundles] = useState([]);
    const [recentReceives, setRecentReceives] = useState([]);
    const [recentIssues, setRecentIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    // Action States
    const [viewItem, setViewItem] = useState(null); // { type, data }
    const [printBarcodes, setPrintBarcodes] = useState(null); // For garment barcodes
    const [selectedBundles, setSelectedBundles] = useState([]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch recent received bundles
        const { data: bundles } = await supabase
            .from('bundles')
            .select(`
                *,
                cutting_orders (production_orders (styles (styleNo)))
            `)
            .eq('status', 'Received')
            .order('created_at', { ascending: false })
            .limit(20);

        // Fetch recent worker receiving
        const { data: receives } = await supabase
            .from('stitching_receives')
            .select(`
                *,
                workers(name),
                production_orders(order_no, styles(styleNo, stitchingRate, color)),
                stitching_receive_items(size, quantity)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        // Fetch recent issues
        const { data: issues } = await supabase
            .from('stitching_issues')
            .select(`
                *,
                workers(name),
                production_orders(order_no, styles(styleNo))
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        setRecentBundles(bundles || []);
        setRecentReceives(receives || []);
        setRecentIssues(issues || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleView = (type, data) => {
        setViewItem({ type, data });
    };

    const handleEditIssue = (issue) => {
        navigate(`/stitching/issue/edit/${issue.id}`, { state: { editEntry: issue } });
    };

    const handleDeleteIssue = async (id) => {
        if (!window.confirm('Are you sure you want to delete this issue transaction?')) return;
        const { error } = await supabase.from('stitching_issues').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchData();
    };

    const handleDeleteReceive = async (id) => {
        if (!window.confirm('Are you sure you want to delete this receive transaction? This will also delete generated barcodes.')) return;
        const { error } = await supabase.from('stitching_receives').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchData();
    };

    const handleReprintBarcodes = async (receiveId) => {
        const { data, error } = await supabase
            .from('garment_barcodes')
            .select('*')
            .in('receive_item_id', (await supabase.from('stitching_receive_items').select('id').eq('receive_id', receiveId)).data?.map(i => i.id) || []);

        if (data && data.length > 0) {
            setPrintBarcodes(data);
        } else {
            alert('No barcodes found for this transaction.');
        }
    };

    const handleDeleteBundle = async (id) => {
        if (!window.confirm('Are you sure you want to un-receive this bundle?')) return;
        const { error } = await supabase.from('bundles').update({ status: 'Cut' }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchData();
    };

    const handlePrintReceipt = (data) => {
        const printWindow = window.open('', '', 'width=800,height=900');
        const items = data.stitching_receive_items || [];
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

        // Robust access for joined data
        const po = Array.isArray(data.production_orders) ? data.production_orders[0] : data.production_orders;
        const style = Array.isArray(po?.styles) ? po.styles[0] : po?.styles;
        const rate = style?.stitchingRate || style?.stitching_rate || 0;

        const totalAmount = totalQty * rate;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Production Receipt - ${data.receipt_no}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-info h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; }
                        .company-info p { margin: 5px 0; font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px; }
                        .receipt-details { text-align: right; }
                        .receipt-details h2 { margin: 0; font-size: 18px; color: #888; }
                        .receipt-details p { margin: 5px 0; font-weight: bold; }
                        
                        .info-grid { display: grid; grid-cols: 2; gap: 20px; margin-bottom: 30px; }
                        .info-box { background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee; }
                        .info-label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                        .info-value { font-size: 14px; font-weight: bold; }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #333; color: #fff; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                        .total-row { background: #f0f0f0; font-weight: bold; font-size: 16px; }

                        .price-info { font-family: monospace; font-weight: bold; color: #666; }
                        .amount { font-weight: 900; color: #000; }
                        
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-info">
                            <h1>MADAN CREATION</h1>
                            <p>Worker Production Receipt</p>
                        </div>
                        <div class="receipt-details">
                            <h2>${data.receipt_no}</h2>
                            <p>${new Date(data.receive_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div class="info-box">
                            <div class="info-label">Produced By (Worker)</div>
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
                                <th style="text-align: right;">Rate/Pcs</th>
                                <th style="text-align: right;">Quantity</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.size}</td>
                                    <td>${item.color || style?.color || 'N/A'}</td>
                                    <td style="text-align: right;" class="price-info">₹ ${parseFloat(rate).toFixed(2)}</td>
                                    <td style="text-align: right; font-weight: bold;">${item.quantity}</td>
                                    <td style="text-align: right;" class="amount">₹ ${(item.quantity * rate).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 10px;">Total Pieces & Wages</td>
                                <td style="text-align: right; border-top: 2px solid #333;">${totalQty} PCS</td>
                                <td style="text-align: right; border-top: 2px solid #333;">₹ ${totalAmount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    ${data.remarks ? `
                        <div style="margin-top: 30px;">
                            <div class="info-label">Remarks</div>
                            <div style="font-style: italic; color: #666; font-size: 13px;">${data.remarks}</div>
                        </div>
                    ` : ''}

                    <div class="footer">
                        <div class="signature-box">Receiver Signature</div>
                        <div class="signature-box">Worker Signature</div>
                    </div>

                    <div style="margin-top: 40px; text-align: center; font-size: 8px; color: #ccc; letter-spacing: 3px; text-transform: uppercase;">
                        System Generated Document • Madan Creation ERP
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

    // Bulk Selection Logic
    const toggleBundleSelection = (id) => {
        setSelectedBundles(prev =>
            prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedBundles.length === recentBundles.length) {
            setSelectedBundles([]);
        } else {
            setSelectedBundles(recentBundles.map(b => b.id));
        }
    };

    const handleBulkPrint = () => {
        // This is for bundle barcodes (cutting)
        const bundlesToPrint = recentBundles.filter(b => selectedBundles.includes(b.id));
        setPrintBarcodes(bundlesToPrint); // Using same modal state
        setSelectedBundles([]);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-sage-800">Sewing Department</h1>
                <p className="text-sage-500">Manage stitching operations and production flow</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Cutting Receiving */}
                <div className="space-y-4">
                    <Link to="/stitching/receive" className="block group bg-white p-6 rounded-2xl shadow-sm border border-sage-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Scissors size={80} />
                        </div>
                        <div className="position-relative z-10 flex items-center gap-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Scissors size={28} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-sage-800 mb-1">Cutting Receiving</h2>
                                <p className="text-sage-500 text-sm mb-3">Scan incoming bundles from cutting.</p>
                                <div className="flex items-center gap-2 text-blue-600 text-sm font-bold group-hover:gap-3 transition-all">
                                    Start Scanning <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Recent Received List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                        <div className="p-4 border-b border-sage-100 bg-sage-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {recentBundles.length > 0 && (
                                    <input
                                        type="checkbox"
                                        className="rounded text-sage-600 focus:ring-sage-500 cursor-pointer"
                                        checked={selectedBundles.length === recentBundles.length && recentBundles.length > 0}
                                        onChange={toggleSelectAll}
                                        title="Select All"
                                    />
                                )}
                                <h3 className="font-bold text-sage-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={14} /> Recently Received
                                </h3>
                            </div>

                            {selectedBundles.length > 0 ? (
                                <button
                                    onClick={handleBulkPrint}
                                    className="text-[10px] font-bold text-white bg-sage-600 hover:bg-sage-700 px-3 py-1 rounded-full flex items-center gap-1 transition-colors animate-in fade-in zoom-in"
                                >
                                    <Printer size={12} /> Print ({selectedBundles.length})
                                </button>
                            ) : (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{recentBundles.length} Recent</span>
                            )}
                        </div>
                        <div className="divide-y divide-sage-50">
                            {recentBundles.length === 0 ? (
                                <div className="p-6 text-center text-sage-400 italic text-sm">No bundles received recently.</div>
                            ) : (
                                recentBundles.map(bundle => (
                                    <div key={bundle.id} className={`p-3 hover:bg-sage-50/30 transition-colors flex items-center justify-between group ${selectedBundles.includes(bundle.id) ? 'bg-sage-50' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                className="rounded text-sage-600 focus:ring-sage-500 cursor-pointer"
                                                checked={selectedBundles.includes(bundle.id)}
                                                onChange={() => toggleBundleSelection(bundle.id)}
                                            />
                                            <div>
                                                <div className="font-bold text-sage-800 text-sm">{bundle.bundle_no}</div>
                                                <div className="text-[10px] text-sage-500">{bundle.cutting_orders?.production_orders?.styles?.styleNo}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-blue-600 text-sm">{bundle.qty_per_bundle} pcs</div>
                                            <div className="flex items-center justify-end gap-1 mt-1 transition-opacity">
                                                <button onClick={() => handleView('bundle', bundle)} className="p-1 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye size={14} /></button>
                                                <button onClick={() => setPrintBarcodes([bundle])} className="p-1 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Print Barcode"><Printer size={14} /></button>
                                                <button onClick={() => handleDeleteBundle(bundle.id)} className="p-1 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded" title="Un-receive"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 2: Worker Production Receiving */}
                <div className="space-y-4">
                    <Link to="/stitching/production" className="block group bg-white p-6 rounded-2xl shadow-sm border border-sage-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shirt size={80} />
                        </div>
                        <div className="position-relative z-10 flex items-center gap-6">
                            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Shirt size={28} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-sage-800 mb-1">Receive from Worker</h2>
                                <p className="text-sage-500 text-sm mb-3">Record Production & Generate Barcodes.</p>
                                <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold group-hover:gap-3 transition-all">
                                    Start Receiving <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Recent Production List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                        <div className="p-4 border-b border-sage-100 bg-sage-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-sage-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle size={14} /> Production Log
                            </h3>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{recentReceives.length} Recent</span>
                        </div>
                        <div className="divide-y divide-sage-50">
                            {recentReceives.length === 0 ? (
                                <div className="p-6 text-center text-sage-400 italic text-sm">No production entries yet.</div>
                            ) : (
                                recentReceives.map(receive => (
                                    <div key={receive.id} className="p-3 hover:bg-sage-50/30 transition-colors flex items-center justify-between group">
                                        <div>
                                            <div className="font-bold text-sage-800 text-sm">{receive.receipt_no}</div>
                                            <div className="text-[10px] text-sage-500 flex items-center gap-2">
                                                <User size={10} /> {receive.workers?.name} | <Tag size={10} /> {receive.production_orders?.styles?.styleNo}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-emerald-600 text-sm">
                                                {receive.stitching_receive_items?.reduce((sum, i) => sum + i.quantity, 0)} Pcs
                                            </div>
                                            <div className="flex items-center justify-end gap-1 mt-1 transition-opacity">
                                                <button onClick={() => handleView('receive', receive)} className="p-1 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="View"><Eye size={14} /></button>
                                                <button onClick={() => handleReprintBarcodes(receive.id)} className="p-1 text-sage-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Re-print Barcodes"><Printer size={14} /></button>
                                                <button onClick={() => handleDeleteReceive(receive.id)} className="p-1 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Link to="/stitching/issue/new" className="block group bg-white p-6 rounded-2xl shadow-sm border border-sage-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Package size={80} />
                        </div>
                        <div className="position-relative z-10 flex items-center gap-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Package size={28} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-sage-800 mb-1">Cutting Issue</h2>
                                <p className="text-sage-500 text-sm mb-3">Distribute received bundles to workers.</p>
                                <div className="flex items-center gap-2 text-blue-600 text-sm font-bold group-hover:gap-3 transition-all">
                                    Create Issue Note <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Recent Issues List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden">
                        <div className="p-4 border-b border-sage-100 bg-sage-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-sage-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                <Package size={14} /> Recent Issues
                            </h3>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{recentIssues.length} Recent</span>
                        </div>
                        <div className="divide-y divide-sage-50">
                            {recentIssues.length === 0 ? (
                                <div className="p-6 text-center text-sage-400 italic text-sm">No cutting issues yet.</div>
                            ) : (
                                recentIssues.map(issue => (
                                    <div key={issue.id} className="p-3 hover:bg-sage-50/30 transition-colors flex items-center justify-between group">
                                        <div>
                                            <div className="font-bold text-sage-800 text-sm">{issue.issue_no}</div>
                                            <div className="text-[10px] text-sage-500 flex items-center gap-2">
                                                <User size={10} /> {issue.workers?.name} | <Tag size={10} /> {issue.production_orders?.styles?.styleNo}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-sage-400 font-bold mb-1">{new Date(issue.issue_date).toLocaleDateString()}</div>
                                            <div className="flex items-center justify-end gap-1 transition-opacity">
                                                <Link to={`/stitching/issue/${issue.id}`} className="p-1 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View / Print"><Eye size={14} /></Link>
                                                <button onClick={() => handleEditIssue(issue)} className="p-1 text-sage-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={14} /></button>
                                                <button onClick={() => handleDeleteIssue(issue.id)} className="p-1 text-sage-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {viewItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95">
                        <div className="p-4 border-b border-sage-100 flex justify-between items-center bg-sage-50/50 rounded-t-2xl">
                            <h3 className="font-bold text-sage-800 uppercase tracking-widest text-xs">
                                {viewItem.type === 'bundle' ? 'Bundle Details' : 'Worker Receiving Details'}
                            </h3>
                            <button onClick={() => setViewItem(null)} className="p-1 hover:bg-sage-200 rounded-lg text-sage-500 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {viewItem.type === 'bundle' ? (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><label className="text-[10px] text-sage-500 font-bold uppercase">Bundle No</label><div className="font-bold">{viewItem.data.bundle_no}</div></div>
                                    <div><label className="text-[10px] text-sage-500 font-bold uppercase">Quantity</label><div className="font-bold">{viewItem.data.qty_per_bundle} Pcs</div></div>
                                    <div><label className="text-[10px] text-sage-500 font-bold uppercase">Size</label><div className="font-bold">{viewItem.data.size}</div></div>
                                    <div><label className="text-[10px] text-sage-500 font-bold uppercase">Status</label><div className="font-bold text-blue-600">{viewItem.data.status}</div></div>
                                    <div className="col-span-2"><label className="text-[10px] text-sage-500 font-bold uppercase">Style</label><div className="font-bold">{viewItem.data.cutting_orders?.production_orders?.styles?.styleNo}</div></div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><label className="text-[10px] text-sage-500 font-bold uppercase">Receipt No</label><div className="font-bold">{viewItem.data.receipt_no}</div></div>
                                        <div><label className="text-[10px] text-sage-500 font-bold uppercase">Date</label><div className="font-bold">{new Date(viewItem.data.receive_date).toLocaleDateString()}</div></div>
                                        <div><label className="text-[10px] text-sage-500 font-bold uppercase">Worker</label><div className="font-bold">{viewItem.data.workers?.name}</div></div>
                                        <div><label className="text-[10px] text-sage-500 font-bold uppercase">Style Color</label><div className="font-bold text-emerald-600">{(Array.isArray(viewItem.data.production_orders?.styles) ? viewItem.data.production_orders.styles[0] : viewItem.data.production_orders?.styles)?.color || 'N/A'}</div></div>
                                        <div><label className="text-[10px] text-sage-500 font-bold uppercase">Order</label><div className="font-bold">{viewItem.data.production_orders?.order_no}</div></div>
                                    </div>

                                    <div className="bg-sage-50 p-4 rounded-xl border border-sage-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-[10px] font-bold text-sage-500 uppercase">Size Breakdown</h4>
                                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                RATE: ₹ {(Array.isArray(viewItem.data.production_orders?.styles) ? viewItem.data.production_orders.styles[0] : viewItem.data.production_orders?.styles)?.stitchingRate || 0} / PCS
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {viewItem.data.stitching_receive_items?.map((itm, idx) => (
                                                <div key={idx} className="bg-white p-2 rounded border border-sage-200 text-center">
                                                    <div className="text-[9px] text-sage-400 font-bold">{itm.size}</div>
                                                    <div className="font-black text-blue-600">{itm.quantity}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-sage-200 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-sage-400 uppercase">Estimated Wages:</span>
                                            <span className="text-sm font-black text-sage-800">
                                                ₹ {(viewItem.data.stitching_receive_items?.reduce((sum, i) => sum + i.quantity, 0) * ((Array.isArray(viewItem.data.production_orders?.styles) ? viewItem.data.production_orders.styles[0] : viewItem.data.production_orders?.styles)?.stitchingRate || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    {viewItem.data.remarks && (
                                        <div>
                                            <label className="text-[10px] text-sage-500 font-bold uppercase">Remarks</label>
                                            <div className="italic text-sage-600 text-sm">{viewItem.data.remarks}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-sage-100 flex gap-3 bg-sage-50/30 rounded-b-2xl">
                            <button
                                onClick={() => setViewItem(null)}
                                className="flex-1 px-4 py-2 border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-100 transition-colors font-bold text-sm"
                            >
                                Close
                            </button>
                            {viewItem.type === 'receive' && (
                                <button
                                    onClick={() => handlePrintReceipt(viewItem.data)}
                                    className="flex-1 px-4 py-2 bg-sage-800 text-white rounded-xl hover:bg-sage-900 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Printer size={16} /> Print Receipt
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Barcodes Modal */}
            {printBarcodes && (
                <BarcodeModal
                    isOpen={!!printBarcodes}
                    onClose={() => setPrintBarcodes(null)}
                    item={printBarcodes.map(b => ({
                        id: b.id,
                        name: b.bundle_no ? `${b.bundle_no} (${b.size})` : `${viewItem?.data?.production_orders?.styles?.styleNo || 'Piece'} (${b.size})`,
                        fabricCode: b.barcode
                    }))}
                />
            )}
        </div>
    );
};

export default StitchingList;
