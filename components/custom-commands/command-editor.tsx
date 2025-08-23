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
      allowedChannels: formData.allowedChannels ?? [],
      allowedRoles: formData.allowedRoles ?? [],
      buttons: formData.buttons || [],
      enabled: formData.enabled || true,
      createdAt: command?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(commandData);
  };

  const addButton = () => {
    const newButton: InteractiveButton = {
      id: Date.now().toString(),
      label: "",
      style: "primary"
    };
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), newButton]
    }));
  };

  const updateButton = (id: string, updates: Partial<InteractiveButton>) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.map(btn => 
        btn.id === id ? { ...btn, ...updates } : btn
      )
    }));
  };

  const removeButton = (id: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter(btn => btn.id !== id)
    }));
  };

  const addEmbedField = () => {
    const newField: EmbedField = {
      name: "",
      value: "",
      inline: false
    };
    setFormData(prev => ({
      ...prev,
      embedFields: [...(prev.embedFields || []), newField]
    }));
  };

  const updateEmbedField = (index: number, updates: Partial<EmbedField>) => {
    setFormData(prev => ({
      ...prev,
      embedFields: prev.embedFields?.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

     const removeEmbedField = (index: number) => {
     setFormData(prev => ({
       ...prev,
       embedFields: prev.embedFields?.filter((_, i) => i !== index)
     }));
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
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Basic Information</h4>
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
      </div>

      {/* Response Type */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Response Type</h4>
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
      </div>

             {/* Content based on response type */}
              {formData.responseType === "message" && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Message Content</h4>
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
          </div>
        )}

      {formData.responseType === "embed" && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">Embed Configuration</h4>
          
          {/* Inline editor only */}
          <div className="flex items-center justify-between mb-0">
            <label className="block text-sm font-medium">Embed Editor</label>
          </div>

          {/* Preview container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2" />
            <div className="rounded-lg border bg-background p-3">
              {/* Simulated Discord message container */}
              <div className="flex items-start gap-3">
                {/* Circular color picker trigger */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, embedColor: prev.embedColor || "#5865F2" }))}
                  className="relative h-9 w-9 rounded-full border-2 border-border cursor-pointer overflow-hidden shadow-sm hover:shadow transition"
                  title="Set embed color"
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundImage: 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                  />
                  <span
                    className="absolute inset-1 rounded-full border"
                    style={{ backgroundColor: formData.embedColor || "#5865F2" }}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  {/* Username + timestamp */}
                  <div className="mb-1 text-sm flex items-center gap-3">
                    <span className="font-semibold">ServerMate Bot</span>
                    <span className="ml-2 text-xs text-muted-foreground">Just now</span>
                  </div>

                  {/* Embed card */}
                  <div className="relative rounded-md border bg-card p-3" style={{ borderLeftWidth: 4, borderLeftColor: formData.embedColor || "#5865F2" }}>
                    {/* Author section */}
                    <div className="flex items-center gap-2 mb-3">
                      {formData.embedAuthorIcon ? (
                        <div className="relative">
                          <img src={formData.embedAuthorIcon} alt="author" className="w-5 h-5 rounded-full" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, embedAuthorIcon: "" }))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs cursor-pointer"
                            title="Remove author icon"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTempAuthorIconUrl(formData.embedAuthorIcon || "");
                            setAuthorIconModalOpen(true);
                          }}
                          className="w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Add author icon"
                        >
                          <ImageIcon className="w-3 h-3" />
                        </button>
                      )}
                      <Input 
                        value={formData.embedAuthorName || ""} 
                        onChange={(e) => setFormData(prev => ({ ...prev, embedAuthorName: e.target.value }))} 
                        placeholder="Author name" 
                        className="text-sm text-muted-foreground w-32" 
                      />
                    </div>

                    {/* Thumbnail on the right */}
                    <div className="absolute right-3 top-3 w-24">
                      {formData.embedThumbnail ? (
                        <div className="relative">
                          <img src={formData.embedThumbnail} alt="thumb" className="w-20 h-20 rounded object-cover border" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, embedThumbnail: "" }))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs cursor-pointer"
                            title="Remove thumbnail"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTempThumbnailUrl(formData.embedThumbnail || "");
                            setThumbnailModalOpen(true);
                          }}
                          className="w-20 h-20 rounded border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Add thumbnail"
                        >
                          <ImageIcon className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    {/* Title / Description */}
                    <Input 
                      value={formData.embedTitle || ""} 
                      onChange={(e) => setFormData(prev => ({ ...prev, embedTitle: e.target.value }))} 
                      placeholder="Embed title" 
                      className="font-semibold leading-snug mb-2 w-[24rem]" 
                    />
                    <Textarea 
                      value={formData.embedDescription || ""} 
                      onChange={(e) => setFormData(prev => ({ ...prev, embedDescription: e.target.value }))} 
                      placeholder="Embed description" 
                      rows={2} 
                      className="text-sm whitespace-pre-wrap text-muted-foreground" 
                    />

                    {/* Large image below */}
                    <div className="mt-3">
                      {formData.embedImage ? (
                        <div className="relative">
                          <img src={formData.embedImage} alt="embed" className="w-full max-h-56 rounded object-cover border" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, embedImage: "" }))}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs cursor-pointer"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTempImageUrl(formData.embedImage || "");
                            setImageModalOpen(true);
                          }}
                          className="w-full h-32 rounded border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Add large image"
                        >
                          <ImageIcon className="w-8 h-8" />
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {formData.embedFooterIcon ? (
                          <div className="relative">
                            <img src={formData.embedFooterIcon} alt="footer" className="w-4 h-4 rounded-full" />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, embedFooterIcon: "" }))}
                              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs cursor-pointer"
                              title="Remove footer icon"
                            >
                              <X className="w-1.5 h-1.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempFooterIconUrl(formData.embedFooterIcon || "");
                              setFooterIconModalOpen(true);
                            }}
                            className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Add footer icon"
                          >
                            <ImageIcon className="w-2 h-2" />
                          </button>
                        )}
                        <Input 
                          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm text-foreground bg-background" 
                          placeholder="Footer text" 
                          value={formData.embedFooter || ""} 
                          onChange={(e)=>setFormData(prev => ({ ...prev, embedFooter: e.target.value }))} 
                        />
                      </div>
                      <span className="ml-auto">Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.responseType === "dm" && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">Direct Message Configuration</h4>
          
          <div>
            <label className="block text-sm font-medium mb-2">DM Type</label>
            <div className="flex gap-4">
              {["message", "embed"].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={formData.dmType === type}
                    onChange={(e) => setFormData(prev => ({ ...prev, dmType: e.target.value as any }))}
                    className="text-blue-600"
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

                     {formData.dmType === "message" ? (
             <div>
               <label className="block text-sm font-medium mb-2">DM Content with Live Preview</label>
               <div className="relative">
                 <textarea
                   value={formData.dmContent || ""}
                   onChange={(e) => setFormData(prev => ({ ...prev, dmContent: e.target.value }))}
                   className="w-full px-3 py-2 border rounded-lg h-32 font-mono text-sm bg-transparent relative z-10 resize-none"
                   placeholder="Message to send via DM..."
                   style={{ 
                     color: 'transparent', 
                     caretColor: 'black',
                     lineHeight: '1.25rem',
                     fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                   }}
                 />
                 <div className="absolute inset-0 pointer-events-none">
                   <div className="w-full h-32 overflow-hidden px-3 py-2">
                     {formData.dmContent ? (
                       <div 
                         className="text-sm font-mono whitespace-pre-wrap"
                         style={{ 
                           lineHeight: '1.25rem',
                           fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                         }}
                         dangerouslySetInnerHTML={{ __html: formatDiscordMessage(formData.dmContent) }}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">DM Embed Title</label>
                <input
                  type="text"
                  value={formData.dmEmbedTitle || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, dmEmbedTitle: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="DM embed title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">DM Embed Color</label>
                <input
                  type="color"
                  value={formData.dmEmbedColor || "#5865F2"}
                  onChange={(e) => setFormData(prev => ({ ...prev, dmEmbedColor: e.target.value }))}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">DM Embed Description</label>
                <textarea
                  value={formData.dmEmbedDescription || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, dmEmbedDescription: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-24"
                  placeholder="DM embed description"
                />
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
                             <div className={`border rounded-lg flex flex-col ${compact ? 'max-h-32' : 'max-h-40'}`}>
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
                         <div className={`border rounded-lg flex flex-col ${compact ? 'max-h-32' : 'max-h-40'}`}>
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

      {/* Interactive Buttons */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Interactive Buttons</h4>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={addButton}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Button
          </button>
        </div>
        {formData.buttons?.length === 0 && (
          <div className="text-sm text-gray-500 mb-3">
            Buttons allow users to interact with your command. You can add URLs or custom actions.
          </div>
        )}
        {formData.buttons?.map((button) => (
          <div key={button.id} className="grid grid-cols-12 gap-2 mb-3 p-3 border rounded-lg">
            <div className="col-span-3">
              <label className="text-xs text-gray-600">Button Text</label>
              <input
                type="text"
                value={button.label}
                onChange={(e) => updateButton(button.id, { label: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm mt-1"
                placeholder="Button text"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600">Style</label>
              <select
                value={button.style}
                onChange={(e) => updateButton(button.id, { style: e.target.value as any })}
                className="w-full px-2 py-1 border rounded text-sm mt-1"
              >
                <option value="primary">Primary (Blue)</option>
                <option value="secondary">Secondary (Gray)</option>
                <option value="success">Success (Green)</option>
                <option value="danger">Danger (Red)</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-xs text-gray-600">URL (Optional)</label>
              <input
                type="url"
                value={button.url || ""}
                onChange={(e) => updateButton(button.id, { url: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm mt-1"
                placeholder="https://..."
              />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-gray-600">Action (Optional)</label>
              <input
                type="text"
                value={button.action || ""}
                onChange={(e) => updateButton(button.id, { action: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm mt-1"
                placeholder="Custom action"
              />
            </div>
            <div className="col-span-1 flex items-end justify-center">
              <button
                onClick={() => removeButton(button.id)}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
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

      {/* Image URL Modals */}
      {/* Thumbnail Modal */}
      <Dialog open={thumbnailModalOpen} onOpenChange={(o: boolean) => { if (!o) setThumbnailModalOpen(false); }}>
        <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
          <DialogHeader>
            <DialogTitle>Set Thumbnail Image</DialogTitle>
            <DialogDescription>Enter the URL for the image. This will be displayed in the embed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={tempThumbnailUrl}
                onChange={(e) => setTempThumbnailUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full"
              />
            </div>
            {tempThumbnailUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="border rounded p-2 bg-muted/30">
                  <img src={tempThumbnailUrl} alt="preview" className="max-w-full max-h-32 object-contain mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> { setTempThumbnailUrl(''); setThumbnailModalOpen(false); }}>Cancel</Button>
            <Button onClick={()=> { setFormData(prev => ({ ...prev, embedThumbnail: tempThumbnailUrl })); setThumbnailModalOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Large Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={(o: boolean) => { if (!o) setImageModalOpen(false); }}>
        <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
          <DialogHeader>
            <DialogTitle>Set Large Image</DialogTitle>
            <DialogDescription>Enter the URL for the image. This will be displayed in the embed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={tempImageUrl}
                onChange={(e) => setTempImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full"
              />
            </div>
            {tempImageUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="border rounded p-2 bg-muted/30">
                  <img src={tempImageUrl} alt="preview" className="max-w-full max-h-32 object-contain mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> { setTempImageUrl(''); setImageModalOpen(false); }}>Cancel</Button>
            <Button onClick={()=> { setFormData(prev => ({ ...prev, embedImage: tempImageUrl })); setImageModalOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Author Icon Modal */}
      <Dialog open={authorIconModalOpen} onOpenChange={(o: boolean) => { if (!o) setAuthorIconModalOpen(false); }}>
        <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
          <DialogHeader>
            <DialogTitle>Set Author Icon</DialogTitle>
            <DialogDescription>Enter the URL for the author icon. This will be displayed next to the author name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Icon URL</label>
              <Input
                value={tempAuthorIconUrl}
                onChange={(e) => setTempAuthorIconUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                className="w-full"
              />
            </div>
            {tempAuthorIconUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="border rounded p-2 bg-muted/30">
                  <img src={tempAuthorIconUrl} alt="preview" className="w-16 h-16 rounded-full object-cover mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> { setTempAuthorIconUrl(''); setAuthorIconModalOpen(false); }}>Cancel</Button>
            <Button onClick={()=> { setFormData(prev => ({ ...prev, embedAuthorIcon: tempAuthorIconUrl })); setAuthorIconModalOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Icon Modal */}
      <Dialog open={footerIconModalOpen} onOpenChange={(o: boolean) => { if (!o) setFooterIconModalOpen(false); }}>
        <DialogContent className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
          <DialogHeader>
            <DialogTitle>Set Footer Icon</DialogTitle>
            <DialogDescription>Enter the URL for the footer icon. This will be displayed next to the footer text.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Icon URL</label>
              <Input
                value={tempFooterIconUrl}
                onChange={(e) => setTempFooterIconUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                className="w-full"
              />
            </div>
            {tempFooterIconUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="border rounded p-2 bg-muted/30">
                  <img src={tempFooterIconUrl} alt="preview" className="w-16 h-16 rounded-full object-cover mx-auto" onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=> { setTempFooterIconUrl(''); setFooterIconModalOpen(false); }}>Cancel</Button>
            <Button onClick={()=> { setFormData(prev => ({ ...prev, embedFooterIcon: tempFooterIconUrl })); setFooterIconModalOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
