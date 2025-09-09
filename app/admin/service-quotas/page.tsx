"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  Filter,
  BarChart3
} from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

interface QuotaStatus {
  serviceName: string;
  quotaType: string;
  limitValue: number;
  windowSeconds: number;
  description: string;
  currentUsage: number;
  usagePercentage: number;
  isRateLimited: boolean;
  status: 'good' | 'moderate' | 'warning' | 'critical';
  lastUpdated: string;
  usageStats: {
    totalRequests: number;
    averageRequestsPerHour: number;
    peakUsage: number;
    violations: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  };
}

interface QuotaViolation {
  id: number;
  serviceName: string;
  quotaType: string;
  violationType: 'rate_limit' | 'quota_exceeded' | 'burst_limit';
  requestedCount: number;
  availableCount: number;
  limitValue: number;
  windowStart: string;
  windowEnd: string;
  endpoint?: string;
  userId?: string;
  ipAddress?: string;
  createdAt: string;
}

export default async function ServiceQuotasPage(undefined) {
  return (
    <AuthErrorBoundary>
      <ServiceQuotasPageContent undefined />
    </AuthErrorBoundary>
  );
}

async function ServiceQuotasPageContent(undefined) {
  
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus[]>([]);
  const [violations, setViolations] = useState<QuotaViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [showViolations, setShowViolations] = useState(false);

  const fetchQuotaData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedService !== 'all') {
        params.append('service', selectedService);
      }
      if (showViolations) {
        params.append('include_violations', 'true');
      }
      params.append('hours', '24');

      const response = await fetch(`/api/admin/service-quotas?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQuotaStatus(data.quotaStatus || []);
        setViolations(data.violations || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch quota data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching quota data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotaData();
    const interval = setInterval(fetchQuotaData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedService, showViolations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'moderate': return 'bg-blue-500';
      case 'good': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'moderate': return <Clock className="h-4 w-4" />;
      case 'good': return <CheckCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatWindow = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const services = Array.from(new Set(quotaStatus.map(q => q.serviceName)));

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <h1 className="text-2xl font-bold mb-4">Service Quotas</h1>
        <p>Error: {error}</p>
        <Button onClick={fetchQuotaData} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Service Quotas</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowViolations(!showViolations)}
            variant={showViolations ? "default" : "outline"}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showViolations ? 'Hide' : 'Show'} Violations
          </Button>
          <Button onClick={fetchQuotaData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Service Filter */}
      <div className="flex gap-2">
        <Button
          onClick={() => setSelectedService('all')}
          variant={selectedService === 'all' ? 'default' : 'outline'}
        >
          All Services
        </Button>
        {services.map(service => (
          <Button
            key={service}
            onClick={() => setSelectedService(service)}
            variant={selectedService === service ? 'default' : 'outline'}
          >
            {service}
          </Button>
        ))}
      </div>

      {/* Quota Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quotaStatus.map((quota, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{quota.serviceName}</CardTitle>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(quota.status)}`}></div>
              </div>
              <p className="text-sm text-muted-foreground">{quota.quotaType}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage</span>
                  <span>{quota.currentUsage.toLocaleString()} / {quota.limitValue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getStatusColor(quota.status)}`}
                    style={{ width: `${Math.min(quota.usagePercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{quota.usagePercentage.toFixed(1)}%</span>
                  <span>{formatWindow(quota.windowSeconds)}</span>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(quota.status)}
                  <span className="capitalize">{quota.status}</span>
                  {quota.isRateLimited && (
                    <Badge variant="destructive" className="text-xs">Rate Limited</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{quota.description}</p>
              </div>

              {/* Usage Stats */}
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-xs">
                  <span>24h Requests:</span>
                  <span>{quota.usageStats.totalRequests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Avg/Hour:</span>
                  <span>{quota.usageStats.averageRequestsPerHour.toFixed(1)}</span>
                </div>
                {quota.usageStats.violations > 0 && (
                  <div className="flex justify-between text-xs text-red-600">
                    <span>Violations:</span>
                    <span>{quota.usageStats.violations}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Violations Table */}
      {showViolations && violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Recent Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Service</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Violation</th>
                    <th className="text-left p-2">Requested</th>
                    <th className="text-left p-2">Available</th>
                    <th className="text-left p-2">Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((violation) => (
                    <tr key={violation.id} className="border-b">
                      <td className="p-2 text-muted-foreground">
                        {new Date(violation.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="p-2 font-medium">{violation.serviceName}</td>
                      <td className="p-2">
                        <Badge variant="destructive" className="text-xs">
                          {violation.violationType}
                        </Badge>
                      </td>
                      <td className="p-2">{violation.quotaType}</td>
                      <td className="p-2">{violation.requestedCount}</td>
                      <td className="p-2">{violation.availableCount}</td>
                      <td className="p-2 font-mono text-xs">{violation.endpoint || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {quotaStatus.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quota data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

}
