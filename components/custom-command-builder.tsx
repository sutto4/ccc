"use client";

import { useState, useEffect } from "react";
import { Bot, MessageSquare, FileText, Send, Hash, Shield, Zap, Settings } from "lucide-react";
import EmbeddedMessageBuilder from "./embedded-messages-builder";
import { Input, Textarea, Select, Button, Checkbox, Radio } from "@/components/ui";

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

interface CustomCommandBuilderProps {
  guildId: string;
  command?: CustomCommand | null;
  isEditing: boolean;
  onCreate: (command: Omit<CustomCommand, "id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  onUpdate: (command: CustomCommand) => void;
  onCancel: () => void;
}

export default function CustomCommandBuilder({
  guildId,
  command,
  isEditing,
  onCreate,
  onUpdate,
  onCancel
}: CustomCommandBuilderProps) {
  const [formData, setFormData] = useState({
    name: "",
    aliases: [] as string[],
    prefix: "!",
    description: "",
    responseType: "message" as "message" | "embed" | "dm",
    channels: "all" as string[] | "all",
    allowedRoles: [] as string[],
    interactiveOptions: {
      buttons: false,
      dropdowns: false,
      modals: false
    },
    enabled: true
  });

  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: number }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; color: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [newAlias, setNewAlias] = useState("");

  // Load channels and roles on component mount
  useEffect(() => {
    fetchChannels();
    fetchRoles();
  }, [guildId]);

  // Populate form when editing
  useEffect(() => {
          if (command && isEditing) {
        setFormData({
          name: command.name,
          aliases: command.aliases,
          prefix: command.prefix,
          description: command.description,
          responseType: command.responseType,
          channels: command.channels,
          allowedRoles: command.allowedRoles,
          interactiveOptions: command.interactiveOptions,
          enabled: command.enabled
        });
      }
  }, [command, isEditing]);

