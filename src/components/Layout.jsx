import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Package, FileText, ClipboardList,
    Calculator, ChevronLeft, ChevronRight, Scissors, Activity,
    CheckSquare, Settings, Database, Clock, Shirt,
    ChevronDown, ChevronUp, LogOut, User
} from 'lucide-react';
import clsx from 'clsx';

import logo from '../assets/logo.png';
import MigrationTool from './MigrationTool';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, logout, isAdmin, isManager } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showMigration, setShowMigration] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState(['stitching']);

    const handleLogout = async () => {
        const { error } = await logout();
        if (!error) {
            navigate('/login');
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/suppliers', label: 'Suppliers', icon: Users },
        { path: '/items', label: 'Items', icon: Package },
        { path: '/styles', label: 'Styles', icon: FileText },
        { path: '/purchase-orders', label: 'Purchase Orders', icon: FileText },
        { path: '/costing', label: 'Costing', icon: Calculator },
        { path: '/challans', label: 'Inward Challans', icon: ClipboardList },
        { path: '/outward-challans', label: 'Outward Challans', icon: ClipboardList },
        { path: '/invoices', label: 'GRNs', icon: FileText },
        { path: '/inventory', label: 'Inventory', icon: Package },
        { type: 'divider', label: 'PRODUCTION' },
        { path: '/tna', label: 'TNA Calendar', icon: Clock },
        { path: '/production-orders', label: 'Prod. Orders', icon: ClipboardList },
        {
            id: 'cutting',
            path: '/cutting',
            label: 'Cutting',
            icon: Scissors,
            subItems: [
                { path: '/cutting', label: 'Cutting Orders', icon: FileText },
                { path: '/cutting/fabric-receive', label: 'Fabric Receipt', icon: CheckSquare },
                { path: '/cutting/fabric-issue', label: 'Fabric Issue (Out)', icon: Package },
            ]
        },
        {
            id: 'stitching',
            path: '/stitching',
            label: 'Stitching',
            icon: Activity,
            subItems: [
                { path: '/stitching/receive', label: 'Cutting Receiving', icon: Scissors },
                { path: '/stitching/production', label: 'Stitched Pcs Entry', icon: Shirt },
                { path: '/stitching/issue/new', label: 'Cutting Issue', icon: Package },
                { path: '/production/material-issues', label: 'Material Issue', icon: ClipboardList },
            ]
        },
        {
            id: 'finishing',
            path: '/finishing',
            label: 'Finishing & Dispatch',
            icon: CheckSquare,
            subItems: [
                { path: '/finishing/receive', label: 'Finishing Entry', icon: Shirt },
                { path: '/finishing', label: 'QC Inspection', icon: CheckSquare },
                { path: '/finishing/packing', label: 'Carton Packing', icon: Package },
                { path: '/dispatch', label: 'Dispatch Register', icon: Activity },
            ]
        },
        {
            id: 'hr',
            path: '/hr',
            label: 'HR Management',
            icon: Users,
            roles: ['admin', 'manager'],
            subItems: [
                { path: '/hr/employees', label: 'Employees', icon: Users },
                { path: '/hr/attendance', label: 'Attendance', icon: Clock },
                { path: '/hr/salaries', label: 'Salary Sheet', icon: Calculator },
            ]
        },
        { path: '/production-masters', label: 'ERP Masters', icon: Settings, roles: ['admin', 'manager'] },
        { path: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(profile?.role);
    });

    return (
        <div
            className="flex min-h-screen bg-cover bg-center bg-fixed relative"
            style={{ backgroundImage: 'url("/silver-bg.png")' }}
        >
            {/* Global Light Blur Overlay for readability */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none z-0"></div>

            {/* Sidebar */}
            <aside
                className={clsx(
                    "bg-sage-900/95 backdrop-blur-md border-r border-sage-800/80 sticky top-0 h-screen overflow-hidden flex flex-col z-20 transition-all duration-300 ease-in-out shadow-2xl",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                <div className="p-4 border-b border-sage-800 bg-sage-900 sticky top-0 z-10 flex items-center justify-between">
                    <div className={clsx("flex items-center gap-3 transition-opacity duration-300", isCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible")}>
                        <div className="p-1 bg-white rounded-lg shadow-sm">
                            <img src={logo} alt="Madan Creation" className="w-8 h-8 object-contain" />
                        </div>
                        <h1 className="text-lg font-bold text-white whitespace-nowrap tracking-tight">
                            Madan Creation
                        </h1>
                    </div>
                    {isCollapsed && (
                        <div className="mx-auto p-1 bg-white rounded-lg">
                            <img src={logo} alt="M" title="Madan Creation" className="w-8 h-8 object-contain" />
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-lg bg-sage-800 text-sage-300 hover:bg-sage-700 transition-colors"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                </div>

                <nav className="p-3 space-y-1 bg-cream/30 flex-1 overflow-y-auto">
                    {filteredNavItems.map((item, idx) => {
                        if (item.type === 'divider') {
                            return !isCollapsed ? (
                                <div key={idx} className="px-4 pt-6 pb-2 text-[10px] font-bold text-sage-400 uppercase tracking-widest whitespace-nowrap">
                                    {item.label}
                                </div>
                            ) : <div key={idx} className="border-t border-sage-100 my-4" />;
                        }

                        const Icon = item.icon;
                        const hasSub = item.subItems && item.subItems.length > 0;
                        const isExpanded = expandedMenus.includes(item.id);
                        const isActive = location.pathname === item.path || (hasSub && item.subItems.some(sub => location.pathname === sub.path));

                        const toggleMenu = (e) => {
                            if (hasSub) {
                                e.preventDefault();
                                setExpandedMenus(prev =>
                                    prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                );
                            }
                        };

                        return (
                            <div key={item.id || item.path || idx} className="space-y-1">
                                <Link
                                    to={item.path}
                                    onClick={toggleMenu}
                                    title={isCollapsed ? item.label : ""}
                                    className={clsx(
                                        'flex items-center rounded-lg text-sm font-medium transition-all duration-200 w-full group relative',
                                        isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                                        isActive
                                            ? 'bg-sage-800 text-white shadow-lg shadow-black/20'
                                            : 'text-sage-300 hover:bg-sage-800/50 hover:text-white'
                                    )}
                                >
                                    {isActive && !isCollapsed && (
                                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-sage-500 rounded-r-full" />
                                    )}
                                    <Icon className={clsx("transition-transform duration-200", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-200">
                                                {item.label}
                                            </span>
                                            {hasSub && (
                                                isExpanded ? <ChevronUp size={14} className="text-sage-500" /> : <ChevronDown size={14} className="text-sage-500" />
                                            )}
                                        </>
                                    )}
                                </Link>

                                {hasSub && isExpanded && !isCollapsed && (
                                    <div className="ml-6 border-l border-sage-800 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {item.subItems.map((sub, sIdx) => {
                                            const SubIcon = sub.icon;
                                            const isSubActive = location.pathname === sub.path;
                                            return (
                                                <Link
                                                    key={sub.path}
                                                    to={sub.path}
                                                    className={clsx(
                                                        'flex items-center gap-3 px-4 py-2 text-xs font-medium transition-all duration-200 rounded-r-lg',
                                                        isSubActive
                                                            ? 'bg-sage-800/50 text-white border-l-2 border-sage-500 -ml-[1px]'
                                                            : 'text-sage-400 hover:bg-sage-800/30 hover:text-white pl-[18px]'
                                                    )}
                                                >
                                                    <SubIcon size={14} className="opacity-70" />
                                                    <span className="whitespace-nowrap overflow-hidden">{sub.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Section at Bottom */}
                <div className="p-4 border-t border-sage-800 bg-sage-900/50">
                    <div className={clsx("flex items-center gap-3 mb-4", isCollapsed ? "justify-center" : "")}>
                        <div className="w-10 h-10 rounded-full bg-sage-800 flex items-center justify-center text-sage-300 shrink-0 border border-sage-700">
                            <User size={20} />
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate">
                                    {profile?.full_name || 'ERP User'}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-sage-400 tracking-wider">
                                    {profile?.role || 'Viewer'}
                                </p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={clsx(
                            "flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors group",
                            isCollapsed ? "justify-center px-0" : ""
                        )}
                        title={isCollapsed ? "Logout" : ""}
                    >
                        <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Floating Cloud Sync Trigger */}
            <div className="fixed bottom-6 right-6 z-40">
                {isAdmin && (
                    <button
                        onClick={() => setShowMigration(true)}
                        className="p-3 bg-sage-800 text-sage-100 rounded-full shadow-2xl hover:bg-sage-900 transition-all hover:scale-110 active:scale-95 border-2 border-sage-700/50 group flex items-center gap-2"
                        title="Database Cloud Sync"
                    >
                        <Database size={24} />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-xs font-bold uppercase tracking-widest px-0 group-hover:px-2">
                            Cloud Sync
                        </span>
                    </button>
                )}
            </div>

            {/* Migration Tool Overlay */}
            {showMigration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-sage-900/60 backdrop-blur-md" onClick={() => setShowMigration(false)} />
                    <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <MigrationTool onClose={() => setShowMigration(false)} isModal={true} />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative z-10 bg-transparent">
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
