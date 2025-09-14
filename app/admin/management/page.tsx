"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Check,
  RefreshCw,
  Settings,
  Database,
  Server,
  Command,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Filter,
  Download,
  Upload,
  Globe,
  Shield,
  Zap
} from "lucide-react";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { useSession } from "next-auth/react";

interface Feature {
  id: number;
  name: string; // feature_key
  display_name: string; // feature_name
  description: string;
  minimum_package: string;
  enabled: boolean; // is_active
  created_at: string;
  updated_at: string;
}

interface GuildFeature {
  id: number;
  guild_id: string;
  feature_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  guild_name?: string;
  feature_display_name?: string;
}

interface CommandMapping {
  id: number;
  command_name: string;
  feature_key: string;
  description: string;
  created_at: string;
  updated_at: string;
  feature_display_name?: string;
}

interface DefaultConfig {
  features: string[];
  commands: string[];
}

export default function AdminManagement() {
  return (
    <AuthErrorBoundary>
      <AdminManagementContent />
    </AuthErrorBoundary>
  );
}

function AdminManagementContent() {
  const { data: session, status: sessionStatus } = useSession();
  
  // State management
  const [activeTab, setActiveTab] = useState<'features' | 'guild-features' | 'command-mappings' | 'defaults' | 'bulk'>('features');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);
  
  // Data state
  const [features, setFeatures] = useState<Feature[]>([]);
  const [guildFeatures, setGuildFeatures] = useState<GuildFeature[]>([]);
  const [commandMappings, setCommandMappings] = useState<CommandMapping[]>([]);
  const [defaultConfig, setDefaultConfig] = useState<DefaultConfig>({ features: [], commands: [] });
  
  // Editing state
  const [editingItem, setEditingItem] = useState<{type: string, id: number, data: any} | null>(null);
  const [newItem, setNewItem] = useState<{type: string, data: any} | null>(null);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Notification system
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Load data functions
  const loadFeatures = async () => {
    try {
      const response = await fetch('/api/admin/management/features');
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.features || []);
      }
    } catch (error) {
      console.error('Failed to load features:', error);
      showNotification('Failed to load features', 'error');
    }
  };

  const loadGuildFeatures = async () => {
    try {
      const response = await fetch('/api/admin/management/guild-features');
      if (response.ok) {
        const data = await response.json();
        setGuildFeatures(data.guildFeatures || []);
      }
    } catch (error) {
      console.error('Failed to load guild features:', error);
      showNotification('Failed to load guild features', 'error');
    }
  };

  const loadCommandMappings = async () => {
    try {
      const response = await fetch('/api/admin/management/command-mappings');
      if (response.ok) {
        const data = await response.json();
        setCommandMappings(data.commandMappings || []);
      }
    } catch (error) {
      console.error('Failed to load command mappings:', error);
      showNotification('Failed to load command mappings', 'error');
    }
  };

  const loadDefaultConfig = async () => {
    try {
      const response = await fetch('/api/admin/management/defaults');
      if (response.ok) {
        const data = await response.json();
        setDefaultConfig(data.defaults || { features: [], commands: [] });
      }
    } catch (error) {
      console.error('Failed to load default config:', error);
      showNotification('Failed to load default configuration', 'error');
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFeatures(),
        loadGuildFeatures(),
        loadCommandMappings(),
        loadDefaultConfig()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // CRUD operations
  const handleCreate = useCallback(async (type: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/management/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showNotification(`${type} created successfully`, 'success');
        await loadAllData();
        setNewItem(null);
      } else {
        const error = await response.json();
        showNotification(`Failed to create ${type}: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error(`Failed to create ${type}:`, error);
      showNotification(`Failed to create ${type}`, 'error');
    }
  }, [loadAllData, showNotification]);

  const handleUpdate = useCallback(async (type: string, id: number, data: any) => {
    try {
      // Special handling for defaults - it doesn't use an ID in the URL
      const url = type === 'defaults' 
        ? `/api/admin/management/${type}`
        : `/api/admin/management/${type}/${id}`;
        
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showNotification(`${type} updated successfully`, 'success');
        await loadAllData();
        setEditingItem(null);
      } else {
        const error = await response.json();
        showNotification(`Failed to update ${type}: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error(`Failed to update ${type}:`, error);
      showNotification(`Failed to update ${type}`, 'error');
    }
  }, [loadAllData, showNotification]);

  const handleDelete = useCallback(async (type: string, id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const response = await fetch(`/api/admin/management/${type}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification(`${type} deleted successfully`, 'success');
        await loadAllData();
      } else {
        const error = await response.json();
        showNotification(`Failed to delete ${type}: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      showNotification(`Failed to delete ${type}`, 'error');
    }
  }, [loadAllData, showNotification]);

  // Memoized handlers for better performance
  const handleAddNew = useCallback(() => {
    setNewItem({ type: activeTab, data: {} });
  }, [activeTab]);

  // Bulk operations
  const handleBulkEnable = useCallback(async (type: 'features' | 'commands', items: string[]) => {
    try {
      const response = await fetch('/api/admin/management/bulk-enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, items })
      });

      if (response.ok) {
        showNotification(`Bulk enabled ${items.length} ${type}`, 'success');
        await loadAllData();
      } else {
        const error = await response.json();
        showNotification(`Failed to bulk enable: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to bulk enable:', error);
      showNotification('Failed to bulk enable', 'error');
    }
  }, [loadAllData, showNotification]);

  const handleBulkDisable = useCallback(async (type: 'features' | 'commands', items: string[]) => {
    try {
      const response = await fetch('/api/admin/management/bulk-disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, items })
      });

      if (response.ok) {
        showNotification(`Bulk disabled ${items.length} ${type}`, 'success');
        await loadAllData();
      } else {
        const error = await response.json();
        showNotification(`Failed to bulk disable: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to bulk disable:', error);
      showNotification('Failed to bulk disable', 'error');
    }
  }, [loadAllData, showNotification]);

  // Filter data based on search and filter options
  const getFilteredData = () => {
    let data: any[] = [];
    
    switch (activeTab) {
      case 'features':
        data = features;
        break;
      case 'guild-features':
        data = guildFeatures;
        break;
      case 'command-mappings':
        data = commandMappings;
        break;
      default:
        return [];
    }

    // Apply search filter
    if (searchTerm) {
      data = data.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply enabled/disabled filter
    if (filterEnabled !== 'all' && 'enabled' in data[0]) {
      data = data.filter(item => 
        filterEnabled === 'enabled' ? item.enabled : !item.enabled
      );
    }

    return data;
  };

  const filteredData = getFilteredData();

  // Show loading while session is loading
  if (sessionStatus === "loading") {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin management...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (sessionStatus === "unauthenticated" || !session?.user) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be logged in to access the admin management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
          'bg-blue-50 border-blue-400 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'warning' && <AlertCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'info' && <Info className="w-5 h-5 mr-2" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-600 mt-1">Manage features, commands, and server configurations</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'features', label: 'Features', icon: Settings },
                { id: 'guild-features', label: 'Guild Features', icon: Server },
                { id: 'command-mappings', label: 'Command Mappings', icon: Command },
                { id: 'defaults', label: 'Default Config', icon: Globe },
                { id: 'bulk', label: 'Bulk Operations', icon: Zap }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Search and Filter Controls */}
            {activeTab !== 'defaults' && activeTab !== 'bulk' && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                    />
                  </div>
                </div>
                <select
                  value={filterEnabled}
                  onChange={(e) => setFilterEnabled(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <button
                  onClick={handleAddNew}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'features' && (
              <FeaturesTable 
                data={filteredData}
                onEdit={setEditingItem}
                onDelete={handleDelete}
                editingItem={editingItem}
                onSave={handleUpdate}
                onCancel={() => setEditingItem(null)}
                newItem={newItem}
                onCreate={handleCreate}
                onCancelNew={() => setNewItem(null)}
              />
            )}

            {activeTab === 'guild-features' && (
              <GuildFeaturesTable 
                data={filteredData}
                onEdit={setEditingItem}
                onDelete={handleDelete}
                editingItem={editingItem}
                onSave={handleUpdate}
                onCancel={() => setEditingItem(null)}
                newItem={newItem}
                onCreate={handleCreate}
                onCancelNew={() => setNewItem(null)}
              />
            )}

            {activeTab === 'command-mappings' && (
              <CommandMappingsTable 
                data={filteredData}
                onEdit={setEditingItem}
                onDelete={handleDelete}
                editingItem={editingItem}
                onSave={handleUpdate}
                onCancel={() => setEditingItem(null)}
                newItem={newItem}
                onCreate={handleCreate}
                onCancelNew={() => setNewItem(null)}
              />
            )}

            {activeTab === 'defaults' && (
              <DefaultConfigPanel 
                config={defaultConfig}
                onUpdate={handleUpdate}
                features={features}
                commands={commandMappings}
              />
            )}

            {activeTab === 'bulk' && (
              <BulkOperationsPanel 
                features={features}
                commands={commandMappings}
                onBulkEnable={handleBulkEnable}
                onBulkDisable={handleBulkDisable}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual table components with inline editing
function FeaturesTable({ data, onEdit, onDelete, editingItem, onSave, onCancel, newItem, onCreate, onCancelNew }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const startEdit = (item: Feature) => {
    setEditingId(item.id.toString());
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    if (editingId) {
      await onSave('features', parseInt(editingId), editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Add New Row */}
          {newItem && newItem.type === 'features' && (
            <tr className="bg-blue-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <input
                  type="text"
                  placeholder="Feature Key"
                  value={newItem.data.name || ''}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, name: e.target.value } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <input
                  type="text"
                  placeholder="Display Name"
                  value={newItem.data.display_name || ''}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, display_name: e.target.value } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={newItem.data.minimum_package || 'free'}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, minimum_package: e.target.value } })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={newItem.data.enabled ? 'enabled' : 'disabled'}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, enabled: e.target.value === 'enabled' } })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <button
                    onClick={() => onCreate('features', newItem.data)}
                    className="text-green-600 hover:text-green-900"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCancelNew()}
                    className="text-gray-600 hover:text-gray-900"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          )}

          {/* Existing Rows */}
          {data.map((item: Feature) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {editingId === item.id.toString() ? (
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    disabled // Can't change feature key
                  />
                ) : (
                  item.name
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {editingId === item.id.toString() ? (
                  <input
                    type="text"
                    value={editData.display_name || ''}
                    onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                ) : (
                  item.display_name
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === item.id.toString() ? (
                  <select
                    value={editData.minimum_package || 'free'}
                    onChange={(e) => setEditData({ ...editData, minimum_package: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.minimum_package === 'free' ? 'bg-green-100 text-green-800' : 
                    item.minimum_package === 'premium' ? 'bg-purple-100 text-purple-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.minimum_package}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === item.id.toString() ? (
                  <select
                    value={editData.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setEditData({ ...editData, enabled: e.target.value === 'enabled' })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  {editingId === item.id.toString() ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="text-green-600 hover:text-green-900"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete('features', item.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuildFeaturesTable({ data, onEdit, onDelete, editingItem, onSave, onCancel, newItem, onCreate, onCancelNew }: any) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([]);
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([]);

  // Load available features and guilds for the dropdowns
  useEffect(() => {
    const loadData = async () => {
      try {
        const [featuresResponse, guildsResponse] = await Promise.all([
          fetch('/api/admin/management/features'),
          fetch('/api/admin/management/guilds')
        ]);
        
        if (featuresResponse.ok) {
          const featuresData = await featuresResponse.json();
          setAvailableFeatures(featuresData.features || []);
        }
        
        if (guildsResponse.ok) {
          const guildsData = await guildsResponse.json();
          setAvailableGuilds(guildsData.guilds || []);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const startEdit = (item: GuildFeature) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    if (editingId) {
      await onSave('guild-features', editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleCreate = useCallback(async () => {
    if (newItem && newItem.data) {
      await onCreate('guild-features', newItem.data);
    }
  }, [newItem, onCreate]);

  const handleNewItemChange = useCallback((field: string, value: any) => {
    if (newItem) {
      onEdit({ ...newItem, data: { ...newItem.data, [field]: value } });
    }
  }, [newItem, onEdit]);

  const handleEditDataChange = useCallback((field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guild</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Add New Row */}
          {newItem && newItem.type === 'guild-features' && (
            <tr className="bg-blue-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <select
                  value={newItem.data.guild_id || ''}
                  onChange={(e) => handleNewItemChange('guild_id', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="">Select Guild</option>
                  {availableGuilds.map((guild: any) => (
                    <option key={guild.guild_id} value={guild.guild_id}>
                      {guild.guild_name} ({guild.guild_id})
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <select
                  value={newItem.data.feature_key || ''}
                  onChange={(e) => handleNewItemChange('feature_key', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="">Select Feature</option>
                  {availableFeatures.map((feature: any) => (
                    <option key={feature.name} value={feature.name}>
                      {feature.display_name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={newItem.data.enabled ? 'enabled' : 'disabled'}
                  onChange={(e) => handleNewItemChange('enabled', e.target.value === 'enabled')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    className="text-green-600 hover:text-green-900"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCancelNew()}
                    className="text-gray-600 hover:text-gray-900"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          )}

          {/* Existing Rows */}
          {data.map((item: GuildFeature) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {editingId === item.id ? (
                  <select
                    value={editData.guild_id || ''}
                    onChange={(e) => handleEditDataChange('guild_id', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select Guild</option>
                    {availableGuilds.map((guild: any) => (
                      <option key={guild.guild_id} value={guild.guild_id}>
                        {guild.guild_name} ({guild.guild_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <div className="font-medium">{item.guild_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{item.guild_id}</div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {editingId === item.id ? (
                  <select
                    value={editData.feature_key || ''}
                    onChange={(e) => handleEditDataChange('feature_key', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select Feature</option>
                    {availableFeatures.map((feature: any) => (
                      <option key={feature.name} value={feature.name}>
                        {feature.display_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <div className="font-medium">{item.feature_display_name || item.feature_key}</div>
                    <div className="text-xs text-gray-400">{item.feature_key}</div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === item.id ? (
                  <select
                    value={editData.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => handleEditDataChange('enabled', e.target.value === 'enabled')}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="text-green-600 hover:text-green-900"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete('guild-features', item.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommandMappingsTable({ data, onEdit, onDelete, editingItem, onSave, onCancel, newItem, onCreate, onCancelNew }: any) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const startEdit = (item: CommandMapping) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    if (editingId) {
      await onSave('command-mappings', editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Command</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Add New Row */}
          {newItem && newItem.type === 'command-mappings' && (
            <tr className="bg-blue-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <input
                  type="text"
                  placeholder="Command Name"
                  value={newItem.data.command_name || ''}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, command_name: e.target.value } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <select
                  value={newItem.data.feature_key || ''}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, feature_key: e.target.value } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="">Select Feature</option>
                  <option value="moderation">Moderation</option>
                  <option value="custom_commands">Custom Commands</option>
                  <option value="verification_system">Verification System</option>
                  <option value="feedback_system">Feedback System</option>
                  <option value="embedded_messages">Embedded Messages</option>
                  <option value="reaction_roles">Reaction Roles</option>
                </select>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <input
                  type="text"
                  placeholder="Description"
                  value={newItem.data.description || ''}
                  onChange={(e) => onEdit({ ...newItem, data: { ...newItem.data, description: e.target.value } })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <button
                    onClick={() => onCreate('command-mappings', newItem.data)}
                    className="text-green-600 hover:text-green-900"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCancelNew()}
                    className="text-gray-600 hover:text-gray-900"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          )}

          {/* Existing Rows */}
          {data.map((item: CommandMapping) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editData.command_name || ''}
                    onChange={(e) => setEditData({ ...editData, command_name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                ) : (
                  item.command_name
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {editingId === item.id ? (
                  <select
                    value={editData.feature_key || ''}
                    onChange={(e) => setEditData({ ...editData, feature_key: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="moderation">Moderation</option>
                    <option value="custom_commands">Custom Commands</option>
                    <option value="verification_system">Verification System</option>
                    <option value="feedback_system">Feedback System</option>
                    <option value="embedded_messages">Embedded Messages</option>
                    <option value="reaction_roles">Reaction Roles</option>
                  </select>
                ) : (
                  <div>
                    <div className="font-medium">{item.feature_display_name || item.feature_key}</div>
                    <div className="text-xs text-gray-400">{item.feature_key}</div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                ) : (
                  item.description
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="text-green-600 hover:text-green-900"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete('command-mappings', item.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DefaultConfigPanel({ config, onUpdate, features, commands }: any) {
  // Group commands by feature for better organization
  const commandsByFeature = useMemo(() => {
    return commands.reduce((acc: any, command: CommandMapping) => {
      const featureKey = command.feature_key;
      if (!acc[featureKey]) {
        acc[featureKey] = [];
      }
      acc[featureKey].push(command);
      return acc;
    }, {});
  }, [commands]);

  // Separate features by package type - use useMemo to ensure stable separation
  const freeFeatures = useMemo(() => {
    return features.filter((f: Feature) => f.minimum_package === 'free');
  }, [features]);

  const premiumFeatures = useMemo(() => {
    return features.filter((f: Feature) => f.minimum_package === 'premium');
  }, [features]);


  return (
    <div className="space-y-8">
      {/* Summary Statistics */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{freeFeatures.length}</div>
            <div className="text-sm text-gray-600">Free Features</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{premiumFeatures.length}</div>
            <div className="text-sm text-gray-600">Premium Features</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{config.features.length}</div>
            <div className="text-sm text-gray-600">Enabled Features</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{config.commands.length}</div>
            <div className="text-sm text-gray-600">Enabled Commands</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Default Features for New Servers</h3>
        <p className="text-sm text-gray-600 mb-4">Enable/disable entire features for new servers. Commands will follow their feature's status unless overridden below.</p>
        
        {/* Free Features Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h4 className="text-md font-semibold text-gray-900">Free Features</h4>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {freeFeatures.length} features
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freeFeatures.map((feature: Feature) => (
              <label key={feature.id} className="flex items-center p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.features.includes(feature.name)}
                  onChange={(e) => {
                    const newFeatures = e.target.checked
                      ? [...config.features, feature.name]
                      : config.features.filter((f: string) => f !== feature.name);
                    onUpdate('defaults', 0, { features: newFeatures, commands: config.commands });
                  }}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">{feature.display_name}</div>
                  <div className="text-xs text-gray-500">{feature.name}</div>
                  {feature.description && (
                    <div className="text-xs text-gray-400 mt-1">{feature.description}</div>
                  )}
                </div>
                <div className="text-xs text-green-600 font-medium">FREE</div>
              </label>
            ))}
          </div>
        </div>

        {/* Premium Features Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h4 className="text-md font-semibold text-gray-900">Premium Features</h4>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {premiumFeatures.length} features
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {premiumFeatures.map((feature: Feature) => (
              <label key={feature.id} className="flex items-center p-3 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.features.includes(feature.name)}
                  onChange={(e) => {
                    const newFeatures = e.target.checked
                      ? [...config.features, feature.name]
                      : config.features.filter((f: string) => f !== feature.name);
                    onUpdate('defaults', 0, { features: newFeatures, commands: config.commands });
                  }}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">{feature.display_name}</div>
                  <div className="text-xs text-gray-500">{feature.name}</div>
                  {feature.description && (
                    <div className="text-xs text-gray-400 mt-1">{feature.description}</div>
                  )}
                </div>
                <div className="text-xs text-purple-600 font-medium">PREMIUM</div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fine-Grained Command Control</h3>
        <p className="text-sm text-gray-600 mb-4">Override individual commands even within enabled features. This gives you precise control over which commands are available to new servers.</p>
        
        {Object.entries(commandsByFeature).map(([featureKey, featureCommands]: [string, any]) => {
          const feature = features.find((f: Feature) => f.name === featureKey);
          const isFeatureEnabled = config.features.includes(featureKey);
          const isPremium = feature?.minimum_package === 'premium';
          
          return (
            <div key={featureKey} className={`mb-6 p-4 border rounded-lg ${
              isPremium ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{feature?.display_name || featureKey}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isPremium 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isPremium ? 'PREMIUM' : 'FREE'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {isFeatureEnabled ? 'Feature enabled - commands can be individually controlled' : 'Feature disabled - all commands disabled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allCommandNames = featureCommands.map((c: any) => c.command_name);
                      const newCommands = isFeatureEnabled 
                        ? [...new Set([...config.commands, ...allCommandNames])]
                        : config.commands.filter((c: string) => !allCommandNames.includes(c));
                      onUpdate('defaults', 0, { features: config.features, commands: newCommands });
                    }}
                    className={`text-xs px-2 py-1 rounded hover:opacity-80 ${
                      isPremium 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {isFeatureEnabled ? 'Enable All' : 'Disable All'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {featureCommands.map((command: CommandMapping) => (
                  <label key={command.id} className={`flex items-center p-2 rounded ${
                    isFeatureEnabled ? 'hover:bg-gray-50' : 'opacity-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={config.commands.includes(command.command_name)}
                      disabled={!isFeatureEnabled}
                      onChange={(e) => {
                        const newCommands = e.target.checked
                          ? [...config.commands, command.command_name]
                          : config.commands.filter((c: string) => c !== command.command_name);
                        onUpdate('defaults', 0, { features: config.features, commands: newCommands });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">{command.command_name}</div>
                      <div className="text-xs text-gray-500">{command.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkOperationsPanel({ features, commands, onBulkEnable, onBulkDisable }: any) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedCommands, setSelectedCommands] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Feature Operations</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {features.map((feature: Feature) => (
            <label key={feature.id} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedFeatures.includes(feature.name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFeatures([...selectedFeatures, feature.name]);
                  } else {
                    setSelectedFeatures(selectedFeatures.filter(f => f !== feature.name));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{feature.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onBulkEnable('features', selectedFeatures)}
            disabled={selectedFeatures.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Enable Selected ({selectedFeatures.length})
          </button>
          <button
            onClick={() => onBulkDisable('features', selectedFeatures)}
            disabled={selectedFeatures.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Disable Selected ({selectedFeatures.length})
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Command Operations</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {commands.map((command: CommandMapping) => (
            <label key={command.id} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedCommands.includes(command.command_name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCommands([...selectedCommands, command.command_name]);
                  } else {
                    setSelectedCommands(selectedCommands.filter(c => c !== command.command_name));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{command.command_name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onBulkEnable('commands', selectedCommands)}
            disabled={selectedCommands.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Enable Selected ({selectedCommands.length})
          </button>
          <button
            onClick={() => onBulkDisable('commands', selectedCommands)}
            disabled={selectedCommands.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Disable Selected ({selectedCommands.length})
          </button>
        </div>
      </div>
    </div>
  );
}
