import React, { useState } from 'react';
import KanbanCard from './KanbanCard';

const KanbanBoard = ({ users, locations, onTrack, onComplete, onViewHistory }) => {
    // Mobile tab state
    const [mobileTab, setMobileTab] = useState('pending');

    // ACTIVE/PENDING → Pending Column
    // STARTED → In Progress Column  
    // COMPLETED → Completed Column
    const pendingUsers = users.filter(u => (u.status === 'PENDING' || u.status === 'ACTIVE'));
    const activeUsers = users.filter(u => u.status === 'STARTED');
    const completedUsers = users.filter(u => u.status === 'COMPLETED');

    // Common Column Wrapper
    const Column = ({ title, count, color, users, emptyText, icon }) => (
        <div className="w-full md:w-1/3 flex flex-col min-w-0 sm:min-w-[300px] h-full">
            {/* Fixed Header - Hidden on mobile */}
            <div className="hidden md:flex items-center justify-between px-1 mb-4 flex-shrink-0">
                <h3 className={`font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2`}>
                    <span className={`w-2 h-2 rounded-full ${color}`}></span>
                    {title}
                    <span className="bg-neutral-light dark:bg-neutral-dark text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                        {count}
                    </span>
                </h3>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <span className="material-icons text-lg">{icon}</span>
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide min-h-0">
                {users.length > 0 ? (
                    users.map(user => (
                        <KanbanCard
                            key={user._id}
                            user={user}
                            status={user.status === 'COMPLETED' ? 'COMPLETED' : (locations[user.token] ? 'ACTIVE' : 'PENDING')}
                            locationData={locations[user.token]}
                            onTrack={onTrack}
                            onComplete={onComplete}
                            onViewHistory={onViewHistory}
                        />
                    ))
                ) : (
                    <div className="h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-dark flex items-center justify-center text-gray-400 text-xs font-medium uppercase tracking-widest">
                        {emptyText}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="absolute inset-0 overflow-hidden flex flex-col">
            {/* Mobile Tabs - Only visible on small screens */}
            <div className="md:hidden flex gap-1 mb-3 bg-surface-light dark:bg-surface-dark p-1 rounded-lg border border-neutral-light dark:border-neutral-dark">
                <button
                    onClick={() => setMobileTab('pending')}
                    className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${mobileTab === 'pending'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Pending ({pendingUsers.length})
                </button>
                <button
                    onClick={() => setMobileTab('active')}
                    className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${mobileTab === 'active'
                            ? 'bg-primary/20 text-primary-dark dark:text-primary'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Progress ({activeUsers.length})
                </button>
                <button
                    onClick={() => setMobileTab('completed')}
                    className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${mobileTab === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Done ({completedUsers.length})
                </button>
            </div>

            {/* Desktop: Show all columns side by side */}
            {/* Mobile: Show only selected tab */}
            <div className="flex-1 overflow-hidden">
                <div className="hidden md:flex gap-6 h-full pb-4 px-1">
                    <Column
                        title="Pending"
                        count={pendingUsers.length}
                        color="bg-gray-400"
                        users={pendingUsers}
                        emptyText="No Pending Jobs"
                        icon="more_horiz"
                    />
                    <Column
                        title="In Progress"
                        count={activeUsers.length}
                        color="bg-primary animate-pulse"
                        users={activeUsers}
                        emptyText="No Active Trips"
                        icon="filter_list"
                    />
                    <Column
                        title="Completed"
                        count={completedUsers.length}
                        color="bg-green-500"
                        users={completedUsers}
                        emptyText="No History Yet"
                        icon="history"
                    />
                </div>

                {/* Mobile View - Single Column Based on Active Tab */}
                <div className="md:hidden h-full px-1">
                    {mobileTab === 'pending' && (
                        <Column
                            title="Pending"
                            count={pendingUsers.length}
                            color="bg-gray-400"
                            users={pendingUsers}
                            emptyText="No Pending Jobs"
                            icon="more_horiz"
                        />
                    )}
                    {mobileTab === 'active' && (
                        <Column
                            title="In Progress"
                            count={activeUsers.length}
                            color="bg-primary animate-pulse"
                            users={activeUsers}
                            emptyText="No Active Trips"
                            icon="filter_list"
                        />
                    )}
                    {mobileTab === 'completed' && (
                        <Column
                            title="Completed"
                            count={completedUsers.length}
                            color="bg-green-500"
                            users={completedUsers}
                            emptyText="No History Yet"
                            icon="history"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default KanbanBoard;
