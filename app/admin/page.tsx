"use client";

import dynamic from 'next/dynamic';

// Dynamically import the overview page
const OverviewPage = dynamic(() => import('./overview/page'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span>Loading Admin Overview...</span>
      </div>
    </div>
  )
});

export default function AdminDashboard() {
  return <OverviewPage />;
}
