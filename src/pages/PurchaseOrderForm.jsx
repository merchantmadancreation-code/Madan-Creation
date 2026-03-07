import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { useDropzone } from 'react-dropzone';
import { Save, Plus, Trash2, ArrowLeft, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const PurchaseOrderForm = () => {
    const { loading, suppliers, items, addPurchaseOrder, updatePurchaseOrder, purchaseOrders, styles } = usePurchaseOrder();
    const navigate = useNavigate();
    const { id } = useParams();
    const [previewImages, setPreviewImages] = useState([]);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        defaultValues: {
            // ... (defaults remain same, relying on reset for edit)
            buyerDetails: {
                companyName: 'Madan Creation',
                address: '138-139, Ashid Nagar, Oxford International Public School, Sanganer, Jaipur - 3020239',
                gstin: '08CPAPS4393K1ZB',
                pan: 'CPAPS4393K',
                contactPerson: 'Kuldeep Singh',
                mobile: '9928230187'
            },
            poNumber: 'Auto-generated',
            poDate: new Date().toISOString().split('T')[0],
            deliveryDate: '',
            validity: '',
            items: [{
                itemId: '',
                description: '',
                styleNo: '',
                buyerPO: '',
                articleCode: '',
                hsnCode: '',
                materialType: '',
                fabricDetails: '',
                color: '',
                qty: 1,
                uom: 'Meter',
                tolerance: '5',
                packingType: 'Roll',
                qtyPerRoll: '',
                rate: 0,
                amount: 0
            }],
            commercials: {
                discount: 0,
                freight: 0,
                gstType: 'IGST',
                gstRate: 12
            },
            terms: {
                deliveryAddress: '138-139, Ashid Nagar, Oxford International Public School, Sanganer, Jaipur - 3020239',
                transportMode: 'Road',
                partialDelivery: 'No',
                paymentTerms: '30 Days Credit',
                qualityTerms: 'As per approved sample',
                generalTerms: ''
            },
            authorization: {
                preparedBy: 'Kuldeep Singh',
                approvedBy: 'Kuldeep Singh Naruka'
            }
        }
    });

    // Load Data for Edit Mode
    useEffect(() => {
        if (id && !loading && purchaseOrders.length > 0) {
            const po = purchaseOrders.find(p => p.id === id);
            if (po) {
                // Enforce the fixed Approved By name even for existing records
                // Unpack 'commercials' if it contains extra data (terms, buyerDetails, etc.)
                const unpackedData = {
                    ...po,
                    terms: po.commercials?.terms || po.terms || {},
                    buyerDetails: po.commercials?.buyerDetails || po.buyerDetails || {},
                    supplierDetails: po.commercials?.supplierDetails || po.supplierDetails || {},
                    authorization: po.commercials?.authorization || po.authorization || {},
                    calculations: po.commercials?.calculations || po.calculations || {},
                    attachment: po.commercials?.attachment || po.attachment,
                    poDate: po.date || po.poDate, // Map DB date to form poDate
                    items: Array.isArray(po.items) ? po.items.filter(i => i) : [] // CRITICAL: Ensure items is an array AND filter nulls
                };

                const fixedPO = {
                    ...unpackedData,
                    authorization: {
                        ...(unpackedData.authorization || {}),
                        approvedBy: 'Kuldeep Singh Naruka'
                    }
                };
                reset(fixedPO);
                const attachments = unpackedData.attachment;
                setPreviewImages(Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []));
            }
        }
    }, [id, purchaseOrders, loading, reset]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = watch("items");
    const watchCommercials = watch("commercials");
    const watchSupplierId = watch("supplierId");

    // Auto-fill Supplier Details
    // Use a ref to track if we've already filled for this ID to prevent loops
    const [lastAutoFilledSupplierId, setLastAutoFilledSupplierId] = useState(null);

    useEffect(() => {
        if (watchSupplierId && watchSupplierId !== lastAutoFilledSupplierId) {
            const supplier = suppliers && suppliers.find(s => s.id === watchSupplierId);
            if (supplier) {
                setValue('supplierDetails', {
                    name: supplier.name,
                    address: supplier.address || '',
                    gstin: supplier.gstin || '',
                    pan: supplier.pan || '',
                    contact: supplier.contactPerson || '',
                    mobile: supplier.mobile || supplier.phone || ''
                });
                setLastAutoFilledSupplierId(watchSupplierId);
            }
        }
    }, [watchSupplierId, suppliers, setValue, lastAutoFilledSupplierId]);

    // Handle Item Selection
    const handleItemChange = (index, itemId) => {
        const selectedItem = items && items.find(i => i.id === itemId);
        if (selectedItem) {
            setValue(`items.${index}.description`, selectedItem.description);
            setValue(`items.${index}.articleCode`, selectedItem.fabricCode);
            setValue(`items.${index}.hsnCode`, selectedItem.hsnCode || '');
            setValue(`items.${index}.materialType`, selectedItem.materialType);
            setValue(`items.${index}.fabricDetails`, `${selectedItem.fabricType || ''} ${selectedItem.fabricWidth ? `| ${selectedItem.fabricWidth}` : ''}`);
            setValue(`items.${index}.color`, selectedItem.color);
            setValue(`items.${index}.uom`, selectedItem.unit);
            setValue(`items.${index}.rate`, selectedItem.rate || 0);
        }
    };

    // Handle Style Selection
    const handleStyleChange = (index, styleNo) => {
        const selectedStyle = styles && styles.find(s => s.styleNo === styleNo);
        if (selectedStyle) {
            setValue(`items.${index}.buyerPO`, selectedStyle.buyerPO || '');
        }
    };

    // Calculations
    const calculateTotals = () => {
        const currentItems = Array.isArray(watchItems) ? watchItems.filter(i => i) : []; // Filter nulls
        const itemsTotal = currentItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
        const discount = Number(watchCommercials?.discount || 0);
        const freight = Number(watchCommercials?.freight || 0);
        const taxableAmount = Math.max(0, itemsTotal - discount + freight);
        const gstRate = Number(watchCommercials?.gstRate || 0);
        const gstAmount = taxableAmount * (gstRate / 100);
        const finalTotal = taxableAmount + gstAmount;

        return { itemsTotal, taxableAmount, gstAmount, finalTotal };
    };

    const { itemsTotal, taxableAmount, gstAmount, finalTotal } = calculateTotals();

    // Show loading state if data is fetching
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
                <span className="ml-2 text-sage-600">Loading data...</span>
            </div>
        );
    }

    // Image Dropzone
    const onDrop = (acceptedFiles) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                setPreviewImages(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: true
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        // Ensure Approved By is explicitly set to the fixed value
        // Calculate amounts for items before saving
        const calculatedItems = data.items.map(item => ({
            ...item,
            amount: (Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2)
        }));

        const poData = {
            ...data,
            items: calculatedItems,
            poNumber: id ? data.poNumber : null, // Let context handle generation if new
            calculations: { itemsTotal, taxableAmount, gstAmount, finalTotal },
            attachment: previewImages.length > 0 ? previewImages : null,
            authorization: {
                ...data.authorization,
                approvedBy: 'Kuldeep Singh Naruka'
            }
        };

        try {
            let success = false;
            if (id) {
                success = await updatePurchaseOrder(id, poData);
                if (success) alert("Purchase Order updated successfully!");
            } else {
                const newId = await addPurchaseOrder(poData);
                success = !!newId;
                if (success) alert("Purchase Order created successfully!");
            }

            if (success) {
                navigate('/purchase-orders');
            }
        } catch (error) {
            console.error("Error saving PO:", error);
            alert("An unexpected error occurred while saving. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onError = (errors) => {
        console.error("Validation Errors:", errors);
        alert("Please fix the validation errors in the form before saving.");
    };



    return (
        <div className="max-w-[95%] mx-auto pb-12">
            <div className="sticky top-0 z-30 bg-cream -mt-8 pt-8 pb-4 border-b border-sage-200 mb-6 flex items-center gap-4">
                <Link to="/purchase-orders" className="text-sage-500 hover:text-sage-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-sage-800">
                    {id ? 'Edit Purchase Order' : 'Create Purchase Order (ERP Mode)'}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">

                {/* Section 1: Parties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Buyer Details</h3>
                        <div className="space-y-3">
                            <input {...register('buyerDetails.companyName')} placeholder="Company Name" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            <textarea {...register('buyerDetails.address')} placeholder="Address" rows="2" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input {...register('buyerDetails.gstin')} placeholder="GSTIN" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                                <input {...register('buyerDetails.pan')} placeholder="PAN" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input {...register('buyerDetails.contactPerson')} placeholder="Contact Person" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                                <input {...register('buyerDetails.mobile')} placeholder="Contact No" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 border-b border-sage-100 pb-2">Supplier Details</h3>
                        <div className="space-y-3">
                            <select
                                {...register('supplierId', { required: 'Supplier is required' })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg bg-cream focus:ring-2 focus:ring-sage-500 outline-none"
                            >
                                <option value="">Select Supplier to Auto-fill</option>
                                {suppliers && suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {errors.supplierId && <span className="text-red-500 text-sm">{errors.supplierId.message}</span>}

                            <input {...register('supplierDetails.name')} placeholder="Supplier Name" className="w-full px-3 py-2 border border-sage-200 rounded-lg bg-sage-50" readOnly />
                            <textarea {...register('supplierDetails.address')} placeholder="Address" rows="2" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input {...register('supplierDetails.gstin')} placeholder="GSTIN" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                                <input {...register('supplierDetails.pan')} placeholder="PAN" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input {...register('supplierDetails.contact')} placeholder="Contact Person" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                                <input {...register('supplierDetails.mobile')} placeholder="Contact No" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: PO Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-sage-500 uppercase mb-1">PO Number</label>
                        <input {...register('poNumber')} disabled className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-lg font-mono text-sage-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-sage-500 uppercase mb-1">PO Date</label>
                        <input type="date" {...register('poDate')} className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Delivery Date</label>
                        <input type="date" {...register('deliveryDate')} className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-sage-500 uppercase mb-1">Validity</label>
                        <input {...register('validity')} placeholder="e.g. 15 Days" className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                    </div>
                </div>

                {/* Section 3: Items */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 overflow-x-auto">
                    <h3 className="text-lg font-semibold text-sage-800 mb-4">Item Details</h3>
                    <table className="w-full min-w-[1000px] text-sm text-left">
                        <thead>
                            <tr className="bg-sage-50 text-xs uppercase text-sage-600 font-semibold border-b border-sage-200">
                                <th className="px-3 py-2 min-w-[250px]">Item Select</th>
                                <th className="px-3 py-2 min-w-[160px]">Style No.</th>
                                <th className="px-3 py-2 min-w-[160px]">Buyer PO</th>
                                <th className="px-3 py-2 min-w-[140px]">Article Code</th>
                                <th className="px-3 py-2 min-w-[100px]">HSN</th>
                                <th className="px-3 py-2 min-w-[300px]">Description</th>
                                <th className="px-3 py-2 min-w-[120px]">Color</th>
                                <th className="px-3 py-2 min-w-[100px]">Qty</th>
                                <th className="px-3 py-2 min-w-[100px]">UOM</th>
                                <th className="px-3 py-2 min-w-[120px]">Rate</th>
                                <th className="px-3 py-2 min-w-[140px]">Amount</th>
                                <th className="px-3 py-2 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-100">
                            {fields.map((field, index) => (
                                <tr key={field.id} className="align-top">
                                    <td className="px-2 py-2">
                                        <select
                                            {...register(`items.${index}.itemId`, {
                                                onChange: (e) => handleItemChange(index, e.target.value)
                                            })}
                                            className="w-full px-2 py-1 border border-sage-200 rounded text-sm focus:ring-1 focus:ring-sage-500 outline-none"
                                        >
                                            <option value="">Select...</option>
                                            {items && items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            list="styleOptions"
                                            {...register(`items.${index}.styleNo`, {
                                                onChange: (e) => handleStyleChange(index, e.target.value)
                                            })}
                                            className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none"
                                            placeholder="Style No"
                                        />
                                    </td>
                                    <td className="px-2 py-2"><input {...register(`items.${index}.buyerPO`)} className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none" placeholder="Buyer PO" /></td>
                                    <td className="px-2 py-2"><input {...register(`items.${index}.articleCode`)} className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none" placeholder="Code" /></td>
                                    <td className="px-2 py-2"><input {...register(`items.${index}.hsnCode`)} className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none" placeholder="HSN" /></td>
                                    <td className="px-2 py-2"><textarea {...register(`items.${index}.description`)} rows="2" className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none" placeholder="Desc" /></td>
                                    <td className="px-2 py-2"><input {...register(`items.${index}.color`)} className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none" placeholder="Color" /></td>
                                    <td className="px-2 py-2"><input type="number" step="0.01" {...register(`items.${index}.qty`)} className="w-full px-2 py-1 border border-sage-200 rounded text-right bg-cream focus:ring-1 focus:ring-sage-500 outline-none" /></td>
                                    <td className="px-2 py-2"><input {...register(`items.${index}.uom`)} className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none" /></td>
                                    <td className="px-2 py-2"><input type="number" step="0.01" {...register(`items.${index}.rate`)} className="w-full px-2 py-1 border border-sage-200 rounded text-right bg-cream focus:ring-1 focus:ring-sage-500 outline-none" /></td>
                                    <td className="px-2 py-2 font-mono text-right pt-3 text-sage-900">
                                        {((watchItems?.[index]?.qty || 0) * (watchItems?.[index]?.rate || 0)).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={() => append({})} className="mt-4 text-sage-600 text-sm font-medium flex items-center gap-2 hover:text-sage-700">
                        <Plus className="w-4 h-4" /> Add Line Item
                    </button>
                </div>

                {/* Section 4 & 5: Commercials & Terms */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Terms */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-sage-100 space-y-4">
                        <h3 className="text-lg font-semibold text-sage-800 border-b border-sage-100 pb-2">Terms & Conditions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input {...register('terms.deliveryAddress')} placeholder="Delivery Address" className="col-span-2 px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            <input {...register('terms.transportMode')} placeholder="Transport Mode" className="px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            <select {...register('terms.partialDelivery')} className="px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none">
                                <option value="No">Partial Delivery: No</option>
                                <option value="Yes">Partial Delivery: Yes</option>
                            </select>
                            <input {...register('terms.paymentTerms')} placeholder="Payment Terms" className="col-span-2 px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                            <textarea {...register('terms.generalTerms')} placeholder="General Terms / Remarks" rows="3" className="col-span-2 px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" />
                        </div>
                    </div>

                    {/* Commercials Summary */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 h-fit">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-sage-500" /> Commercials
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-sage-600">Items Total</span>
                                <span className="font-mono text-sage-900">₹{itemsTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-cream p-2 rounded">
                                <span className="text-sage-700">Discount</span>
                                <input type="number" {...register('commercials.discount')} className="w-20 text-right border border-sage-200 rounded px-1 focus:ring-1 focus:ring-sage-500 outline-none" />
                            </div>
                            <div className="flex justify-between items-center bg-cream p-2 rounded">
                                <span className="text-sage-700">Freight</span>
                                <input type="number" {...register('commercials.freight')} className="w-20 text-right border border-sage-200 rounded px-1 focus:ring-1 focus:ring-sage-500 outline-none" />
                            </div>
                            <div className="flex justify-between font-medium pt-2 border-t border-sage-100">
                                <span className="text-sage-800">Taxable Amount</span>
                                <span className="text-sage-900">₹{taxableAmount.toFixed(2)}</span>
                            </div>
                            <div className="space-y-2 bg-sage-50 p-2 rounded border border-sage-100">
                                <div className="flex gap-2">
                                    <select {...register('commercials.gstType')} className="text-xs border border-sage-200 rounded p-1 w-full focus:ring-1 focus:ring-sage-500 outline-none">
                                        <option value="IGST">IGST (Inter-state)</option>
                                        <option value="CGST_SGST">CGST + SGST</option>
                                    </select>
                                    <input type="number" {...register('commercials.gstRate')} className="w-12 text-right border border-sage-200 rounded p-1 text-xs focus:ring-1 focus:ring-sage-500 outline-none" placeholder="%" />
                                    <span className="text-xs pt-1 text-sage-700">%</span>
                                </div>
                                <div className="flex justify-between text-sage-800 font-medium">
                                    <span>GST Amount</span>
                                    <span>₹{gstAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between font-bold text-xl text-sage-900 border-t border-sage-100 pt-4">
                                <span>Grand Total</span>
                                <span>₹{finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-sage-100">
                            {/* Image Attachment Preview */}
                            <div
                                {...getRootProps()}
                                className={clsx(
                                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-cream",
                                    isDragActive ? "border-sage-500 bg-sage-50" : "border-sage-300 hover:border-sage-400"
                                )}
                            >
                                <input {...getInputProps()} />
                                <div className="text-center text-xs text-sage-500 flex flex-col items-center">
                                    <span className="text-2xl mb-1">🖼️</span>
                                    <span>Upload Photos (Drag & Drop or Click)</span>
                                </div>
                            </div>
                            {previewImages && previewImages.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                                    {previewImages.map((imgSrc, idx) => (
                                        <div key={idx} className="relative group aspect-square bg-sage-50 rounded-lg overflow-hidden border border-sage-200">
                                            <img src={imgSrc} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewImages(prev => prev.filter((_, i) => i !== idx));
                                                }}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                                                title="Remove Image"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 6: Authorization */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Prepared By</label>
                        <input {...register('authorization.preparedBy')} className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none" placeholder="Name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Approved By</label>
                        <input {...register('authorization.approvedBy')} className="w-full px-3 py-2 border border-sage-200 rounded-lg text-sage-600 cursor-not-allowed outline-none bg-sage-50" readOnly />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => navigate('/purchase-orders')} className="px-6 py-2 border border-gray-300 rounded-lg text-sage-700 hover:bg-cream">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 shadow-sm flex items-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                        {isSubmitting ? 'Saving...' : 'Save Purchase Order'}
                    </button>
                </div>
                <datalist id="styleOptions">
                    {styles && styles.map(s => <option key={s.id} value={s.styleNo} />)}
                </datalist>
            </form>
        </div>
    );
};

export default PurchaseOrderForm;
