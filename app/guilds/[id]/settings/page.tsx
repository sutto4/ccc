"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Shield, 
  Bot, 
  MessageSquare, 
  Users, 
  FileText,
  Zap,
  Crown,
  ArrowRight,
  CheckCircle,
  Star
} from "lucide-react";

export default function GuildSettingsPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";

  const settingsSections = [
    {
      title: "Features",
      description: "Enable or disable server features and commands",
      icon: <Zap className="h-8 w-8 text-blue-600" />,
      href: `/guilds/${guildId}/settings/features`,
      color: "from-blue-50 to-blue-100 border-blue-200",
      accentColor: "text-blue-600",
      features: ["Feature toggles", "Command management", "Premium features"],
      status: "active"
    },
    {
      title: "General",
      description: "Basic server settings and configuration",
      icon: <Settings className="h-8 w-8 text-gray-600" />,
      href: `/guilds/${guildId}/settings/general`,
      color: "from-gray-50 to-gray-100 border-gray-200",
      accentColor: "text-gray-600",
      features: ["Server preferences", "Language settings", "Timezone config"],
      status: "active"
    },
    {
      title: "Role Permissions",
      description: "Manage which roles can use the bot",
      icon: <Shield className="h-8 w-8 text-green-600" />,
      href: `/guilds/${guildId}/settings/role-permissions`,
      color: "from-green-50 to-green-100 border-green-200",
      accentColor: "text-green-600",
      features: ["Role-based access", "Permission levels", "Admin controls"],
      status: "active"
    },
    {
      title: "Bot Customization",
      description: "Customize bot appearance and behavior",
      icon: <Bot className="h-8 w-8 text-purple-600" />,
      href: `/guilds/${guildId}/settings/bot-customization`,
      color: "from-purple-50 to-purple-100 border-purple-200",
      accentColor: "text-purple-600",
      features: ["Bot appearance", "Response styles", "Custom messages"],
      status: "premium"
    },
    {
      title: "Logs",
      description: "View server activity and bot logs",
      icon: <FileText className="h-8 w-8 text-orange-600" />,
      href: `/guilds/${guildId}/settings/logs`,
      color: "from-orange-50 to-orange-100 border-orange-200",
      accentColor: "text-orange-600",
      features: ["Activity tracking", "Audit logs", "Export data"],
      status: "active"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Server Settings</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Configure your server's bot settings, features, and permissions. 
          All changes are applied in real-time and affect your Discord server immediately.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Card key={section.title} className={`bg-gradient-to-br ${section.color} hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-xl bg-white/60 ${section.accentColor}`}>
                  {section.icon}
                </div>
                <div className="flex items-center gap-2">
                  {section.status === 'premium' && (
                    <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {section.status === 'active' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-xl mb-2">{section.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {section.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Feature List */}
              <div className="space-y-2">
                {section.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              
              {/* Action Button */}
              <Link href={section.href} className="block">
                <Button 
                  variant="outline" 
                  className={`w-full border-2 hover:border-current transition-colors ${section.accentColor} hover:bg-white/80`}
                >
                  <span>Configure {section.title}</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium Features Banner */}
      <Card className="bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 border-2 border-yellow-200">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Crown className="h-8 w-8 text-yellow-600" />
            <CardTitle className="text-2xl text-yellow-800">Premium Features</CardTitle>
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <CardDescription className="text-yellow-700 text-lg">
            Unlock advanced features, unlimited customization, and priority support
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-yellow-800">Advanced Bot Customization</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-yellow-800">Unlimited Custom Commands</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-yellow-800">Priority Support</span>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Premium
            </Button>
            <Button variant="outline" size="lg" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50">
              View All Features
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-600">5</div>
          <div className="text-sm text-muted-foreground">Active Features</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-600">3</div>
          <div className="text-sm text-muted-foreground">Configured Settings</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-purple-600">2</div>
          <div className="text-sm text-muted-foreground">Premium Features</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-orange-600">24/7</div>
          <div className="text-sm text-muted-foreground">Bot Uptime</div>
        </Card>
      </div>
    </div>
  );
}
