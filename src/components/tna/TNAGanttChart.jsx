import React from 'react';
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

const TNAGanttChart = ({ tasks }) => {
    if (!tasks || tasks.length === 0) return <div className="p-4 text-center text-gray-500">No tasks to display</div>;

    // 1. Determine Timeline Range
    const dates = tasks.flatMap(t => [
        t.planned_start_date ? parseISO(t.planned_start_date) : null,
        t.planned_end_date ? parseISO(t.planned_end_date) : null,
        t.actual_start_date ? parseISO(t.actual_start_date) : null,
        t.actual_end_date ? parseISO(t.actual_end_date) : null
    ]).filter(Boolean);

    if (dates.length === 0) return <div className="p-4 text-center text-gray-500">No dates set for tasks</div>;

    const minDate = startOfWeek(new Date(Math.min(...dates)));
    const maxDate = endOfWeek(new Date(Math.max(...dates)));
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // Grid configuration
    const dayWidth = 30; // px per day
    const chartWidth = totalDays * dayWidth;

    // Generate Header Days
    const timelineDays = [];
    for (let i = 0; i < totalDays; i++) {
        timelineDays.push(addDays(minDate, i));
    }

    const getPosition = (dateStr) => {
        if (!dateStr) return null;
        const date = parseISO(dateStr);
        const daysFromStart = differenceInDays(date, minDate);
        return daysFromStart * dayWidth;
    };

    const getWidth = (startStr, endStr) => {
        if (!startStr || !endStr) return dayWidth;
        const start = parseISO(startStr);
        const end = parseISO(endStr);
        const diff = differenceInDays(end, start);
        return (diff + 1) * dayWidth;
    };

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
            <div className="relative" style={{ width: `${Math.max(chartWidth, 800)}px` }}>

                {/* Header */}
                <div className="flex bg-gray-100 border-b border-gray-200 h-10 sticky top-0 z-10">
                    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 px-4 py-2 font-medium text-sm sticky left-0 z-20">Task Name</div>
                    <div className="flex-1 flex relative">
                        {timelineDays.map((date, i) => (
                            <div
                                key={i}
                                className={`flex-shrink-0 border-r border-gray-200 text-[10px] flex items-center justify-center ${isSameDay(date, new Date()) ? 'bg-blue-50' : ''}`}
                                style={{ width: `${dayWidth}px` }}
                            >
                                <div className="text-center">
                                    <div className="font-bold">{format(date, 'd')}</div>
                                    <div className="text-gray-400">{format(date, 'EE')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows */}
                {tasks.map((task) => {
                    const planStart = getPosition(task.planned_start_date);
                    const planWidth = getWidth(task.planned_start_date, task.planned_end_date);

                    const actualStart = getPosition(task.actual_start_date);
                    const actualWidth = getWidth(task.actual_start_date, task.actual_end_date);

                    return (
                        <div key={task.id} className="flex border-b border-gray-100 h-12 hover:bg-gray-50 group">
                            <div className="w-64 flex-shrink-0 border-r border-gray-200 px-4 py-3 text-sm truncate bg-white sticky left-0 z-10 group-hover:bg-gray-50 font-medium text-gray-700">
                                {task.task_name}
                            </div>
                            <div className="flex-1 relative bg-white group-hover:bg-gray-50">
                                {/* Grid Lines */}
                                {timelineDays.map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 border-r border-gray-100"
                                        style={{ left: `${(i + 1) * dayWidth}px` }}
                                    />
                                ))}

                                {/* Planned Bar */}
                                {planStart !== null && (
                                    <div
                                        className="absolute h-3 bg-blue-300 rounded-sm opacity-60 top-2"
                                        style={{ left: `${planStart}px`, width: `${planWidth}px` }}
                                        title={`Planned: ${task.planned_start_date} to ${task.planned_end_date}`}
                                    />
                                )}

                                {/* Actual Bar */}
                                {actualStart !== null && (
                                    <div
                                        className={`absolute h-3 rounded-sm top-6 ${task.status === 'Completed' ? 'bg-green-500' : 'bg-amber-500'}`}
                                        style={{ left: `${actualStart}px`, width: `${actualWidth}px` }}
                                        title={`Actual: ${task.actual_start_date} to ${task.actual_end_date}`}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Today Marker */}
                {differenceInDays(new Date(), minDate) >= 0 && differenceInDays(new Date(), minDate) < totalDays && (
                    <div
                        className="absolute top-10 bottom-0 border-l-2 border-red-500 z-0 pointer-events-none"
                        style={{ left: `${differenceInDays(new Date(), minDate) * dayWidth}px` }}
                    />
                )}
            </div>
        </div>
    );
};

export default TNAGanttChart;
