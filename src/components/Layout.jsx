import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Package, FileText, ClipboardList,
    Calculator, ChevronLeft, ChevronRight, Scissors, Activity,
    CheckSquare, Settings, Database, Clock, Shirt,
    ChevronDown, ChevronUp, LogOut, User, Layers
} from 'lucide-react';
import clsx from 'clsx';

import logo from '../assets/logo.png';
import MigrationTool from './MigrationTool';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, logout, isAdmin, isManager } = useAuth();
    const [showMigration, setShowMigration] = useState(false);
    const [openMenu, setOpenMenu] = useState(null);

    const handleLogout = async () => {
        const { error } = await logout();
        if (!error) {
            navigate('/login');
        }
    };
    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/production-orders', label: 'Production', icon: Activity },
        { path: '/tna', label: 'TNA Tracker', icon: Clock },
        { path: '/dpr-workspace', label: 'DPR Report', icon: FileText },
        {
            id: 'prod_stages',
            label: 'Production Stages',
            icon: Layers,
            subItems: [
                { path: '/cutting', label: 'Cutting Orders', icon: Scissors },
                { path: '/stitching', label: 'Stitching List', icon: Activity },
                { path: '/stitching/receive', label: 'Cutting Receiving', icon: Scissors },
                { path: '/stitching/issue/new', label: 'Cutting Issue', icon: Package },
            ]
        },
        {
            id: 'fabric_inventory',
            label: 'Fabric Inventory',
            icon: Package,
            subItems: [
                { path: '/inventory', label: 'Current Inventory', icon: Package },
                { path: '/cutting/fabric-receive', label: 'Fabric Receipt', icon: CheckSquare },
                { path: '/cutting/fabric-issue', label: 'Fabric Issue', icon: Package },
                { path: '/production/material-issues', label: 'Material Issue', icon: ClipboardList },
            ]
        },
        {
            id: 'qc',
            label: 'Quality Control',
            icon: CheckSquare,
            subItems: [
                { path: '/finishing', label: 'QC Inspection', icon: CheckSquare },
                { path: '/finishing/receive', label: 'Finishing Entry', icon: Shirt },
            ]
        },
        {
            id: 'dispatch',
            label: 'Dispatch',
            icon: Activity,
            subItems: [
                { path: '/dispatch', label: 'Dispatch Register', icon: Activity },
                { path: '/finishing/packing', label: 'Carton Packing', icon: Package },
            ]
        },
        {
            id: 'reports',
            label: 'Reports & Analytics',
            icon: ClipboardList,
            subItems: [
                { path: '/suppliers', label: 'Suppliers', icon: Users },
                { path: '/items', label: 'Items', icon: Package },
                { path: '/styles', label: 'Styles', icon: FileText },
                { path: '/purchase-orders', label: 'Purchase Orders', icon: FileText },
                { path: '/costing', label: 'Costing', icon: Calculator },
                { path: '/challans', label: 'Inward Challans', icon: ClipboardList },
                { path: '/outward-challans', label: 'Outward Challans', icon: ClipboardList },
                { path: '/invoices', label: 'GRNs', icon: FileText },
            ]
        },
        {
            id: 'hr_admin',
            label: 'HR & Admin',
            icon: Users,
            roles: ['admin', 'manager'],
            subItems: [
                { path: '/hr/employees', label: 'Employees', icon: Users },
                { path: '/hr/attendance', label: 'Attendance', icon: Clock },
                { path: '/hr/salaries', label: 'Salary Sheet', icon: Calculator },
                { path: '/production-masters', label: 'ERP Masters', icon: Settings },
                { path: '/admin/users', label: 'User Management', icon: Users },
            ]
        }
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(profile?.role);
    });
    return (
        <div
            className="flex flex-col min-h-screen bg-cover bg-center bg-fixed relative px-5"
            style={{ backgroundImage: 'url("/silver-bg.png")' }}
        >
            {/* Global Light Blur Overlay for readability */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none z-0"></div>

            <div className="flex-1 flex flex-col max-w-[1920px] mx-auto w-full relative">
                {/* Two-Tier Horizontal Header */}
                <header className="sticky top-4 z-[100] flex flex-col shadow-2xl">
                    {/* Row 1: Brand & User Profile */}
                    <div className="bg-[#0f172a] border-b border-white/5 h-11 flex items-center justify-between px-4 rounded-t-xl">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="p-0.5 bg-white rounded shadow-sm group-hover:scale-105 transition-transform">
                            <img src={logo} alt="Madan Creation" className="w-5 h-5 object-contain" />
                        </div>
                        <h1 className="text-sm font-bold text-white whitespace-nowrap tracking-wide">
                            Madan Creation
                        </h1>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end mr-1">
                            <p className="text-[11px] font-bold text-white leading-tight">
                                {profile?.full_name || 'ERP User'}
                            </p>
                            <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">
                                {profile?.role || 'Admin'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                {/* Row 2: Navigation "Horizontal Sidebar" */}
                <div className="bg-[#1e293b] h-10 flex items-center px-2 relative overflow-visible rounded-b-xl">
                    <nav className="flex-1 flex items-center">
                        <div className="flex items-center gap-0.5">
                            {filteredNavItems.map((item, idx) => {
                                const Icon = item.icon;
                                const hasSub = item.subItems && item.subItems.length > 0;
                                const isActive = location.pathname === item.path || (hasSub && item.subItems.some(sub => location.pathname === sub.path));
                                const isOpen = openMenu === item.id;

                                return (
                                    <div key={item.id || item.path || idx} className="relative group shrink-0">
                                        <Link
                                            to={hasSub ? '#' : item.path}
                                            onClick={(e) => {
                                                if (hasSub) {
                                                    e.preventDefault();
                                                    setOpenMenu(isOpen ? null : item.id);
                                                } else {
                                                    setOpenMenu(null);
                                                }
                                            }}
                                            className={clsx(
                                                'flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-200 whitespace-nowrap',
                                                isActive
                                                    ? 'bg-[#1d4ed8] text-white'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            )}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="text-[12px] font-semibold">{item.label}</span>
                                            {hasSub && <ChevronDown size={12} className={clsx("transition-transform duration-200 opacity-50", isOpen && "rotate-180")} />}
                                        </Link>

                                        {hasSub && (
                                            <div
                                                className={clsx(
                                                    "absolute top-full left-0 mt-1 w-52 bg-[#0f172a] border border-white/10 rounded-lg shadow-2xl transition-all duration-200 origin-top overflow-hidden z-[110]",
                                                    isOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
                                                )}
                                            >
                                                <div className="py-1.5">
                                                    {item.subItems.map((sub) => {
                                                        const SubIcon = sub.icon;
                                                        const isSubActive = location.pathname === sub.path;
                                                        return (
                                                            <Link
                                                                key={sub.path}
                                                                to={sub.path}
                                                                onClick={() => setOpenMenu(null)}
                                                                className={clsx(
                                                                    'flex items-center gap-3 px-4 py-2 text-[11px] font-medium transition-all duration-200',
                                                                    isSubActive
                                                                        ? 'bg-[#1d4ed8] text-white'
                                                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                                )}
                                                            >
                                                                <SubIcon size={13} className="opacity-60" />
                                                                <span>{sub.label}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </nav>
                </div>
            </header>

            {/* Backdrop for open menus */}
            {openMenu && (
                <div
                    className="fixed inset-0 z-[90] bg-black/5"
                    onClick={() => setOpenMenu(null)}
                />
            )}

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
            <main className="flex-1 overflow-y-auto mt-[24px]">
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
            </div>
        </div>
    );
};

export default Layout;
