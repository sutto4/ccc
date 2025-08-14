"use client";
import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table } from "@/components/ui/table";


import { useEffect } from "react";

export default function GuildLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("");
  const [actionType, setActionType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/log")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, []);

const actionTypes = [
  { value: "", label: "All Actions" },
  { value: "role.add", label: "Role Added" },
  { value: "role.remove", label: "Role Removed" },
];

function exportToCSV(rows: any[], filename = "logs.csv") {
  const header = ["Time", "User", "Action", "Details", "Source", "IP"];
  const csvRows = [header.join(",")];
  for (const log of rows) {
    const details = log.actionType === "role.add"
      ? `Added ${log.actionData.role} to ${log.actionData.targetUser}`
      : log.actionType === "role.remove"
      ? `Removed ${log.actionData.role} from ${log.actionData.targetUser}`
      : "";
    const source = log.actionData?.source || "-";
    csvRows.push([
      new Date(log.timestamp).toLocaleString(),
      log.user?.username || log.userId || "-",
      log.actionType,
      details,
      source,
      log.ip
    ].map(x => `"${String(x).replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
        if (dateTo && new Date(log.timestamp) > new Date(dateTo)) return false;
        if (user && !(log.user?.username || log.userId || "").toLowerCase().includes(user.toLowerCase())) return false;
        if (actionType && log.actionType !== actionType) return false;
        if (search) {
          const details = log.actionType === "role.add"
            ? `Added ${log.actionData?.role} to ${log.actionData?.targetUser}`
            : log.actionType === "role.remove"
            ? `Removed ${log.actionData?.role} from ${log.actionData?.targetUser}`
            : "";
          if (!details.toLowerCase().includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, search, user, actionType, dateFrom, dateTo]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Action Logs</h2>
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <Label htmlFor="date-from">From</Label>
          <Input id="date-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label htmlFor="date-to">To</Label>
          <Input id="date-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label htmlFor="user">User</Label>
          <Input id="user" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label htmlFor="action-type">Action</Label>
          <select id="action-type" value={actionType} onChange={e => setActionType(e.target.value)} className="w-40 h-9 rounded-md border px-2">
            {actionTypes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="search">Search</Label>
          <Input id="search" placeholder="Search details..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          className="ml-auto bg-primary text-primary-foreground px-4 py-2 rounded font-semibold shadow hover:bg-primary/90 transition"
          onClick={() => exportToCSV(filteredLogs)}
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading logs…</div>
        ) : (
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Details</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={log.id || i} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {log.user?.username ? (
                      <span title={log.userId || log.user?.id || ""}>{log.user.username}</span>
                    ) : log.userId ? (
                      <span>{log.userId}</span>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{log.actionType}</td>
                  <td className="px-3 py-2">
                    {log.actionType === "role.add" && (
                      <span>
                        Added <b title={log.actionData?.roleId || log.actionData?.role}>{log.actionData?.roleName || log.actionData?.role || log.actionData?.roleId}</b>
                        {" to "}
                        <b title={log.actionData?.targetUserId || log.actionData?.targetUser}>{log.actionData?.targetUsername || log.actionData?.targetUser || log.actionData?.targetUserId}</b>
                      </span>
                    )}
                    {log.actionType === "role.remove" && (
                      <span>
                        Removed <b title={log.actionData?.roleId || log.actionData?.role}>{log.actionData?.roleName || log.actionData?.role || log.actionData?.roleId}</b>
                        {" from "}
                        <b title={log.actionData?.targetUserId || log.actionData?.targetUser}>{log.actionData?.targetUsername || log.actionData?.targetUser || log.actionData?.targetUserId}</b>
                      </span>
                    )}
                    {/* Add more action renderers as needed */}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{log.actionData?.source || "-"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{log.ip || "-"}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">No logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
