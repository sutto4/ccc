"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Shield, Users, Zap, Crown, CheckCircle, ArrowRight, Play, Sparkles, Rocket } from "lucide-react";
import SignInModal from "@/components/signin-modal";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  
  // If user is authenticated, redirect to My Servers
  useEffect(() => {
    if (session && status === "authenticated") {
      router.push('/guilds');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-900/20 text-blue-300 border border-blue-700/50 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              <span>Discord Server Management Made Simple</span>
            </div>
            
            <div className="mb-6 flex items-center justify-center gap-4 md:gap-6">
              <img
                src="/brand/sh-logo.png"
                alt="ServerMate"
                className="h-24 md:h-32 w-auto object-contain"
              />
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight text-left">
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  ServerMate
                </span>
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              The Discord bot that makes server management effortless. Manage roles, users, and features with powerful tools designed for real communities.
            </p>
        
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={() => setSignInModalOpen(true)}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <Rocket className="h-5 w-5" />
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <Link
                href="#features"
                className="inline-flex items-center gap-3 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200 hover:border-gray-300"
              >
                <Play className="h-5 w-5" />
                See Features
              </Link>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>Setup in 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>Free forever plan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"> Manage Your Server</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Powerful tools designed specifically for Discord server administrators.
            </p>
          </div>
      
          <div className="grid md:grid-cols-3 gap-6">
            <div className="group p-6 rounded-xl border border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Role Management</h3>
              <p className="text-gray-300 text-sm">Create, edit, and manage roles with powerful tools. Bulk operations and permission templates.</p>
            </div>

            <div className="group p-6 rounded-xl border border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">User Management</h3>
              <p className="text-gray-300 text-sm">Track user activity, manage custom groups, and get insights into your server's growth.</p>
            </div>

            <div className="group p-6 rounded-xl border border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Reaction Roles</h3>
              <p className="text-gray-300 text-sm">Create interactive role selection menus and automate server management tasks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Crown className="h-4 w-4" />
              <span>Early Adopter Pricing</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Locked for life pricing. No price increases, ever.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Solo Plan */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Early Adopter Solo</h3>
                <div className="text-3xl font-bold text-white mb-1">$9.95<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-400 text-sm">1 server, locked for life</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">1 Discord server</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">All premium features</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Priority support</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setSignInModalOpen(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all duration-300"
              >
                Get Started
              </button>
            </div>

            {/* Squad Plan */}
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-yellow-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">MOST POPULAR</span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Early Adopter Squad</h3>
                <div className="text-3xl font-bold text-white mb-1">$19.95<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-400 text-sm">Up to 3 servers, locked for life</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Up to 3 Discord servers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">All premium features</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Advanced analytics</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setSignInModalOpen(true)}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300"
              >
                Get Started
              </button>
            </div>

            {/* City Plan */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-emerald-500 transition-all duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Early Adopter City</h3>
                <div className="text-3xl font-bold text-white mb-1">$29.95<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-400 text-sm">Up to 10 servers, locked for life</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Up to 10 Discord servers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">All premium features</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300 text-sm">Custom integrations</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setSignInModalOpen(true)}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              Need more than 10 servers? <a href="mailto:contact@servermate.gg" className="text-blue-400 hover:text-blue-300">Contact us for custom pricing</a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Join server administrators who trust ServerMate to manage their communities effectively.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setSignInModalOpen(true)}
              className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <Rocket className="h-5 w-5" />
              Start Managing Your Server
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <Link
              href="#"
              className="inline-flex items-center gap-3 bg-transparent text-white border-2 border-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              <Bot className="h-5 w-5" />
              Add Bot to Server
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-lg"></div>
            <span className="text-xl font-bold">ServerMate</span>
          </div>
          <p className="text-gray-400 mb-4">Discord server management made simple.</p>
          
          <div className="flex justify-center gap-6 mb-4 text-sm">
            <Link href="/legal" className="text-gray-400 hover:text-white transition-colors">
              Privacy & Terms
            </Link>
          </div>
          
          <div className="border-t border-gray-800 pt-4 text-center text-gray-400">
            <p>&copy; 2024 ServerMate. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Sign In Modal */}
      <SignInModal open={signInModalOpen} onOpenChange={setSignInModalOpen} />
    </div>
  );
}
