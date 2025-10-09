"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckIcon, HashIcon, SmileIcon, User2Icon, PlusCircleIcon, Trash2Icon, InfoIcon, ChevronRightIcon, AlertCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import EmojiPicker from "@/components/ui/emoji-picker";
import { Select } from "@/components/ui/select";
import { InlineSearchSelect } from "@/components/ui/inline-search-select";

export default function ReactionRolesSetup({ premium, guildIdProp }: { premium: boolean; guildIdProp?: string }) {
  const [channelId, setChannelId] = useState("");
  const [channels, setChannels] = useState<any[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<any[]>([]);
  const [loadingEmojis, setLoadingEmojis] = useState(true);
  const [emojisError, setEmojisError] = useState<string | null>(null);
  const [messageId, setMessageId] = useState("");
  const [mappings, setMappings] = useState([
    { emoji: "", roleId: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/guilds\/(\d+)/);
    const guildId = guildIdProp || match?.[1];
    if (!guildId) return;
    setLoadingChannels(true);
    fetch(`/api/guilds/${guildId}/channels`)
      .then(r => r.json())
      .then(data => {
        if (data.channels) {
          setChannels(data.channels.filter((c: any) => c.type === 0));
        } else {
          setChannelsError(data.error || "Failed to load channels");
        }
      })
      .catch(e => setChannelsError(e.message))
      .finally(() => setLoadingChannels(false));

    // Fetch roles
    setLoadingRoles(true);
    fetch(`/api/guilds/${guildId}/roles`)
      .then(r => r.json())
      .then(data => {
        if (data.roles) {
          setRoles(data.roles);
        } else {
          setRolesError(data.error || "Failed to load roles");
        }
      })
      .catch(e => setRolesError(e.message))
      .finally(() => setLoadingRoles(false));

    // Fetch emojis
    setLoadingEmojis(true);
    fetch(`/api/guilds/${guildId}/emojis`)
      .then(r => r.json())
      .then(data => {
        if (data.emojis) {
          setEmojis(data.emojis);
        } else {
          setEmojisError(data.error || "Failed to load emojis");
        }
      })
      .catch(e => setEmojisError(e.message))
      .finally(() => setLoadingEmojis(false));
  }, []);

  const handleMappingChange = (idx: number, field: string, value: string) => {
    setMappings(mappings => mappings.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addMapping = () => setMappings(m => [...m, { emoji: "", roleId: "" }]);
  const removeMapping = (idx: number) => setMappings(m => m.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveOk(false);
    setSaveError(null);
    const match = window.location.pathname.match(/guilds\/(\d+)/);
    const guildId = guildIdProp || match?.[1];
    if (!guildId) { setSaveError("Missing guild id"); return; }
    if (!channelId) { setSaveError("Select a channel"); return; }
    if (!messageId) { setSaveError("Enter a message ID"); return; }
    const payload = {
      channelId,
      messageId,
      mappings: mappings.filter(m => m.emoji && m.roleId)
    };
    if (payload.mappings.length === 0) { setSaveError("Add at least one emoji → role mapping"); return; }
    try {
      setSaving(true);
      const res = await fetch(`/api/guilds/${guildId}/reaction-roles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data?.error || `Save failed (${res.status})`);
        try {
          const { toast } = await import("@/hooks/use-toast");
          toast({ title: "Save failed", description: data?.error || `${res.status}`, variant: "destructive", duration: 5000 });
        } catch {}
        return;
      }
      setSaveOk(true);
      try {
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: "Saved", description: "Reaction roles configured", variant: "success", duration: 3000 });
      } catch {}
    } catch (err: any) {
      setSaveError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!premium) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <p className="text-red-600 font-medium">
              This feature is only available to premium servers.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardContent className="p-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel Picker with Popover and HoverCard */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <HashIcon className="w-4 h-4 text-blue-500" /> Channel
            <Popover>
              <PopoverTrigger asChild>
                <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </PopoverTrigger>
              <PopoverContent className="text-xs max-w-xs">
                Select the channel where the reaction role message is posted.
              </PopoverContent>
            </Popover>
          </Label>
          {loadingChannels ? (
            <div className="text-muted-foreground text-xs">Loading channels...</div>
          ) : channelsError ? (
            <div className="text-red-600 text-xs">{channelsError}</div>
          ) : (
            <InlineSearchSelect
              options={channels.filter((c:any)=>c.type===0).map((c:any)=>({ value: c.id, label: `#${c.name}` }))}
              value={channelId}
              onChange={(v:string)=> setChannelId(v)}
              placeholder="Search channels…"
            />
          )}
        </div>

        {/* Message ID input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User2Icon className="w-4 h-4 text-purple-500" /> Message ID
            <Popover>
              <PopoverTrigger asChild>
                <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </PopoverTrigger>
              <PopoverContent className="text-xs max-w-xs">
                Paste the ID of the message to attach reaction roles to.
              </PopoverContent>
            </Popover>
          </Label>
          <Input
            value={messageId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageId(e.target.value)}
            placeholder="Enter message ID"
            required
          />
        </div>

        {/* Emoji → Role Mappings with RadioGroup and summary popover */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <SmileIcon className="w-4 h-4 text-yellow-500" />
              Emoji → Role Mappings
              <Popover>
                <PopoverTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                </PopoverTrigger>
                <PopoverContent className="text-xs max-w-xs">
                  Add one or more emoji/role pairs. Users who react with the emoji will get the role.
                </PopoverContent>
              </Popover>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="icon" variant="ghost" className="ml-2" title="Show summary">
                  <InfoIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="text-xs">
                <b>Current Mappings:</b>
                <ul className="mt-1 space-y-1">
                  {mappings.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span>{m.emoji}</span>
                      <ChevronRightIcon className="w-3 h-3" />
                      <span>{m.roleId}</span>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3">
            {mappings.map((m, idx) => (
              <div key={idx} className="flex gap-3 items-center bg-muted/50 rounded-lg p-3 border border-border">
                {/* Emoji Picker: show custom emojis if available, else fallback to input */}
                {loadingEmojis ? (
                  <div className="text-muted-foreground text-xs">Loading emojis...</div>
                ) : emojisError ? (
                  <div className="text-red-600 text-xs">{emojisError}</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24"
                      value={m.emoji}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMappingChange(idx, "emoji", e.target.value)}
                      placeholder="Emoji (type or pick)"
                      required
                    />
                    <div style={{ position: 'relative' }}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" aria-label="Pick emoji">
                            <SmileIcon className="w-5 h-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 border-none bg-transparent shadow-none">
                          <EmojiPicker onEmojiSelect={(emoji: any) => handleMappingChange(idx, "emoji", emoji.native)} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
                {/* Role dropdown */}
                {loadingRoles ? (
                  <div className="text-muted-foreground text-xs">Loading roles...</div>
                ) : rolesError ? (
                  <div className="text-red-600 text-xs">{rolesError}</div>
                ) : (
                  <Select
                    className="flex-1"
                    value={m.roleId}
                    onChange={e => handleMappingChange(idx, "roleId", (e.target as HTMLSelectElement).value)}
                    required
                  >
                    <option value="" disabled>Select a role</option>
                    {roles.map((role: any) => (
                      <option key={role.roleId} value={role.roleId}>{role.name}</option>
                    ))}
                  </Select>
                )}
                <Button type="button" variant="destructive" size="icon" onClick={() => removeMapping(idx)} disabled={mappings.length === 1} title="Remove mapping">
                  <Trash2Icon className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" onClick={addMapping} variant="secondary" className="w-full flex items-center gap-2 justify-center">
              <PlusCircleIcon className="w-4 h-4" /> Add Mapping
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{saveError}</p>
          </div>
        )}
        {saveOk && !saveError && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm flex items-center gap-2">
              <CheckIcon className="w-4 h-4" />
              Saved successfully!
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          <SmileIcon className="w-5 h-5 mr-2" /> {saving ? 'Saving…' : 'Save Reaction Roles'}
        </Button>
      </form>
      </CardContent>
    </Card>
  );
}


