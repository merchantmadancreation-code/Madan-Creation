import React, { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CheckCircle, AlertCircle, Clock, Save } from 'lucide-react';
import { useTNA } from '../../context/TNAContext';
import { getStatusColor } from '../../utils/tnaUtils';

const TNATaskList = ({ tasks, readOnly = false, hideHeader = false }) => {
    const { updateTaskStatus } = useTNA();
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

    // Sort tasks by date
    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.planned_end_date) - new Date(b.planned_end_date)
    );

    const handleEditClick = (task) => {
        if (readOnly) return;
        setEditingId(task.id);
        setEditValues({
            actual_start_date: task.actual_start_date,
            actual_end_date: task.actual_end_date,
            status: task.status,
            remarks: task.remarks
        });
    };

    const handleSave = async (id) => {
        const success = await updateTaskStatus(id, editValues);
        if (success) {
            setEditingId(null);
            setEditValues({});
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValues({});
    };

    const handleChange = (field, value) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = parseISO(dateStr);
        return isValid(date) ? format(date, 'dd MMM yyyy') : '-';
    };

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                {!hideHeader && (
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Start</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan End</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Start</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual End</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                            {!readOnly && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                )}
                <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTasks.map((task) => {
                        const isEditing = editingId === task.id;
                        const statusColor = getStatusColor(task.status, task.planned_end_date, task.actual_end_date);

                        return (
                            <tr key={task.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {task.task_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(task.planned_start_date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(task.planned_end_date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={editValues.actual_start_date || ''}
                                            onChange={(e) => handleChange('actual_start_date', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-xs"
                                        />
                                    ) : (
                                        formatDate(task.actual_start_date)
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={editValues.actual_end_date || ''}
                                            onChange={(e) => handleChange('actual_end_date', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-xs"
                                        />
                                    ) : (
                                        formatDate(task.actual_end_date)
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {isEditing ? (
                                        <select
                                            value={editValues.status}
                                            onChange={(e) => handleChange('status', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-xs"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Delayed">Delayed</option>
                                        </select>
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                            {task.status}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editValues.remarks || ''}
                                            onChange={(e) => handleChange('remarks', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 sm:text-xs"
                                            placeholder="Remarks..."
                                        />
                                    ) : (
                                        task.remarks || '-'
                                    )}
                                </td>
                                {!readOnly && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {isEditing ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleSave(task.id)} className="text-sage-600 hover:text-sage-900">
                                                    <Save className="w-5 h-5" />
                                                </button>
                                                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(task)} className="text-sage-600 hover:text-sage-900">
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TNATaskList;
