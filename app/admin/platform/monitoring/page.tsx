"use client";

import dynamic from 'next/dynamic';

// Dynamically import the existing e2e monitoring page
const MonitoringPage = dynamic(() => import('../../e2e-monitoring/page'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        <span>Loading Monitoring...</span>
      </div>
    </div>
  )
});

export default function PlatformMonitoring() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground">
          End-to-end monitoring, health checks, and system alerts
        </p>
      </div>
      <MonitoringPage />
    </div>
  );
}
