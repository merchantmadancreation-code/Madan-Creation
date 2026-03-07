import { format, subDays, addDays, parseISO, isValid } from 'date-fns';

/**
 * Calculate TNA dates based on delivery date and task durations (Backward Scheduling)
 * @param {string|Date} deliveryDate - The target delivery date
 * @param {Array} tasks - List of template tasks with duration_days and sequence_order
 * @returns {Array} - Tasks with calculated planned_start_date and planned_end_date
 */
export const calculateTNADates = (deliveryDate, tasks) => {
    if (!deliveryDate || !tasks || tasks.length === 0) return [];

    const targetDate = parseISO(deliveryDate); // This is Shipment Date
    if (!isValid(targetDate)) return [];

    // Clone and sort tasks by sequence (ascending) to map them easily, 
    // but calculation works best backwards or by specific anchors.
    // Let's create a map for easier access if we need to find specific tasks.
    let planTasks = tasks.map(t => ({ ...t, status: 'Pending' }));

    // 1. Identify Anchor Tasks
    const shipmentTask = planTasks.find(t => t.name === 'Shipment');
    const exFactoryTask = planTasks.find(t => t.name === 'Ex-Factory');
    const finalInspectionTask = planTasks.find(t => t.name === 'Final Inspection (AQL)');
    const packingCompleteTask = planTasks.find(t => t.name === 'Packing Complete');

    // 2. Set Anchors (Specific Requirements)
    // Shipment = Delivery Date
    if (shipmentTask) {
        shipmentTask.planned_end_date = format(targetDate, 'yyyy-MM-dd');
        shipmentTask.planned_start_date = format(targetDate, 'yyyy-MM-dd');
    }

    // Ex-Factory = Shipment - 1 day
    let exFactoryDate = subDays(targetDate, 1);
    if (exFactoryTask) {
        exFactoryTask.planned_end_date = format(exFactoryDate, 'yyyy-MM-dd');
        exFactoryTask.planned_start_date = format(exFactoryDate, 'yyyy-MM-dd'); // Duration usually 0 or 1 for milestone
    }

    // Final Inspection = Shipment - 2 days (Requirement)
    // (If Ex-Factory is day -1, Inspection is day -2)
    let inspectionDate = subDays(targetDate, 2);
    if (finalInspectionTask) {
        finalInspectionTask.planned_end_date = format(inspectionDate, 'yyyy-MM-dd');
        finalInspectionTask.planned_start_date = format(inspectionDate, 'yyyy-MM-dd');
    }

    // Packing Complete = Inspection - 1 day
    let packingEndDate = subDays(inspectionDate, 1);
    if (packingCompleteTask) {
        packingCompleteTask.planned_end_date = format(packingEndDate, 'yyyy-MM-dd');
        // If packing takes 2 days
        packingCompleteTask.planned_start_date = format(subDays(packingEndDate, (packingCompleteTask.duration_days || 1) - 1), 'yyyy-MM-dd');
    }

    // 3. Backward Schedule the Rest
    // We'll iterate backwards from the last task, skipping those we already calculated.
    // Sort reverse sequence
    const sortedReverse = [...planTasks].sort((a, b) => b.sequence_order - a.sequence_order);

    let currentPointer = targetDate;

    // Find the task before our earliest anchor to start chain
    // Actually, simpler approach:
    // If a task already has dates set (is anchor), use its start date as the "End Date" for the previous task in sequence.
    // If not set, use currentPointer.

    // Let's re-loop properly
    // We need to find the "Packing Complete" index in the sortedReverse array to start buffering back from there?
    // Or just be robust: 
    // If task has date, update pointer. If task has no date, calculate from pointer.

    sortedReverse.forEach(task => {
        if (task.planned_end_date) {
            // This is an anchor, update pointer to its START date - 1 day
            currentPointer = subDays(parseISO(task.planned_start_date), 1);
        } else {
            // Not an anchor, calculate based on pointer
            const duration = task.duration_days || 1;
            const endDate = currentPointer;
            const startDate = subDays(endDate, Math.max(0, duration - 1));

            task.planned_end_date = format(endDate, 'yyyy-MM-dd');
            task.planned_start_date = format(startDate, 'yyyy-MM-dd');

            // Move pointer for next (previous in seq) task
            currentPointer = subDays(startDate, 1);
        }
    });

    // Re-sort to original sequence
    return planTasks.sort((a, b) => a.sequence_order - b.sequence_order);
};

export const getStatusColor = (status, plannedEnd, actualEnd) => {
    if (status === 'Completed') return 'bg-green-100 text-green-800';

    const today = new Date();
    const planEnd = new Date(plannedEnd);

    if (status !== 'Completed' && today > planEnd) return 'bg-red-100 text-red-800'; // Delayed
    if (status === 'In Progress') return 'bg-blue-100 text-blue-800';

    return 'bg-gray-100 text-gray-800'; // Pending
};
