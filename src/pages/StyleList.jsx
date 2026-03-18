import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Plus, Search, Edit, Trash2, Eye, Upload, FileDown, Loader2, LayoutGrid, List } from 'lucide-react';
import { exportAllStylesToExcel } from '../utils/export';
import Papa from 'papaparse';

import { supabase } from '../lib/supabase';

const StyleCard = ({ style, toggleSelect, selected, handleDelete }) => {
    const [image, setImage] = useState(style.image || null);
    const [loadingImage, setLoadingImage] = useState(!style.image);

    useEffect(() => {
        const fetchImage = async () => {
            if (style.image || image) return;
            
            // INCREASED DELAY: Give the main system core more time to breathe
            // Random jitter helps distribute the load over time
            const baseDelay = 3000; // 3 seconds wait minimum
            const jitter = Math.random() * 5000; // up to 5 more seconds
            await new Promise(r => setTimeout(r, baseDelay + jitter));
            
            if (!style.id) return;

            setLoadingImage(true);
            try {
                // Check if we already have it in local state to avoid redundant calls
                const { data, error } = await supabase
                    .from('styles')
                    .select('image')
                    .eq('id', style.id)
                    .single();
                
                if (error) {
                    if (error.code === 'PGRST116') return; // Not found, ignore
                    throw error;
                }
                if (data?.image) setImage(data.image);
            } catch (err) {
                console.warn(`Soft fail fetching image for style ${style.styleNo || style.id}:`, err.message);
            } finally {
                setLoadingImage(false);
            }
        };

        fetchImage();
    }, [style.id, style.image]);

    return (
        <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col">
            <div className="relative aspect-[3/4] overflow-hidden bg-slate-50">
                {image ? (
                    <img src={image} alt={style.styleNo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : loadingImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-50">
                        <Loader2 className="animate-spin text-indigo-500" size={24} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</span>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20 grayscale group-hover:grayscale-0 transition-all">✂️</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                    <div className="flex gap-2">
                        <Link to={`/styles/${style.id}`} className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 text-white py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-white hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-widest">
                            <Eye size={16} /> View
                        </Link>
                        <Link to={`/styles/edit/${style.id}`} className="p-2.5 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-500 rounded-2xl hover:bg-amber-500 hover:text-white transition-all">
                            <Edit size={16} />
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(style.id); }} className="p-2.5 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className={clsx(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border",
                        style.status === 'Complete' ? "bg-emerald-500 text-white border-emerald-400" :
                        style.status === 'Deactive' ? "bg-rose-500 text-white border-rose-400" :
                        "bg-indigo-600 text-white border-indigo-500"
                    )}>
                        {style.status || 'Active'}
                    </span>
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm border border-slate-100">
                        {style.orderType || 'New'}
                    </span>
                </div>
                {selected && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white animate-in zoom-in-50">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                )}
            </div>
            <div className="p-6 space-y-4 flex-1 flex flex-col cursor-pointer" onClick={() => toggleSelect(style.id)}>
                <div className="space-y-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-lg leading-none">
                            {style.styleNo}
                        </h3>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest whitespace-nowrap ml-2">
                            {style.category || 'General'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{style.buyerName || 'Unassigned Buyer'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fabric</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{style.fabricName || '-'}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Color</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{style.color || '-'}</p>
                    </div>
                </div>

                <div className="pt-2 mt-auto border-t border-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Season: {style.season || '-'}</span>
                    {style.stitchingRate && <span className="text-slate-900">₹{style.stitchingRate}</span>}
                </div>
            </div>
        </div>
    );
};

const StyleList = () => {
    const { styles, deleteStyle, updateStyle, addStylesBulk, deleteStylesBulk, loading, error } = usePurchaseOrder();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStatusId, setEditingStatusId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedStyles, setSelectedStyles] = useState([]);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'catalog'
    const fileInputRef = useRef(null);

    const filteredStyles = (styles || []).filter(style => {
        const search = searchTerm.toLowerCase();
        return (
            (style?.styleNo?.toLowerCase() || '').includes(search) ||
            (style?.buyerName?.toLowerCase() || '').includes(search) ||
            (style?.fabricName?.toLowerCase() || '').includes(search)
        );
    });

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this style?')) {
            deleteStyle(id);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStyles.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedStyles.length} selected styles?`)) {
            const result = await deleteStylesBulk(selectedStyles);
            if (result.success) {
                setSelectedStyles([]);
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedStyles.length === filteredStyles.length) {
            setSelectedStyles([]);
        } else {
            setSelectedStyles(filteredStyles.map(s => s.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedStyles(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleStatusChange = async (style, newStatus) => {
        setEditingStatusId(null);
        if (style.status === newStatus) return;

        await updateStyle(style.id, { status: newStatus });
    };

    const downloadTemplate = () => {
        const headers = [
            'Style No', 'Image', 'Buyer Name', 'Fabric Name', 'Color', 'Fabric Content', 'Fabric Width',
            'Season / Collection', 'Style Status', 'Buyer PO No', 'PO Received Date', 'PO Expired Date',
            'Description / Notes', 'Category', 'Section', 'Order Type', 'Stitching Rate', 'Per PCS Avg',
            'Lead Time (Days)', 'PO Extension Date', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', 'Rate'
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "style_upload_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const newStyles = results.data.map(row => {
                    const styleNo = row['Style No'];
                    const rate = parseFloat(row['Rate']) || 0;

                    // Map size-wise details
                    const sizeWiseDetails = SIZES.map(size => {
                        const qty = parseFloat(row[size]) || 0;
                        return {
                            size,
                            qty: qty || '', // Use empty string if 0 for consistency with form
                            rate: qty > 0 ? rate : '',
                            amount: (qty * rate).toFixed(2),
                            sku: styleNo ? `${styleNo}-${size}` : ''
                        };
                    });

                    // Calculate lead time if not provided
                    let leadTime = row['Lead Time (Days)'];
                    if (!leadTime && row['PO Received Date'] && row['PO Expired Date']) {
                        const start = new Date(row['PO Received Date']);
                        const end = new Date(row['PO Expired Date']);
                        if (!isNaN(start) && !isNaN(end)) {
                            const diffTime = Math.abs(end - start);
                            leadTime = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        }
                    }

                    return {
                        styleNo,
                        image: row['Image'],
                        buyerName: row['Buyer Name'],
                        fabricName: row['Fabric Name'],
                        fabricContent: row['Fabric Content'],
                        fabricWidth: row['Fabric Width'],
                        color: row['Color'],
                        season: row['Season / Collection'],
                        status: row['Style Status'] || 'Active',
                        buyerPO: row['Buyer PO No'],
                        buyerPOReceivedDate: row['PO Received Date'],
                        poExpiredDate: row['PO Expired Date'],
                        description: row['Description / Notes'],
                        category: row['Category'],
                        section: row['Section'],
                        orderType: row['Order Type'] || 'New',
                        stitchingRate: row['Stitching Rate'],
                        perPcsAvg: row['Per PCS Avg'],
                        leadTime: leadTime,
                        poExtensionDate: row['PO Extension Date'],
                        sizeWiseDetails: sizeWiseDetails
                    };
                }).filter(s => s.styleNo); // Ensure Style No exists

                if (newStyles.length > 0) {
                    const result = await addStylesBulk(newStyles);
                    if (result.success) {
                        alert(`Successfully uploaded ${result.count} styles!`);
                    }
                } else {
                    alert('No valid styles found in CSV. Please check the template.');
                }
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            error: (error) => {
                console.error("CSV Parse Error:", error);
                alert("Failed to parse CSV file.");
                setIsUploading(false);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-50 bg-[#fdfbf7]/95 backdrop-blur-md -mx-8 -mt-8 px-8 py-4 border-b border-sage-200 shadow-md transition-all">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                            <span className="text-3xl">✂️</span> Style Management
                        </h1>
                        <p className="text-sage-500 text-xs mt-0.5">Manage your style database and details</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {selectedStyles.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-sm transition-colors text-sm"
                            >
                                <Trash2 size={16} /> Delete ({selectedStyles.length})
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv"
                            className="hidden"
                        />
                        <button
                            onClick={downloadTemplate}
                            className="px-3 py-1.5 border border-sage-300 text-sage-600 rounded-lg hover:bg-sage-50 flex items-center gap-2 transition-colors bg-white text-sm"
                            title="Download CSV Template"
                        >
                            <FileDown size={16} /> <span className="hidden lg:inline">Template</span>
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors disabled:opacity-70 text-sm"
                        >
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            <span className="hidden lg:inline">Bulk Upload</span>
                        </button>
                        <button
                            onClick={() => exportAllStylesToExcel(filteredStyles)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm transition-colors text-sm"
                        >
                            <FileDown size={16} /> <span className="hidden lg:inline">Export</span>
                        </button>
                        <Link to="/styles/new" className="px-3 py-1.5 bg-sage-600 text-white rounded-lg hover:bg-sage-700 flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                            <Plus size={16} /> <span className="hidden lg:inline">New Style</span>
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative max-w-xl w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by Style No, Buyer, or Fabric..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 bg-white/80 backdrop-blur-sm outline-none text-sm transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1 bg-sage-100/50 p-1 rounded-lg border border-sage-200 shadow-inner">
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest",
                                viewMode === 'table' ? "bg-white text-indigo-600 shadow-sm" : "text-sage-400 hover:text-sage-600"
                            )}
                        >
                            <List size={16} /> Table
                        </button>
                        <button
                            onClick={() => setViewMode('catalog')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest",
                                viewMode === 'catalog' ? "bg-white text-indigo-600 shadow-sm" : "text-sage-400 hover:text-sage-600"
                            )}
                        >
                            <LayoutGrid size={16} /> Catalog
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Area */}
            {loading ? (
                <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-20 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sage-500 font-medium tracking-widest uppercase text-xs font-black">Loading ERP Styles...</p>
                </div>
            ) : error && styles.length === 0 ? (
                <div className="bg-rose-50 rounded-2xl shadow-sm border border-rose-100 p-12 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="text-rose-800 font-black text-xs uppercase tracking-widest mb-2">System Core Failure</h3>
                    <p className="text-rose-600 text-xs font-bold max-w-md">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-rose-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg"
                    >
                        Re-initialize Core
                    </button>
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-separate border-spacing-0">
                            <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="pl-8 pr-4 py-5 w-12">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                onChange={toggleSelectAll}
                                                checked={selectedStyles.length === filteredStyles.length && filteredStyles.length > 0}
                                                className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-4 py-5 w-24">Image</th>
                                    <th className="px-4 py-5">Style Identifier</th>
                                    <th className="px-4 py-5">Buyer / Client</th>
                                    <th className="px-4 py-5">Fabric Info</th>
                                    <th className="px-4 py-5">Category</th>
                                    <th className="px-4 py-5">Order Type</th>
                                    <th className="px-4 py-5">Color</th>
                                    <th className="px-4 py-5">Season</th>
                                    <th className="px-4 py-5">Status</th>
                                    <th className="pr-8 pl-4 py-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStyles?.length > 0 ? (
                                    filteredStyles.map((style, index) => (
                                        <tr key={style.id} className={clsx("hover:bg-slate-50/50 transition-colors group", selectedStyles.includes(style.id) && "bg-slate-50")}>
                                            <td className="pl-8 pr-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStyles.includes(style.id)}
                                                    onChange={() => toggleSelect(style.id)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform shadow-sm">
                                                    {style.image ? (
                                                        <img src={style.image} alt={style.styleNo} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-slate-400 opacity-50 text-2xl">✂️</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Link to={`/styles/${style.id}`} className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                    {style.styleNo}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-800">{style.buyerName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Studio LLP</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <div className="text-xs font-black text-slate-700">{style.fabricName}</div>
                                                    <div className="text-[10px] font-bold text-slate-400">{style.fabricContent}</div>
                                                    <div className="text-[10px] font-bold text-slate-300">{style.fabricWidth}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-black text-slate-500 uppercase">
                                                    {style.category || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-[9px] px-2 py-0.5 font-black bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 uppercase tracking-tighter">
                                                    {style.orderType || 'New'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-bold text-slate-600">{style.color}</span>
                                            </td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-400">
                                                {style.season}
                                            </td>
                                            <td className="px-4 py-4">
                                                {editingStatusId === style.id ? (
                                                    <select
                                                        autoFocus
                                                        className="text-[10px] px-2 py-1 font-black rounded-lg uppercase border border-slate-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                        value={style.status || 'Active'}
                                                        onChange={(e) => handleStatusChange(style, e.target.value)}
                                                        onBlur={() => setEditingStatusId(null)}
                                                    >
                                                        <option value="Active">Active</option>
                                                        <option value="Deactive">Deactive</option>
                                                        <option value="Complete">Complete</option>
                                                    </select>
                                                ) : (
                                                    <span
                                                        onClick={() => setEditingStatusId(style.id)}
                                                        className={clsx(
                                                            "text-[9px] px-2.5 py-1 font-black rounded-full uppercase border shadow-sm cursor-pointer hover:scale-105 transition-transform",
                                                            style.status === 'Complete' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                style.status === 'Deactive' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                                    "bg-amber-50 text-amber-600 border-amber-100"
                                                        )}
                                                    >
                                                        {style.status || 'Active'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="pr-8 pl-4 py-4">
                                                <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link to={`/styles/${style.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Details">
                                                        <Eye size={16} />
                                                    </Link>
                                                    <Link to={`/styles/edit/${style.id}`} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(style.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="11" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <span className="text-5xl">✂️</span>
                                                <span className="font-black text-xs uppercase tracking-widest">
                                                    {searchTerm ? `No styles matching "${searchTerm}"` : "No styles found in system core"}
                                                </span>
                                                {!searchTerm && (
                                                    <Link to="/styles/new" className="bg-sage-600 text-white px-8 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-sage-700 transition-all shadow-md">
                                                        Create First Style
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStyles?.length > 0 ? (
                        filteredStyles.map((style) => (
                            <StyleCard 
                                key={style.id} 
                                style={style} 
                                toggleSelect={toggleSelect} 
                                selected={selectedStyles.includes(style.id)} 
                                handleDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-20 flex flex-col items-center gap-6 text-slate-300">
                             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl grayscale opacity-50">✂️</div>
                             <div className="text-center">
                                <p className="font-black text-xs uppercase tracking-widest mb-2">
                                    {searchTerm ? `No styles matching "${searchTerm}"` : "Database core is empty"}
                                </p>
                                <p className="text-[10px] font-medium text-slate-400">Try adjusting your filters or create a new style</p>
                             </div>
                             {!searchTerm && (
                                <Link to="/styles/new" className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl hover:scale-105">
                                    Create First Entry
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StyleList;
