import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2, Camera, User, Phone, Mail, Building, Briefcase, Calendar, X, Save, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import * as faceapi from '@vladmandic/face-api';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [saving, setSaving] = useState(false);

    // Enrollment State
    const [cameraActive, setCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [enrollmentStatus, setEnrollmentStatus] = useState('idle'); // idle, scanning, success, error
    const videoRef = React.useRef();

    const [formData, setFormData] = useState({
        emp_id: '',
        name: '',
        department: '',
        designation: '',
        salary_type: 'Monthly',
        base_salary: 0,
        mobile: '',
        email: '',
        joining_date: format(new Date(), 'yyyy-MM-dd'),
        face_descriptor: null
    });

    useEffect(() => {
        fetchEmployees();
        loadModels();
    }, []);

    const loadModels = async () => {
        try {
            const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
        } catch (error) {
            console.error('Error loading face models:', error);
        }
    };

    const startEnrollment = async (emp) => {
        setEnrollingEmp(emp);
        setShowEnrollment(true);
        setEnrollmentStatus('idle');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            setCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 100);
        } catch (err) {
            console.error(err);
            setEnrollmentStatus('error');
        }
    };

    const stopEnrollment = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
    };


    const fetchEmployees = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('hr_employees')
            .select('*')
            .order('name');
        if (error) console.error(error);
        else setEmployees(data || []);
        setLoading(false);
    };

    const handleEdit = (emp) => {
        setEditingEmp(emp);
        setFormData({
            emp_id: emp.emp_id,
            name: emp.name,
            department: emp.department || '',
            designation: emp.designation || '',
            salary_type: emp.salary_type || 'Monthly',
            base_salary: emp.base_salary || 0,
            mobile: emp.mobile || '',
            email: emp.email || '',
            joining_date: emp.joining_date || format(new Date(), 'yyyy-MM-dd'),
            face_descriptor: emp.face_descriptor || null
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        const { error } = await supabase.from('hr_employees').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchEmployees();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingEmp) {
                const { error } = await supabase
                    .from('hr_employees')
                    .update(formData)
                    .eq('id', editingEmp.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('hr_employees')
                    .insert([formData]);
                if (error) throw error;
            }
            setShowForm(false);
            setEditingEmp(null);
            fetchEmployees();
            setFormData({
                emp_id: '', name: '', department: '', designation: '',
                salary_type: 'Monthly', base_salary: 0, mobile: '', email: '',
                joining_date: format(new Date(), 'yyyy-MM-dd'),
                face_descriptor: null
            });
        } catch (error) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddNew = () => {
        setEditingEmp(null);

        // Find highest numeric ID in MC-XXX format
        const numericIds = employees
            .map(emp => {
                const match = emp.emp_id?.match(/MC-(\d+)/i);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(id => !isNaN(id));

        const nextNumber = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
        const nextId = `MC-${nextNumber.toString().padStart(3, '0')}`;

        setFormData({
            emp_id: nextId,
            name: '',
            department: '',
            designation: '',
            salary_type: 'Monthly',
            base_salary: 0,
            mobile: '',
            email: '',
            joining_date: format(new Date(), 'yyyy-MM-dd')
        });
        setShowForm(true);
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Employee Management</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-0.5">Directory & Enrollment</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[250px] font-bold"
                        />
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all active:scale-95"
                    >
                        <Plus size={18} /> Add Employee
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">ID & Name</th>
                                <th className="px-6 py-4">Dept / Designation</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4 text-center">Face ID</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="animate-spin text-blue-600 mx-auto"><Plus /></div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-800 text-sm">{emp.name}</div>
                                        <div className="text-[10px] font-bold text-blue-500">{emp.emp_id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                                        <div>{emp.department}</div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase italic mt-0.5">{emp.designation}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                            <Phone size={12} className="text-slate-400" /> {emp.mobile}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-1">
                                            <Mail size={10} /> {emp.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {emp.face_descriptor ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-emerald-100 italic">Enrolled</span>
                                                <button onClick={() => handleEdit(emp)} className="text-[9px] text-slate-400 font-bold hover:text-blue-600 underline">Update Face</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(emp)}
                                                className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase hover:bg-amber-100 flex items-center gap-1 mx-auto border border-amber-100 transition-colors"
                                            >
                                                <Camera size={10} /> Enroll Face
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleEdit(emp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px]">Employee Profile</h3>
                                <p className="font-bold text-slate-400 text-[9px] uppercase mt-0.5">{editingEmp ? 'Update Existing' : 'Create New Identity'}</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (cameraActive) stopEnrollment();
                                    setShowForm(false);
                                }}
                                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto">
                            {/* Integrated Face ID Section */}
                            <div className="mb-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <Camera size={14} className="text-blue-500" /> Biometric Identity {formData.face_descriptor && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={12} /> Captured</span>}
                                </h4>

                                <div className="flex flex-col md:flex-row gap-6 items-center">
                                    <div className="w-32 h-32 bg-slate-200 rounded-3xl overflow-hidden relative border-4 border-white shadow-sm ring-1 ring-slate-100">
                                        {cameraActive ? (
                                            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                                        ) : formData.face_descriptor ? (
                                            <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                <User size={48} />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                                <User size={48} />
                                            </div>
                                        )}

                                        {enrollmentStatus === 'scanning' && (
                                            <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[1px] flex items-center justify-center">
                                                <RefreshCw size={24} className="text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-3 text-center md:text-left">
                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                            {formData.face_descriptor
                                                ? "Face signature captured successfully. You can re-capture if needed for better accuracy."
                                                : "No biometric data linked yet. Identification requires a face scan for secure attendance."}
                                        </p>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                            {!cameraActive ? (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
                                                            setCameraActive(true);
                                                            setTimeout(() => {
                                                                if (videoRef.current) videoRef.current.srcObject = stream;
                                                            }, 100);
                                                        } catch (err) { alert("Camera access denied"); }
                                                    }}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                                >
                                                    <Camera size={14} /> {formData.face_descriptor ? 'Update Face Scan' : 'Start Face Capture'}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!videoRef.current) return;
                                                        setEnrollmentStatus('scanning');
                                                        try {
                                                            const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                                                .withFaceLandmarks()
                                                                .withFaceDescriptor();
                                                            if (detections) {
                                                                setFormData({ ...formData, face_descriptor: Array.from(detections.descriptor) });
                                                                setEnrollmentStatus('success');
                                                                setTimeout(() => {
                                                                    stopEnrollment();
                                                                    setEnrollmentStatus('idle');
                                                                }, 1000);
                                                            } else {
                                                                alert('Face not detected');
                                                                setEnrollmentStatus('idle');
                                                            }
                                                        } catch (e) {
                                                            console.error(e);
                                                            setEnrollmentStatus('error');
                                                        }
                                                    }}
                                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                                >
                                                    <RefreshCw size={14} className={enrollmentStatus === 'scanning' ? 'animate-spin' : ''} /> Capture Identity
                                                </button>
                                            )}
                                            {cameraActive && (
                                                <button
                                                    type="button"
                                                    onClick={stopEnrollment}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Employee ID</label>
                                        <input
                                            required
                                            value={formData.emp_id}
                                            onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                                            placeholder="e.g. MC-101"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Full Name</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Department</label>
                                        <input
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Designation</label>
                                        <input
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Salary Type</label>
                                        <select
                                            value={formData.salary_type}
                                            onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        >
                                            <option value="Monthly">Monthly Fixed</option>
                                            <option value="Daily">Daily Payout</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Base Salary (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.base_salary}
                                            onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mobile Number</label>
                                        <input
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Joining Date</label>
                                        <input
                                            type="date"
                                            value={formData.joining_date}
                                            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save size={18} />}
                                    {editingEmp ? 'Confirm Profile Update' : 'Generate Employee Identity'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;
