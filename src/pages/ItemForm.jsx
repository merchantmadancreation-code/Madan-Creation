import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { useDropzone } from 'react-dropzone';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const ItemForm = () => {
    const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
        defaultValues: {
            materialType: 'Fabric',
            unit: 'Meter',
            rateType: 'Per Meter'
        }
    });
    const navigate = useNavigate();
    const { id } = useParams();
    const { items, addItem, updateItem } = usePurchaseOrder();
    const [previewImage, setPreviewImage] = useState(null);

    const description = useWatch({ control, name: 'description' });
    const materialType = useWatch({ control, name: 'materialType' });

    useEffect(() => {
        if (id) {
            const item = items.find(i => i.id === id);
            if (item) {
                reset(item);
                setPreviewImage(item.image);
            }
        }
    }, [id, items, reset]);

    // Auto-generate Fabric Code
    useEffect(() => {
        if (!id && description) {
            const initials = description.split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .replace(/[^A-Z]/g, '');

            const count = (items.length + 1).toString().padStart(4, '0');
            const code = `${initials}${count}`;
            setValue('fabricCode', code);
        }
    }, [description, id, items.length, setValue]);

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

    const onSubmit = (data) => {
        const formattedData = {
            ...data,
            openingStock: data.openingStock ? parseFloat(data.openingStock) : 0,
            rate: data.rate ? parseFloat(data.rate) : 0,
            image: previewImage
        };

        if (id) {
            updateItem(id, formattedData);
            navigate(`/items`);
        } else {
            addItem(formattedData);
            navigate(`/items`);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/items" className="text-sage-500 hover:text-sage-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-sage-800">
                    {id ? 'Edit Item' : 'Add New Item'}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-sage-100 p-6 h-fit">
                    <form id="item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Item Name</label>
                                <input
                                    {...register('name', { required: 'Item Name is required' })}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                    placeholder="e.g. Widget A"
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Fabric Code (Auto)</label>
                                <input
                                    {...register('fabricCode')}
                                    className="w-full px-3 py-2 bg-sage-50 border border-sage-300 rounded-lg outline-none text-sage-600 font-mono"
                                    readOnly
                                    placeholder="Auto-generated"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">HSN Code</label>
                            <input
                                {...register('hsnCode')}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="e.g. 5208"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Description</label>
                            <textarea
                                {...register('description')}
                                rows="2"
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="e.g. Cotton Red Fabric"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Material Type</label>
                                <select
                                    {...register('materialType')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                >
                                    <option value="Fabric">Fabric</option>
                                    <option value="Accessories">Accessories</option>
                                    <option value="Trims">Trims</option>
                                    <option value="Packaging">Packaging</option>
                                    <option value="Finished Goods">Finished Goods</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Opening Stock</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('openingStock')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Item Rate</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('rate')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Unit of Measurement</label>
                                <select
                                    {...register('rateType')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                >
                                    <option value="Per Meter">Per Meter</option>
                                    <option value="Per Kg">Per Kg</option>
                                    <option value="Per Pcs">Per Pcs</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {materialType === 'Fabric' && (
                                <div>
                                    <label className="block text-sm font-medium text-sage-700 mb-1">Fabric Type</label>
                                    <select
                                        {...register('fabricType')}
                                        className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Cotton">Cotton</option>
                                        <option value="Rayon">Rayon</option>
                                        <option value="Polyester">Polyester</option>
                                        <option value="Blend">Blend</option>
                                        <option value="Linen">Linen</option>
                                        <option value="Silk">Silk</option>
                                        <option value="Wool">Wool</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Width (Inches/CM)</label>
                                <input
                                    {...register('fabricWidth')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                    placeholder="e.g. 60 inches"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Color</label>
                                <input
                                    {...register('color')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                    placeholder="e.g. Red"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Design</label>
                                <select
                                    {...register('fabricDesign')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                >
                                    <option value="">Select Design</option>
                                    <option value="Print">Print</option>
                                    <option value="Dyed">Dyed</option>
                                    <option value="Greige">Greige</option>
                                    <option value="Yarn Dyed">Yarn Dyed</option>
                                    <option value="Solid">Solid</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-sage-700 mb-1">Unit</label>
                                <select
                                    {...register('unit')}
                                    className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none"
                                >
                                    <option value="Meter">Meter</option>
                                    <option value="kg">kg</option>
                                    <option value="Pcs">Pcs</option>
                                    <option value="Yard">Yard</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Right Column: Image Upload & Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                        <h3 className="text-lg font-semibold text-sage-800 mb-4">Item Image</h3>
                        <div
                            {...getRootProps()}
                            className={clsx(
                                "border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors h-96 overflow-hidden relative",
                                isDragActive ? "border-sage-500 bg-sage-50" : "border-sage-300 hover:border-sage-400 bg-cream",
                                !previewImage && "p-6"
                            )}
                        >
                            <input {...getInputProps()} />
                            {previewImage ? (
                                <div className="relative group w-full h-full flex justify-center items-center bg-gray-50">
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 transition-opacity shadow-md hover:bg-red-600 z-10"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-sage-500">
                                    <span className="text-5xl block mb-3">🖼️</span>
                                    <span className="font-medium text-base">Click or drag & drop<br />to upload image</span>
                                    <span className="text-xs text-sage-400 mt-2 block">Supports: JPG, PNG, WEBP</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        form="item-form"
                        className="w-full bg-sage-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-sage-700 transition-colors shadow-md text-lg font-medium"
                    >
                        <Save className="w-5 h-5" />
                        Save Item
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemForm;
