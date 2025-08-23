"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Bot, Hash, Users, Settings, Trash2, Edit3, ImageIcon, XIcon } from "lucide-react";
import Section from "@/components/ui/section";
import CommandEditor from "@/components/custom-commands/command-editor";
import { fetchChannels, fetchRoles, type Role } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface InteractiveButton {
  id: string;
  label: string;
  style: "primary" | "secondary" | "success" | "danger";
  url?: string;
  action?: string;
}

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface CustomCommand {
  id: string;
  name: string;
  description: string;
  trigger: string;
  responseType: "message" | "embed" | "dm";
  messageContent?: string;
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: string;
  embedFields?: EmbedField[];
  embedFooter?: string;
  embedImage?: string;
  embedThumbnail?: string;
  dmType?: "message" | "embed";
  dmContent?: string;
  dmEmbedTitle?: string;
  dmEmbedDescription?: string;
  dmEmbedColor?: string;
  allowedChannels: string[];
  allowedRoles: string[];
  buttons?: InteractiveButton[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CustomCommandsPage() {
  const params = useParams();
  const guildId = params.id as string;
  const { data: session } = useSession();
  
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [channels, setChannels] = useState<{ channelId: string; name: string; type: number }[]>([]);
  const [roles, setRoles] = useState<{ roleId: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  
  // Inline editor state
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("#5865F2");
  
  // Complete embed state for all fields
  const [authorName, setAuthorName] = useState("");
  const [authorIconUrl, setAuthorIconUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [footerIconUrl, setFooterIconUrl] = useState("");
  const [showTimestamp, setShowTimestamp] = useState(true);

  useEffect(() => {
    fetchData();
  }, [guildId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = (session as any)?.accessToken;
      
      const [channelsData, rolesData] = await Promise.all([
        fetchChannels(guildId, token),
        fetchRoles(guildId, token)
      ]);
      
      // Transform channels to match CommandEditor interface
      const transformedChannels = channelsData
        .filter((ch: any) => ch.type === 0)
        .map((ch: any) => ({
          channelId: ch.id,
          name: ch.name,
          type: ch.type
        }));
      
      // Transform roles to match CommandEditor interface
      const transformedRoles = rolesData.map((role: any) => ({
        roleId: role.roleId,
        name: role.name,
        color: role.color || '#99AAB5' // Default color if null
      }));
      
      setChannels(transformedChannels);
      setRoles(transformedRoles);
      
      // Mock commands for demonstration
      const mockCommands: CustomCommand[] = [
        {
          id: "1",
          name: "Server Info",
          description: "Shows server information",
          trigger: "serverinfo",
          responseType: "embed",
          embedTitle: "Server Information",
          embedDescription: "Welcome to our amazing server!",
          embedColor: "#5865F2",
          allowedChannels: [],
          allowedRoles: [],
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "2",
          name: "Welcome DM",
          description: "Sends a welcome message via DM",
          trigger: "welcome",
          responseType: "dm",
          dmType: "message",
          dmContent: "Welcome to the server! We're glad to have you here.",
          allowedChannels: [],
          allowedRoles: [],
          enabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setCommands(mockCommands);
      
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newCommand: CustomCommand = {
      id: Date.now().toString(),
      name: "",
      description: "",
      trigger: "",
      responseType: "embed",
      allowedChannels: [],
      allowedRoles: [],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingCommand(newCommand);
  };

  const handleEdit = (command: CustomCommand) => {
    setEditingCommand(command);
  };

  const handleSave = (command: CustomCommand) => {
    if (editingCommand) {
      setCommands(prev => prev.map(cmd => cmd.id === editingCommand.id ? command : cmd));
    } else {
      setCommands(prev => [...prev, command]);
    }
    setEditingCommand(null);
  };

  const handleCancel = () => {
    setEditingCommand(null);
  };

  const handleDelete = (commandId: string) => {
    if (confirm("Are you sure you want to delete this command?")) {
      setCommands(prev => prev.filter(cmd => cmd.id !== commandId));
    }
  };

  const toggleCommand = (commandId: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId ? { ...cmd, enabled: !cmd.enabled } : cmd
    ));
  };

  if (loading) {
    return (
      <Section title="Custom Commands">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Custom Commands">
      <p className="text-muted-foreground mb-6">Create custom commands that respond with messages, embeds, or direct messages.</p>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Editor */}
        <div className="space-y-6 h-full flex-1 min-h-[700px] flex flex-col" style={{ minHeight: '700px' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingCommand ? `Edit: ${editingCommand.name}` : 'Create New Command'}
            </h3>
            <div className="flex gap-2">
              {editingCommand && (
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleCreateNew}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {editingCommand ? 'New Command' : 'Clear Form'}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="rounded-xl border p-4 bg-card space-y-4 flex-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Settings className="w-4 h-4"/> Configure your custom command.
            </div>
            
            {/* Basic command information will be handled by CommandEditor below */}
          </div>
          
          <CommandEditor
            command={editingCommand}
            channels={channels}
            roles={roles}
            onSave={handleSave}
            onCancel={handleCancel}
            inline={true}
          />
        </div>

        {/* Right Column: Commands List */}
        <div className="space-y-6 h-full flex-1">
          {/* Header - matching left column spacing */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Commands</h3>
            <span className="text-sm text-gray-500">
              {commands.length} command{commands.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* List Container - matching left column styling */}
          <div className="rounded-xl border p-4 bg-card space-y-4 flex flex-col h-full max-h-[700px]">
            {commands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No custom commands created yet.</p>
                <p>Use the editor on the left to create your first command!</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                {commands.map((command) => (
                  <div key={command.id} className="rounded border p-4 bg-card hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate text-base">
                          {command.name}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {command.description || 'No description'} 
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Trigger: /{command.trigger}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Type: {command.responseType === "dm" ? "Direct Message" : command.responseType}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => toggleCommand(command.id)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            command.enabled
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                          title={command.enabled ? "Disable command" : "Enable command"}
                        >
                          {command.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleEdit(command)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                          title="Edit command"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(command.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                          title="Delete command"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Footer with status and dates */}
                    <div className="flex items-center justify-between text-xs mt-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${command.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className={command.enabled ? 'text-green-600' : 'text-gray-500'}>
                          {command.enabled ? 'Active' : 'Disabled'}
                        </span>
                        {command.createdAt && (
                          <span className="text-muted-foreground">
                            • Created: {new Date(command.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {command.updatedAt && (
                          <span className="text-muted-foreground">
                            • Updated: {new Date(command.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
