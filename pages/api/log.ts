// pages/api/log.ts
import type { NextApiRequest, NextApiResponse } from "next";

// In-memory log store for demo. Replace with DB integration.
let logs: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const entry = req.body;
    logs.push(entry);
    // Optionally limit log size for demo
    if (logs.length > 1000) logs = logs.slice(-1000);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "GET") {
    // Optionally filter by guildId, etc.
    return res.status(200).json({ logs });
  }
  res.status(405).end();
}
