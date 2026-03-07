import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder } from '../context/PurchaseOrderContext';
import { Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SupplierForm = () => {
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
    const navigate = useNavigate();
    const { id } = useParams();
    const { suppliers, addSupplier, updateSupplier } = usePurchaseOrder();

    useEffect(() => {
        if (id) {
            const supplier = suppliers.find(s => s.id === id);
            if (supplier) {
                Object.keys(supplier).forEach(key => {
                    setValue(key, supplier[key]);
                });
            }
        }
    }, [id, suppliers, setValue]);

    const onSubmit = (data) => {
        if (id) {
            updateSupplier(id, data);
        } else {
            addSupplier(data);
        }
        navigate('/suppliers');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/suppliers" className="text-sage-500 hover:text-sage-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-sage-800">
                    {id ? 'Edit Supplier' : 'Add New Supplier'}
                </h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Supplier Name</label>
                        <input
                            {...register('name', { required: 'Supplier Name is required' })}
                            className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                            placeholder="e.g. Acme Corp"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Contact Person</label>
                        <input
                            {...register('contactPerson')}
                            className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Mobile</label>
                            <input
                                {...register('mobile', { required: 'Mobile is required for PO' })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="9876543210"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Email</label>
                            <input
                                {...register('email')}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">Phone (Landline)</label>
                            <input
                                {...register('phone')}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">GSTIN</label>
                            <input
                                {...register('gstin')}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="GSTIN Number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-sage-700 mb-1">PAN Card</label>
                            <input
                                {...register('pan')}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                                placeholder="PAN Number"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-sage-700 mb-1">Address</label>
                        <textarea
                            {...register('address')}
                            rows="3"
                            className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition-colors"
                            placeholder="Street address, City, Country"
                        ></textarea>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-sage-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-sage-700 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Save Supplier
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierForm;
