'use client';

import { useState } from 'react';
import { 
  Shield, 
  Settings, 
  Users, 
  MessageSquare, 
  Bot, 
  Crown,
  CheckCircle,
  Star,
  Server,
  Calendar,
  Clock,
  MessageSquare as MessageSquareIcon,
  Plus,
  List,
  AlertCircle
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
  },
  {
    id: '343265479302971402',
    name: 'Development Server',
    icon: 'https://cdn.discordapp.com/icons/343265479302971402/c_1234567890abcdef.png',
    memberCount: 45,
    roleCount: 8,
    isPremium: true,
    group: 'Development',
    features: [
      { name: 'Moderation Tools', enabled: true, premium: false },
      { name: 'AI Message Summarization', enabled: true, premium: true },
      { name: 'Custom Commands', enabled: true, premium: true },
    ]
  }
];

const mockModerationCases = [
  {
    id: 'case-1',
    caseId: '#123',
    actionType: 'warn',
    targetUser: 'JohnDoe',
    moderator: 'AdminUser',
    reason: 'Spam in #general channel',
    createdAt: '2025-01-15',
    active: true,
    evidenceCount: 2
  },
  {
    id: 'case-2', 
    caseId: '#124',
    actionType: 'timeout',
    targetUser: 'BadUser',
    moderator: 'ModUser',
    reason: 'Inappropriate content',
    createdAt: '2025-01-14',
    active: true,
    evidenceCount: 1
  },
  {
    id: 'case-3',
    caseId: '#125', 
    actionType: 'ban',
    targetUser: 'ToxicUser',
    moderator: 'AdminUser',
    reason: 'Repeated violations',
    createdAt: '2025-01-13',
    active: false,
    evidenceCount: 5
  }
];

export default function MockupLayoutV2Page() {
  const [selectedGuild, setSelectedGuild] = useState(mockGuilds[0]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCase, setSelectedCase] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'moderation', label: 'Moderation', icon: Users },
    { id: 'features', label: 'Features', icon: Bot },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Server List */}
      <div className="w-[480px] border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">My Servers</h2>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <Input placeholder="Search servers..." className="w-full" />
        </div>

        {/* Favorites */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Star className="h-4 w-4" />
            <span>Favorites</span>
          </div>
          <div className="space-y-1">
            {mockGuilds.slice(0, 2).map((guild) => (
              <button
                key={guild.id}
                onClick={() => setSelectedGuild(guild)}
                className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-colors ${
                  selectedGuild.id === guild.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
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
                      <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {guild.memberCount} members
                    {guild.group && ` • ${guild.group}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All Servers */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {mockGuilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => setSelectedGuild(guild)}
                className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-colors ${
                  selectedGuild.id === guild.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
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
                      <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {guild.memberCount} members
                    {guild.group && ` • ${guild.group}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={selectedGuild.icon} 
                alt={selectedGuild.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedGuild.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{selectedGuild.memberCount} members</span>
                  <span>{selectedGuild.roleCount} roles</span>
                  {selectedGuild.isPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
              </div>
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
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Quick Stats */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Server Stats</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">{selectedGuild.memberCount}</div>
                        <div className="text-sm text-blue-700">Members</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">234</div>
                        <div className="text-sm text-green-700">Online</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-xl font-bold text-purple-600">{selectedGuild.roleCount}</div>
                        <div className="text-sm text-purple-700">Roles</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-xl font-bold text-yellow-600">8</div>
                        <div className="text-sm text-yellow-700">Premium</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bot className="h-5 w-5" />
                      <span>Enabled Features</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
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
              </div>

              {/* Right Column - Quick Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
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

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Recent Activity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Bot joined the server</span>
                        <span className="text-gray-500">2 days ago</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>AI Summarization enabled</span>
                        <span className="text-gray-500">1 week ago</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span>Premium activated</span>
                        <span className="text-gray-500">2 weeks ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Cases List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Moderation Cases
                  </h2>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Case
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {mockModerationCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className={`p-3 cursor-pointer transition-colors border-l-4 ${
                        selectedCase?.id === caseItem.id 
                          ? 'bg-blue-50 border-blue-500 hover:bg-blue-100' 
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                      onClick={() => setSelectedCase(caseItem)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{caseItem.caseId}</h3>
                            <Badge
                              variant={caseItem.active ? "default" : "secondary"}
                              className={`text-xs ${caseItem.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                            >
                              {caseItem.active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge
                              variant={
                                caseItem.actionType === 'ban' ? 'destructive' :
                                caseItem.actionType === 'warn' ? 'default' :
                                'outline'
                              }
                              className="text-xs capitalize"
                            >
                              {caseItem.actionType}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="font-medium">{caseItem.targetUser}</span>
                              <span className="text-gray-500">by</span>
                              <span className="text-gray-600">{caseItem.moderator}</span>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{caseItem.createdAt}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{caseItem.evidenceCount}</span>
                              </span>
                            </div>

                            <div className="text-xs text-gray-600 truncate">
                              {caseItem.reason}
                            </div>
                          </div>
                        </div>
                        
                        {selectedCase?.id === caseItem.id && (
                          <div className="ml-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Case Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Case Details
                  </h2>
                  {selectedCase && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCase(null)}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>

                {selectedCase ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{selectedCase.caseId}</span>
                        <Badge
                          variant={selectedCase.active ? "default" : "secondary"}
                          className={selectedCase.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {selectedCase.active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Action Type</label>
                          <p className="text-sm text-gray-900 capitalize">{selectedCase.actionType}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Created</label>
                          <p className="text-sm text-gray-900">{selectedCase.createdAt}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Target User</label>
                          <p className="text-sm text-gray-900">{selectedCase.targetUser}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Moderator</label>
                          <p className="text-sm text-gray-900">{selectedCase.moderator}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Reason</label>
                        <p className="text-sm text-gray-900">{selectedCase.reason}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Evidence</label>
                        <p className="text-sm text-gray-900">{selectedCase.evidenceCount} files attached</p>
                      </div>

                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          View Evidence
                        </Button>
                        <Button size="sm" variant="outline">
                          Add Evidence
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <AlertCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-600">Select a case</h2>
                        <p className="text-gray-400 mt-2">Choose a case from the list to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Free Features */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Free Features</h2>
                <div className="space-y-3">
                  {selectedGuild.features.filter(f => !f.premium).map((feature) => (
                    <Card key={feature.name}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-sm text-gray-600">Free Feature</div>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Right Column - Premium Features */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Premium Features</h2>
                <div className="space-y-3">
                  {selectedGuild.features.filter(f => f.premium).map((feature) => (
                    <Card key={feature.name}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Crown className="h-5 w-5 text-yellow-500" />
                            <div>
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-sm text-gray-600">Premium Feature</div>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - General Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Server Group
                      </label>
                      <Input value={selectedGuild.group || 'None'} readOnly />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bot Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Command Prefix
                      </label>
                      <Input value="!" placeholder="Enter command prefix" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Channel
                      </label>
                      <Input value="#general" placeholder="Select default channel" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - AI Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Prompt
                      </label>
                      <textarea 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={4}
                        placeholder="Enter custom AI prompt..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Message Length
                      </label>
                      <Input value="4000" placeholder="Enter max length" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate Limit (per hour)
                      </label>
                      <Input value="100" placeholder="Enter rate limit" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Save Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Save Settings
                      </Button>
                      <Button variant="outline">
                        Reset to Defaults
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


