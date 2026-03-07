import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <div className="w-12 h-12 border-4 border-sage-200 border-t-sage-800 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(profile?.role)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-cream p-8 text-center">
                <h1 className="text-4xl font-bold text-sage-900 mb-4">Access Denied</h1>
                <p className="text-sage-600 mb-8 max-w-md">
                    You do not have the necessary permissions to view this page. If you believe this is an error, please contact your administrator.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="px-6 py-2 bg-sage-800 text-white rounded-lg hover:bg-sage-900 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
