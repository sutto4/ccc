"use client";

import { useEffect, useState } from "react";
import Section from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function GuildFeaturesPage({ params }: { params: { id: string } }) {
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/guilds/${params.id}/features`)
      .then(res => res.json())
      .then(data => setFeatures(data.features || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleToggle = async (featureKey: string, enabled: boolean) => {
    setLoading(true);
    await fetch(`/api/admin/guilds/${params.id}/features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey, enabled }),
    });
    // Refetch features
    fetch(`/api/admin/guilds/${params.id}/features`)
      .then(res => res.json())
      .then(data => setFeatures(data.features || []))
      .finally(() => setLoading(false));
  };

  return (
    <Section title="Guild Features">
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <table className="min-w-full text-xs border">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left">Feature</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f: any) => (
              <tr key={f.feature_key} className="border-t">
                <td className="px-3 py-2 font-semibold">{f.feature_name}</td>
                <td className="px-3 py-2">{f.description}</td>
                <td className="px-3 py-2">
                  <Switch checked={!!f.enabled} onCheckedChange={val => handleToggle(f.feature_key, val)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
