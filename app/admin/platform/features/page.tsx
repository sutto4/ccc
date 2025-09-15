"use client";

import dynamic from 'next/dynamic';

// Dynamically import the existing management page to avoid duplication
const ManagementPage = dynamic(() => import('../../management/page'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span>Loading Features Management...</span>
      </div>
    </div>
  )
});

export default function PlatformFeatures() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Features Management</h1>
        <p className="text-muted-foreground">
          Configure platform features, guild assignments, and command mappings
        </p>
      </div>
      <ManagementPage />
    </div>
  );
}
