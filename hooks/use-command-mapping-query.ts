"use client";

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

interface CommandMapping {
  command_name: string;
  feature_name: string;
  description: string;
}

interface CommandMappingResponse {
  success: boolean;
  commands: CommandMapping[];
}

async function fetchCommandMappings(): Promise<CommandMapping[]> {
  const response = await fetch('/api/command-mapping');
  
  if (!response.ok) {
    throw new Error('Failed to fetch command mappings');
  }
  
  const data: CommandMappingResponse = await response.json();
  
  if (!data.success) {
    throw new Error('API returned error');
  }
  
  return data.commands;
}

export function useCommandMappingsQuery() {
  return useQuery({
    queryKey: queryKeys.commandMappings(),
    queryFn: fetchCommandMappings,
    staleTime: 10 * 60 * 1000, // 10 minutes - command mappings don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 1,
    retryDelay: 1000,
  });
}
