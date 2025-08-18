"use client";

import { useState } from "react";
import { Edit3, Trash2, Eye, EyeOff, Bot, Hash, Shield, Zap, Calendar, User, Search, FileText, Send, MessageSquare } from "lucide-react";

interface CustomCommand {
  id: string;
  name: string;
  aliases: string[];
  prefix: string;
  description: string;
  responseType: "message" | "embed" | "dm";
  channels: string[] | "all";
  allowedRoles: string[];
  interactiveOptions: {
    buttons: boolean;
    dropdowns: boolean;
    modals: boolean;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface CustomCommandsListProps {
  commands: CustomCommand[];
  loading: boolean;
  onEdit: (command: CustomCommand) => void;
  onDelete: (commandId: string) => void;
  onToggle: (commandId: string) => void;
}

export default function CustomCommandsList({
  commands,
  loading,
  onEdit,
  onDelete,
  onToggle
}: CustomCommandsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "enabled" | "disabled">("all");

  const filteredCommands = commands.filter(command => {
    const matchesSearch = 
      command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      command.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      command.aliases.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = 
      filterType === "all" || 
      (filterType === "enabled" && command.enabled) ||
      (filterType === "disabled" && !command.enabled);
    
    return matchesSearch && matchesFilter;
  });

  const getResponseTypeIcon = (type: string) => {
    switch (type) {
      case "embed":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "dm":
        return <Send className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getResponseTypeLabel = (type: string) => {
    switch (type) {
      case "embed":
        return "Embed";
      case "dm":
        return "DM";
      default:
        return "Message";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (commands.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No commands yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating your first custom command.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="all">All Commands</option>
          <option value="enabled">Enabled Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
      </div>

      {/* Commands List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredCommands.map((command) => (
          <div
            key={command.id}
            className={`bg-gray-50 rounded-lg p-4 border-l-4 transition-all duration-200 ${
              command.enabled 
                ? "border-l-green-500 hover:bg-gray-100" 
                : "border-l-gray-400 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Command Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono text-gray-500">
                      {command.prefix}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {command.name}
                    </span>
                  </div>
                  
                  {command.aliases.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">aliases:</span>
                      {command.aliases.map((alias, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                        >
                          {alias}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {command.description}
                </p>

                {/* Command Details */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                  {/* Response Type */}
                  <div className="flex items-center gap-1">
                    {getResponseTypeIcon(command.responseType)}
                    <span>{getResponseTypeLabel(command.responseType)}</span>
                  </div>

                  {/* Channels */}
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    <span>
                      {command.channels === "all" 
                        ? "All channels" 
                        : `${command.channels.length} channel${command.channels.length !== 1 ? 's' : ''}`
                      }
                    </span>
                  </div>

                  {/* Role Restrictions */}
                  {command.allowedRoles.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>{command.allowedRoles.length} role{command.allowedRoles.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Interactive Options */}
                  {Object.values(command.interactiveOptions).some(Boolean) && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>Interactive</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(command.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>By {command.createdBy}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                {/* Toggle Button */}
                <button
                  onClick={() => onToggle(command.id)}
                  className={`p-2 rounded-md transition-colors ${
                    command.enabled
                      ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                      : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
                  title={command.enabled ? "Disable command" : "Enable command"}
                >
                  {command.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => onEdit(command)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  title="Edit command"
                >
                  <Edit3 className="h-4 w-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => onDelete(command.id)}
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete command"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-400 text-center pt-2">
        Showing {filteredCommands.length} of {commands.length} commands
      </div>
    </div>
  );
}
