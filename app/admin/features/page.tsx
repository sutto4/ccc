"use client";

import { useEffect, useState } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Crown, Plus, Edit, Trash2 } from "lucide-react";

interface Feature {
  id: number;
  feature_key: string;
  feature_name: string;
  description: string;
  minimum_package: 'free' | 'premium';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    feature_key: '',
    feature_name: '',
    description: '',
    minimum_package: 'free' as 'free' | 'premium',
    is_active: true
  });

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await fetch('/api/admin/features');
      if (!response.ok) throw new Error('Failed to fetch features');
      const data = await response.json();
      setFeatures(data.features || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingFeature 
        ? `/api/admin/features/${editingFeature.id}`
        : '/api/admin/features';
      
      const method = editingFeature ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save feature');
      
      await fetchFeatures();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (featureId: number) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;
    
    try {
      const response = await fetch(`/api/admin/features/${featureId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete feature');
      
      await fetchFeatures();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      feature_key: '',
      feature_name: '',
      description: '',
      minimum_package: 'free',
      is_active: true
    });
    setEditingFeature(null);
    setShowAddForm(false);
  };

  const startEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData({
      feature_key: feature.feature_key,
      feature_name: feature.feature_name,
      description: feature.description,
      minimum_package: feature.minimum_package,
      is_active: feature.is_active
    });
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <Section title="Admin Features">
        <div className="text-center py-8">Loading...</div>
      </Section>
    );
  }

  return (
    <Section title="Admin Features">
      <div className="space-y-6">
        {/* Add/Edit Feature Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                {editingFeature ? 'Edit Feature' : 'Add New Feature'}
              </h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feature_key">Feature Key</Label>
                    <Input
                      id="feature_key"
                      value={formData.feature_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, feature_key: e.target.value }))}
                      placeholder="e.g., embedded_messages"
                      required
                      disabled={!!editingFeature} // Can't change key when editing
                    />
                  </div>
                  <div>
                    <Label htmlFor="feature_name">Display Name</Label>
                    <Input
                      id="feature_name"
                      value={formData.feature_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, feature_name: e.target.value }))}
                      placeholder="e.g., Embedded Messages"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this feature does..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_package">Package Requirement</Label>
                    <select
                      id="minimum_package"
                      value={formData.minimum_package}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_package: e.target.value as 'free' | 'premium' }))}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingFeature ? 'Update Feature' : 'Add Feature'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Features List */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Global Features</h2>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Feature
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {features.map((feature) => (
            <Card key={feature.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{feature.feature_name}</h3>
                      {feature.minimum_package === 'premium' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        feature.minimum_package === 'premium' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {feature.minimum_package}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        feature.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {feature.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {feature.description}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Key: {feature.feature_key}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(feature)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(feature.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {features.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No features found. Add your first feature to get started.
          </div>
        )}
      </div>
    </Section>
  );
}
