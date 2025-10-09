'use client';

import { useState } from 'react';
import { 
  Shield, 
  Settings, 
  Users, 
  MessageSquare, 
  Bot, 
  Crown,
  ChevronDown,
  Menu,
  X,
  CheckCircle,
  Star,
  Server,
  Calendar,
  Clock,
  MessageSquare as MessageSquareIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Mock data
const mockGuilds = [
  {
    id: '1403257704222429224',
    name: 'My Awesome Server',
    icon: 'https://cdn.discordapp.com/icons/1403257704222429224/a_1234567890abcdef.png',
    memberCount: 1250,
    roleCount: 45,
    isPremium: true,
    group: 'Gaming Community',
    features: [
      { name: 'Moderation Tools', enabled: true, premium: false },
      { name: 'AI Message Summarization', enabled: true, premium: true },
      { name: 'Custom Commands', enabled: true, premium: true },
      { name: 'Reaction Roles', enabled: true, premium: false },
      { name: 'Verification System', enabled: true, premium: false },
    ]
  },
  {
    id: '429139312572104705',
    name: 'Test Server',
    icon: 'https://cdn.discordapp.com/icons/429139312572104705/b_1234567890abcdef.png',
    memberCount: 89,
    roleCount: 12,
    isPremium: false,
    group: null,
    features: [
      { name: 'Moderation Tools', enabled: true, premium: false },
      { name: 'Reaction Roles', enabled: true, premium: false },
    ]
  }
];

const mockStats = {
  totalMembers: 1250,
  totalRoles: 45,
  onlineMembers: 234,
  premiumFeatures: 8,
  activeModerationCases: 3
};

export default function MockupLayoutPage() {
  const [selectedGuild, setSelectedGuild] = useState(mockGuilds[0]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'moderation', label: 'Moderation', icon: Users },
    { id: 'features', label: 'Features', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ServerMate</h1>
            </div>

            {/* Server Selector */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                  className="flex items-center space-x-2 min-w-[200px] justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <img 
                      src={selectedGuild.icon} 
                      alt={selectedGuild.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="font-medium">{selectedGuild.name}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {/* Server Dropdown */}
                {isServerDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {mockGuilds.map((guild) => (
                      <button
                        key={guild.id}
                        onClick={() => {
                          setSelectedGuild(guild);
                          setIsServerDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                      >
                        <img 
                          src={guild.icon} 
                          alt={guild.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 truncate">{guild.name}</span>
                            {guild.isPremium && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {guild.memberCount} members
                            {guild.group && ` • ${guild.group}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Server Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <img 
                  src={selectedGuild.icon} 
                  alt={selectedGuild.name}
                  className="w-16 h-16 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedGuild.name}</h2>
                    {selectedGuild.isPremium && (
                      <Badge className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{selectedGuild.memberCount} members</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Server className="h-4 w-4" />
                      <span>{selectedGuild.roleCount} roles</span>
                    </span>
                    {selectedGuild.group && (
                      <span className="flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>{selectedGuild.group}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Members</p>
                      <p className="text-lg font-semibold">{mockStats.totalMembers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Online Now</p>
                      <p className="text-lg font-semibold">{mockStats.onlineMembers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Server className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Roles</p>
                      <p className="text-lg font-semibold">{mockStats.totalRoles}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Crown className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Premium Features</p>
                      <p className="text-lg font-semibold">{mockStats.premiumFeatures}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enabled Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>Enabled Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {selectedGuild.features.map((feature) => (
                    <div
                      key={feature.name}
                      className={`px-3 py-2 rounded-lg border flex items-center space-x-2 ${
                        feature.premium
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-900'
                          : 'bg-green-50 border-green-200 text-green-800'
                      }`}
                    >
                      {feature.premium ? (
                        <Crown className="h-4 w-4 flex-shrink-0 text-yellow-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">Settings</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('moderation')}
                  >
                    <Users className="h-6 w-6" />
                    <span className="text-sm">Moderation</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setActiveTab('features')}
                  >
                    <Bot className="h-6 w-6" />
                    <span className="text-sm">Features</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <MessageSquareIcon className="h-6 w-6" />
                    <span className="text-sm">Commands</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">General Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Server Name
                        </label>
                        <Input value={selectedGuild.name} readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Member Count
                        </label>
                        <Input value={selectedGuild.memberCount.toString()} readOnly />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">AI Configuration</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Prompt
                        </label>
                        <textarea 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                          placeholder="Enter custom AI prompt..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Moderation Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">3</div>
                    <div className="text-sm text-red-700">Active Cases</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">12</div>
                    <div className="text-sm text-yellow-700">Warnings</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">5</div>
                    <div className="text-sm text-green-700">Resolved</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">User Warning</div>
                        <div className="text-sm text-gray-600">Spam in #general</div>
                      </div>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="font-medium">Timeout</div>
                        <div className="text-sm text-gray-600">Inappropriate content</div>
                      </div>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedGuild.features.map((feature) => (
                    <div key={feature.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {feature.premium ? (
                          <Crown className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">{feature.name}</div>
                          <div className="text-sm text-gray-600">
                            {feature.premium ? 'Premium Feature' : 'Free Feature'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={feature.enabled}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}


