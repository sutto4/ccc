"use client";

import dynamic from 'next/dynamic';

// Dynamically import the existing service quotas page
const ServiceQuotasPage = dynamic(() => import('../../service-quotas/page'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
        <span>Loading Service Quotas...</span>
      </div>
    </div>
  )
});

export default function PlatformQuotas() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Service Quotas</h1>
        <p className="text-muted-foreground">
          Monitor and manage system resource quotas and limits
        </p>
      </div>
      <ServiceQuotasPage />
    </div>
  );
}
