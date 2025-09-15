"use client";

import { useState, useEffect } from "react";
import { 
  Server, 
  Users, 
  Settings, 
  Search, 
  Filter,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  RefreshCw,
  BarChart3,
  Activity,
  ChevronDown,
  Eye,
  Cog
} from "lucide-react";
import Link from "next/link";

interface Guild {
  guild_id: string;
  name?: string;
  guild_name?: string; // Fallback column name
  icon_url?: string;
  icon?: string; // Discord icon hash
  member_count?: number;
  premium?: boolean;
  status?: string;
  created_at: string;
  owner_id?: string;
}

export default function AdminGuilds() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'new'>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchGuilds();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const fetchGuilds = async () => {
    try {
      setLoading(true);
      // This would need to be an admin endpoint that fetches all guilds
      const response = await fetch('/api/admin/guilds');
      if (response.ok) {
        const data = await response.json();
        setGuilds(data.guilds || []);
      }
    } catch (error) {
      console.error('Error fetching guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuilds = guilds.filter(guild => {
    const guildName = guild.name || guild.guild_name || '';
    const matchesSearch = guildName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isNew = guild.created_at && new Date(guild.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && (guild.status === 'active' || !guild.status)) ||
      (statusFilter === 'new' && isNew);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string, premium: boolean) => {
    if (premium) return <Shield className="h-4 w-4 text-yellow-500" />;
    if (status === 'active') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'inactive') return <Clock className="h-4 w-4 text-gray-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = (status: string, premium: boolean) => {
    if (premium) return 'Premium';
    if (status === 'active') return 'Active';
    if (status === 'inactive') return 'Inactive';
    return 'Unknown';
  };

  const getGuildIconUrl = (guild: Guild) => {
    // If we have a direct icon_url, use it
    if (guild.icon_url) return guild.icon_url;
    
    // If we have a Discord icon hash, construct the URL
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.guild_id}/${guild.icon}.png?size=64`;
    }
    
    // No icon available
    return null;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading guilds...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Filter:</span>
          <div className="flex items-center gap-1">
            {[
              { value: 'all', label: 'All', count: guilds.length },
              { value: 'active', label: 'Active', count: guilds.filter(g => g.status === 'active' || !g.status).length },
              { value: 'new', label: 'New', count: guilds.filter(g => g.created_at && new Date(g.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value as any)}
                className={[
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  statusFilter === filter.value
                    ? "bg-blue-600 text-white"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                ].join(" ")}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guilds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
        
        <Link
          href="/admin/guilds/bulk"
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
        >
          <Settings className="h-4 w-4" />
          Bulk Operations
        </Link>

        <button
          onClick={fetchGuilds}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </button>

        <Link
          href="/admin/platform/analytics"
          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
        >
          <BarChart3 className="h-4 w-4" />
          View Analytics
        </Link>

        <Link
          href="/admin/overview"
          className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm"
        >
          <Activity className="h-4 w-4" />
          System Overview
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Showing</span>
          </div>
          <div className="text-2xl font-bold">{filteredGuilds.length}</div>
          <div className="text-xs text-muted-foreground">of {guilds.length} total</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Active Guilds</span>
          </div>
          <div className="text-2xl font-bold">
            {guilds.filter(g => g.status === 'active' || !g.status).length}
          </div>
          <div className="text-xs text-muted-foreground">
            {guilds.length > 0 ? `${((guilds.filter(g => g.status === 'active' || !g.status).length / guilds.length) * 100).toFixed(1)}%` : '0%'} of total
          </div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">New (7 days)</span>
          </div>
          <div className="text-2xl font-bold">
            {guilds.filter(g => g.created_at && new Date(g.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-xs text-muted-foreground">Recently added</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Total Members</span>
          </div>
          <div className="text-2xl font-bold">
            {filteredGuilds.reduce((sum, g) => sum + (g.member_count || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">in filtered guilds</div>
        </div>
      </div>

      {/* Guild List */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Guilds ({filteredGuilds.length})</h2>
        </div>
        
        <div className="divide-y">
          {filteredGuilds.map((guild) => (
            <div key={guild.guild_id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    {guild.icon_url ? (
                      <>
                        <img 
                          src={guild.icon_url} 
                          alt={guild.name || guild.guild_name}
                          className="w-10 h-10 rounded-full object-cover border"
                          onError={(e) => {
                            // Hide the image and show the fallback
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm absolute top-0 left-0"
                          style={{ display: 'none' }}
                        >
                          {(guild.name || guild.guild_name || 'G').charAt(0).toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {(guild.name || guild.guild_name || 'G').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{guild.name || guild.guild_name}</h3>
                      {getStatusIcon(guild.status || 'unknown', guild.premium || false)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{guild.member_count?.toLocaleString() || 0} members</span>
                      <span>Status: {getStatusText(guild.status, guild.premium)}</span>
                      <span>Added: {new Date(guild.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Quick actions */}
                  <Link
                    href={`/guilds/${guild.guild_id}/settings`}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Cog className="h-3 w-3" />
                    Settings
                  </Link>
                  
                  <Link
                    href={`/admin/guilds/${guild.guild_id}`}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    Admin View
                  </Link>

                  {/* More actions dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === guild.guild_id ? null : guild.guild_id)}
                      className="px-2 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors flex items-center gap-1"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                    
                    {openDropdown === guild.guild_id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
                        <div className="py-1">
                          <Link
                            href={`/guilds/${guild.guild_id}`}
                            className="block px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Eye className="h-4 w-4" />
                            View Dashboard
                          </Link>
                          <Link
                            href={`/guilds/${guild.guild_id}/roles`}
                            className="block px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Shield className="h-4 w-4" />
                            Manage Roles
                          </Link>
                          <Link
                            href={`/guilds/${guild.guild_id}/bot-customization`}
                            className="block px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Settings className="h-4 w-4" />
                            Bot Customization
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredGuilds.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No guilds found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
