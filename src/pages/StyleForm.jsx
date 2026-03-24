import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { FileText, Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import { useFieldArray, useWatch } from 'react-hook-form';

const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Ethnic Wear', 'Lingerie', 'Activewear', 'Accessories', 'Kids Wear'];
const ORDER_TYPES = ['Sampling', 'New', 'Repeat', 'Cancelled/Reject'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

const StyleForm = () => {
    const { addStyle, updateStyle, styles } = usePurchaseOrder();
    const navigate = useNavigate();
    const { id } = useParams();
    const [previewImage, setPreviewImage] = useState(null);

    const { register, handleSubmit, setValue, reset, control, formState: { errors } } = useForm({
        defaultValues: {
            styleNo: '',
            buyerName: '',
            fabricName: '',
            fabricContent: '',
            fabricWidth: '',
            color: '',
            season: '',
            description: '',
            notes: '',
            buyerPO: '',
            buyerPOReceivedDate: '',
            poExpiredDate: '',
            category: '',
            section: '',
            orderType: 'New',
            leadTime: 0,
            poExtensionDate: '',
            stitchingRate: '',
            status: 'Active',
            perPcsAvg: '',
            buyerPOCopy: null,
            pcsPerSet: 1,
            setDetails: [{ name: '', rate: '', avg: '' }],
            sizeWiseDetails: SIZES.map(size => ({ size, qty: '', rate: '', amount: 0, sku: '' }))
        }
    });

    const { fields: sizeFields } = useFieldArray({
        control,
        name: "sizeWiseDetails"
    });

    const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
        control,
        name: "setDetails"
    });


    // Load Data for Edit Mode
    useEffect(() => {
        if (id && styles.length > 0) {
            const foundStyle = styles.find(s => s.id === id);
            if (foundStyle) {
                // Ensure sizeWiseDetails has at least the SIZES structure if missing
                const styleWithDetails = {
                    ...foundStyle,
                    pcsPerSet: foundStyle.pcsPerSet || 1,
                    setDetails: (foundStyle.setDetails && foundStyle.setDetails.length > 0)
                        ? foundStyle.setDetails
                        : [{ name: '', rate: '', avg: '' }],
                    sizeWiseDetails: (foundStyle.sizeWiseDetails && foundStyle.sizeWiseDetails.length > 0)
                        ? foundStyle.sizeWiseDetails
                        : SIZES.map(size => ({ size, qty: '', rate: '', amount: 0, sku: '' }))
                };
                reset(styleWithDetails);
                if (foundStyle.image) setPreviewImage(foundStyle.image);
            }
        }
    }, [id, styles, reset]);

    const watchedStyleNo = useWatch({ control, name: 'styleNo' });
    const watchedPcsPerSet = useWatch({ control, name: 'pcsPerSet' });
    const watchedSetDetails = useWatch({ control, name: 'setDetails' });
    const watchedDetails = useWatch({ control, name: 'sizeWiseDetails' });
    const watchedReceivedDate = useWatch({ control, name: 'buyerPOReceivedDate' });
    const watchedExpiredDate = useWatch({ control, name: 'poExpiredDate' });

    // Calculate Lead Time
    useEffect(() => {
        if (watchedReceivedDate && watchedExpiredDate) {
            const start = new Date(watchedReceivedDate);
            const end = new Date(watchedExpiredDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setValue('leadTime', diffDays || 0);
        }
    }, [watchedReceivedDate, watchedExpiredDate, setValue]);

    // Calculate Amounts and SKUs
    useEffect(() => {
        if (watchedDetails) {
            watchedDetails.forEach((detail, index) => {
                const qty = parseFloat(detail.qty) || 0;
                const rate = parseFloat(detail.rate) || 0;
                const amount = (qty * rate).toFixed(2);
                const size = SIZES[index];
                const sku = watchedStyleNo ? `${watchedStyleNo}-${size}` : '';

                if (detail.amount !== amount) setValue(`sizeWiseDetails.${index}.amount`, amount);
                if (detail.sku !== sku) setValue(`sizeWiseDetails.${index}.sku`, sku);
            });
        }
    }, [watchedDetails, watchedStyleNo, setValue]);

    // Handle pcsPerSet Change
    useEffect(() => {
        const currentCount = setFields.length;
        const targetCount = parseInt(watchedPcsPerSet) || 1;

        if (targetCount > currentCount) {
            for (let i = currentCount; i < targetCount; i++) {
                appendSet({ name: '', rate: '', avg: '' });
            }
        } else if (targetCount < currentCount) {
            for (let i = currentCount - 1; i >= targetCount; i--) {
                removeSet(i);
            }
        }
    }, [watchedPcsPerSet, appendSet, removeSet, setFields.length]);

    // Calculate Total Rate and Avg from Set Details
    useEffect(() => {
        if (watchedPcsPerSet > 1 && watchedSetDetails) {
            const totalRate = watchedSetDetails.reduce((sum, d) => sum + (parseFloat(d.rate) || 0), 0);
            const totalAvg = watchedSetDetails.reduce((sum, d) => sum + (parseFloat(d.avg) || 0), 0);

            setValue('stitchingRate', totalRate.toFixed(2));
            setValue('perPcsAvg', totalAvg.toFixed(2));
        }
    }, [watchedSetDetails, watchedPcsPerSet, setValue]);

    // Image Dropzone
    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    const handlePOCopyUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setValue('buyerPOCopy', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        console.log("Submitting style data:", data);
        const styleData = {
            ...data,
            image: previewImage
        };

        let success = false;
        let savedId = id;

        if (id) {
            success = await updateStyle(id, styleData);
        } else {
            // Check for duplicate
            const existingStyle = styles.find(s => s.styleNo?.trim().toUpperCase() === data.styleNo?.trim().toUpperCase());
            if (existingStyle) {
                const overwrite = window.confirm(`Style No "${data.styleNo}" already exists in the system.\n\nClick OK to Overwrite the existing style, or Cancel to Skip and abort saving.`);
                if (!overwrite) {
                    setIsSubmitting(false);
                    return; // Abort
                } else {
                    success = await updateStyle(existingStyle.id, styleData);
                    savedId = existingStyle.id;
                }
            } else {
                savedId = await addStyle(styleData);
                success = !!savedId;
            }
        }

        setIsSubmitting(false);

        if (success) {
            alert("Style saved successfully!");
            navigate(`/styles/${savedId}`);
        }
    };

    const onError = (errors) => {
        console.error("Validation errors:", errors);
        alert("Please fix the errors in the form before saving.\nCheck for required fields like 'Style No'.");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header - Flush Sticky */}
            <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md -mx-8 -mt-8 px-8 py-4 mb-6 border-b border-sage-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => navigate('/styles')} className="text-sage-500 hover:text-sage-700 transition-colors">
                        <span className="text-xl">←</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                            <span className="text-2xl">✂️</span>
                            {id ? 'Edit Style' : 'New Style'}
                        </h1>
                        <p className="text-sage-500 text-sm">Fill in the details to {id ? 'update' : 'create'} Style</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/styles')} className="px-6 py-2 border border-gray-300 rounded-lg text-sage-700 hover:bg-cream text-sm">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 shadow-sm flex items-center gap-2 disabled:opacity-50 text-sm font-bold">
                        <span className="text-sm">💾</span> {isSubmitting ? 'Saving...' : 'Save Style'}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-sage-100 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left Column: Image Upload */}
                    <div className="md:col-span-1 space-y-4">
                        <label className="block text-sm font-medium text-sage-700">Style Image</label>
                        <div
                            {...getRootProps()}
                            className={clsx(
                                "aspect-[3/4] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-sage-50 relative overflow-hidden group",
                                isDragActive ? "border-sage-500 bg-sage-100" : "border-sage-300 hover:border-sage-400"
                            )}
                        >
                            <input {...getInputProps()} />
                            {previewImage ? (
                                <>
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
                                        <div className="text-white text-xs flex flex-col items-center">
                                            <div className="text-white text-2xl mb-1">🖼️</div>
                                            <span>Change Image</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-100 hover:bg-red-600 shadow-sm z-10"
                                    >
                                        <span className="text-sm">🗑️</span>
                                    </button>
                                </>
                            ) : (
                                <div className="text-center text-sage-400 p-4">
                                    <div className="text-4xl opacity-50 mb-2">🖼️</div>
                                    <p className="text-xs">Drag & drop photo here</p>
                                    <p className="text-[10px] mt-1 text-sage-300">or click to browse</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Style Details */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                            <div>
                                <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Style No (REQUIRED) <span className="text-red-500">*</span></label>
                                <input
                                    {...register('styleNo', { required: 'Style No is required' })}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. ST-2024-001"
                                />
                                {errors.styleNo && <span className="text-xs text-red-500 font-bold">{errors.styleNo.message}</span>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Buyer Name</label>
                                <input
                                    {...register('buyerName')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. Zara, H&M"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Fabric Name</label>
                                <input
                                    {...register('fabricName')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. Cotton Poplin"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Color</label>
                                <input
                                    {...register('color')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. Navy Blue"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Fabric Content</label>
                                <input
                                    {...register('fabricContent')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. 100% Cotton"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Fabric Width</label>
                                <input
                                    {...register('fabricWidth')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. 58 inches"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Season / Collection</label>
                                <input
                                    {...register('season')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. SS24"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Style Status</label>
                                <select
                                    {...register('status')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none bg-white"
                                >
                                    <option value="Active">Active ✅</option>
                                    <option value="Deactive">Deactive ❌</option>
                                    <option value="Complete">Complete 🏆</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Buyer PO No</label>
                                <input
                                    {...register('buyerPO')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                    placeholder="e.g. PO-12345"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">PO Received Date</label>
                                <input
                                    type="date"
                                    {...register('buyerPOReceivedDate')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-sage-600 uppercase mb-1">PO Expired Date</label>
                                <input
                                    type="date"
                                    {...register('poExpiredDate')}
                                    className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-xs font-medium text-sage-600 uppercase mb-1">Description / Notes</label>
                            <textarea
                                {...register('notes')}
                                rows="3"
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none"
                                placeholder="Any additional details..."
                            />
                        </div>
                    </div>

                    {/* New Fields Section */}
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 bg-sage-50/50 p-4 rounded-xl border border-sage-100">
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Category</label>
                            <select
                                {...register('category')}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm"
                            >
                                <option value="">Select Category</option>
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Section</label>
                            <input
                                {...register('section')}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm"
                                placeholder="e.g. Ethnic, Western"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Order Type</label>
                            <select
                                {...register('orderType')}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm"
                            >
                                {ORDER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Set Type</label>
                            <select
                                {...register('pcsPerSet')}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm bg-blue-50/50"
                            >
                                <option value="1">1 Pcs (Single)</option>
                                <option value="2">2 Pcs Set</option>
                                <option value="3">3 Pcs Set</option>
                                <option value="4">4 Pcs Set</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Total Stitching Rate</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('stitchingRate')}
                                readOnly={watchedPcsPerSet > 1}
                                className={clsx(
                                    "w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm",
                                    watchedPcsPerSet > 1 && "bg-gray-50 text-sage-600 font-bold"
                                )}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Total Per pcs Avg.</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('perPcsAvg')}
                                readOnly={watchedPcsPerSet > 1}
                                className={clsx(
                                    "w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm",
                                    watchedPcsPerSet > 1 && "bg-gray-50 text-sage-600 font-bold"
                                )}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Set Details Table */}
                    {watchedPcsPerSet > 1 && (
                        <div className="md:col-span-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100 space-y-3">
                            <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                Set Component Details
                            </h3>
                            <div className="overflow-hidden border border-blue-100 rounded-lg">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-blue-100/50 text-blue-800 font-bold uppercase">
                                        <tr>
                                            <th className="px-3 py-2">Piece Name</th>
                                            <th className="px-3 py-2 w-32">Rate (₹)</th>
                                            <th className="px-3 py-2 w-32">Fabric Avg (m)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50 bg-white/50">
                                        {setFields.map((field, index) => (
                                            <tr key={field.id}>
                                                <td className="px-2 py-1">
                                                    <input
                                                        {...register(`setDetails.${index}.name`)}
                                                        className="w-full px-2 py-1 bg-transparent border-none focus:ring-0 outline-none placeholder:text-blue-200"
                                                        placeholder={`e.g. ${index === 0 ? 'Top' : index === 1 ? 'Bottom' : 'Dupatta'}`}
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        {...register(`setDetails.${index}.rate`)}
                                                        className="w-full px-2 py-1 bg-transparent border-none focus:ring-0 outline-none font-bold text-blue-900"
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        {...register(`setDetails.${index}.avg`)}
                                                        className="w-full px-2 py-1 bg-transparent border-none focus:ring-0 outline-none font-bold text-blue-900"
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Lead Time (Days)</label>
                            <input
                                {...register('leadTime')}
                                readOnly
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-100/50 text-blue-900 font-bold outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">PO Extension Date</label>
                            <input
                                type="date"
                                {...register('poExtensionDate')}
                                className="w-full px-3 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-500 outline-none text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-sage-800 uppercase mb-1">Buyer PO Copy (PDF/Image)</label>
                            <div className="flex items-center gap-3">
                                <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-dashed border-sage-300 rounded-lg bg-sage-50 hover:bg-sage-100 cursor-pointer transition-colors text-sm text-sage-600">
                                    <Upload className="w-4 h-4 text-sage-400" />
                                    <span>{useWatch({ control, name: 'buyerPOCopy' }) ? 'Change PO Copy' : 'Upload PO Copy'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={handlePOCopyUpload}
                                    />
                                </label>
                                {useWatch({ control, name: 'buyerPOCopy' }) && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-sage-100 rounded-lg border border-sage-200">
                                        <FileText className="w-4 h-4 text-sage-600" />
                                        <span className="text-xs font-medium text-sage-700">Contract Attached</span>
                                        <button
                                            type="button"
                                            onClick={() => setValue('buyerPOCopy', null)}
                                            className="p-1 hover:bg-sage-200 rounded text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Size Wise Order Grid */}
                    <div className="md:col-span-3 space-y-4">
                        <div className="flex items-center justify-between border-b border-sage-200 pb-2">
                            <h3 className="text-sm font-bold text-sage-800 uppercase tracking-wider">Size Wise Order Details</h3>
                        </div>
                        <div className="overflow-x-auto border border-sage-200 rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-sage-100 text-sage-800 font-bold uppercase text-[10px]">
                                    <tr>
                                        <th className="px-3 py-2 w-20">Size</th>
                                        <th className="px-3 py-2">SKU Code (Auto)</th>
                                        <th className="px-3 py-2 w-32">Order Qty</th>
                                        <th className="px-3 py-2 w-32">Rate</th>
                                        <th className="px-3 py-2 w-32 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sage-100">
                                    {sizeFields.map((field, index) => (
                                        <tr key={field.id} className="hover:bg-sage-50/30">
                                            <td className="px-3 py-2 font-bold text-sage-700">
                                                {field.size}
                                                <input type="hidden" {...register(`sizeWiseDetails.${index}.size`)} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    {...register(`sizeWiseDetails.${index}.sku`)}
                                                    readOnly
                                                    className="w-full bg-transparent border-none focus:ring-0 text-xs text-sage-500 font-mono"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    {...register(`sizeWiseDetails.${index}.qty`)}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none text-sm"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    {...register(`sizeWiseDetails.${index}.rate`)}
                                                    className="w-full px-2 py-1 border border-sage-200 rounded focus:ring-1 focus:ring-sage-500 outline-none text-sm"
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-sage-900">
                                                <input
                                                    {...register(`sizeWiseDetails.${index}.amount`)}
                                                    readOnly
                                                    className="w-full text-right bg-transparent border-none focus:ring-0 text-sm font-bold"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-sage-50 font-bold">
                                        <td colSpan="2" className="px-3 py-3 text-right">Grand Total:</td>
                                        <td className="px-3 py-3">
                                            {watchedDetails?.reduce((sum, d) => sum + (parseFloat(d.qty) || 0), 0)}
                                        </td>
                                        <td></td>
                                        <td className="px-3 py-3 text-right text-sage-900">
                                            ₹ {watchedDetails?.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </form>
    );
};

export default StyleForm;
