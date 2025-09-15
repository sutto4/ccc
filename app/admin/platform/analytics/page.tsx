"use client";

import dynamic from 'next/dynamic';

// Dynamically import the existing analytics page
const AnalyticsPage = dynamic(() => import('../../analytics/page'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        <span>Loading Analytics...</span>
      </div>
    </div>
  )
});

export default function PlatformAnalytics() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground">
          Monitor usage statistics, performance metrics, and system insights
        </p>
      </div>
      <AnalyticsPage />
    </div>
  );
}
