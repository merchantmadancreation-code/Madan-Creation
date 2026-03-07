import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Plus, Search, Edit, Trash2, Eye, Upload, FileDown, Loader2 } from 'lucide-react';
import { exportAllStylesToExcel } from '../utils/export';
import Papa from 'papaparse';

const StyleList = () => {
    const { styles, deleteStyle, updateStyle, addStylesBulk, deleteStylesBulk } = usePurchaseOrder();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStatusId, setEditingStatusId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedStyles, setSelectedStyles] = useState([]);
    const fileInputRef = useRef(null);

    const filteredStyles = (styles || []).filter(style =>
        style?.styleNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        style?.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        style?.fabricName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <div className="flex flex-wrap gap-2">
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

                <div className="relative max-w-xl">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by Style No, Buyer, or Fabric..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 bg-white/80 backdrop-blur-sm outline-none text-sm transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-sage-50 text-sage-600 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={selectedStyles.length === filteredStyles.length && filteredStyles.length > 0}
                                        className="rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                                    />
                                </th>
                                <th className="px-6 py-4 w-20">Image</th>
                                <th className="px-6 py-4">Style No</th>
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Fabric</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Order Type</th>
                                <th className="px-6 py-4">Color</th>
                                <th className="px-6 py-4">Season</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {filteredStyles?.length > 0 ? (
                                filteredStyles.map((style, index) => (
                                    <tr key={style.id} className={clsx("hover:bg-sage-50/30 transition-colors", selectedStyles.includes(style.id) && "bg-sage-50")}>
                                        <td className="px-6 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedStyles.includes(style.id)}
                                                onChange={() => toggleSelect(style.id)}
                                                className="rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="w-12 h-12 rounded-lg bg-sage-100 border border-sage-200 overflow-hidden flex items-center justify-center">
                                                {style.image ? (
                                                    <img src={style.image} alt={style.styleNo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sage-400 opacity-50 text-xl">✂️</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-sage-900">
                                            <Link to={`/styles/${style.id}`} className="hover:text-sage-600 hover:underline">
                                                {style.styleNo}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-3 text-sage-600">{style.buyerName}</td>
                                        <td className="px-6 py-3 text-sage-600">
                                            <div className="font-medium text-sage-900">{style.fabricName}</div>
                                            <div className="text-xs text-sage-500">{style.fabricContent}</div>
                                            <div className="text-xs text-sage-400">{style.fabricWidth}</div>
                                        </td>
                                        <td className="px-6 py-3 text-sage-600">
                                            <span className="text-xs px-2 py-0.5 bg-sage-50 rounded border border-sage-100">{style.category || '-'}</span>
                                        </td>
                                        <td className="px-6 py-3 text-sage-600">
                                            <span className="text-[10px] px-1.5 py-0.5 font-bold bg-blue-50 text-blue-700 rounded uppercase">{style.orderType || 'New'}</span>
                                        </td>
                                        <td className="px-6 py-3 text-sage-600">{style.color}</td>
                                        <td className="px-6 py-3 text-sage-600">{style.season}</td>
                                        <td className="px-6 py-3">
                                            {editingStatusId === style.id ? (
                                                <select
                                                    autoFocus
                                                    className="text-[10px] px-2 py-0.5 font-bold rounded-full uppercase border bg-white outline-none focus:ring-1 focus:ring-sage-400"
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
                                                        "text-[10px] px-2 py-0.5 font-bold rounded-full uppercase border cursor-pointer hover:opacity-80 transition-opacity",
                                                        style.status === 'Complete' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                            style.status === 'Deactive' ? "bg-red-100 text-red-700 border-red-200" :
                                                                "bg-green-100 text-green-700 border-green-200"
                                                    )}
                                                >
                                                    {style.status || 'Active'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link to={`/styles/${style.id}`} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="View Details">
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link to={`/styles/edit/${style.id}`} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(style.id)}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-sage-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-4xl opacity-20">✂️</div>
                                            <span>No styles found. Create one to get started.</span>
                                        </div>
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

export default StyleList;
