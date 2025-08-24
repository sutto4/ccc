"use client";

import { useState } from "react";
import { Save, X, Plus, Trash2, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Channel {
  channelId: string;
  name: string;
  type: number;
}

interface Role {
  roleId: string;
  name: string;
  color: string;
}

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
  embedAuthorName?: string;
  embedAuthorIcon?: string;
  embedFields?: EmbedField[];
  embedFooter?: string;
  embedFooterIcon?: string;
  embedImage?: string;
  embedThumbnail?: string;
  dmType?: "message" | "embed";
  dmContent?: string;
  dmEmbedTitle?: string;
  dmEmbedDescription?: string;
  dmEmbedColor?: string;
  dmEmbedAuthorName?: string;
  dmEmbedAuthorIcon?: string;
  dmEmbedThumbnail?: string;
  dmEmbedImage?: string;
  dmEmbedFooter?: string;
  dmEmbedFooterIcon?: string;
  allowedChannels: string[];
  allowedRoles: string[];
  buttons?: InteractiveButton[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommandEditorProps {
  command?: CustomCommand | null;
  channels: Channel[];
  roles: Role[];
  onSave: (command: CustomCommand) => void;
  onCancel: () => void;
  compact?: boolean;
  inline?: boolean;
}

export default function CommandEditor({ command, channels, roles, onSave, onCancel, compact = false, inline = false }: CommandEditorProps) {
  const [formData, setFormData] = useState<Partial<CustomCommand>>(command || {
    name: "",
    description: "",
    trigger: "message",
    responseType: "message",
    messageContent: "",
    allowedChannels: undefined,
    allowedRoles: undefined,
    buttons: [],
    enabled: true
  });

  // Modal state for image URLs
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [authorIconModalOpen, setAuthorIconModalOpen] = useState(false);
  const [footerIconModalOpen, setFooterIconModalOpen] = useState(false);
  const [tempThumbnailUrl, setTempThumbnailUrl] = useState("");
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [tempAuthorIconUrl, setTempAuthorIconUrl] = useState("");
  const [tempFooterIconUrl, setTempFooterIconUrl] = useState("");
  
  // Search state for permissions
  const [channelSearch, setChannelSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  
  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    responseType: true,
    content: true,
    permissions: true,
    interactiveButtons: true,
    commandStatus: true
  });
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.trigger) {
      alert("Name and trigger are required");
      return;
    }

    const commandData: CustomCommand = {
      id: command?.id || Date.now().toString(),
      name: formData.name!,
      description: formData.description || "",
      trigger: formData.trigger!,
      responseType: formData.responseType!,
      messageContent: formData.messageContent,
      embedTitle: formData.embedTitle,
      embedDescription: formData.embedDescription,
      embedColor: formData.embedColor || "#5865F2",
      embedAuthorName: formData.embedAuthorName,
      embedAuthorIcon: formData.embedAuthorIcon,
      embedFields: formData.embedFields || [],
      embedFooter: formData.embedFooter,
      embedFooterIcon: formData.embedFooterIcon,
      embedImage: formData.embedImage,
      embedThumbnail: formData.embedThumbnail,
      dmType: formData.dmType,
      dmContent: formData.dmContent,
      dmEmbedTitle: formData.dmEmbedTitle,
      dmEmbedDescription: formData.dmEmbedDescription,
      dmEmbedColor: formData.dmEmbedColor || "#5865F2",
      dmEmbedAuthorName: formData.dmEmbedAuthorName,
      dmEmbedAuthorIcon: formData.dmEmbedAuthorIcon,
      dmEmbedThumbnail: formData.dmEmbedThumbnail,
      dmEmbedImage: formData.dmEmbedImage,
      dmEmbedFooter: formData.dmEmbedFooter,
      dmEmbedFooterIcon: formData.dmEmbedFooterIcon,
      allowedChannels: formData.allowedChannels ?? [],
      allowedRoles: formData.allowedRoles ?? [],
      buttons: formData.buttons || [],
      enabled: formData.enabled || true,
      createdAt: command?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(commandData);
  };

  // Function to format Discord message for preview
  const formatDiscordMessage = (text: string) => {
    if (!text) return '';
    
    return text
      // Bold: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* -> <em>text</em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Underline: __text__ -> <u>text</u>
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Strikethrough: ~~text~~ -> <s>text</s>
      .replace(/~~(.*?)~~/g, '<s>$1</s>')
      // Inline code: `code` -> <code>code</code>
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      // Code blocks: ```code``` -> <pre><code>code</code></pre>
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto"><code>$1</code></pre>')
      // Bullet points: - item -> • item
      .replace(/^- (.+)$/gm, '• $1')
      // Numbered lists: 1. item -> 1. item (already formatted)
      .replace(/^(\d+)\. (.+)$/gm, '$1. $2')
      // Spoilers: ||text|| -> <span class="bg-black text-black">text</span>
      .replace(/\|\|(.*?)\|\|/g, '<span class="bg-black text-black hover:text-white cursor-pointer select-none" title="Click to reveal">$1</span>')
      // Quotes: > text -> <blockquote>text</blockquote>
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 italic text-gray-600">$1</blockquote>');
  };

  return (
    <div className={`${inline ? 'space-y-6' : compact ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
      {/* Header - Only show in compact mode if editing */}
      {compact && command && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Command</h3>
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel Edit
          </button>
        </div>
      )}
      
      {/* Action Buttons - Always visible */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          <Save className="h-4 w-4" />
          {command ? "Update" : "Create"}
        </button>
        {!compact && !inline && (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>

      {/* Basic Info */}
      <div className="bg-gray-50 rounded-lg p-4 relative">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Basic Information</h4>
          <button
            onClick={() => toggleSection('basicInfo')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={expandedSections.basicInfo ? "Collapse" : "Expand"}
          >
            {expandedSections.basicInfo ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
        {expandedSections.basicInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Command Name *</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Welcome Message"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Trigger *</label>
              <input
                type="text"
                value={formData.trigger || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., welcome, help, info"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="What does this command do?"
              />
            </div>
          </div>
        )}
      </div>

      {/* Response Type */}
      <div className="bg-gray-50 rounded-lg p-4 relative">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Response Type</h4>
          <button
            onClick={() => toggleSection('responseType')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={expandedSections.responseType ? "Collapse" : "Expand"}
          >
            {expandedSections.responseType ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
        {expandedSections.responseType && (
          <div className={`flex ${inline ? 'gap-6' : compact ? 'flex-col gap-2' : 'gap-4'}`}>
            {[
              { value: "message", label: "Channel Message" },
              { value: "embed", label: "Embed Message" },
              { value: "dm", label: "Direct Message" }
            ].map((type) => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={type.value}
                  checked={formData.responseType === type.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, responseType: e.target.value as any }))}
                  className="text-blue-600"
                />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Content based on response type */}
      {formData.responseType === "message" && (
        <div className="bg-gray-50 rounded-lg p-4 relative">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Message Content</h4>
            <button
              onClick={() => toggleSection('content')}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title={expandedSections.content ? "Collapse" : "Expand"}
            >
              {expandedSections.content ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
          {expandedSections.content && (
            <div>
              <label className="block text-sm font-medium mb-2">Editor with Live Preview</label>
              <div className="relative">
                <textarea
                  value={formData.messageContent || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, messageContent: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-32 font-mono text-sm bg-transparent relative z-10 resize-none"
                  placeholder="Enter the message content..."
                  style={{ 
                    color: 'transparent', 
                    caretColor: 'black',
                    lineHeight: '1.25rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                  }}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-32 overflow-hidden px-3 py-2">
                    {formData.messageContent ? (
                      <div 
                        className="text-sm font-mono whitespace-pre-wrap"
                        style={{ 
                          lineHeight: '1.25rem',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatDiscordMessage(formData.messageContent) }}
                      />
                    ) : (
                      <span className="text-gray-400 italic">Preview will appear here...</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                You can use variables like {"{user}"}, {"{server}"}, etc. Discord formatting will render in real-time.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permissions */}
      <div className={`bg-gray-50 rounded-lg p-4 ${inline ? 'space-y-4' : ''}`}>
        <h4 className="font-medium text-gray-900 mb-4">Permissions</h4>
        <div className={`grid ${compact ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
          {/* Channel Permissions - Only show for Channel Message and Embed Message */}
          {(formData.responseType === "message" || formData.responseType === "embed") ? (
            <div>
              <label className="block text-sm font-medium mb-2">Allowed Channels</label>
              <div className={`border rounded-lg flex flex-col ${compact ? 'max-h-40' : 'max-h-56'}`}>
                {/* Search input */}
                <div className="p-3 border-b bg-gray-50 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Search channels..."
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                
                <div className="overflow-y-auto p-3 space-y-2 flex-1 min-h-0">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={formData.allowedChannels !== undefined && formData.allowedChannels.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, allowedChannels: [] }));
                        } else {
                          setFormData(prev => ({ ...prev, allowedChannels: undefined }));
                        }
                      }}
                    />
                    📢 All Channels
                  </label>
                  
                  {channels
                    .filter(channel => 
                      !channelSearch || 
                      channel.name.toLowerCase().includes(channelSearch.toLowerCase())
                    )
                    .map((channel) => (
                      <label key={channel.channelId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.allowedChannels?.includes(channel.channelId) || false}
                          onChange={(e) => {
                            const channelId = channel.channelId;
                            setFormData(prev => ({
                              ...prev,
                              allowedChannels: e.target.checked
                                ? [...(prev.allowedChannels || []), channelId]
                                : prev.allowedChannels?.filter(id => id !== channelId) || []
                            }));
                          }}
                        />
                        <span className="text-gray-600">#{channel.name}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center">
              <span className="text-sm text-gray-500">Channel permissions not available for Direct Message commands</span>
            </div>
          )}
          
          {/* Role Permissions - Always show */}
          <div>
            <label className="block text-sm font-medium mb-2">Allowed Roles</label>
            <div className={`border rounded-lg flex flex-col ${compact ? 'max-h-40' : 'max-h-56'}`}>
              {/* Search input */}
              <div className="p-3 border-b bg-gray-50 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              
              <div className="overflow-y-auto p-3 space-y-2 flex-1 min-h-0">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.allowedRoles !== undefined && formData.allowedRoles.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, allowedRoles: [] }));
                      } else {
                        setFormData(prev => ({ ...prev, allowedRoles: undefined }));
                      }
                    }}
                  />
                  👥 Everyone
                </label>
                
                {roles
                  .filter(role => 
                    !roleSearch || 
                    role.name.toLowerCase().includes(roleSearch.toLowerCase())
                  )
                  .map((role) => (
                    <label key={role.roleId} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.allowedRoles?.includes(role.roleId) || false}
                        onChange={(e) => {
                          const roleId = role.roleId;
                          setFormData(prev => ({
                            ...prev,
                            allowedRoles: e.target.checked
                              ? [...(prev.allowedRoles || []), roleId]
                              : prev.allowedRoles?.filter(id => id !== roleId) || []
                          }));
                        }}
                      />
                      <span 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: role.color || '#99AAB5' }}
                      />
                      {role.name}
                    </label>
                  ))}
              </div>
            </div>
            
            {/* Subtle warning when @everyone is selected (outside the dropdown) */}
            {((formData.allowedRoles !== undefined && formData.allowedRoles.length === 0) || roles.some(role => role.name === '@everyone' && formData.allowedRoles?.includes(role.roleId))) && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
                <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Security note: @everyone access allows any user to use this command</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enable/Disable */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Command Status</h4>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.enabled || false}
            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          <span className="text-sm font-medium">Enable this command</span>
        </label>
      </div>
    </div>
  );
}
