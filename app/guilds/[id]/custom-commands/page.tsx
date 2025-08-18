"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Bot, Settings, Trash2, Edit3, Eye, EyeOff } from "lucide-react";
import CustomCommandBuilder from "@/components/custom-command-builder";
import CustomCommandsList from "@/components/custom-commands-list";

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

export default function CustomCommandsPage() {
  const params = useParams();
  const guildId = params.id as string;
  
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<CustomCommand | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch existing commands on component mount
  useEffect(() => {
    fetchCommands();
  }, [guildId]);

  const fetchCommands = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/guilds/${guildId}/custom-commands`);
      // const data = await response.json();
      // setCommands(data.commands);
      
      // Mock data for now
      setCommands([
        {
          id: "1",
          name: "welcome",
          aliases: ["w", "hi"],
          prefix: "!",
          description: "Welcome new members to the server",
          responseType: "embed",
          channels: "all",
          allowedRoles: [],
          interactiveOptions: { buttons: false, dropdowns: false, modals: false },
          enabled: true,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          createdBy: "user123"
        }
      ]);
    } catch (error) {
      console.error("Failed to fetch commands:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommand = (command: Omit<CustomCommand, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    const newCommand: CustomCommand = {
      ...command,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "current-user-id" // TODO: Get from session
    };
    
    setCommands(prev => [newCommand, ...prev]);
    setSelectedCommand(null);
    setIsEditing(false);
  };

  const handleEditCommand = (command: CustomCommand) => {
    setSelectedCommand(command);
    setIsEditing(true);
  };

  const handleUpdateCommand = (updatedCommand: CustomCommand) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === updatedCommand.id ? { ...updatedCommand, updatedAt: new Date().toISOString() } : cmd
    ));
    setSelectedCommand(null);
    setIsEditing(false);
  };

  const handleDeleteCommand = (commandId: string) => {
    setCommands(prev => prev.filter(cmd => cmd.id !== commandId));
    if (selectedCommand?.id === commandId) {
      setSelectedCommand(null);
      setIsEditing(false);
    }
  };

  const handleToggleCommand = (commandId: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId ? { ...cmd, enabled: !cmd.enabled } : cmd
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Custom Commands
                </h1>
                <p className="text-sm text-gray-500">
                  Create and manage custom bot commands for your server
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setSelectedCommand(null);
                  setIsEditing(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Command
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Command Builder */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  {isEditing ? "Edit Command" : "Create New Command"}
                </h2>
                <p className="text-sm text-gray-500">
                  {isEditing ? "Modify your existing command" : "Build a custom command for your server"}
                </p>
              </div>
              
              <div className="p-6">
                <CustomCommandBuilder
                  guildId={guildId}
                  command={selectedCommand}
                  isEditing={isEditing}
                  onCreate={handleCreateCommand}
                  onUpdate={handleUpdateCommand}
                  onCancel={() => {
                    setSelectedCommand(null);
                    setIsEditing(false);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Commands List */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Your Commands
                </h2>
                <p className="text-sm text-gray-500">
                  Manage and monitor your custom commands
                </p>
              </div>
              
              <div className="p-6">
                <CustomCommandsList
                  commands={commands}
                  loading={loading}
                  onEdit={handleEditCommand}
                  onDelete={handleDeleteCommand}
                  onToggle={handleToggleCommand}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
