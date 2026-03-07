import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Clock, CheckCircle, AlertTriangle, User, History, ChevronRight, X, Play, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import * as faceapi from '@vladmandic/face-api';
import AttendanceHistoryModal from '../../components/hr/AttendanceHistoryModal';

const AttendanceMarking = () => {
    const [cameraActive, setCameraActive] = useState(false);
    const [loadingModels, setLoadingModels] = useState(true);
    const [status, setStatus] = useState('idle'); // idle, scanning, matched, error
    const [matchedEmp, setMatchedEmp] = useState(null);
    const [logs, setLogs] = useState([]);
    const [mode, setMode] = useState('IN'); // IN, OUT
    const [message, setMessage] = useState(null); // New state for non-blocking feedback
    const videoRef = useRef();
    const canvasRef = useRef();
    const scanTimerRef = useRef();
    const isScanningRef = useRef(false);
    const [employeesWithFace, setEmployeesWithFace] = useState([]);
    const [debugInfo, setDebugInfo] = useState({
        faceDetected: false,
        minDistance: 1.0,
        closestName: 'None',
        modelsLoaded: false,
        dbStatus: 'pending',
        videoReady: false
    });
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        loadModels();
        fetchAttendanceLogs();
        fetchEmployeesWithFace();
    }, []);

    const loadModels = async () => {
        try {
            setLoadingModels(true);
            const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL) // Loaded as fallback for accuracy
            ]);
            setLoadingModels(false);
            setDebugInfo(prev => ({ ...prev, modelsLoaded: true }));
        } catch (error) {
            console.error('Error loading face models:', error);
            setLoadingModels(false);
            setDebugInfo(prev => ({ ...prev, modelsLoaded: false }));
        }
    };

    const fetchEmployeesWithFace = async () => {
        try {
            const { data, error } = await supabase
                .from('hr_employees')
                .select('*')
                .not('face_descriptor', 'is', null);

            if (error) throw error;
            setEmployeesWithFace(data || []);
            setDebugInfo(prev => ({ ...prev, dbStatus: `loaded (${data?.length || 0})` }));
        } catch (err) {
            setDebugInfo(prev => ({ ...prev, dbStatus: 'error' }));
        }
    };

    const fetchAttendanceLogs = async () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const { data } = await supabase
            .from('hr_attendance')
            .select('*, hr_employees(name, emp_id)')
            .eq('date', today)
            .order('created_at', { ascending: false });
        setLogs(data || []);
    };

    const startCamera = async () => {
        fetchEmployeesWithFace(); // Refetch latest enrollment data
        setCameraActive(true);
        setStatus('scanning');
        setDebugInfo(prev => ({ ...prev, videoReady: false }));
        setMessage(null); // Clear any previous messages

        try {
            // Enforce 9:16 aspect ratio for the camera feed
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1080 },
                    height: { ideal: 1920 },
                    aspectRatio: { ideal: 9 / 16 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setDebugInfo(prev => ({ ...prev, videoReady: true }));
                    isScanningRef.current = true;
                    scanLoop();
                };
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage({ type: 'error', text: 'Failed to start camera. Please check permissions.' });
        }
    };

    const stopCamera = () => {
        isScanningRef.current = false;
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
        setStatus('idle');
        setMessage(null); // Clear message when camera stops
    };

    const scanLoop = async () => {
        if (!isScanningRef.current) return;

        try {
            await handleScan();
        } catch (err) {
            console.error("Scan error:", err);
        }

        // Only continue loop if we haven't found a match and camera is still active
        if (isScanningRef.current && status !== 'matched') {
            scanTimerRef.current = setTimeout(scanLoop, 500); // Super fast scan every 500ms
        }
    };

    // This is a placeholder for the actual matching logic
    // We'll refine this once Employee Enrollment is implemented
    const handleScan = async () => {
        if (!videoRef.current || !isScanningRef.current || status === 'matched') return;
        if (!debugInfo.modelsLoaded) return;

        setDebugInfo(prev => ({ ...prev, faceDetected: false }));

        try {
            // First pass: Rapid detection with TinyFaceDetector
            let detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
            ).withFaceLandmarks().withFaceDescriptor();

            // If Tiny fails and we haven't detected a face in a while, try SsdMobilenetv1 for accuracy
            if (!detections && Math.random() > 0.7) {
                detections = await faceapi.detectSingleFace(
                    videoRef.current,
                    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
                ).withFaceLandmarks().withFaceDescriptor();
            }

            if (detections) {
                setDebugInfo(prev => ({ ...prev, faceDetected: true }));

                let bestMatch = null;
                let minDistance = 0.7;
                let localMin = 1.0;
                let localName = 'None';

                for (const emp of employeesWithFace) {
                    try {
                        const rawDesc = Array.isArray(emp.face_descriptor) ? emp.face_descriptor : Object.values(emp.face_descriptor);
                        const descriptor = new Float32Array(rawDesc);

                        const distance = faceapi.euclideanDistance(detections.descriptor, descriptor);

                        if (distance < localMin) {
                            localMin = distance;
                            localName = emp.name;
                        }

                        if (distance < minDistance) {
                            minDistance = distance;
                            bestMatch = emp;
                        }
                    } catch (e) {
                        console.error("Descriptor error for", emp.name, e);
                    }
                }

                setDebugInfo(prev => ({ ...prev, minDistance: localMin, closestName: localName }));

                if (bestMatch) {
                    isScanningRef.current = false;
                    await markAttendance(bestMatch);
                    return true;
                }
            }
        } catch (err) {
            console.error("Scan internal error:", err);
            setDebugInfo(prev => ({ ...prev, dbStatus: 'scan-error' }));
        }
        return false;
    };

    const markAttendance = async (emp) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = new Date().toISOString();

        try {
            // Find existing record for today
            const { data: existingRecords, error: fetchError } = await supabase
                .from('hr_attendance')
                .select('*')
                .eq('employee_id', emp.id)
                .eq('date', today)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const latestOpenSession = existingRecords?.find(r => r.check_in && !r.check_out);

            let dbResult;
            if (mode === 'IN') {
                dbResult = await supabase
                    .from('hr_attendance')
                    .insert([{
                        employee_id: emp.id,
                        date: today,
                        check_in: now,
                        status: 'Present'
                    }]);
            } else {
                if (latestOpenSession) {
                    dbResult = await supabase
                        .from('hr_attendance')
                        .update({ check_out: now })
                        .eq('id', latestOpenSession.id);
                } else {
                    dbResult = await supabase
                        .from('hr_attendance')
                        .insert([{
                            employee_id: emp.id,
                            date: today,
                            check_out: now,
                            status: 'Present'
                        }]);
                }
            }

            if (dbResult.error) throw dbResult.error;

            setMatchedEmp(emp);
            setStatus('matched');

            // Explicitly await logs to ensure UI sync
            await fetchAttendanceLogs();

            setTimeout(() => {
                setStatus('scanning');
                setMatchedEmp(null);
                isScanningRef.current = true;
                scanLoop();
            }, 3000);
        } catch (error) {
            console.error("Attendance System Error:", error);
            setStatus('error');
            setMessage({
                type: 'error',
                text: `Database Error: ${error.message || 'Unknown'}`
            });
            setTimeout(() => {
                setStatus('scanning');
                setMessage(null);
                isScanningRef.current = true;
                scanLoop();
            }, 5000);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl font-black text-slate-800">Attendance System</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-0.5 italic">Biometric Face Recognition Enrollment</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Column 1: Scanner */}
                <div className={cameraActive ? "fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-0 overflow-hidden" : "bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative aspect-square md:aspect-video flex items-center justify-center border-4 border-slate-800"}>
                    {!cameraActive ? (
                        <div className="text-center p-8">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-600 ring-4 ring-slate-800/50">
                                <Camera size={40} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Kiosk Ready</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-8 max-w-xs mx-auto">Stand in front of the camera for automatic recognition</p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => { setMode('IN'); startCamera(); }}
                                    className="px-12 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    Check In
                                </button>
                                <button
                                    onClick={() => { setMode('OUT'); startCamera(); }}
                                    className="px-12 py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-500/10 transition-all active:scale-95"
                                >
                                    Check Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-[100svh] md:h-full max-w-[calc(100svh*9/16)] aspect-[9/16] bg-black flex flex-col overflow-hidden shadow-2xl">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-contain bg-black"
                            />

                            {/* Face Frame UI - Adjusted for strict 9:16 proportions */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                                <div className="w-full h-[80%] border-[2px] border-white/20 rounded-[3rem] relative">
                                    <div className="absolute -top-1 -left-1 w-12 h-12 border-t-[4px] border-l-[4px] border-blue-500 rounded-tl-[2rem]" />
                                    <div className="absolute -top-1 -right-1 w-12 h-12 border-t-[4px] border-r-[4px] border-blue-500 rounded-tr-[2rem]" />
                                    <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[4px] border-l-[4px] border-blue-500 rounded-bl-[2rem]" />
                                    <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[4px] border-r-[4px] border-blue-500 rounded-br-[2rem]" />

                                    {/* Scanning line animation */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/60 blur-[2px] animate-[scan_2s_linear_infinite]" />
                                </div>
                            </div>

                            <div className="absolute inset-x-0 top-0 p-8 flex justify-between items-start pointer-events-none">
                                <div className="pointer-events-auto flex flex-col gap-2">
                                    <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-2xl backdrop-blur-md ${mode === 'IN' ? 'bg-emerald-500/90 text-white' : 'bg-blue-500/90 text-white'}`}>
                                        <Clock size={14} className="animate-pulse" /> {mode} MODE ACTIVE
                                    </div>
                                    <div className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black text-white/70 uppercase tracking-widest border border-white/10">
                                        Searching for Face...
                                    </div>
                                </div>
                                <button
                                    onClick={stopCamera}
                                    className="pointer-events-auto p-4 bg-white/10 hover:bg-red-500 text-white rounded-[1.5rem] backdrop-blur-md transition-all active:scale-95"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-4 pointer-events-none px-4">
                                {message && (
                                    <div className={`w-full max-w-xs p-4 rounded-2xl backdrop-blur-xl border flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${message.type === 'warning' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}`}>
                                        <AlertTriangle size={20} className="shrink-0" />
                                        <p className="text-[10px] font-black uppercase tracking-wider">{message.text}</p>
                                    </div>
                                )}

                                {/* Diagnostic Panel */}
                                <div className="px-6 py-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] flex flex-col gap-2 min-w-[240px]">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/50">Model Status:</span>
                                        <span className={debugInfo.modelsLoaded ? "text-emerald-400" : "text-amber-400"}>
                                            {debugInfo.modelsLoaded ? 'LOADED' : 'WAITING...'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/50">DB Registry:</span>
                                        <span className={debugInfo.dbStatus.includes('loaded') ? "text-emerald-400" : "text-amber-400"}>
                                            {debugInfo.dbStatus}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/50">Camera Feed:</span>
                                        <span className={debugInfo.videoReady ? "text-emerald-400" : "text-amber-400"}>
                                            {debugInfo.videoReady ? 'READY' : 'STARTING...'}
                                        </span>
                                    </div>
                                    <div className="w-full h-px bg-white/10 my-1" />
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/50">Face Detected:</span>
                                        <span className={debugInfo.faceDetected ? "text-emerald-400" : "text-amber-400"}>
                                            {debugInfo.faceDetected ? 'YES' : 'SEARCHING...'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/50">Closest Match:</span>
                                        <span className="text-blue-400 truncate ml-4 text-right max-w-[120px]">{debugInfo.closestName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/50">Match Score:</span>
                                        <span className={debugInfo.minDistance < 0.7 ? "text-emerald-400" : "text-white"}>
                                            {debugInfo.minDistance.toFixed(3)}
                                        </span>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${debugInfo.minDistance < 0.7 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.max(0, (1 - debugInfo.minDistance) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="px-8 py-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl">
                                    <RefreshCw size={14} className="animate-spin" /> Auto-Scanning Cycle
                                </div>
                            </div>

                            {status === 'matched' && matchedEmp && (
                                <div className="absolute inset-0 bg-emerald-600 z-[100] flex flex-col items-center justify-center text-white animate-in zoom-in slide-in-from-bottom duration-500">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-2xl shadow-emerald-900/50">
                                        <CheckCircle size={56} />
                                    </div>
                                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">Matched</h3>
                                    <div className="text-xl font-bold mt-1 text-emerald-100 flex items-center gap-3">
                                        {matchedEmp.name}
                                    </div>
                                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.4em] mt-8 bg-black/10 px-6 py-2 rounded-full border border-white/10">
                                        {mode} TIME: {format(new Date(), 'hh:mm a')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Column 2: Logs */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <History size={16} className="text-blue-500" /> Today's Registry
                            </h3>
                            <div className="flex items-center gap-3">
                                <button onClick={fetchAttendanceLogs} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                    <RefreshCw size={14} />
                                </button>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(), 'dd MMM yyyy')}</div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-[500px]">
                            {logs.map(log => (
                                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                            <User size={20} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{log.hr_employees?.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.hr_employees?.emp_id}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-right">
                                        <div>
                                            <div className="text-[9px] text-slate-400 font-black uppercase">Clock IN</div>
                                            <div className="text-xs font-black text-emerald-600">{log.check_in ? format(new Date(log.check_in), 'hh:mm a') : '--:--'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-slate-400 font-black uppercase">Clock OUT</div>
                                            <div className="text-xs font-black text-blue-600">{log.check_out ? format(new Date(log.check_out), 'hh:mm a') : '--:--'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="p-12 text-center">
                                    <Clock size={48} className="text-slate-100 mx-auto mb-4" />
                                    <p className="text-slate-400 italic text-sm font-medium">No activity recorded yet today.</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="p-4 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                        >
                            View Full History <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {loadingModels && (
                <div className="fixed bottom-8 left-8 bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom flex items-center gap-4 z-[60]">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest">Warming Engines</div>
                        <p className="text-[10px] text-slate-400 font-bold">Connecting to neural networks...</p>
                    </div>
                </div>
            )}

            <AttendanceHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
        </div>
    );
};

export default AttendanceMarking;
