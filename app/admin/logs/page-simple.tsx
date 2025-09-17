"use client";

import { useState, useEffect } from 'react';

interface SystemLog {
  id: number;
  guild_id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  action_name: string;
  target_name?: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}

export default function AdminLogsPageSimple() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/logs?limit=10');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      } else {
        const errorText = await response.text();
        setError(`API Error ${response.status}: ${errorText}`);
      }
    } catch (err) {
      setError(`Network Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">System Logs</h1>
        <div className="text-center py-8">Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">System Logs</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={fetchLogs}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-gray-600">Monitor all user actions and system events</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No logs found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.user_name}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.action_type === 'feature_toggle' ? 'bg-blue-100 text-blue-800' :
                      log.action_type === 'user_management' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action_type.replace('_', ' ')}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">{log.action_name}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.target_name || 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Showing {logs.length} logs
      </div>
    </div>
  );
}
