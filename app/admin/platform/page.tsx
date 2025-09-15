"use client";

import Link from "next/link";
import { Zap, BarChart3, Activity, MonitorDot, ArrowRight } from "lucide-react";

const platformSections = [
  {
    title: "Features",
    description: "Manage platform features, commands, and configurations",
    href: "/admin/platform/features",
    icon: Zap,
    color: "bg-blue-500"
  },
  {
    title: "Analytics", 
    description: "View usage statistics, performance metrics, and insights",
    href: "/admin/platform/analytics",
    icon: BarChart3,
    color: "bg-green-500"
  },
  {
    title: "Service Quotas",
    description: "Monitor and manage system resource quotas and limits",
    href: "/admin/platform/quotas",
    icon: Activity,
    color: "bg-orange-500"
  },
  {
    title: "Monitoring",
    description: "System health checks, alerts, and end-to-end monitoring",
    href: "/admin/platform/monitoring",
    icon: MonitorDot,
    color: "bg-purple-500"
  }
];

export default function PlatformManagement() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {platformSections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="block p-6 bg-card rounded-lg border hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${section.color}`}>
                <section.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                  {section.title}
                </h3>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          
          <p className="text-muted-foreground">
            {section.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
