"use client";

import React, { useState, useEffect } from "react";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CheckIcon, HashIcon, SmileIcon, User2Icon, PlusCircleIcon, Trash2Icon, InfoIcon, ChevronRightIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import EmojiPicker from "@/components/ui/emoji-picker";

export default function ReactionRolesSetup({ premium }: { premium: boolean }) {
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

  useEffect(() => {
    const match = window.location.pathname.match(/guilds\/(\d+)/);
    const guildId = match?.[1];
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Not implemented: Would save config to backend");
  };

  if (!premium) {
    return (
      <Section title="Setup Reaction Roles">
        <div className="text-center text-red-600 py-8">
          This feature is only available to premium servers.
        </div>
      </Section>
    );
  }


  return (
    <Section title={<span className="flex items-center gap-2"><SmileIcon className="w-5 h-5 text-yellow-500" /> Setup Reaction Roles</span>}>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
        {/* Channel Picker with Popover and HoverCard */}
        <div>
          <label className="block mb-1 font-semibold flex items-center gap-1">
            <HashIcon className="w-4 h-4 text-blue-500" /> Channel
            <Popover>
              <PopoverTrigger asChild>
                <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </PopoverTrigger>
              <PopoverContent className="text-xs max-w-xs">
                Select the channel where the reaction role message is posted.
              </PopoverContent>
            </Popover>
          </label>
          {loadingChannels ? (
            <div className="text-muted-foreground text-xs">Loading channels...</div>
          ) : channelsError ? (
            <div className="text-red-600 text-xs">{channelsError}</div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full flex justify-between items-center">
                  {channelId ? (
                    <span className="flex items-center gap-2">
                      <HashIcon className="w-4 h-4 text-blue-500" />
                      {channels.find((c: any) => c.id === channelId)?.name || "Select a channel"}
                    </span>
                  ) : "Select a channel"}
                  <ChevronRightIcon className="w-4 h-4 ml-auto" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-h-64 overflow-y-auto p-1 bg-white text-black border border-border shadow-xl rounded-lg min-w-[220px]">
                <ul>
                  {channels.map((c: any) => (
                    <li key={c.id}>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Button
                            type="button"
                            variant={channelId === c.id ? "secondary" : "ghost"}
                            className={
                              `w-full flex justify-start items-center gap-2 px-3 py-2 rounded-md transition-colors
                              ${channelId === c.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-muted/60 hover:text-blue-700'}`
                            }
                            onClick={() => setChannelId(c.id)}
                            aria-label={`Select channel ${c.name}`}
                          >
                            <HashIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />
                            <span>{c.name}</span>
                            {channelId === c.id && <CheckIcon className="w-4 h-4 text-green-500 ml-auto" aria-hidden="true" />}
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="text-xs rounded shadow-md">
                          <div><b>ID:</b> {c.id}</div>
                          <div><b>Type:</b> {c.type === 0 ? "Text" : c.type}</div>
                        </HoverCardContent>
                      </HoverCard>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Message ID input */}
        <div>
          <label className="block mb-1 font-semibold flex items-center gap-1">
            <User2Icon className="w-4 h-4 text-purple-500" /> Message ID
            <Popover>
              <PopoverTrigger asChild>
                <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </PopoverTrigger>
              <PopoverContent className="text-xs max-w-xs">
                Paste the ID of the message to attach reaction roles to.
              </PopoverContent>
            </Popover>
          </label>
          <Input
            value={messageId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageId(e.target.value)}
            placeholder="Enter message ID"
            required
          />
        </div>

        {/* Emoji → Role Mappings with RadioGroup and summary popover */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SmileIcon className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold">Emoji → Role Mappings</span>
            <Popover>
              <PopoverTrigger asChild>
                <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </PopoverTrigger>
              <PopoverContent className="text-xs max-w-xs">
                Add one or more emoji/role pairs. Users who react with the emoji will get the role.
              </PopoverContent>
            </Popover>
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
          <div className="space-y-2">
            {mappings.map((m, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-muted/40 rounded p-2">
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
                  <select
                    className="input input-bordered flex-1"
                    value={m.roleId}
                    onChange={e => handleMappingChange(idx, "roleId", e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a role</option>
                    {roles.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
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

        <Button type="submit" className="w-full font-bold text-lg py-3 mt-4" variant="default">
          <SmileIcon className="w-5 h-5 mr-2" /> Save Reaction Roles
        </Button>
      </form>
    </Section>
  );
}