  const fetchChannels = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/guilds/${guildId}/channels`);
      // const data = await response.json();
      // setChannels(data.channels);
      
      // Mock data for now
      setChannels([
        { id: "1", name: "general", type: 0 },
        { id: "2", name: "announcements", type: 0 },
        { id: "3", name: "commands", type: 0 }
      ]);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/guilds/${guildId}/roles`);
      // const data = await response.json();
      // setRoles(data.roles);
      
      // Mock data for now
      setRoles([
        { id: "1", name: "Admin", color: 0xFF0000 },
        { id: "2", name: "Moderator", color: 0x00FF00 },
        { id: "3", name: "Member", color: 0x0000FF }
      ]);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && command) {
        onUpdate({
          ...command,
          ...formData
        });
      } else {
        onCreate(formData);
      }
    } catch (error) {
      console.error("Failed to save command:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAlias = () => {
    if (newAlias.trim() && !formData.aliases.includes(newAlias.trim())) {
      setFormData(prev => ({
        ...prev,
        aliases: [...prev.aliases, newAlias.trim()]
      }));
      setNewAlias("");
    }
  };

  const removeAlias = (alias: string) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter(a => a !== alias)
    }));
  };

  const toggleChannel = (channelId: string) => {
    if (formData.channels === "all") {
      setFormData(prev => ({ ...prev, channels: [channelId] }));
    } else {
      const currentChannels = formData.channels as string[];
      if (currentChannels.includes(channelId)) {
        const newChannels = currentChannels.filter(id => id !== channelId);
        setFormData(prev => ({ 
          ...prev, 
          channels: newChannels.length === 0 ? "all" : newChannels 
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          channels: [...currentChannels, channelId] 
        }));
      }
    }
  };

  const toggleRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(roleId)
        ? prev.allowedRoles.filter(id => id !== roleId)
        : [...prev.allowedRoles, roleId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Command Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Basic Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Command Name */}
          <Input
            label="Command Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="welcome"
            required
          />

          {/* Command Prefix */}
          <Select
            label="Prefix"
            value={formData.prefix}
            onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
            options={[
              { value: "!", label: "!" },
              { value: ".", label: "." },
              { value: "/", label: "/" },
              { value: "$", label: "$" },
              { value: "%", label: "%" }
            ]}
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="What does this command do?"
          required
        />

        {/* Aliases */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Aliases
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="Add alias..."
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAlias())}
            />
            <Button
              type="button"
              onClick={addAlias}
              variant="primary"
              size="md"
            >
              Add
            </Button>
          </div>
          {formData.aliases.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.aliases.map((alias, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => removeAlias(alias)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          Response Type
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: "message", label: "Regular Message", icon: MessageSquare },
            { value: "embed", label: "Embed Message", icon: FileText },
            { value: "dm", label: "Direct Message", icon: Send }
          ].map((type) => (
            <label
              key={type.value}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                formData.responseType === type.value
                  ? "border-blue-500 ring-2 ring-blue-500"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="responseType"
                value={type.value}
                checked={formData.responseType === type.value}
                onChange={(e) => setFormData(prev => ({ ...prev, responseType: e.target.value as any }))}
                className="sr-only"
              />
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <type.icon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {type.label}
                      </span>
                    </div>
                  </div>
                </div>
                {formData.responseType === type.value && (
                  <div className="shrink-0 text-blue-600">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="12" fill="currentColor" />
                      <path
                        d="m9 12 2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Channel Restrictions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Hash className="h-5 w-5 text-purple-600" />
          Channel Restrictions
        </h3>
        
        <div className="space-y-3">
          <Radio
            name="channels"
            value="all"
            checked={formData.channels === "all"}
            onChange={() => setFormData(prev => ({ ...prev, channels: "all" }))}
            label="All channels"
          />
          
          <Radio
            name="channels"
            value="specific"
            checked={formData.channels !== "all"}
            onChange={() => setFormData(prev => ({ ...prev, channels: [] }))}
            label="Specific channels"
          />
          
          {formData.channels !== "all" && (
            <div className="ml-6 space-y-2">
              {channels.map((channel) => (
                <Checkbox
                  key={channel.id}
                  checked={(formData.channels as string[]).includes(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                  label={`#${channel.name}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Restrictions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          Role Restrictions
        </h3>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Leave empty to allow all roles, or select specific roles that can use this command
          </p>
          
          {roles.map((role) => (
            <Checkbox
              key={role.id}
              checked={formData.allowedRoles.includes(role.id)}
              onChange={() => toggleRole(role.id)}
              label={role.name}
              className="[&>span]:text-sm"
              style={{ 
                '--role-color': `#${role.color.toString(16).padStart(6, '0')}` 
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Interactive Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Interactive Options
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: "buttons", label: "Buttons", description: "Add interactive buttons" },
            { key: "dropdowns", label: "Dropdowns", description: "Add selection dropdowns" },
            { key: "modals", label: "Modals", description: "Add modal forms" }
          ].map((option) => (
            <Checkbox
              key={option.key}
              checked={formData.interactiveOptions[option.key as keyof typeof formData.interactiveOptions]}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                interactiveOptions: {
                  ...prev.interactiveOptions,
                  [option.key]: e.target.checked
                }
              }))}
              label={option.label}
              helperText={option.description}
            />
          ))}
        </div>
      </div>

      {/* Response Content */}
      {formData.responseType === "embed" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Embed Message Builder
          </h3>
          
          <div className="border border-gray-300 rounded-lg p-4">
            <EmbeddedMessageBuilder premium={false} />
          </div>
        </div>
      )}

      {formData.responseType === "message" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Message Content
          </h3>
          
          <Textarea
            rows={4}
            placeholder="Enter the message content that will be sent when this command is used..."
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="md"
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          disabled={loading || !formData.name.trim()}
          loading={loading}
          size="md"
        >
          {isEditing ? "Update Command" : "Create Command"}
        </Button>
      </div>
    </form>
  );
}
