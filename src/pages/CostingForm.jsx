import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { ArrowLeft, Save, Plus, Trash2, Calculator, Printer, Upload, RotateCcw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logo from '../assets/logo.png';

const CostingForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCosting, updateCosting, costings, loading } = usePurchaseOrder();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
        defaultValues: {
            styleNo: '',
            buyerName: '',
            productName: '',
            season: '',
            orderQty: '',
            targetPrice: '',
            category: 'Women',
            fabricDetails: [{ type: '', gsm: '', cons: '', rate: '', amount: 0 }],
            trimsDetails: [{ item: '', rate: '', amount: 0 }], // amount is direct input for trims often, or rate/unit
            laborDetails: [
                { operation: 'Cutting', rate: 0 },
                { operation: 'Stitching', rate: 0 },
                { operation: 'Finishing', rate: 0 },
                { operation: 'Checking & Packing', rate: 0 }
            ],
            overheadDetails: [
                { type: 'Factory Overhead', amount: 0 },
                { type: 'Washing', amount: 0 },
                { type: 'Printing/Embroidery', amount: 0 },
                { type: 'Transport', amount: 0 }
            ],
            profitMargin: 15 // Default 15%
        }
    });

    const { fields: fabricFields, append: appendFabric, remove: removeFabric } = useFieldArray({ control, name: 'fabricDetails' });
    const { fields: trimsFields, append: appendTrims, remove: removeTrims } = useFieldArray({ control, name: 'trimsDetails' });
    const { fields: laborFields, append: appendLabor, remove: removeLabor } = useFieldArray({ control, name: 'laborDetails' });
    const { fields: overheadFields, append: appendOverhead, remove: removeOverhead } = useFieldArray({ control, name: 'overheadDetails' });

    // Watchers for calculations
    const watchedFabric = useWatch({ control, name: 'fabricDetails' });
    const watchedTrims = useWatch({ control, name: 'trimsDetails' });
    const watchedLabor = useWatch({ control, name: 'laborDetails' });
    const watchedOverhead = useWatch({ control, name: 'overheadDetails' });
    const profitMargin = useWatch({ control, name: 'profitMargin' });
    const orderQty = useWatch({ control, name: 'orderQty' });

    // Load Data
    useEffect(() => {
        if (id && costings.length > 0) {
            const costing = costings.find(c => c.id === id);
            if (costing) {
                reset(costing);
                setPreviewImage(costing.image);
            }
        }
    }, [id, costings, reset]);

    // Calculations
    const [totals, setTotals] = useState({
        fabric: 0,
        trims: 0,
        labor: 0,
        overhead: 0,
        production: 0,
        fob: 0,
        orderValue: 0
    });

    useEffect(() => {
        const totalFabric = watchedFabric?.reduce((sum, item) => {
            const amount = (parseFloat(item.cons) || 0) * (parseFloat(item.rate) || 0);
            return sum + amount;
        }, 0) || 0;

        const totalTrims = watchedTrims?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
        const totalLabor = watchedLabor?.reduce((sum, item) => sum + (parseFloat(item.rate) || 0), 0) || 0;
        const totalOverhead = watchedOverhead?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;

        const totalProduction = totalFabric + totalTrims + totalLabor + totalOverhead;
        const profitAmount = totalProduction * ((parseFloat(profitMargin) || 0) / 100);
        const finalFOB = totalProduction + profitAmount;
        const totalOrderVal = finalFOB * (parseFloat(orderQty) || 0);

        setTotals({
            fabric: totalFabric,
            trims: totalTrims,
            labor: totalLabor,
            overhead: totalOverhead,
            production: totalProduction,
            fob: finalFOB,
            orderValue: totalOrderVal
        });

    }, [watchedFabric, watchedTrims, watchedLabor, watchedOverhead, profitMargin, orderQty]);

    // Image Upload
    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setPreviewImage(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false });

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        const costingData = {
            ...data,
            image: previewImage,
            totalFabricCost: totals.fabric,
            totalTrimsCost: totals.trims,
            totalLaborCost: totals.labor,
            totalOverheadCost: totals.overhead,
            totalProductionCost: totals.production,
            finalFOB: totals.fob,
            totalOrderValue: totals.orderValue
        };

        if (id) {
            await updateCosting(id, costingData);
        } else {
            await addCosting(costingData);
        }
        setIsSubmitting(false);
        navigate('/costing'); // Route to list or back to dashboard? Ideally list. For now, let's assume dashboard or a list page
    };

    const handlePrint = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80); // Navy Blue
        doc.text("Madan Creation", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text("Garment Costing Sheet", 105, 28, { align: 'center' });

        // Product Info
        doc.autoTable({
            startY: 35,
            head: [['Style No', 'Buyer', 'Season', 'Qty', 'Category']],
            body: [[
                watch('styleNo'),
                watch('buyerName'),
                watch('season'),
                watch('orderQty'),
                watch('category')
            ]],
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] }
        });

        let currentY = doc.lastAutoTable.finalY + 10;

        // Fabric
        doc.text("Fabric Cost", 14, currentY);
        doc.autoTable({
            startY: currentY + 2,
            head: [['Type', 'GSM', 'Cons.', 'Rate', 'Amount']],
            body: watchedFabric.map(row => [
                row.type,
                row.gsm,
                row.cons,
                row.rate,
                ((parseFloat(row.cons) || 0) * (parseFloat(row.rate) || 0)).toFixed(2)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [100, 116, 139] } // Slate-500
        });
        currentY = doc.lastAutoTable.finalY + 5;
        doc.text(`Total Fabric: ${totals.fabric.toFixed(2)}`, 140, currentY, { align: 'right' });

        // Trims & Accessories
        currentY += 10;
        doc.text("Trims & Accessories", 14, currentY);
        doc.autoTable({
            startY: currentY + 2,
            head: [['Item', 'Rate', 'Amount']],
            body: watchedTrims.map(row => [row.item, row.rate, row.amount]),
            theme: 'striped',
            headStyles: { fillColor: [100, 116, 139] }
        });
        currentY = doc.lastAutoTable.finalY + 5;
        doc.text(`Total Trims: ${totals.trims.toFixed(2)}`, 140, currentY, { align: 'right' });


        // Summary Table
        currentY += 15;
        doc.autoTable({
            startY: currentY,
            head: [['Cost Component', 'Amount']],
            body: [
                ['Total Fabric Cost', totals.fabric.toFixed(2)],
                ['Total Trims Cost', totals.trims.toFixed(2)],
                ['Total Labor Cost', totals.labor.toFixed(2)],
                ['Total Overhead', totals.overhead.toFixed(2)],
                ['Total Production Cost', totals.production.toFixed(2)],
                [`Profit Margin (${watch('profitMargin')}%)`, (totals.fob - totals.production).toFixed(2)],
                ['Final FOB Price (Per Piece)', totals.fob.toFixed(2)],
                ['Total Order Value', totals.orderValue.toFixed(2)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74], halign: 'center' }, // Green-600
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
        });

        doc.save(`Costing_${watch('styleNo') || 'Draft'}.pdf`);
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md -mx-8 -mt-8 px-8 py-4 mb-6 border-b border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2 text-slate-800">
                            <Calculator className="w-6 h-6 text-indigo-600" />
                            {id ? 'Edit Costing' : 'New Costing Sheet'}
                        </h1>
                        <p className="text-gray-500 text-sm">Calculate precise garment production costs</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => reset()} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm">
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button type="button" onClick={handlePrint} className="px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm font-medium">
                        <Printer className="w-4 h-4" /> Print / PDF
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 disabled:opacity-50 text-sm font-bold"
                    >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Saving...' : 'Save Costing'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                {/* 1. Product Info & Image */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <h3 className="md:col-span-2 text-lg font-semibold text-gray-800 border-b pb-2 mb-2">Product Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Style Number</label>
                            <input {...register('styleNo', { required: 'Required' })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. ST-2024-001" />
                            {errors.styleNo && <span className="text-xs text-red-500">{errors.styleNo.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                            <input {...register('buyerName')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                            <input {...register('productName')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                            <input {...register('season')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. SS24" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Quantity</label>
                            <input type="number" {...register('orderQty')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label>
                            <input type="number" step="0.01" {...register('targetPrice')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select {...register('category')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="Men">Men</option>
                                <option value="Women">Women</option>
                                <option value="Kids">Kids</option>
                                <option value="Unisex">Unisex</option>
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl h-64 flex items-center justify-center cursor-pointer transition-colors ${previewImage ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
                            <input {...getInputProps()} />
                            {previewImage ? (
                                <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                            ) : (
                                <div className="text-center text-gray-400 p-4">
                                    <Upload className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">Drag & drop image here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Fabric Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Fabric Details</h3>
                        <button type="button" onClick={() => appendFabric({ type: '', gsm: '', cons: '', rate: '', amount: 0 })} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Add Fabric
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Fabric Type</th>
                                    <th className="px-4 py-3 w-24">GSM</th>
                                    <th className="px-4 py-3 w-24">Cons. (m)</th>
                                    <th className="px-4 py-3 w-28">Rate</th>
                                    <th className="px-4 py-3 w-32 text-right">Amount</th>
                                    <th className="px-4 py-3 w-10 rounded-r-lg"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fabricFields.map((field, index) => {
                                    const amount = (parseFloat(watchedFabric?.[index]?.cons) || 0) * (parseFloat(watchedFabric?.[index]?.rate) || 0);
                                    return (
                                        <tr key={field.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-2">
                                                <input {...register(`fabricDetails.${index}.type`)} className="w-full px-2 py-1 outline-none bg-transparent" placeholder="e.g. Cotton Poplin" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input {...register(`fabricDetails.${index}.gsm`)} className="w-full px-2 py-1 outline-none bg-transparent" placeholder="120" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" step="0.01" {...register(`fabricDetails.${index}.cons`)} className="w-full px-2 py-1 outline-none bg-transparent" placeholder="0.00" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" step="0.01" {...register(`fabricDetails.${index}.rate`)} className="w-full px-2 py-1 outline-none bg-transparent" placeholder="0.00" />
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                {amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button type="button" onClick={() => removeFabric(index)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold text-gray-800">
                                <tr>
                                    <td colSpan="4" className="px-4 py-3 text-right">Total Fabric Cost:</td>
                                    <td className="px-4 py-3 text-right">{totals.fabric.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* 3. Trims & Accessories */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Trims & Accessories</h3>
                        <button type="button" onClick={() => appendTrims({ item: '', rate: '', amount: 0 })} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Item Name</th>
                                    <th className="px-4 py-3 w-32 text-right">Cost (Amount)</th>
                                    <th className="px-4 py-3 w-10 rounded-r-lg"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {trimsFields.map((field, index) => (
                                    <tr key={field.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2">
                                            <input {...register(`trimsDetails.${index}.item`)} className="w-full px-2 py-1 outline-none bg-transparent" placeholder="e.g. Buttons, Zippers" />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <input type="number" step="0.01" {...register(`trimsDetails.${index}.amount`)} className="w-full px-2 py-1 outline-none bg-transparent text-right" placeholder="0.00" />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button type="button" onClick={() => removeTrims(index)} className="text-red-400 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold text-gray-800">
                                <tr>
                                    <td className="px-4 py-3 text-right">Total Trims Cost:</td>
                                    <td className="px-4 py-3 text-right">{totals.trims.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* 4. Labor Cost & 5. Overhead */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Labor */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-semibold text-gray-800">Labor Cost</h3>
                            <button type="button" onClick={() => appendLabor({ operation: '', rate: 0 })} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <tbody className="divide-y divide-gray-100">
                                {laborFields.map((field, index) => (
                                    <tr key={field.id}>
                                        <td className="py-2 pr-2">
                                            <input {...register(`laborDetails.${index}.operation`)} className="w-full px-2 py-1 border-b border-gray-100 focus:border-indigo-500 outline-none" placeholder="Operation" />
                                        </td>
                                        <td className="py-2 w-24 text-right">
                                            <input type="number" step="0.01" {...register(`laborDetails.${index}.rate`)} className="w-full px-2 py-1 border-b border-gray-100 focus:border-indigo-500 outline-none text-right" placeholder="0.00" />
                                        </td>
                                        <td className="py-2 w-8 text-center">
                                            <button type="button" onClick={() => removeLabor(index)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="font-bold text-gray-800 border-t">
                                <tr>
                                    <td className="py-3 text-right">Total Labor:</td>
                                    <td className="py-3 text-right">{totals.labor.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Overhead */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-semibold text-gray-800">Overheads</h3>
                            <button type="button" onClick={() => appendOverhead({ type: '', amount: 0 })} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <tbody className="divide-y divide-gray-100">
                                {overheadFields.map((field, index) => (
                                    <tr key={field.id}>
                                        <td className="py-2 pr-2">
                                            <input {...register(`overheadDetails.${index}.type`)} className="w-full px-2 py-1 border-b border-gray-100 focus:border-indigo-500 outline-none" placeholder="Type" />
                                        </td>
                                        <td className="py-2 w-24 text-right">
                                            <input type="number" step="0.01" {...register(`overheadDetails.${index}.amount`)} className="w-full px-2 py-1 border-b border-gray-100 focus:border-indigo-500 outline-none text-right" placeholder="0.00" />
                                        </td>
                                        <td className="py-2 w-8 text-center">
                                            <button type="button" onClick={() => removeOverhead(index)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="font-bold text-gray-800 border-t">
                                <tr>
                                    <td className="py-3 text-right">Total Overhead:</td>
                                    <td className="py-3 text-right">{totals.overhead.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* 6. Summary Section */}
                <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold mb-6 border-b border-slate-700 pb-2">Costing Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between text-slate-300 text-sm">
                                <span>Total Fabric Cost</span>
                                <span>₹ {totals.fabric.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-300 text-sm">
                                <span>Total Trims Cost</span>
                                <span>₹ {totals.trims.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-300 text-sm">
                                <span>Total Labor Cost</span>
                                <span>₹ {totals.labor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-300 text-sm">
                                <span>Total Overhead</span>
                                <span>₹ {totals.overhead.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-700 pt-3 flex justify-between font-bold text-lg">
                                <span>Total Production Cost</span>
                                <span>₹ {totals.production.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-4 md:border-l md:border-slate-700 md:pl-12">
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Profit Margin (%)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" {...register('profitMargin')} className="w-20 bg-slate-700 border border-slate-600 text-white px-2 py-1 rounded text-right font-mono" />
                                    <span className="text-slate-400 text-sm">%</span>
                                </div>
                            </div>

                            <div className="bg-emerald-600 p-4 rounded-lg shadow-lg">
                                <label className="block text-xs font-bold text-emerald-100 uppercase mb-1 opacity-80">Final FOB Price (Per Piece)</label>
                                <div className="text-3xl font-bold text-white tracking-tight">
                                    ₹ {totals.fob.toFixed(2)}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm text-slate-400 pt-2">
                                <span>Total Order Value ({watch('orderQty') || 0} pcs)</span>
                                <span className="font-mono text-emerald-400">₹ {totals.orderValue.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default CostingForm;
