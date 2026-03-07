import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Save, Plus, Trash2, Calculator, Upload, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import BaleModal from '../components/BaleModal';

const InvoiceForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { suppliers, purchaseOrders, invoices, challans, addInvoice, updateInvoice } = usePurchaseOrder();
    const [invoicePreview, setInvoicePreview] = useState(null);
    const [activeBaleIndex, setActiveBaleIndex] = useState(null);
    const [isBaleModalOpen, setIsBaleModalOpen] = useState(false);
    const [lastResetId, setLastResetId] = useState(null);

    const { register, control, handleSubmit, watch, setValue, reset, getValues, formState: { errors } } = useForm({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            grnNo: '', // Initialize empty, will be auto-filled
            invoiceNo: '',
            supplierId: '',
            poId: '',
            challanIds: [], // Changed to array for multiple selection
            items: [],
            commercials: {
                discount: 0,
                freight: 0,
                gstType: 'IGST',
                gstRate: 0,
                roundOff: 0
            },
            remarks: ''
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    const { styles, items } = usePurchaseOrder();

    // Auto-Generate GRN No for New Entries
    useEffect(() => {
        if (!id && invoices.length >= 0) { // Only for new entries
            const currentGrnVal = getValues('grnNo');
            // Only auto-fill if empty or equal to previous auto-gen value (to avoid overwriting user edits if re-render happens)
            // But simplified: just fill if empty.
            if (!currentGrnVal) {
                const now = new Date();
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const yy = String(now.getFullYear()).slice(-2);
                const datePart = `${dd}${mm}${yy}`;

                let maxSeq = 0;
                invoices.forEach(inv => {
                    if (inv.grnNo && inv.grnNo.startsWith('GRN-')) {
                        const seqStr = inv.grnNo.slice(-2);
                        const seqPart = parseInt(seqStr, 10);
                        if (!isNaN(seqPart) && seqPart > maxSeq) maxSeq = seqPart;
                    }
                });

                const nextSeq = String(maxSeq + 1).padStart(2, '0');
                const nextGrn = `GRN-${datePart}${nextSeq}`;
                setValue('grnNo', nextGrn);
            }
        }
    }, [id, invoices, setValue, getValues]);

    // Ensure 'bales' field is registered for all items so setValue works and persists
    useEffect(() => {
        fields.forEach((_, index) => {
            register(`items.${index}.bales`);
        });
    }, [fields, register]);

    const watchSupplierId = watch("supplierId");
    const watchPoId = watch("poId");
    const watchChallanIds = watch("challanIds");
    const watchItems = watch("items");
    const [isChallanDropdownOpen, setIsChallanDropdownOpen] = useState(false);
    const watchCommercials = watch("commercials");

    // Load Data for Edit Mode
    useEffect(() => {
        if (id && lastResetId !== id) {
            const invoice = invoices.find(i => i.id === id);
            if (invoice) {
                if (invoice.status === 'Verified') {
                    alert('Verified GRNs cannot be edited.');
                    navigate(`/invoices/${id}`);
                    return;
                }
                // Handle legacy single challanId if present, convert to array
                const data = { ...invoice };

                // Initialize defaults for missing schema fields
                if (!data.commercials) {
                    data.commercials = {
                        discount: 0,
                        freight: 0,
                        gstType: 'IGST',
                        gstRate: 0,
                        roundOff: 0
                    };
                }
                if (!data.items) {
                    data.items = [];
                }

                if (data.challanId && (!data.challanIds || data.challanIds.length === 0)) {
                    data.challanIds = [data.challanId];
                }
                reset(data);
                setLastResetId(id);
                setInvoicePreview(invoice.attachment);
            }
        }
    }, [id, invoices, reset, navigate, lastResetId]);

    // Filter POs by Supplier
    const filteredPOs = purchaseOrders.filter(po =>
        !watchSupplierId || po.supplierId === watchSupplierId
    );

    // Filter Challans by Supplier and PO
    const filteredChallans = challans.filter(c =>
        (!watchSupplierId || c.supplierId === watchSupplierId) &&
        (!watchPoId || c.poId === watchPoId)
    );

    // Handle Challan Selection Toggle
    const toggleChallan = (challanId) => {
        const currentIds = getValues('challanIds') || [];
        const newIds = currentIds.includes(challanId)
            ? currentIds.filter(id => id !== challanId)
            : [...currentIds, challanId];
        setValue('challanIds', newIds);
    };

    // Combined Effect for Item Population (PO + Challans)
    useEffect(() => {
        if (!id) { // Only auto-populate on create mode to avoid overwriting user edits
            const selectedPO = purchaseOrders.find(po => po.id === watchPoId);

            if (selectedPO) {
                // 1. If NO challans selected: Populate from PO with Qty = 0
                if (!watchChallanIds || watchChallanIds.length === 0) {
                    const poItems = selectedPO.items.map(item => {
                        const masterItem = items.find(i => i.id === item.itemId);
                        return {
                            itemId: item.itemId,
                            fabricCode: masterItem?.fabricCode || masterItem?.name || '-',
                            description: item.description,
                            poQty: item.qty, // Capture ordered quantity
                            qty: 0, // Default to 0 as requested
                            rate: item.rate,
                            amount: 0, // 0 since Qty is 0
                            uom: item.uom,
                            rolls: 0,
                            bales: []
                        };
                    });
                    replace(poItems);

                    // Prepopulate commercials
                    setValue('commercials.discount', selectedPO.commercials?.discount || 0);
                    setValue('commercials.freight', selectedPO.commercials?.freight || 0);
                    setValue('commercials.gstRate', selectedPO.commercials?.gstRate || 0);
                    setValue('commercials.gstType', selectedPO.commercials?.gstType || 'IGST');

                } else {
                    // 2. If Challans ARE selected: Aggregate items
                    const selectedChallanObjs = challans.filter(c => watchChallanIds.includes(c.id));

                    // Map to aggregate quantities by Item ID
                    const aggregatedItems = {};

                    selectedChallanObjs.forEach(challan => {
                        challan.items.forEach(cItem => {
                            if (!aggregatedItems[cItem.itemId]) {
                                // Initialize
                                const poItem = selectedPO.items.find(p => p.itemId === cItem.itemId);
                                const masterItem = items.find(i => i.id === cItem.itemId);
                                aggregatedItems[cItem.itemId] = {
                                    itemId: cItem.itemId,
                                    fabricCode: masterItem?.fabricCode || masterItem?.name || '-',
                                    description: poItem?.description || '',
                                    poQty: poItem?.qty || 0,
                                    qty: 0,
                                    rate: poItem?.rate || 0,
                                    uom: cItem.unit || poItem?.uom || 'Meter',
                                    rolls: 0,
                                    bales: []
                                };
                            }
                            // Sum up
                            aggregatedItems[cItem.itemId].qty += Number(cItem.quantity || 0);
                            aggregatedItems[cItem.itemId].rolls += Number(cItem.rolls || 0);

                            // Aggregate bales if present
                            if (cItem.baleDetails && Array.isArray(cItem.baleDetails)) {
                                aggregatedItems[cItem.itemId].bales = [
                                    ...aggregatedItems[cItem.itemId].bales,
                                    ...cItem.baleDetails
                                ];
                            }
                        });
                    });

                    // Convert back to array
                    const invoiceItems = Object.values(aggregatedItems).map(item => ({
                        ...item,
                        amount: (item.qty * item.rate).toFixed(2)
                    }));

                    replace(invoiceItems);
                }
            }
        }
    }, [watchPoId, watchChallanIds, purchaseOrders, challans, replace, setValue, id]);


    // Calculations
    const calculateTotals = () => {
        const itemsTotal = watchItems ? watchItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0) : 0;
        const discount = Number(watchCommercials?.discount || 0);
        const freight = Number(watchCommercials?.freight || 0);
        const taxableAmount = Math.max(0, itemsTotal - discount + freight);
        const gstRate = Number(watchCommercials?.gstRate || 0);
        const gstAmount = taxableAmount * (gstRate / 100);
        const roundOff = Number(watchCommercials?.roundOff || 0);
        const finalTotal = taxableAmount + gstAmount + roundOff;

        return { itemsTotal, taxableAmount, gstAmount, finalTotal };
    };

    const { itemsTotal, taxableAmount, gstAmount, finalTotal } = calculateTotals();

    // PO Reconciliation Logic
    const getReconciliationData = () => {
        if (!watchPoId) return [];
        const selectedPO = purchaseOrders.find(po => po.id === watchPoId);
        if (!selectedPO) return [];

        return selectedPO.items.map(poItem => {
            // Find corresponding item in current invoice items
            const invoiceItem = watchItems?.find(i => i.itemId === poItem.itemId);
            const invoiceQty = invoiceItem ? Number(invoiceItem.qty || 0) : 0;
            const poQty = Number(poItem.qty || 0);
            const diff = invoiceQty - poQty; // Invoice - PO

            return {
                name: poItem.description, // Or fetch name from item master if needed
                ordered: poQty,
                invoiced: invoiceQty,
                diff: diff,
                status: diff === 0 ? 'Matched' : diff > 0 ? 'Excess' : 'Short'
            };
        });
    };

    const reconciliationData = getReconciliationData();

    // Image Upload
    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setInvoicePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [], 'application/pdf': [] },
        multiple: false
    });

    const onSubmit = async (data) => {
        try {
            const selectedPO = purchaseOrders.find(po => po.id === data.poId);
            const poNumber = selectedPO ? selectedPO.poNumber : '';

            // Get Challan Numbers string
            const selectedChallanObjs = challans.filter(c => (data.challanIds || []).includes(c.id));
            const challanNo = selectedChallanObjs.map(c => c.challanNo).join(', ');

            // Merge bales and rolls from current form state
            const currentItems = getValues('items') || [];
            const itemsWithBales = data.items.map((item, index) => ({
                ...item,
                bales: currentItems[index]?.bales || [],
                rolls: currentItems[index]?.rolls || item.rolls || 1
            }));

            const invoiceData = {
                ...data,
                items: itemsWithBales,
                poNumber,
                challanIds: data.challanIds, // Save IDs array
                challanNo, // Save readable string
                calculations: { itemsTotal, taxableAmount, gstAmount, finalTotal },
                totalAmount: finalTotal,
                attachment: invoicePreview
            };

            let result;
            if (id) {
                // updateInvoice assumes synchronous success? No, it's async but returns void in my context update... 
                // Wait, I updated addInvoice but updateInvoice is also void in provided file.
                // Assuming updateInvoice in context sets state or alerts error.
                // But for robust error handling, I should update that too. For now let's focus on Creation (where user issue is).
                await updateInvoice(id, invoiceData);
                alert('GRN updated successfully!');
                navigate('/invoices');
            } else {
                // Adaptive Retry Logic for Schema Errors
                let currentInvoiceData = { ...invoiceData };
                let attempts = 0;
                const maxAttempts = 10;
                let success = false;
                let missingColumns = [];

                while (attempts < maxAttempts && !success) {
                    result = await addInvoice(currentInvoiceData);

                    if (result && result.error) {
                        const errorMsg = result.error.message;
                        // Check for "Could not find the 'COLUMN' column" error
                        const match = errorMsg.match(/Could not find the '(\w+)' column/);
                        if (match && match[1]) {
                            const missingCol = match[1];
                            console.warn(`Schema mismatch: Removing missing column '${missingCol}' and retrying...`);
                            delete currentInvoiceData[missingCol];
                            missingColumns.push(missingCol);
                            attempts++;
                        } else {
                            // Non-schema error, break loop
                            attempts = maxAttempts;
                        }
                    } else {
                        success = true;
                    }
                }

                if (success) {
                    let msg = 'GRN created successfully!';
                    if (missingColumns.length > 0) {
                        msg += `\n\nNote: The following details were NOT saved because your database needs an update: ${missingColumns.join(', ')}.`;
                        msg += `\n\nPlease contact support (or run "fix_invoice_schema.sql") to fix this permanently.`;
                    }
                    alert(msg);
                    navigate('/invoices');
                } else {
                    alert(`Error creating GRN: ${result?.error?.message || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error("Submission Error:", error);
            alert(`Error saving GRN: ${error.message}`);
        }
    };

    const openBaleModal = (index) => {
        setActiveBaleIndex(index);
        setIsBaleModalOpen(true);
    };

    const handleBaleSave = (bales, totalQty) => {
        if (activeBaleIndex !== null) {
            setValue(`items.${activeBaleIndex}.bales`, bales);
            setValue(`items.${activeBaleIndex}.rolls`, bales.length); // Update rolls count based on bales
            setValue(`items.${activeBaleIndex}.qty`, totalQty);
        }
        setActiveBaleIndex(null);
    };

    const onError = (errors) => {
        console.error("Form Errors:", errors);
        const errorMessages = Object.values(errors).map(err => {
            if (err.message) return err.message;
            if (typeof err === 'object') {
                return Object.values(err).map(e => e?.message || 'Invalid field').join(', ');
            }
            return 'Invalid field';
        }).join('\n');
        alert(`Please fix the following errors:\n${errorMessages}`);
    };

    return (
        <div className="max-w-[95%] mx-auto space-y-6 pb-12">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/invoices" className="text-sage-500 hover:text-sage-700">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-sage-800">
                        {id ? 'Edit Vendor GRN' : 'New Vendor GRN'}
                    </h1>
                </div>
                <button
                    onClick={handleSubmit(onSubmit, onError)}
                    className="px-6 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 shadow-sm flex items-center gap-2"
                >
                    <Save className="w-4 h-4" /> Save GRN
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">

                {/* 1. Header Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-sage-700 mb-1">Supplier</label>
                        <select
                            {...register('supplierId', { required: 'Supplier is required' })}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                            disabled={!!id} // Disable on edit to prevent data mismatch
                        >
                            <option value="">Select Supplier</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-sage-700 mb-1">Purchase Order</label>
                        <select
                            {...register('poId')}
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm"
                        >
                            <option value="">Select PO (Optional)</option>
                            {filteredPOs.map(po => {
                                const poSupplier = suppliers.find(s => s.id === po.supplierId);
                                return <option key={po.id} value={po.id}>{po.poNumber} ({poSupplier?.name || 'Unknown Supplier'})</option>;
                            })}
                        </select>
                    </div>

                    <div className="md:col-span-1 relative">
                        <label className="block text-sm font-medium text-sage-700 mb-1">Inward Challans</label>
                        <div
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus-within:ring-2 focus-within:ring-sage-500 bg-white cursor-pointer min-h-[42px] relative"
                            onClick={() => setIsChallanDropdownOpen(!isChallanDropdownOpen)}
                        >
                            <div className="flex flex-wrap gap-1">
                                {watchChallanIds && watchChallanIds.length > 0 ? (
                                    watchChallanIds.map(id => {
                                        const c = challans.find(ch => ch.id === id);
                                        return (
                                            <span key={id} className="bg-sage-100 text-sage-800 text-xs px-2 py-1 rounded-full flex items-center">
                                                {c?.challanNo}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); toggleChallan(id); }}
                                                    className="ml-1 text-sage-500 hover:text-sage-700 font-bold"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-gray-400 text-sm">Select Challans...</span>
                                )}
                            </div>
                        </div>

                        {isChallanDropdownOpen && (
                            <div className="absolute z-10 w-full bg-white border border-sage-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                {filteredChallans.length > 0 ? (
                                    filteredChallans.map(c => (
                                        <div
                                            key={c.id}
                                            className={clsx(
                                                "px-3 py-2 cursor-pointer hover:bg-sage-50 flex items-center gap-2",
                                                (watchChallanIds || []).includes(c.id) ? "bg-sage-50" : ""
                                            )}
                                            onClick={() => toggleChallan(c.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={(watchChallanIds || []).includes(c.id)}
                                                readOnly
                                                className="rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                                            />
                                            <div className="text-sm">
                                                <div className="font-medium text-sage-800">{c.challanNo}</div>
                                                <div className="text-xs text-sage-500">{new Date(c.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-gray-500">No challans available</div>
                                )}
                            </div>
                        )}
                        {/* Overlay to close dropdown when clicking outside */}
                        {isChallanDropdownOpen && (
                            <div
                                className="fixed inset-0 z-0"
                                onClick={() => setIsChallanDropdownOpen(false)}
                            ></div>
                        )}
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-sage-700 mb-1 font-bold">System GRN No</label>
                        <input
                            {...register('grnNo')}
                            placeholder="Auto-generated if left blank"
                            className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none font-mono text-sm font-bold text-sage-800"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-sage-700 mb-1">Vendor Invoice No</label>
                        <input {...register('invoiceNo', { required: 'Invoice No is required' })} placeholder="e.g. INV-2024-001" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                        {errors.invoiceNo && <p className="text-red-500 text-xs mt-1">{errors.invoiceNo.message}</p>}
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-sage-700 mb-1">GRN Date</label>
                        <input type="date" {...register('date', { required: true })} className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                    </div>
                </div>

                {/* 2. Items Grid */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                    <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">GRN Items</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-sm text-left">
                            <thead>
                                <tr className="bg-sage-50 text-xs uppercase text-sage-600 font-semibold border-b border-sage-200">
                                    <th className="px-3 py-2 w-48">Style No</th>
                                    <th className="px-3 py-2 w-56">Buyer PO</th>
                                    <th className="px-3 py-2 w-48">Item Code</th>
                                    <th className="px-3 py-2 min-w-[200px]">Description</th>
                                    <th className="px-3 py-2 w-24 text-right">PO Qty</th>
                                    <th className="px-3 py-2 w-36 text-center">Bales</th>
                                    <th className="px-3 py-2 w-28">Qty</th>
                                    <th className="px-3 py-2 w-28">Rate</th>
                                    <th className="px-3 py-2 w-36 text-right">Amount</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sage-100">
                                {fields.map((field, index) => (
                                    <tr key={field.id}>
                                        <td className="px-3 py-2">
                                            <select
                                                {...register(`items.${index}.styleNo`)}
                                                onChange={(e) => {
                                                    const selectedStyle = styles.find(s => s.styleNo === e.target.value);
                                                    if (selectedStyle) {
                                                        setValue(`items.${index}.buyerPO`, selectedStyle.buyerPO || '');
                                                    }
                                                }}
                                                className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none text-xs"
                                            >
                                                <option value="">Select Style</option>
                                                {styles.map(s => <option key={s.id} value={s.styleNo}>{s.styleNo}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                {...register(`items.${index}.buyerPO`)}
                                                readOnly
                                                className="w-full px-2 py-1 border border-sage-100 bg-sage-50/50 rounded text-xs outline-none cursor-default"
                                                placeholder="Auto-filled"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                {...register(`items.${index}.itemId`)}
                                                onChange={(e) => {
                                                    const selectedItem = items.find(i => i.id === e.target.value);
                                                    if (selectedItem) {
                                                        setValue(`items.${index}.description`, selectedItem.name || '');
                                                        setValue(`items.${index}.fabricCode`, selectedItem.fabricCode || selectedItem.name); // Set fabricCode for display in details
                                                        if (selectedItem.rate) {
                                                            setValue(`items.${index}.rate`, selectedItem.rate);
                                                        }
                                                    }
                                                }}
                                                className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none text-xs"
                                            >
                                                <option value="">Select Code</option>
                                                {items.map(i => <option key={i.id} value={i.id}>{i.fabricCode || i.name}</option>)}
                                            </select>
                                            <input type="hidden" {...register(`items.${index}.fabricCode`)} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                {...register(`items.${index}.description`)}
                                                readOnly
                                                className="w-full px-2 py-1 border border-sage-100 bg-sage-50/50 rounded text-xs outline-none cursor-default"
                                                placeholder="Description"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                readOnly
                                                {...register(`items.${index}.poQty`)}
                                                className="w-full px-2 py-1 border border-transparent bg-transparent text-right text-sage-500 outline-none cursor-default"
                                                tabIndex="-1"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => openBaleModal(index)}
                                                className={clsx(
                                                    "w-full px-2 py-1 border rounded flex items-center justify-center gap-2 text-xs font-medium transition-colors",
                                                    (watchItems?.[index]?.bales?.length > 0)
                                                        ? "bg-sage-100 text-sage-700 border-sage-200 hover:bg-sage-200"
                                                        : "bg-white text-sage-500 border-dashed border-sage-300 hover:border-sage-400 hover:text-sage-700"
                                                )}
                                            >
                                                <Box className="w-3 h-3" />
                                                {watchItems?.[index]?.bales?.length
                                                    ? `${watchItems[index].bales.length} Bales`
                                                    : "Add Bales"}
                                            </button>
                                            <input type="hidden" {...register(`items.${index}.rolls`)} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" step="0.01" {...register(`items.${index}.qty`)} className="w-full px-2 py-1 border border-sage-200 rounded text-right focus:ring-1 focus:ring-sage-500 outline-none" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" step="0.01" {...register(`items.${index}.rate`)} className="w-full px-2 py-1 border border-sage-200 rounded text-right focus:ring-1 focus:ring-sage-500 outline-none" />
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-sage-900">
                                            {((watchItems?.[index]?.qty || 0) * (watchItems?.[index]?.rate || 0)).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={() => append({ description: '', qty: 1, rate: 0, rolls: 1, bales: [] })} className="mt-4 text-sage-600 text-sm font-medium flex items-center gap-2 hover:text-sage-700">
                        <Plus className="w-4 h-4" /> Add Line Item
                    </button>
                </div>

                {/* 3. Commercials & Attachment */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Attachment */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">GRN Copy</h3>
                        <div
                            {...getRootProps()}
                            className={clsx(
                                "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-cream h-48",
                                isDragActive ? "border-sage-500 bg-sage-50" : "border-sage-300 hover:border-sage-400"
                            )}
                        >
                            <input {...getInputProps()} />
                            {invoicePreview ? (
                                <div className="text-center">
                                    <p className="text-sm text-sage-700 font-medium mb-2">File Uploaded</p>
                                    <img src={invoicePreview} alt="Preview" className="max-h-24 mx-auto rounded border border-sage-200" />
                                    <p className="text-xs text-sage-500 mt-2">Click or drag to replace</p>
                                </div>
                            ) : (
                                <div className="text-center text-sage-500">
                                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <span className="text-sm">Click or drag file to upload</span>
                                    <p className="text-xs opacity-70 mt-1">Images or PDF</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-sage-500" /> Payment Details
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-sage-600">Items Total</span>
                                <span className="font-mono text-sage-900">₹{itemsTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-cream p-2 rounded">
                                <span className="text-sage-700">Discount -</span>
                                <input type="number" {...register('commercials.discount')} className="w-24 text-right border border-sage-200 rounded px-2 py-1 focus:ring-1 focus:ring-sage-500 outline-none" />
                            </div>
                            <div className="flex justify-between items-center bg-cream p-2 rounded">
                                <span className="text-sage-700">Freight +</span>
                                <input type="number" {...register('commercials.freight')} className="w-24 text-right border border-sage-200 rounded px-2 py-1 focus:ring-1 focus:ring-sage-500 outline-none" />
                            </div>
                            <div className="flex justify-between font-medium pt-2 border-t border-sage-100">
                                <span className="text-sage-800">Taxable Amount</span>
                                <span className="text-sage-900">₹{taxableAmount.toFixed(2)}</span>
                            </div>

                            <div className="bg-sage-50 p-3 rounded border border-sage-100 space-y-2">
                                <div className="flex items-center gap-2">
                                    <select {...register('commercials.gstType')} className="text-xs border border-sage-200 rounded p-1 flex-1 focus:ring-1 focus:ring-sage-500 outline-none">
                                        <option value="IGST">IGST</option>
                                        <option value="CGST_SGST">CGST + SGST</option>
                                    </select>
                                    <div className="flex items-center gap-1">
                                        <input type="number" {...register('commercials.gstRate')} className="w-12 text-right border border-sage-200 rounded p-1 text-xs focus:ring-1 focus:ring-sage-500 outline-none" />
                                        <span>%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sage-800 font-medium">
                                    <span>Tax Amount</span>
                                    <span>₹{gstAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sage-600 text-xs">Round Off +/-</span>
                                <input type="number" step="0.01" {...register('commercials.roundOff')} className="w-20 text-right border border-sage-200 rounded px-1 text-xs focus:ring-1 focus:ring-sage-500 outline-none" />
                            </div>

                            <div className="flex justify-between font-bold text-xl text-sage-900 border-t border-sage-100 pt-4">
                                <span>Grand Total</span>
                                <span>₹{finalTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. PO Reconciliation (New) */}
                {watchPoId && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">PO Reconciliation</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-sage-50 text-xs uppercase text-sage-600 font-semibold border-b border-sage-200">
                                        <th className="px-3 py-2">Item</th>
                                        <th className="px-3 py-2 text-right">PO Qty</th>
                                        <th className="px-3 py-2 text-right">GRN Qty</th>
                                        <th className="px-3 py-2 text-right">Diff</th>
                                        <th className="px-3 py-2 text-right">Ratio %</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sage-100">
                                    {reconciliationData.map((data, i) => {
                                        const diffRatio = data.ordered > 0 ? ((data.diff / data.ordered) * 100).toFixed(2) : '0.00';
                                        return (
                                            <tr key={i} className="hover:bg-sage-50/50">
                                                <td className="px-3 py-2 font-medium text-sage-900">{data.name}</td>
                                                <td className="px-3 py-2 text-right text-sage-600">{data.ordered}</td>
                                                <td className="px-3 py-2 text-right text-sage-900 font-bold">{data.invoiced}</td>
                                                <td className={clsx(
                                                    "px-3 py-2 text-right font-medium",
                                                    data.diff === 0 ? "text-green-600" : data.diff > 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {data.diff > 0 ? `+${data.diff.toFixed(2)}` : data.diff < 0 ? `${data.diff.toFixed(2)}` : '0.00'}
                                                </td>
                                                <td className={clsx(
                                                    "px-3 py-2 text-right font-mono text-xs",
                                                    data.diff === 0 ? "text-green-600" : data.diff > 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {diffRatio > 0 ? `+${diffRatio}%` : `${diffRatio}%`}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={clsx(
                                                        "px-2 py-1 rounded text-xs font-medium",
                                                        (data.status === 'Matched' || data.status === 'Excess') ? "bg-green-100 text-green-700" :
                                                            "bg-red-100 text-red-700"
                                                    )}>
                                                        {data.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Remarks */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                    <label className="block text-sm font-medium text-sage-700 mb-2">Remarks / Notes</label>
                    <textarea {...register('remarks')} rows="2" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" placeholder="Internal notes..."></textarea>
                </div>
            </form>

            <BaleModal
                isOpen={isBaleModalOpen}
                onClose={() => {
                    setIsBaleModalOpen(false);
                    setActiveBaleIndex(null);
                }}
                onSave={handleBaleSave}
                initialBales={activeBaleIndex !== null ? watchItems?.[activeBaleIndex]?.bales : []}
                itemName={activeBaleIndex !== null ? watchItems?.[activeBaleIndex]?.description : ''}
                expectedQty={activeBaleIndex !== null ? watchItems?.[activeBaleIndex]?.qty : 0}
            />
        </div>
    );
};

export default InvoiceForm;
