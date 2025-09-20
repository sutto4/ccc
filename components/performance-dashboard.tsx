'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetric {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: string;
}

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/performance/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const getOperationStats = (operation: string) => {
    const operationMetrics = metrics.filter(m => m.operation === operation && m.duration !== undefined);
    if (operationMetrics.length === 0) return null;

    const durations = operationMetrics.map(m => m.duration!);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const errors = operationMetrics.filter(m => m.error).length;

    return { avg, min, max, count: operationMetrics.length, errors };
  };

  const getSlowestOperations = () => {
    return metrics
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);
  };

  const getStatusColor = (duration: number) => {
    if (duration > 2000) return 'text-red-600';
    if (duration > 1000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (duration: number) => {
    if (duration > 2000) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (duration > 1000) return <Clock className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const operations = [
    'guilds-api-total',
    'discord-api-fetch',
    'bot-api-fetch',
    'db-access-control-query',
    'permission-check',
    'db-group-info-query',
    'bot-api-http-fetch'
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <Button 
          onClick={fetchMetrics} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Operation Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {operations.map(operation => {
          const stats = getOperationStats(operation);
          if (!stats) return null;

          return (
            <Card key={operation}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {operation.replace(/-/g, ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Average</span>
                  <span className={`font-mono text-sm ${getStatusColor(stats.avg)}`}>
                    {stats.avg.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Min/Max</span>
                  <span className="font-mono text-xs text-gray-600">
                    {stats.min.toFixed(0)}/{stats.max.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Count</span>
                  <Badge variant="secondary" className="text-xs">
                    {stats.count}
                  </Badge>
                </div>
                {stats.errors > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-500">Errors</span>
                    <Badge variant="destructive" className="text-xs">
                      {stats.errors}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Slowest Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Slowest Operations (Last 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getSlowestOperations().map((metric, index) => (
              <div key={metric.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(metric.duration!)}
                  <span className="font-medium text-sm">
                    {metric.operation.replace(/-/g, ' ')}
                  </span>
                  {metric.metadata && (
                    <Badge variant="outline" className="text-xs">
                      {Object.entries(metric.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`font-mono text-sm ${getStatusColor(metric.duration!)}`}>
                    {metric.duration!.toFixed(0)}ms
                  </span>
                  {metric.error && (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {metrics.slice(-20).reverse().map((metric) => (
              <div key={metric.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center space-x-2">
                  {metric.duration ? getStatusIcon(metric.duration) : <Clock className="w-3 h-3 text-gray-400" />}
                  <span className="font-mono">
                    {new Date(metric.startTime).toLocaleTimeString()}
                  </span>
                  <span className="text-gray-600">
                    {metric.operation.replace(/-/g, ' ')}
                  </span>
                </div>
                {metric.duration && (
                  <span className={`font-mono ${getStatusColor(metric.duration)}`}>
                    {metric.duration.toFixed(0)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

