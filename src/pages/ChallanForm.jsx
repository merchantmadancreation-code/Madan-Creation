import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Plus, Trash2, Save, List, X, Camera } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ChallanForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { suppliers, items, purchaseOrders, challans, styles, addChallan, updateChallan } = usePurchaseOrder();
    const [challanPreview, setChallanPreview] = useState(null);
    const [zoomImage, setZoomImage] = useState(null);

    // Bale Details State
    const [showBaleModal, setShowBaleModal] = useState(false);
    const [currentBaleItemIndex, setCurrentBaleItemIndex] = useState(null);
    const [currentBaleDetails, setCurrentBaleDetails] = useState([]);
    const [lastResetId, setLastResetId] = useState(null);

    const openBaleModal = (index) => {
        const item = getValues(`items.${index}`);
        const currentRolls = getValues(`items.${index}.rolls`);
        setCurrentBaleItemIndex(index);
        
        const rollCountStr = currentRolls || (item ? item.rolls : '');
        const rollCount = parseInt(rollCountStr, 10);
        
        // Load existing details or start with empty rows based on rollCount
        let details = [];
        if (item && item.baleDetails && item.baleDetails.length > 0) {
            details = [...item.baleDetails];
            // Auto add more rows if the entered roll count is greater than current rows
            if (!isNaN(rollCount) && rollCount > details.length) {
                const diff = rollCount - details.length;
                for (let i = 0; i < diff; i++) {
                    details.push({ baleNo: `Roll ${details.length + 1}`, qty: '' });
                }
            }
        } else {
            const initialCount = !isNaN(rollCount) && rollCount > 0 ? rollCount : 3;
            details = Array.from({ length: initialCount }, (_, i) => ({
                baleNo: `Roll ${i + 1}`,
                qty: ''
            }));
        }
        setCurrentBaleDetails(details);
        setShowBaleModal(true);
    };

    const saveBaleDetails = () => {
        // Filter out completely empty rows
        const validDetails = currentBaleDetails.filter(d => d.baleNo || d.qty);

        const totalQty = parseFloat(validDetails.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0).toFixed(3));
        const totalRolls = validDetails.length;

        // Update form values
        setValue(`items.${currentBaleItemIndex}.baleDetails`, validDetails);
        setValue(`items.${currentBaleItemIndex}.quantity`, totalQty);
        setValue(`items.${currentBaleItemIndex}.rolls`, totalRolls);

        setShowBaleModal(false);
    };

    // Filter active POs
    const activePOs = purchaseOrders; // Can filter by status if needed

    const { register, control, handleSubmit, watch, setValue, reset, getValues, formState: { errors } } = useForm({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            challanNo: '',
            supplierId: '',
            poId: '',
            vehicleNo: '',
            remarks: '',
            items: [{ styleNo: '', buyerPO: '', itemId: '', rolls: '', lotNo: '', fabricFold: 100, quantity: '', unit: 'Meter', itemImage: null }],
            challanImage: null
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    useEffect(() => {
        if (id && lastResetId !== id) {
            const challanToEdit = challans.find(c => c.id === id);
            if (challanToEdit) {
                reset(challanToEdit);
                setLastResetId(id);
                if (challanToEdit.challanImage) setChallanPreview(challanToEdit.challanImage);
            }
        }
    }, [id, challans, reset, lastResetId]);

    const handleFileChange = (e, fieldName, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress to 70% quality
                    if (setPreview) setPreview(dataUrl);
                    setValue(fieldName, dataUrl);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleItemChange = (index, selectedId) => {
        if (selectedId) {
            const item = items.find(i => i.id === selectedId);
            if (item && item.image) {
                // Only auto-fill if no image is already set
                const currentImage = watch(`items.${index}.itemImage`);
                if (!currentImage) {
                    setValue(`items.${index}.itemImage`, item.image);
                }
            }
        }
    };

    const watchSupplierId = watch("supplierId");

    // Filter items based on selected supplier logic if needed, 
    // but usually item master is global. 
    // Could filter POs by supplier.
    const filteredPOs = activePOs.filter(po => !watchSupplierId || po.supplierId === watchSupplierId);

    const handlePOChange = (e) => {
        const selectedPOId = e.target.value;
        if (!selectedPOId) return;

        const selectedPO = purchaseOrders.find(po => po.id === selectedPOId);
        if (!selectedPO) return;

        // Calculate previously received quantities for this PO
        const relevantChallans = challans.filter(c => c.poId === selectedPOId && c.id !== id); // Exclude current if editing

        const newItems = selectedPO.items.map(poItem => {
            const prevReceived = parseFloat(relevantChallans.reduce((sum, c) => {
                const cItem = c.items?.find(i => i.itemId === poItem.itemId);
                return sum + (cItem ? parseFloat(cItem.quantity) || 0 : 0);
            }, 0).toFixed(3));

            const ordered = parseFloat(poItem.quantity) || 0;
            const pending = parseFloat(Math.max(0, ordered - prevReceived).toFixed(3));

            return {
                styleNo: selectedPO.styleNo || '',
                buyerPO: selectedPO.buyerPO || '',
                itemId: poItem.itemId,
                rolls: '', // Reset for new entry
                lotNo: '',
                fabricFold: 100,
                quantity: pending > 0 ? pending : 0, // Default to pending qty
                unit: poItem.unit || 'Meter',

                // Read-only stats for UI
                _ordered: ordered,
                _prevReceived: prevReceived,
                _pending: pending
            };
        });

        setValue('items', newItems);
    };

    const calculateStats = (itemId) => {
        // Fallback stats calculation if not populated from PO change (e.g. initial load or manual item add)
        // This is useful if items were saved without the _underscore props
        if (!watch("poId")) return null;

        const selectedPO = purchaseOrders.find(po => po.id === watch("poId"));
        if (!selectedPO) return null;

        const poItem = selectedPO.items.find(i => i.itemId === itemId);
        if (!poItem) return null;

        const relevantChallans = challans.filter(c => c.poId === watch("poId") && c.id !== id);
        const prevReceived = parseFloat(relevantChallans.reduce((sum, c) => {
            const cItem = c.items?.find(i => i.itemId === itemId);
            return sum + (cItem ? parseFloat(cItem.quantity) || 0 : 0);
        }, 0).toFixed(3));

        return {
            ordered: parseFloat(poItem.quantity) || 0,
            prevReceived: prevReceived
        };
    };

    const [saveError, setSaveError] = useState(null);

    const sanitizeData = (data) => {
        const cleaned = { ...data };
        // Ensure UUID fields are null if empty
        if (!cleaned.poId || cleaned.poId === "") cleaned.poId = null;
        if (!cleaned.supplierId || cleaned.supplierId === "") cleaned.supplierId = null;

        // Remove id if it's an empty string (for new records)
        if (cleaned.id === "") delete cleaned.id;

        return cleaned;
    };

    const onSubmit = async (data) => {
        setSaveError(null);

        const processedItems = data.items.map(item => {
            const fold = parseFloat(item.fabricFold) || 100;
            const qty = parseFloat(item.quantity) || 0;
            const actual = fold < 100 ? parseFloat((qty * (fold / 100)).toFixed(2)) : qty;
            return {
                ...item,
                fabricFold: fold,
                actualQty: actual
            };
        });

        const cleanData = sanitizeData({ ...data, items: processedItems });

        let result;
        if (id) {
            result = await updateChallan(id, cleanData);
        } else {
            result = await addChallan(cleanData);
        }

        // Only navigate if save was successful
        if (result && !result.error) {
            const savedId = id || (result.data && result.data[0]?.id);
            if (savedId) {
                navigate(`/challans/${savedId}`);
            } else {
                // Fallback if ID is lost or nested data structure changed
                console.warn("Save successful but ID not found for navigation. Returning to list.");
                navigate('/challans');
            }
        } else {
            const errorMsg = result?.error?.message || "Unknown error occurred.";
            setSaveError(errorMsg);
            // alert("Failed to save Challan: " + errorMsg); // Optional, mostly redundant with UI text
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-[95%] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/challans" className="text-sage-500 hover:text-sage-700">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-sage-800">{id ? 'Edit Inward Challan' : 'New Inward Challan'}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {saveError && (
                            <div className="text-red-600 font-semibold text-sm bg-red-50 px-3 py-1 rounded border border-red-200">
                                Error: {saveError}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm font-medium"
                        >
                            <Save className="w-4 h-4" />
                            {id ? 'Update Challan' : 'Save Challan'}
                        </button>
                    </div>
                </div>

                {/* General Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                    <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Challan Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Supplier</label>
                            <select
                                {...register("supplierId", { required: "Supplier is required" })}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">PO Reference (Optional)</label>
                            <select
                                {...register("poId", {
                                    onChange: handlePOChange
                                })}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                            >
                                <option value="">Select PO</option>
                                {filteredPOs.map(po => (
                                    <option key={po.id} value={po.id}>{po.poNumber}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Challan Date</label>
                            <input
                                type="date"
                                {...register("date", { required: "Date is required" })}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500"
                            />
                            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Challan Number</label>
                            <input
                                type="text"
                                {...register("challanNo", { required: "Challan No is required" })}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 placeholder-sage-300"
                                placeholder="e.g. CH-1029"
                            />
                            {errors.challanNo && <p className="text-red-500 text-xs mt-1">{errors.challanNo.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Vehicle/Transport</label>
                            <input
                                type="text"
                                {...register("vehicleNo")}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 placeholder-sage-300"
                                placeholder="Vehicle No / Transporter"
                            />
                        </div>
                    </div>
                </div>

                {/* File Uploads Card (New) */}
                <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                    <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Attachments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Vendor Challan Copy */}
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-2">Vendor Challan Copy</label>
                            <div className="border-2 border-dashed border-sage-200 rounded-lg p-4 text-center hover:bg-sage-50 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'challanImage', setChallanPreview)}
                                    className="w-full text-sm text-sage-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sage-100 file:text-sage-700 hover:file:bg-sage-200"
                                />
                                {challanPreview && (
                                    <div className="mt-4">
                                        <p className="text-xs text-sage-500 mb-1">Preview:</p>
                                        <img src={challanPreview} alt="Challan Preview" className="max-h-48 mx-auto rounded border border-sage-200 shadow-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Items Card */}
                <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                    <div className="flex justify-between items-center mb-4 border-b border-sage-100 pb-2">
                        <h3 className="text-lg font-semibold text-sage-800">Received Items</h3>
                        <button
                            type="button"
                            onClick={() => append({ styleNo: '', buyerPO: '', itemId: '', rolls: '', lotNo: '', fabricFold: 100, quantity: '', unit: 'Meter' })}
                            className="flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => {
                            // Calculate stats on the fly if not already in field (for hybrid cases)
                            const itemId = watch(`items.${index}.itemId`);
                            const currentQty = parseFloat(watch(`items.${index}.quantity`)) || 0;
                            const currentFold = parseFloat(watch(`items.${index}.fabricFold`));
                            const foldValue = isNaN(currentFold) ? 100 : currentFold;
                            const actualQty = foldValue < 100 ? (currentQty * (foldValue / 100)).toFixed(2) : currentQty;

                            const dynamicStats = calculateStats(itemId);

                            // Use dynamic stats if available, otherwise fallback to field props (if auto-populated)
                            const ordered = dynamicStats ? dynamicStats.ordered : (field._ordered || 0);
                            const prevReceived = dynamicStats ? dynamicStats.prevReceived : (field._prevReceived || 0);
                            const totalReceivedSoFar = parseFloat((prevReceived + currentQty).toFixed(3));
                            const pending = Math.max(0, parseFloat((ordered - totalReceivedSoFar).toFixed(3)));
                            const isExtra = totalReceivedSoFar > ordered;

                            return (
                                <div key={field.id} className="p-4 bg-sage-50 rounded-lg border border-sage-200 relative grid grid-cols-1 md:grid-cols-12 gap-4">
                                    {/* Style No */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Style No</label>
                                        <select
                                            {...register(`items.${index}.styleNo`)}
                                            onChange={(e) => {
                                                const selectedStyle = styles.find(s => s.styleNo === e.target.value);
                                                if (selectedStyle) {
                                                    setValue(`items.${index}.buyerPO`, selectedStyle.buyerPO || '');
                                                }
                                            }}
                                            className="w-full px-2 py-2 border border-sage-200 rounded-lg text-sm focus:ring-1 focus:ring-sage-500 outline-none"
                                        >
                                            <option value="">Select Style</option>
                                            {styles.map(s => (
                                                <option key={s.id} value={s.styleNo}>{s.styleNo}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Buyer PO */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Buyer PO</label>
                                        <input
                                            {...register(`items.${index}.buyerPO`)}
                                            readOnly
                                            className="w-full px-3 py-2 border border-sage-200 rounded-lg text-sm bg-sage-50 text-sage-500"
                                            placeholder="Auto-fill"
                                        />
                                    </div>

                                    {/* Item Select */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Item</label>
                                        <select
                                            {...register(`items.${index}.itemId`, {
                                                required: true,
                                                onChange: (e) => handleItemChange(index, e.target.value)
                                            })}
                                            className="w-full px-3 py-2 border border-sage-200 rounded-lg text-sm"
                                        >
                                            <option value="">Select Item</option>
                                            {items.map(i => (
                                                <option key={i.id} value={i.id}>{i.fabricCode ? `${i.fabricCode} | ${i.name}` : i.name}</option>
                                            ))}
                                        </select>
                                        {/* Stats Display */}
                                        {ordered > 0 && (
                                            <div className="mt-1 flex gap-2 text-[10px] text-sage-600">
                                                <span className="bg-sage-100 px-1.5 py-0.5 rounded">Ord: {ordered}</span>
                                                <span className="bg-sage-100 px-1.5 py-0.5 rounded">Prev: {prevReceived}</span>
                                                <span className={`px-1.5 py-0.5 rounded ${isExtra ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {isExtra ? `Extra: +${(totalReceivedSoFar - ordered).toFixed(2)}` : `Pend: ${pending.toFixed(2)}`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Rolls</label>
                                        <input
                                            type="number"
                                            {...register(`items.${index}.rolls`)}
                                            className="w-full px-2 py-2 border border-sage-200 rounded-lg text-sm"
                                            placeholder="0"
                                            readOnly={!!watch(`items.${index}.baleDetails`) && watch(`items.${index}.baleDetails`).length > 0}
                                        />
                                    </div>

                                    {/* Lot No */}
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Lot No</label>
                                        <input
                                            {...register(`items.${index}.lotNo`)}
                                            className="w-full px-2 py-2 border border-sage-200 rounded-lg text-sm"
                                            placeholder="Lot"
                                        />
                                    </div>

                                    {/* Fabric Fold */}
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] whitespace-nowrap font-medium text-sage-600 mb-1 leading-tight">Fabric Fold (L)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register(`items.${index}.fabricFold`)}
                                            className="w-full px-2 py-2 border border-sage-200 rounded-lg text-sm bg-white"
                                            placeholder="100"
                                        />
                                    </div>

                                    {/* Actual Than Qty */}
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] whitespace-nowrap font-medium text-sage-600 mb-1 leading-tight">Actual Than Qty</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={actualQty}
                                            className="w-full px-2 py-2 border border-sage-200 rounded-lg text-sm bg-sage-100 text-sage-700 font-bold"
                                        />
                                    </div>

                                    {/* Qty */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Total Qty</label>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openBaleModal(index)}
                                                className="px-1.5 py-2 bg-sage-100 text-sage-600 rounded-lg hover:bg-sage-200"
                                                title="Add Bale Details"
                                            >
                                                <List className="w-3.5 h-3.5" />
                                            </button>
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register(`items.${index}.quantity`, { required: true })}
                                                className={`w-full px-2 py-2 border rounded-lg text-sm ${watch(`items.${index}.baleDetails`) && watch(`items.${index}.baleDetails`).length > 0 ? 'bg-gray-50 border-sage-200' : 'border-sage-200'}`}
                                                placeholder="0.00"
                                                readOnly={!!watch(`items.${index}.baleDetails`) && watch(`items.${index}.baleDetails`).length > 0}
                                            />
                                        </div>
                                    </div>

                                    {/* Item Image */}
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Photo</label>
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer p-2 bg-sage-100 text-sage-600 rounded-lg hover:bg-sage-200 transition-colors" title="Upload Product Photo">
                                                <Camera className="w-4 h-4" />
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange(e, `items.${index}.itemImage`)}
                                                />
                                            </label>
                                            {(watch(`items.${index}.itemImage`) || items.find(i => i.id === watch(`items.${index}.itemId`))?.image) && (
                                                <div className="relative group flex flex-col items-center">
                                                    <img
                                                        src={watch(`items.${index}.itemImage`) || items.find(i => i.id === watch(`items.${index}.itemId`))?.image}
                                                        alt="Item"
                                                        className="w-10 h-10 object-cover rounded border border-sage-200 shadow-xs cursor-zoom-in hover:brightness-90 transition-all"
                                                        onClick={() => setZoomImage(watch(`items.${index}.itemImage`) || items.find(i => i.id === watch(`items.${index}.itemId`))?.image)}
                                                    />
                                                    {!watch(`items.${index}.itemImage`) && items.find(i => i.id === watch(`items.${index}.itemId`))?.image && (
                                                        <span className="text-[8px] text-sage-400 italic leading-none mt-0.5">Master</span>
                                                    )}
                                                    {watch(`items.${index}.itemImage`) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setValue(`items.${index}.itemImage`, null)}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-2 h-2" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Unit */}
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-sage-600 mb-1">Unit</label>
                                        <select
                                            {...register(`items.${index}.unit`)}
                                            className="w-full px-1 py-2 border border-sage-200 rounded-lg text-xs"
                                        >
                                            <option value="Meter">Mtr</option>
                                            <option value="Kg">Kg</option>
                                            <option value="Pcs">Pcs</option>
                                        </select>
                                    </div>

                                    {/* Remove Button */}
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="mb-1 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Remarks */}
                < div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6" >
                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Remarks / Note</label>
                        <textarea
                            {...register("remarks")}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 placeholder-sage-300"
                            rows="3"
                            placeholder="Any remarks about condition, shortages, etc."
                        ></textarea>
                    </div>
                </div >
                {/* Bale Details Modal */}
                {
                    showBaleModal && (() => {
                        const currentFold = parseFloat(watch(`items.${currentBaleItemIndex}.fabricFold`));
                        const currentFoldValue = isNaN(currentFold) ? 100 : currentFold;
                        const totalActualQty = currentBaleDetails.reduce((sum, d) => {
                            const q = parseFloat(d.qty) || 0;
                            const act = currentFoldValue < 100 ? q * (currentFoldValue / 100) : q;
                            return sum + act;
                        }, 0);

                        return (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                                    <div className="p-4 border-b border-sage-100 flex justify-between items-center bg-sage-50 rounded-t-xl">
                                        <h3 className="font-bold text-sage-800">Bale/Roll Details</h3>
                                        <button onClick={() => setShowBaleModal(false)} className="text-sage-400 hover:text-sage-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-sage-600 mb-1">
                                            <div className="col-span-1 text-center">#</div>
                                            <div className="col-span-4">Roll/Bale No</div>
                                            <div className="col-span-3">Quantity</div>
                                            <div className="col-span-3">Actual Qty</div>
                                            <div className="col-span-1"></div>
                                        </div>

                                        {currentBaleDetails.map((detail, idx) => {
                                            const qtyVal = parseFloat(detail.qty) || 0;
                                            const actualVal = currentFoldValue < 100 ? (qtyVal * (currentFoldValue / 100)).toFixed(2) : qtyVal;
                                            return (
                                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-1 text-center text-sm text-sage-500">{idx + 1}</div>
                                                    <div className="col-span-4">
                                                        <input
                                                            value={detail.baleNo}
                                                            onChange={(e) => {
                                                                const newDetails = [...currentBaleDetails];
                                                                newDetails[idx].baleNo = e.target.value;
                                                                setCurrentBaleDetails(newDetails);
                                                            }}
                                                            className="w-full px-2 py-1.5 border border-sage-200 rounded text-sm"
                                                            placeholder={`Roll ${idx + 1}`}
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={detail.qty}
                                                            onChange={(e) => {
                                                                const newDetails = [...currentBaleDetails];
                                                                newDetails[idx].qty = e.target.value;
                                                                setCurrentBaleDetails(newDetails);
                                                            }}
                                                            className="w-full px-2 py-1.5 border border-sage-200 rounded text-sm"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={actualVal > 0 ? actualVal : ''}
                                                            className="w-full px-2 py-1.5 border border-sage-200 rounded text-sm bg-sage-50 text-sage-600"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="col-span-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newDetails = currentBaleDetails.filter((_, i) => i !== idx);
                                                                setCurrentBaleDetails(newDetails);
                                                            }}
                                                            className="text-red-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        <button
                                            type="button"
                                            onClick={() => setCurrentBaleDetails([...currentBaleDetails, { baleNo: '', qty: '' }])}
                                            className="flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800 mt-2"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Row
                                        </button>
                                    </div>

                                    <div className="p-4 border-t border-sage-100 bg-gray-50 rounded-b-xl flex justify-between items-center">
                                        <div className="text-sm flex gap-4">
                                            <div>
                                                <span className="text-sage-600">Total Qty: </span>
                                                <span className="font-bold text-sage-800">
                                                    {currentBaleDetails.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sage-600">Actual Qty: </span>
                                                <span className="font-bold text-teal-700">
                                                    {totalActualQty.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowBaleModal(false)}
                                                className="px-4 py-2 text-sage-600 hover:bg-sage-100 rounded-lg text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={saveBaleDetails}
                                                className="px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 text-sm font-medium"
                                            >
                                                Apply & Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                }
            </form >

            {/* Zoom Image Modal */}
            {zoomImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setZoomImage(null)}
                >
                    <div className="relative max-w-5xl max-h-full w-full flex items-center justify-center bg-white/5 rounded-xl overflow-hidden p-2">
                        <img
                            src={zoomImage}
                            alt="Zoomed"
                            className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded"
                        />
                        <button
                            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                            onClick={() => setZoomImage(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChallanForm;
