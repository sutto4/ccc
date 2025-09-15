"use client";

import { useState } from "react";
import { 
  Database, 
  Shield, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  Settings
} from "lucide-react";

export default function BulkOperations() {
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string>('');

  const bulkOperations = [
    {
      id: 'sync-all',
      title: 'Sync All Guilds',
      description: 'Synchronize all guild data with Discord API',
      icon: RefreshCw,
      color: 'bg-blue-500',
      endpoint: '/api/admin/bulk/sync-all'
    },
    {
      id: 'cleanup-inactive',
      title: 'Cleanup Inactive Guilds',
      description: 'Remove guilds that have been inactive for over 30 days',
      icon: Trash2,
      color: 'bg-red-500',
      endpoint: '/api/admin/bulk/cleanup-inactive'
    },
    {
      id: 'update-member-counts',
      title: 'Update Member Counts',
      description: 'Refresh member counts for all active guilds',
      icon: Users,
      color: 'bg-green-500',
      endpoint: '/api/admin/bulk/update-member-counts'
    },
    {
      id: 'apply-premium',
      title: 'Apply Premium Features',
      description: 'Enable premium features for all premium guilds',
      icon: Shield,
      color: 'bg-yellow-500',
      endpoint: '/api/admin/bulk/apply-premium'
    }
  ];

  const handleOperation = async (operation: typeof bulkOperations[0]) => {
    if (!confirm(`Are you sure you want to execute: ${operation.title}?`)) {
      return;
    }

    setLoading(true);
    setResults('');
    setSelectedOperation(operation.id);

    try {
      const response = await fetch(operation.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setResults(`✅ Success: ${data.message || 'Operation completed successfully'}`);
      } else {
        setResults(`❌ Error: ${data.error || 'Operation failed'}`);
      }
    } catch (error) {
      setResults(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setSelectedOperation('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Bulk Operations Warning</h3>
            <p className="text-sm text-yellow-700 mt-1">
              These operations affect multiple guilds at once. Use with caution and ensure you understand the impact.
            </p>
          </div>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bulkOperations.map((operation) => (
          <div
            key={operation.id}
            className="bg-card rounded-lg border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${operation.color}`}>
                <operation.icon className="h-6 w-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  {operation.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {operation.description}
                </p>
                
                <button
                  onClick={() => handleOperation(operation)}
                  disabled={loading}
                  className={[
                    "px-4 py-2 rounded-lg text-white font-medium transition-colors",
                    loading && selectedOperation === operation.id
                      ? "bg-gray-400 cursor-not-allowed"
                      : `${operation.color} hover:opacity-90`
                  ].join(" ")}
                >
                  {loading && selectedOperation === operation.id ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running...
                    </div>
                  ) : (
                    "Execute"
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Operation Results
          </h3>
          <div className="bg-muted rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap">{results}</pre>
          </div>
        </div>
      )}

      {/* Recent Operations Log */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Operations</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Operation history coming soon</p>
          <p className="text-sm">This will show a log of recent bulk operations</p>
        </div>
      </div>
    </div>
  );
}
