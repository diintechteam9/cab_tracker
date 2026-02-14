import React from 'react';
import KanbanCard from './KanbanCard';

const KanbanBoard = ({ users, locations, onTrack, onComplete, onViewHistory }) => {
    const pendingUsers = users.filter(u => u.status === 'ACTIVE' && !locations[u.token]);
    const activeUsers = users.filter(u => u.status === 'ACTIVE' && locations[u.token]);
    const completedUsers = users.filter(u => u.status === 'COMPLETED');

    // Common Column Wrapper
    const Column = ({ title, count, color, users, emptyText, icon }) => (
        <div className="w-full md:w-1/3 flex flex-col gap-4 min-w-[300px]">
            <div className="flex items-center justify-between px-1">
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

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar h-full">
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
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex flex-col md:flex-row gap-6 h-full pb-4">

                {/* Pending Column */}
                <Column
                    title="Pending"
                    count={pendingUsers.length}
                    color="bg-gray-400"
                    users={pendingUsers}
                    emptyText="No Pending Jobs"
                    icon="more_horiz"
                />

                {/* In Progress Column */}
                <Column
                    title="In Progress"
                    count={activeUsers.length}
                    color="bg-primary animate-pulse"
                    users={activeUsers}
                    emptyText="No Active Trips"
                    icon="filter_list"
                />

                {/* Completed Column */}
                <Column
                    title="Completed"
                    count={completedUsers.length}
                    color="bg-green-500"
                    users={completedUsers}
                    emptyText="No History Yet"
                    icon="history"
                />

            </div>
        </div>
    );
};

export default KanbanBoard;
