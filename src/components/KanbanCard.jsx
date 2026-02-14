import React from 'react';

// Static Maps for visualization (using the ones from Stitch as placeholders/defaults)
const MAP_BG_ACTIVE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCjonaMqvzadG_vYRyg0dlAdIzRkXrQjLTkr3x9GadF4__blQ0tAHuS_6ci2KjbBGKMx6LfpbECEPQTnJnaKPIFeZz7NA9b_w_P4gB7nKvPMAxhPlgACTXgCmM95sQlciiq-FDhW7YStLwpyxc2kxFM8tlC-L6YDQbQSfY4X06-8qrQC8N5SZ1j6KBBT1WpYJckRUZ8R8OA4jJZpRhjwuoibrCplvoZk2T2vyqTEdl2bm68UWvYpp99rEWZqjIBMkK7JSi4GpGp_Rve";

const KanbanCard = ({ user, status, onTrack, onComplete, onViewHistory, locationData }) => {
    const isPending = status === 'PENDING';
    const isActive = status === 'ACTIVE';
    const isCompleted = status === 'COMPLETED';

    // Helper to generate initials or use image
    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // ----- PENDING CARD -----
    if (isPending) {
        return (
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-neutral-light dark:border-neutral-dark shadow-card hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-gray-400 text-lg">schedule</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">#{user.token?.slice(-6).toUpperCase()}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium">
                        Pending
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold">
                        {getInitials(user.driverName || "D")}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{user.driverName || "Driver Assigned"}</p>
                        <p className="text-xs text-gray-500">{user.vehicleNumber || "Vehicle TBA"}</p>
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                        <span className="material-icons text-gray-400 text-sm mt-0.5">trip_origin</span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">{user.sourceAddress || "Pickup location"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="material-icons text-primary text-sm mt-0.5">location_on</span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">{user.destAddress || "Drop-off location"}</span>
                    </div>
                </div>

                <div className="text-xs text-gray-400 mb-3">
                    Waiting for driver to start...
                </div>

                {/* Tracking Link Section */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <span className="material-icons text-sm">link</span>
                            Tracking Link
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white dark:bg-gray-900 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate block">
                                {window.location.origin}/track?token={user.token?.slice(-8)}...
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const masterLink = `${window.location.origin}/track?token=${user.token}`;
                                navigator.clipboard.writeText(masterLink)
                                    .then(() => alert('Link copied! Add &role=driver or &role=passenger before sending'))
                                    .catch(err => console.error('Copy failed:', err));
                            }}
                            className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg transition-colors flex-shrink-0"
                            title="Copy tracking link"
                        >
                            <span className="material-icons text-sm">content_copy</span>
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                        Add &role=driver or &role=passenger before sending
                    </p>
                </div>

                {/* Track Button */}
                <button
                    onClick={() => onTrack && onTrack(user)}
                    className="w-full bg-primary hover:bg-primary-dark text-background-dark text-xs font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <span className="material-icons text-sm">map</span>
                    Track Route
                </button>
            </div>
        );
    }

    // ----- ACTIVE CARD -----
    if (isActive) {
        return (
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border-2 border-primary shadow-card hover:shadow-lg transition-all relative overflow-hidden">
                {/* Animated pulse background */}
                <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>

                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-primary text-lg animate-pulse">directions_car</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">#{user.token?.slice(-6).toUpperCase()}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-primary/20 text-primary-dark dark:text-primary text-xs rounded-full font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
                        Live
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {getInitials(user.driverName || "D")}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{user.driverName || "Driver"}</p>
                        <p className="text-xs text-gray-500">{user.vehicleNumber || "N/A"}</p>
                    </div>
                </div>

                <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-2 mb-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Speed</span>
                        <span className="text-sm font-bold text-primary">{locationData?.speed || 0} km/h</span>
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                        <span className="material-icons text-gray-400 text-sm mt-0.5">trip_origin</span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 line-clamp-1">{user.sourceAddress || "Source"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="material-icons text-primary text-sm mt-0.5">location_on</span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 line-clamp-1">{user.destAddress || "Destination"}</span>
                    </div>
                </div>

                {/* Compact Tracking Link Section for Active Cards */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-xs text-gray-500">link</span>
                        <div className="flex-1 overflow-hidden">
                            <span className="text-[10px] text-gray-400 font-mono truncate block">
                                {window.location.origin}/track?token={user.token?.slice(-6)}...
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const masterLink = `${window.location.origin}/track?token=${user.token}`;
                                navigator.clipboard.writeText(masterLink)
                                    .then(() => alert('Link copied! Add &role=driver or &role=passenger'))
                                    .catch(err => console.error('Copy failed:', err));
                            }}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-primary hover:text-white p-1.5 rounded transition-colors flex-shrink-0"
                            title="Copy tracking link"
                        >
                            <span className="material-icons text-xs">content_copy</span>
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onTrack && onTrack(user)}
                        className="flex-1 bg-primary hover:bg-primary-dark text-background-dark text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                        Track Live
                    </button>
                    <button
                        onClick={() => onComplete && onComplete(user._id)}
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                        <span className="material-icons text-sm">check</span>
                    </button>
                </div>
            </div>
        );
    }

    // ----- COMPLETED CARD -----
    if (isCompleted) {
        return (
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-neutral-light dark:border-neutral-dark shadow-card opacity-90 hover:opacity-100 transition-opacity">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-primary text-lg">check_circle</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">#{user.token?.slice(-6).toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                        {new Date(user.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold">
                        {getInitials(user.driverName || "D")}
                    </div>
                    <span className="text-xs text-gray-500">
                        Completed by <strong>{user.driverName || "Driver"}</strong>
                    </span>
                </div>

                <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-500">Performance</span>
                        <span className="text-xs font-bold text-primary-dark dark:text-primary">Job Done</span>
                    </div>

                    {/* Visual Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden flex">
                        <div className="bg-primary w-full h-full rounded-full"></div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Total Trip Time: N/A</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewHistory && onViewHistory(user); }}
                        className="text-xs text-primary font-medium hover:underline"
                    >
                        View Report
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default KanbanCard;
