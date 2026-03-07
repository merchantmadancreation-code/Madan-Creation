import React from 'react';

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium animate-pulse">Loading Madan Creation ERP...</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
