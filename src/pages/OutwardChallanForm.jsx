import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Plus, Trash2, Save, List, X, RefreshCw, AlertCircle } from 'lucide-react';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

const OutwardChallanForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { suppliers, items, outwardChallans, addOutwardChallan, updateOutwardChallan, challans, cuttingOrders } = usePurchaseOrder();

    const rawMaterialCategories = [...new Set(items.map(i => i.materialType).filter(Boolean).filter(t => t !== 'Fabric'))];


    // Bale Modal State
    const [showBaleModal, setShowBaleModal] = useState(false);
    const [currentBaleItemIndex, setCurrentBaleItemIndex] = useState(null);
    const [tempBales, setTempBales] = useState([]);
    const [scanError, setScanError] = useState('');
    const [ambiguousMatches, setAmbiguousMatches] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            outChallanNo: '', // Auto-generated if empty
            supplierId: '',
            purpose: 'Cutting/Stitching', // Default
            referenceNo: '', // Optional manula ref
            vehicleNo: '',
            remarks: '',
            items: [],
            rawMaterials: []
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    const { fields: rawFields, append: appendRaw, remove: removeRaw, replace: replaceRaw } = useFieldArray({
        control,
        name: "rawMaterials"
    });

    // Watch purpose to toggle fields
    const purpose = watch("purpose");

    useEffect(() => {
        if (id) {
            const challanToEdit = outwardChallans.find(c => c.id === id);
            if (challanToEdit) {
                const itemsToEdit = (challanToEdit.items || []).filter(i => !i.isRawMaterial);
                const rawMaterialsToEdit = (challanToEdit.items || []).filter(i => i.isRawMaterial);

                reset({ ...challanToEdit, items: itemsToEdit, rawMaterials: rawMaterialsToEdit });
            }
        } else {
            // Initialize with one empty item based on default purpose
            if (fields.length === 0) {
                append({});
            }
        }
    }, [id, outwardChallans, reset]);

    const handlePurposeChange = (e) => {
        const newPurpose = e.target.value;
        setValue("purpose", newPurpose);
        // Reset items when purpose changes to avoid schema mismatch confusion
        replace([{}]);
        replaceRaw([]);
        setSaveError(null);
    };

    const sanitizeData = (data) => {
        const cleaned = { ...data };

        // Filter out empty rows (no itemId)
        cleaned.items = (cleaned.items || []).filter(item => item && item.itemId);

        // Clean numeric fields
        cleaned.items = cleaned.items.map(item => {
            const newItem = { ...item };
            if (purpose === 'Cutting/Stitching') {
                SIZES.forEach(size => {
                    newItem[size] = parseInt(newItem[size]) || 0;
                });
                // Calculate total quantity for this item
                newItem.quantity = SIZES.reduce((sum, size) => sum + (newItem[size] || 0), 0);
            } else {
                newItem.quantity = parseFloat(newItem.quantity) || 0;
                newItem.rate = parseFloat(newItem.rate) || 0;
                newItem.gstRate = parseFloat(newItem.gstRate) || 0;
                newItem.rolls = parseInt(newItem.rolls) || 0;
            }
            return newItem;
        });

        // Handle auto-gen number
        if (!cleaned.outChallanNo || cleaned.outChallanNo === 'Auto-generated') {
            delete cleaned.outChallanNo;
        }

        // Clean rawMaterials
        if (purpose === 'Cutting/Stitching') {
            const rawMats = (cleaned.rawMaterials || []).filter(item => item && item.itemId).map(item => ({
                ...item,
                isRawMaterial: true,
                quantity: parseFloat(item.quantity) || 0
            }));

            cleaned.items = [...cleaned.items, ...rawMats];
            delete cleaned.rawMaterials;
        } else {
            delete cleaned.rawMaterials;
        }

        // Remove empty ID if present
        if (cleaned.id === "") delete cleaned.id;

        return cleaned;
    };

    const handleCuttingOrderChange = (index, cuttingOrderId) => {
        if (!cuttingOrderId) return;

        const order = cuttingOrders.find(co => co.id === cuttingOrderId);
        if (order) {
            setValue(`items.${index}.styleNo`, order.production_orders?.styles?.styleNo || '');
            setValue(`items.${index}.poNo`, order.production_orders?.styles?.buyerPO || '');

            if (order.bundles) {
                const sizesTotal = {};
                const mainBundles = order.bundles.filter(b => b.component_name === 'Main' || b.component_name === 'Top');
                const bundlesToCount = mainBundles.length > 0 ? mainBundles : order.bundles;

                bundlesToCount.forEach(b => {
                    sizesTotal[b.size] = (sizesTotal[b.size] || 0) + Number(b.qty_per_bundle || 0);
                });

                SIZES.forEach(s => {
                    setValue(`items.${index}.${s}`, sizesTotal[s] || 0);
                });
            }
        }
    };

    const getItemName = (itemId) => {
        const item = items.find(i => i.id === itemId);
        return item ? item.name : '';
    };

    const getFabricCode = (itemId) => {
        const item = items.find(i => i.id === itemId);
        return item ? item.fabricCode : '';
    };

    const getItemDescription = (itemId) => {
        const item = items.find(i => i.id === itemId);
        return item ? item.description : '';
    };

    const onSubmit = async (data) => {
        setSaveError(null);
        setIsSaving(true);

        try {
            // Inventory Validation
            for (let i = 0; i < data.items.length; i++) {
                const row = data.items[i];
                if (row.itemId) {
                    const stock = parseFloat(calculateAvailableStock(row.itemId));
                    const outwardQty = parseFloat(row.quantity || 0);

                    if (outwardQty > stock) {
                        const itemName = items.find(item => item.id === row.itemId)?.name || 'Unknown Item';
                        setSaveError(`Insufficient stock for ${itemName}. Available: ${stock}, Requested: ${outwardQty}`);
                        setIsSaving(false);
                        return;
                    }
                }
            }

            let result;
            const cleanData = sanitizeData(data);

            if (id) {
                result = await updateOutwardChallan(id, cleanData);
            } else {
                result = await addOutwardChallan(cleanData);
            }

            if (result && !result.error) {
                navigate('/outward-challans');
            } else {
                setSaveError(result?.error?.message || "Failed to save outward challan. Please try again.");
            }
        } catch (err) {
            console.error("Submit Error:", err);
            setSaveError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFabricCodeChange = (index, code) => {
        if (!code) return;
        const matchingItem = items.find(i =>
            i.fabricCode?.toLowerCase() === code.toLowerCase() ||
            i.articleCode?.toLowerCase() === code.toLowerCase()
        );
        if (matchingItem) {
            setValue(`items.${index}.itemId`, matchingItem.id);
            if (matchingItem.rate) {
                setValue(`items.${index}.rate`, matchingItem.rate);
            }
        }
    };

    const handleBaleScan = (barcode) => {
        if (!barcode) return;
        setScanError('');
        setAmbiguousMatches([]);

        const matches = [];

        // Search all inward challans for this bale
        for (const challan of challans) {
            if (challan.items) {
                // First pass: try to parse the new unique format "CHALLAN-ITEMIDX-BALENO"
                const parts = barcode.split('-');
                if (parts.length === 3 && parts[0].toLowerCase() === challan.challanNo.toLowerCase()) {
                    const itemIdx = parseInt(parts[1]) - 1; // 1-based index to 0-based
                    const baleNo = parts[2];

                    const item = challan.items[itemIdx];
                    if (item && item.baleDetails) {
                        const bale = item.baleDetails.find(b => b.baleNo?.toLowerCase() === baleNo.toLowerCase());
                        if (bale) {
                            const itemMaster = items.find(i => i.id === item.itemId);
                            matches.push({
                                barcode,
                                qty: bale.qty,
                                lotNo: item.lotNo,
                                itemId: item.itemId,
                                itemName: itemMaster?.name || 'Unknown',
                                fabricCode: itemMaster?.fabricCode || '',
                                challanNo: challan.challanNo,
                                baleNo: bale.baleNo
                            });
                            // If we found a precise new-format match, we can stop
                            if (matches.length === 1) break;
                        }
                    }
                }

                if (matches.length === 0) {
                    // Second pass: legacy format or manual baleNo search
                    for (const item of challan.items) {
                        if (item.baleDetails) {
                            item.baleDetails.forEach((b, idx) => {
                                const fullBaleNo = `${challan.challanNo}-${b.baleNo}`;
                                const generatedBarcode = `${challan.challanNo}-${idx + 1}`;

                                if (b.baleNo?.toLowerCase() === barcode.toLowerCase() ||
                                    fullBaleNo.toLowerCase() === barcode.toLowerCase() ||
                                    generatedBarcode.toLowerCase() === barcode.toLowerCase()) {

                                    const itemMaster = items.find(i => i.id === item.itemId);
                                    matches.push({
                                        barcode,
                                        qty: b.qty,
                                        lotNo: item.lotNo,
                                        itemId: item.itemId,
                                        itemName: itemMaster?.name || 'Unknown',
                                        fabricCode: itemMaster?.fabricCode || '',
                                        challanNo: challan.challanNo,
                                        baleNo: b.baleNo || (idx + 1)
                                    });
                                }
                            });
                        }
                    }
                }
            }
            if (matches.length === 1) break;
        }

        if (matches.length > 0) {
            if (matches.length === 1) {
                if (tempBales.some(b => b.barcode === barcode && b.itemId === matches[0].itemId)) {
                    setScanError('Already scanned');
                    return;
                }
                setTempBales([...tempBales, matches[0]]);
            } else {
                setAmbiguousMatches(matches);
            }
        } else {
            setScanError('Barcode not found. If this is a new bale, use "+ Manual Row" below.');
        }
    };

    const selectAmbiguousMatch = (match) => {
        setTempBales([...tempBales, match]);
        setAmbiguousMatches([]);
    };

    const addManualBale = () => {
        setTempBales([...tempBales, {
            barcode: 'MANUAL',
            qty: '0.00',
            lotNo: '',
            itemId: items[0]?.id || '',
            itemName: items[0]?.name || 'Select Item'
        }]);
    };

    const handleBaleQtyChange = (idx, newQty) => {
        const updated = [...tempBales];
        updated[idx].qty = newQty;
        setTempBales(updated);
    };

    const handleBaleBarcodeChange = (idx, newBarcode) => {
        const updated = [...tempBales];
        updated[idx].barcode = newBarcode;
        setTempBales(updated);
    };

    const handleBaleItemChange = (idx, newItemId) => {
        const updated = [...tempBales];
        updated[idx].itemId = newItemId;
        updated[idx].itemName = items.find(i => i.id === newItemId)?.name || 'Unknown';
        setTempBales(updated);
    };

    const openBaleModal = (index) => {
        setCurrentBaleItemIndex(index);
        setTempBales(watch(`items.${index}.bales`) || []);
        setScanError('');
        setShowBaleModal(true);
    };

    const saveBaleModal = () => {
        if (currentBaleItemIndex === null) return;

        const totalQty = tempBales.reduce((sum, b) => sum + (parseFloat(b.qty) || 0), 0);

        setValue(`items.${currentBaleItemIndex}.bales`, tempBales);
        setValue(`items.${currentBaleItemIndex}.quantity`, totalQty.toFixed(2));

        // Auto-select item and lot if first bale
        if (tempBales.length > 0) {
            const firstItemId = tempBales[0].itemId;
            setValue(`items.${currentBaleItemIndex}.itemId`, firstItemId);
            setValue(`items.${currentBaleItemIndex}.lotNo`, tempBales[0].lotNo || '');

            // Set rate if found in items
            const item = items.find(i => i.id === firstItemId);
            if (item && item.rate) {
                setValue(`items.${currentBaleItemIndex}.rate`, item.rate);
            }
        }

        setShowBaleModal(false);
    };

    const removeTempBale = (idx) => {
        setTempBales(tempBales.filter((_, i) => i !== idx));
    };

    const calculateAvailableStock = (itemId) => {
        if (!itemId) return 0;

        // Sum all inward quantities for this item (across all matching rows in all challans)
        const inwardQty = challans.reduce((sum, c) => {
            const matchedItems = c.items?.filter(i => i.itemId === itemId) || [];
            const itemSum = matchedItems.reduce((acc, current) => acc + (parseFloat(current.quantity) || 0), 0);
            return sum + itemSum;
        }, 0);

        // Sum all outward quantities for this item (excluding current if editing)
        const outwardQty = outwardChallans.reduce((sum, c) => {
            if (id && c.id === id) return sum;
            const matchedItems = c.items?.filter(i => i.itemId === itemId) || [];
            const itemSum = matchedItems.reduce((acc, current) => acc + (parseFloat(current.quantity) || 0), 0);
            return sum + itemSum;
        }, 0);

        return (inwardQty - outwardQty).toFixed(2);
    };

    // Calculate row totals for Fabric Return
    const calculateRowAmount = (index) => {
        const qty = parseFloat(watch(`items.${index}.quantity`) || 0);
        const rate = parseFloat(watch(`items.${index}.rate`) || 0);
        const gst = parseFloat(watch(`items.${index}.gstRate`) || 0);

        const gross = qty * rate;
        const tax = gross * (gst / 100);
        return (gross + tax).toFixed(2);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-[95%] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/outward-challans" className="text-sage-500 hover:text-sage-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit Outward Challan' : 'New Outward Challan'}</h1>
                </div>
            </div>

            {/* General Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Challan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Party / Supplier</label>
                        <select
                            {...register("supplierId", { required: "Supplier is required" })}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                        >
                            <option value="">Select Party</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Purpose</label>
                        <select
                            {...register("purpose", { required: true })}
                            onChange={handlePurposeChange}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                        >
                            <option value="Cutting/Stitching">Cutting / Stitching (Job Work)</option>
                            <option value="Fabric Return">Fabric Return</option>
                            <option value="Fabric Issue">Fabric Issue</option>
                            <option value="Accessories Issue">Accessories Issue</option>
                            <option value="Material Issue">General Material Issue</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Date</label>
                        <input
                            type="date"
                            {...register("date", { required: "Date is required" })}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Reference No (Manual)</label>
                        <input
                            type="text"
                            {...register("referenceNo")}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 placeholder-sage-300"
                            placeholder="Optional"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Vehicle/Transport</label>
                        <input
                            type="text"
                            {...register("vehicleNo")}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 placeholder-sage-300"
                            placeholder="Vehicle No"
                        />
                    </div>
                </div>
            </div>

            {/* Items Card */}
            <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6 overflow-x-auto">
                <div className="flex justify-between items-center mb-4 border-b border-sage-100 pb-2">
                    <h3 className="text-lg font-semibold text-sage-800">Items ({purpose})</h3>
                    <button
                        type="button"
                        onClick={() => append({})}
                        className="flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800"
                    >
                        <Plus className="w-4 h-4" />
                        Add Line
                    </button>
                </div>

                {purpose === 'Cutting/Stitching' ? (
                    <>
                        {/* Cutting / Stitching Table */}
                        <table className="w-full min-w-[1500px]">
                            <thead>
                                <tr className="bg-sage-50 text-left text-xs font-medium text-sage-600 uppercase tracking-wider">
                                    <th className="p-3 rounded-tl-lg w-64">Item / Fabric</th>
                                    <th className="p-3 w-48">Cutting Ref</th>
                                    <th className="p-3 w-48">Style No</th>
                                    <th className="p-3 w-48">PO No</th>
                                    {SIZES.map(size => (
                                        <th key={size} className="p-3 text-center w-20">{size}</th>
                                    ))}
                                    <th className="p-3 text-center w-24">Total</th>
                                    <th className="p-3 rounded-tr-lg w-20">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sage-100">
                                {fields.map((field, index) => {
                                    // Calculate total for this row
                                    const rowValues = watch(`items.${index}`);
                                    const totalQty = SIZES.reduce((sum, size) => sum + (parseInt(rowValues?.[size]) || 0), 0);

                                    return (
                                        <tr key={field.id} className="hover:bg-sage-50/30">
                                            <td className="p-2">
                                                <select
                                                    {...register(`items.${index}.itemId`)}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded text-sm"
                                                >
                                                    <option value="">Select Item</option>
                                                    {items.map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({i.fabricCode})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    {...register(`items.${index}.cuttingOrderId`)}
                                                    onChange={(e) => {
                                                        setValue(`items.${index}.cuttingOrderId`, e.target.value);
                                                        handleCuttingOrderChange(index, e.target.value);
                                                    }}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded text-sm bg-sage-50"
                                                >
                                                    <option value="">Select Order</option>
                                                    {cuttingOrders.map(c => (
                                                        <option key={c.id} value={c.id}>{c.cutting_no} - {c.production_orders?.styles?.styleNo || ''}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    {...register(`items.${index}.styleNo`)}
                                                    className="w-full px-3 py-1.5 border border-sage-200 rounded text-sm underline-offset-2"
                                                    placeholder="Style #"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    {...register(`items.${index}.poNo`)}
                                                    className="w-full px-3 py-1.5 border border-sage-200 rounded text-sm"
                                                    placeholder="PO #"
                                                />
                                            </td>
                                            {SIZES.map(size => (
                                                <td key={size} className="p-2">
                                                    <input
                                                        type="number"
                                                        {...register(`items.${index}.${size}`)}
                                                        className="w-full px-1.5 py-1.5 border border-sage-200 rounded text-sm text-center"
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold text-sm">
                                                {totalQty}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="text-sage-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Grand Total Row for Cutting/Stitching */}
                                {fields.length > 0 && (
                                    <tr className="bg-sage-50/50 font-bold border-t-2 border-sage-100">
                                        <td colSpan="4" className="p-3 text-right text-sage-600 uppercase text-[10px] tracking-wider">Grand Totals:</td>
                                        {SIZES.map(size => (
                                            <td key={size} className="p-3 text-center text-sage-900 border-x border-sage-100/10">
                                                {fields.reduce((sum, _, idx) => sum + (parseInt(watch(`items.${idx}.${size}`)) || 0), 0)}
                                            </td>
                                        ))}
                                        <td className="p-3 text-center text-sage-900 text-lg">
                                            {fields.reduce((sum, _, idx) => {
                                                const row = watch(`items.${idx}`);
                                                return sum + SIZES.reduce((s, z) => s + (parseInt(row?.[z]) || 0), 0);
                                            }, 0)}
                                        </td>
                                        <td></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Raw Materials Table */}
                        <div className="mt-8 border-t border-sage-100 pt-6">
                            <div className="flex justify-between items-center mb-4 border-b border-sage-100 pb-2">
                                <h3 className="text-lg font-semibold text-sage-800">Raw Materials (Issued for Job Work)</h3>
                                <button
                                    type="button"
                                    onClick={() => appendRaw({})}
                                    className="flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Material
                                </button>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-sage-50 text-left text-xs font-medium text-sage-600 uppercase tracking-wider">
                                        <th className="p-3 w-48 rounded-tl-lg">Category</th>
                                        <th className="p-3">Material Name</th>
                                        <th className="p-3 w-32">Qty</th>
                                        <th className="p-3 w-32">Unit</th>
                                        <th className="p-3 rounded-tr-lg w-20 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sage-100">
                                    {rawFields.map((field, index) => (
                                        <tr key={field.id} className="hover:bg-sage-50/30">
                                            <td className="p-2">
                                                <select
                                                    {...register(`rawMaterials.${index}.category`)}
                                                    onChange={(e) => {
                                                        setValue(`rawMaterials.${index}.category`, e.target.value);
                                                        setValue(`rawMaterials.${index}.itemId`, '');
                                                        setValue(`rawMaterials.${index}.unit`, 'Pcs');
                                                    }}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded text-sm"
                                                >
                                                    <option value="">Category</option>
                                                    {rawMaterialCategories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    {...register(`rawMaterials.${index}.itemId`)}
                                                    onChange={(e) => {
                                                        const selectedId = e.target.value;
                                                        setValue(`rawMaterials.${index}.itemId`, selectedId);
                                                        const item = items.find(i => i.id === selectedId);
                                                        if (item && item.unit) {
                                                            setValue(`rawMaterials.${index}.unit`, item.unit);
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded text-sm disabled:opacity-50"
                                                    disabled={!watch(`rawMaterials.${index}.category`)}
                                                >
                                                    <option value="">Select Material</option>
                                                    {items
                                                        .filter(i => i.materialType === watch(`rawMaterials.${index}.category`))
                                                        .map(i => (
                                                            <option key={i.id} value={i.id}>{i.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    {...register(`rawMaterials.${index}.quantity`)}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded text-sm"
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    {...register(`rawMaterials.${index}.unit`)}
                                                    className="w-full px-2 py-1 bg-sage-50 border border-sage-100 rounded text-sm"
                                                    readOnly
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRaw(index)}
                                                    className="text-sage-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {rawFields.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-4 text-center text-xs text-sage-400 italic">No raw materials added. Click "Add Material".</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    // Fabric Return Table
                    <table className="w-full min-w-[1600px]">
                        <thead>
                            <tr className="bg-sage-50 text-left text-xs font-medium text-sage-600 uppercase tracking-wider">
                                <th className="p-3 w-16 rounded-tl-lg">S.No</th>
                                <th className="p-3 w-44">Fabric Code</th>
                                <th className="p-3 w-80">Fabric Details</th>
                                <th className="p-3 w-32 text-center text-[10px]">Available Stock</th>
                                <th className="p-3 w-48">Bales / Barcodes</th>
                                <th className="p-3 w-32">Qty</th>
                                <th className="p-3 w-36">Unit</th>
                                <th className="p-3 w-32">Rate</th>
                                <th className="p-3 w-36">Gross Amt</th>
                                <th className="p-3 w-24 text-center">GST %</th>
                                <th className="p-3 w-36">GST Amt</th>
                                <th className="p-3 w-36">Net Amt</th>
                                <th className="p-3 rounded-tr-lg w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {fields.map((field, index) => {
                                const itemId = watch(`items.${index}.itemId`);
                                const qty = parseFloat(watch(`items.${index}.quantity`) || 0);
                                const rate = parseFloat(watch(`items.${index}.rate`) || 0);
                                const gstRate = parseFloat(watch(`items.${index}.gstRate`) || 0);

                                const gross = (qty * rate).toFixed(2);
                                const gstAmt = (qty * rate * (gstRate / 100)).toFixed(2);

                                return (
                                    <tr key={field.id} className="hover:bg-sage-50/30">
                                        <td className="p-3 text-center">{index + 1}</td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                {...register(`items.${index}.inputFabricCode`)}
                                                onChange={(e) => handleFabricCodeChange(index, e.target.value)}
                                                placeholder="Scan/Type Code"
                                                className="w-full px-2 py-1 border border-sage-200 rounded text-sm font-mono placeholder:font-sans placeholder:text-[10px]"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                {...register(`items.${index}.itemId`, { required: true })}
                                                onChange={(e) => {
                                                    const selectedId = e.target.value;
                                                    setValue(`items.${index}.itemId`, selectedId);
                                                    const item = items.find(i => i.id === selectedId);
                                                    if (item && item.rate) {
                                                        setValue(`items.${index}.rate`, item.rate);
                                                    }
                                                }}
                                                className="w-full px-2 py-1 border border-sage-200 rounded text-sm mb-1"
                                            >
                                                <option value="">Select Item</option>
                                                {items.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                            {itemId && (
                                                <div className="text-xs text-sage-500">
                                                    Code: {getFabricCode(itemId)} <br />
                                                    {getItemDescription(itemId)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className={`px-3 py-1.5 rounded font-bold text-center border ${parseFloat(calculateAvailableStock(itemId)) > 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                                }`}>
                                                {calculateAvailableStock(itemId)}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openBaleModal(index)}
                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-sage-50 text-sage-600 rounded border border-sage-200 hover:bg-sage-100 transition-colors text-xs font-semibold"
                                                >
                                                    <List className="w-4 h-4" />
                                                    {field.bales?.length > 0 ? `Manage Bales (${field.bales.length})` : 'Scan Bales'}
                                                </button>
                                                {field.bales?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                                        {field.bales.map((b, bIdx) => (
                                                            <span key={bIdx} className="bg-sage-100 text-[9px] px-1 py-0.5 rounded border border-sage-200 text-sage-600">
                                                                {b.barcode}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register(`items.${index}.quantity`)}
                                                readOnly={(watch(`items.${index}.bales`) || []).length > 0}
                                                className={`w-full px-2 py-1 border rounded text-sm ${(watch(`items.${index}.bales`) || []).length > 0 ? 'bg-sage-50 border-sage-100 italic' : 'border-sage-200'
                                                    }`}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                {...register(`items.${index}.unit`)}
                                                className="w-full px-2 py-1 border border-sage-200 rounded text-sm"
                                            >
                                                <option value="Meter">Meter</option>
                                                <option value="Kg">Kg</option>
                                                <option value="Pcs">Pcs</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register(`items.${index}.rate`)}
                                                className="w-full px-2 py-1 border border-sage-200 rounded text-sm"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={gross}
                                                readOnly
                                                className="w-full px-2 py-1 bg-sage-50 border border-sage-100 rounded text-sm text-sage-700"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                {...register(`items.${index}.gstRate`)}
                                                className="w-full px-2 py-1 border border-sage-200 rounded text-sm"
                                                defaultValue={5}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={gstAmt}
                                                readOnly
                                                className="w-full px-2 py-1 bg-sage-50 border border-sage-100 rounded text-sm text-sage-700"
                                            />
                                        </td>
                                        <td className="p-3 font-bold text-sage-800">
                                            {calculateRowAmount(index)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="text-sage-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Grand Total Row for Fabric Return */}
                            {fields.length > 0 && (
                                <tr className="bg-sage-50/50 font-bold border-t-2 border-sage-100">
                                    <td colSpan="4" className="p-3 text-right text-sage-600 uppercase text-[10px] tracking-wider">Grand Totals:</td>
                                    <td className="p-3 text-center text-sage-900 border-x border-sage-100/50">
                                        {fields.reduce((sum, _, idx) => sum + (parseFloat(watch(`items.${idx}.quantity`)) || 0), 0).toFixed(2)}
                                    </td>
                                    <td colSpan="5"></td>
                                    <td className="p-3 text-sage-900 text-lg">
                                        {fields.reduce((sum, _, idx) => sum + parseFloat(calculateRowAmount(idx)), 0).toFixed(2)}
                                    </td>
                                    <td></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Remarks */}
            <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                <div>
                    <label className="block text-sm font-medium text-sage-700 mb-1">Remarks / Note</label>
                    <textarea
                        {...register("remarks")}
                        className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 placeholder-sage-300"
                        rows="3"
                        placeholder="Any remarks about shipment..."
                    ></textarea>
                </div>
            </div>

            {/* Save Error Display */}
            {
                saveError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-800">
                                {saveError.includes('Could not find') ? 'Schema Error Detected' : 'Error Saving Challan'}
                            </p>
                            <p className="text-xs text-red-700 mt-1">{saveError}</p>
                            {saveError.includes('Could not find') && (
                                <p className="text-[10px] text-red-500 mt-2 font-medium italic">
                                    💡 TIP: This usually means the database needs a quick repair.
                                    Please use the <strong>Repair Schema Errors</strong> tool in the Dashboard or contact support.
                                </p>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pb-10">
                <Link
                    to="/outward-challans"
                    className="px-6 py-2 border border-sage-300 rounded-lg text-sage-600 hover:bg-sage-50 transition-colors font-medium disabled:opacity-50"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] justify-center"
                >
                    {isSaving ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {id ? 'Update Challan' : 'Save Challan'}
                        </>
                    )}
                </button>
            </div>

            {/* Bale Scan Modal */}
            {
                showBaleModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col border border-sage-100">
                            {/* Modal Header */}
                            <div className="p-5 border-b border-sage-100 flex justify-between items-center bg-sage-50 rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-bold text-sage-800 flex items-center gap-2">
                                        <List className="w-5 h-5 text-sage-600" />
                                        Bale Scanning Interface
                                    </h3>
                                    <p className="text-xs text-sage-500 mt-0.5">Scan inward barcodes to add them to this challan.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setIsRefreshing(true);
                                            window.location.reload();
                                        }}
                                        className={`p-2 hover:bg-sage-100 rounded-full transition-all text-sage-400 hover:text-sage-600 ${isRefreshing ? 'animate-spin' : ''}`}
                                        title="Refresh all data"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setShowBaleModal(false)}
                                        className="p-2 hover:bg-sage-100 rounded-full transition-colors text-sage-400 hover:text-sage-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 flex flex-col flex-1 overflow-hidden">
                                {/* Scanning Input */}
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-sage-600 uppercase tracking-wider mb-2">Scan Barcode (Enter to add)</label>
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Scan barcode here..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleBaleScan(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className={`w-full px-4 py-3 bg-sage-50 border-2 rounded-xl text-lg font-mono focus:outline-none transition-all ${scanError ? 'border-red-300 focus:border-red-500' : 'border-sage-200 focus:border-sage-500'
                                                }`}
                                        />
                                        {scanError && (
                                            <div className="absolute top-full left-0 mt-1 text-red-500 text-xs font-medium">
                                                {scanError}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={addManualBale}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-sage-100 text-sage-600 rounded-lg text-xs font-bold hover:bg-sage-200 border border-sage-200"
                                        >
                                            + Manual Row
                                        </button>
                                    </div>
                                </div>

                                {/* Ambiguous Matches Picker */}
                                {ambiguousMatches.length > 0 && (
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            Multiple items found for this barcode:
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {ambiguousMatches.map((m, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => selectAmbiguousMatch(m)}
                                                    className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg hover:border-amber-400 hover:shadow-sm transition-all text-left group"
                                                >
                                                    <div>
                                                        <div className="text-xs font-bold text-sage-900 group-hover:text-amber-900">{m.itemName}</div>
                                                        <div className="text-[10px] text-sage-500 font-mono">{m.fabricCode} • Challan #{m.challanNo}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-sage-900">{m.qty}</div>
                                                        <div className="text-[9px] text-sage-400 uppercase font-black">Select →</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setAmbiguousMatches([])}
                                            className="text-[10px] text-amber-600 underline font-medium"
                                        >
                                            Cancel selection
                                        </button>
                                    </div>
                                )}

                                {/* Scanned List */}
                                <div className="flex-1 overflow-y-auto border border-sage-100 rounded-xl bg-gray-50/50">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-white border-b border-sage-100">
                                            <tr className="text-left text-[10px] text-sage-500 uppercase font-bold">
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">Barcode / Details</th>
                                                <th className="px-4 py-3 text-right">Quantity</th>
                                                <th className="px-4 py-3 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-sage-50">
                                            {tempBales.length > 0 ? tempBales.map((b, idx) => (
                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                    <td className="px-4 py-3 text-sage-400 font-mono italic">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <input
                                                                type="text"
                                                                value={b.barcode}
                                                                onChange={(e) => handleBaleBarcodeChange(idx, e.target.value)}
                                                                className="block w-full text-xs font-mono font-bold text-sage-800 bg-transparent border-none p-0 focus:ring-0"
                                                            />
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] text-sage-400 font-mono uppercase tracking-tighter">{b.fabricCode || 'CODE'}</span>
                                                                <select
                                                                    value={b.itemId}
                                                                    onChange={(e) => handleBaleItemChange(idx, e.target.value)}
                                                                    className="block text-[10px] text-sage-500 bg-transparent border-none p-0 focus:ring-0 font-medium"
                                                                >
                                                                    {items.map(i => (
                                                                        <option key={i.id} value={i.id}>{i.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {b.challanNo && (
                                                                <div className="text-[9px] text-sage-400 mt-0.5">Found in Challan #{b.challanNo}</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={b.qty}
                                                            onChange={(e) => handleBaleQtyChange(idx, e.target.value)}
                                                            className="w-24 text-right font-black text-sage-900 bg-white border border-sage-200 rounded px-2 py-1 focus:border-sage-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeTempBale(idx)}
                                                            className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-12 text-center text-sage-400 italic">
                                                        No barcodes scanned yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-sage-100 bg-sage-50/50 flex justify-between items-center rounded-b-2xl">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-sage-500 uppercase font-bold">Total Summary</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-sage-900">
                                            {tempBales.reduce((sum, b) => sum + (parseFloat(b.qty) || 0), 0).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-sage-500 font-medium">{tempBales.length} Bales</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowBaleModal(false)}
                                        className="px-5 py-2.5 text-sage-600 hover:text-sage-800 font-semibold text-sm transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={saveBaleModal}
                                        className="px-8 py-2.5 bg-sage-600 text-white rounded-xl hover:bg-sage-700 transition-shadow shadow-lg shadow-sage-200 font-bold text-sm"
                                    >
                                        Apply to Row
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </form >
    );
};

export default OutwardChallanForm;
