import React, { useState } from 'react';

const DashboardLayout = ({ children, activeTab, setActiveTab, onNewJourney }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-100 min-h-screen flex flex-col overflow-hidden">

            {/* Top Navigation */}
            <nav className="h-16 bg-surface-light dark:bg-surface-dark border-b border-neutral-light dark:border-neutral-dark px-6 flex items-center justify-between shrink-0 z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-background-dark font-bold text-lg">
                        <span className="material-icons text-xl">near_me</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">
                        FleetOps <span className="text-gray-400 dark:text-gray-500 font-normal">Manager</span>
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2 bg-background-light dark:bg-background-dark px-3 py-1.5 rounded-lg border border-neutral-light dark:border-neutral-dark">
                        <span className="material-icons text-gray-400 text-sm">search</span>
                        <input
                            className="bg-transparent border-none outline-none text-sm w-48 placeholder-gray-400 focus:ring-0"
                            placeholder="Search vehicle or driver..."
                            type="text"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="w-8 h-8 rounded-full bg-background-light dark:bg-background-dark hover:bg-neutral-light dark:hover:bg-neutral-dark flex items-center justify-center transition-colors">
                            <span className="material-icons text-gray-500 dark:text-gray-400 text-lg">notifications</span>
                        </button>
                        <div className="h-8 w-px bg-neutral-light dark:bg-neutral-dark"></div>
                        <div className="flex items-center gap-2 cursor-pointer">
                            <div className="w-8 h-8 rounded-full border border-neutral-light dark:border-neutral-dark bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                                AM
                            </div>
                            <span className="text-sm font-medium hidden sm:block">Alex M.</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col p-6 overflow-hidden">

                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold">Journey Board</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage real-time logistics and trip history</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Tab Switcher */}
                        <div className="flex items-center bg-surface-light dark:bg-surface-dark rounded-lg p-1 border border-neutral-light dark:border-neutral-dark shadow-sm">
                            {[
                                { id: 'kanban', label: 'Board' },
                                { id: 'list', label: 'List' },
                                { id: 'map', label: 'Map' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-primary/20 text-primary-dark dark:text-primary'
                                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onNewJourney}
                            className="bg-primary hover:bg-primary-dark text-background-dark font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-soft transition-colors"
                        >
                            <span className="material-icons text-sm">add</span>
                            New Journey
                        </button>
                    </div>
                </div>

                {/* Dynamic Content */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    {children}
                </div>

            </main>
        </div>
    );
};

export default DashboardLayout;
