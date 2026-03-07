import React, { useState, useEffect } from 'react';
import { useTNA } from '../../context/TNAContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TNATemplateForm = () => {
    const { createTemplate, updateTemplate, templates } = useTNA();
    const navigate = useNavigate();
    const { id } = useParams();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        if (id) {
            const template = templates.find(t => t.id === id);
            if (template) {
                setName(template.name || '');
                setDescription(template.description || '');
                // Sort tasks by sequence_order if available
                const sortedTasks = [...(template.tna_template_tasks || [])].sort((a, b) =>
                    (a.sequence_order || 0) - (b.sequence_order || 0)
                );
                setTasks(sortedTasks.map(t => ({
                    name: t.name,
                    duration_days: t.duration_days,
                    stage: t.stage
                })));
            }
        } else {
            // Default tasks for new template
            setTasks([
                { name: 'Order Confirmation', duration_days: 1, stage: 'Pre-Production' },
                { name: 'Fabric Booking', duration_days: 3, stage: 'Pre-Production' }
            ]);
        }
    }, [id, templates]);

    const handleAddTask = () => {
        setTasks([...tasks, { name: '', duration_days: 1, stage: 'Pre-Production' }]);
    };

    const handleRemoveTask = (index) => {
        const newTasks = [...tasks];
        newTasks.splice(index, 1);
        setTasks(newTasks);
    };

    const handleTaskChange = (index, field, value) => {
        const newTasks = [...tasks];
        newTasks[index][field] = value;
        setTasks(newTasks);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let success = false;

        if (id) {
            success = await updateTemplate(id, name, description, tasks);
        } else {
            const newId = await createTemplate(name, description, tasks);
            success = !!newId;
        }

        if (success) {
            navigate('/tna/templates');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/tna/templates" className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">{id ? 'Edit TNA Template' : 'New TNA Template'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Template Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500"
                                placeholder="e.g. Standard Shirt Order"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500"
                                placeholder="Description"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Task Sequence</h2>
                        <button
                            type="button"
                            onClick={handleAddTask}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 text-sm flex items-center gap-1"
                        >
                            <Plus size={16} /> Add Task
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sequence</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration (Days)</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tasks.map((task, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <input
                                                type="text"
                                                required
                                                value={task.name}
                                                onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-sm"
                                                placeholder="Task Name"
                                            />
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={task.duration_days}
                                                onChange={(e) => handleTaskChange(index, 'duration_days', parseInt(e.target.value) || 1)}
                                                className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <select
                                                value={task.stage}
                                                onChange={(e) => handleTaskChange(index, 'stage', e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-sm"
                                            >
                                                <option value="Pre-Production">Pre-Production</option>
                                                <option value="Production">Production</option>
                                                <option value="Post-Production">Post-Production</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTask(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="bg-sage-600 text-white px-6 py-2 rounded-lg hover:bg-sage-700 flex items-center gap-2"
                    >
                        <Save size={20} /> {id ? 'Update Template' : 'Save Template'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TNATemplateForm;
