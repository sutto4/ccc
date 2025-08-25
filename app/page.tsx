"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Shield, Users, Zap, Crown, CheckCircle, ArrowRight, Play, Sparkles, Rocket } from "lucide-react";
import SignInModal from "@/components/signin-modal";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  
  // Remove automatic redirect - allow users to stay on home page even when logged in

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Navigation Header */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/brand/sh-logo.png"
              alt="ServerMate"
              className="h-8 w-auto object-contain"
            />
            <span className="text-white font-semibold text-lg">ServerMate</span>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/guilds"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  My Servers
                </Link>
                {(session.role === "admin" || session.role === "owner") && (
                  <Link
                    href="/admin"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSignInModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

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
              The Discord bot that makes server management effortless. Join our exclusive beta program and get premium features completely free.
            </p>
        
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {session ? (
                // Logged in user - show My Servers button
                <Link
                  href="/guilds"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  <Shield className="h-5 w-5" />
                  My Servers
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                // Not logged in - show Join Discord button
                <a
                  href="https://discord.gg/wEAPpPhU2T"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  <Rocket className="h-5 w-5" />
                  Join Discord Community
                  <ArrowRight className="h-5 w-5" />
                </a>
              )}
              
              <a
                href="#cta"
                className="inline-flex items-center gap-3 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200 hover:border-gray-300"
              >
                <Play className="h-5 w-5" />
                Get Started
              </a>
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
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-16 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Beta Program Now Available!
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Be among the first 50 servers to get premium features completely free. Join our Discord community and get started today!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={() => setSignInModalOpen(true)}
              className="inline-flex items-center gap-3 bg-white text-green-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <Rocket className="h-5 w-5" />
              Join Beta Program Now
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <a
              href="https://discord.gg/wEAPpPhU2T"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-transparent text-white border-2 border-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-green-600 transition-all duration-300"
            >
              <Bot className="h-5 w-5" />
              Join Our Discord
            </a>
          </div>
          
          {/* Discord Instructions */}
          <div className="bg-white/10 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Getting Started:</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left mb-6">
              <div>
                <h4 className="font-semibold text-white mb-2">1. Add the Bot to Your Server</h4>
                <p className="text-green-100 text-sm">
                  Use the "Add Bot to Server" button below to invite ServerMate to your Discord server. 
                  The bot will guide you through the setup process.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">2. Join Our Discord Community</h4>
                <p className="text-green-100 text-sm">
                  Visit the <strong>#beta-users</strong> channel in our Discord to connect with other beta testers, 
                  share feedback, and get support.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=8&scope=bot%20applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                <Bot className="h-5 w-5" />
                Add Bot to Server
              </a>
              
              <a
                href="https://discord.gg/wEAPpPhU2T"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-transparent text-white border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-all duration-300"
              >
                <Users className="h-5 w-5" />
                Join Our Discord
              </a>
            </div>
          </div>
          
          <div className="p-4 bg-white/10 rounded-lg">
            <p className="text-green-100 text-sm">
              <strong>Limited Time:</strong> Only 50 spots available in our exclusive beta program. 
              Get started today and secure your free premium access!
            </p>
          </div>
        </div>
      </section>

      {/* Quick Features Highlight */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
            What You Get in the Beta Program
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Advanced Management</h3>
              <p className="text-gray-400 text-sm">Role management, user groups, reaction roles, and automation tools</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Creator Alerts</h3>
              <p className="text-gray-400 text-sm">Multi-platform alerts for Twitch, YouTube, Kick, and TikTok</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Moderation Tools</h3>
              <p className="text-gray-400 text-sm">Ban sync, case management, and advanced moderation features</p>
            </div>
          </div>
        </div>
      </section>

      {/* Terms Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Beta Program Terms
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Important information about participating in our beta program
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-red-400 text-sm font-bold">!</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Beta Program Participation</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    By joining our beta program, you agree to participate in testing and provide feedback on ServerMate features. 
                    We reserve the right to remove any server from the beta program for any reason, including but not limited to 
                    violation of Discord's Terms of Service, abuse of features, or failure to provide meaningful feedback.
                  </p>
                </div>
              </div>
              
                             <div className="flex items-start gap-4">
                 <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                   <span className="text-green-400 text-sm font-bold">✓</span>
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-white mb-2">Beta Program Eligibility</h3>
                   <p className="text-gray-300 text-sm leading-relaxed">
                     To join our beta program, servers should meet the following criteria:
                   </p>
                   <ul className="mt-3 space-y-2 text-gray-300 text-sm">
                     <li className="flex items-center gap-2">
                       <CheckCircle className="h-4 w-4 text-green-400" />
                       <span>Willing to actively participate and provide valuable feedback</span>
                     </li>
                     <li className="flex items-center gap-2">
                       <CheckCircle className="h-4 w-4 text-green-400" />
                       <span>Have 50+ active users in their Discord server</span>
                     </li>
                     <li className="flex items-center gap-2">
                       <CheckCircle className="h-4 w-4 text-green-400" />
                       <span>Committed to consistent engagement with ServerMate features</span>
                     </li>
                   </ul>
                 </div>
               </div>
               
               <div className="flex items-start gap-4">
                 <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                   <span className="text-blue-400 text-sm font-bold">ℹ</span>
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-white mb-2">Free Premium for Life Opportunity</h3>
                   <p className="text-gray-300 text-sm leading-relaxed">
                     Active beta participants who provide exceptional feedback and maintain consistent engagement may be eligible 
                     for <strong>Free Premium for Life</strong> status after the beta period ends. This includes continued 
                     access to all premium features without any monthly charges.
                   </p>
                 </div>
               </div>
              
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-400 text-sm font-bold">ℹ</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Beta Program Duration</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    The beta program will run for a limited time. After the beta period ends, we will introduce paid subscription 
                    plans. Beta participants will receive special pricing and early access to new features. The exact duration 
                    of the beta program will be announced in our Discord community.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-yellow-400 text-sm font-bold">⚠</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Service Availability</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    During the beta period, ServerMate is provided "as is" without warranties. We may experience downtime, 
                    bugs, or feature changes as we refine the service. Your patience and feedback help us improve ServerMate 
                    for everyone.
                  </p>
                </div>
              </div>
            </div>
            
                         <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
               <p className="text-blue-200 text-sm text-center">
                 <strong>Questions?</strong> Join our Discord community and visit the <strong>#beta-users</strong> channel 
                 for support and to connect with other beta testers.
                 <br />
                 <a href="https://discord.gg/wEAPpPhU2T" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">
                   Join our Discord →
                 </a>
               </p>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-gray-400">&copy; 2024 ServerMate. All rights reserved.</p>
            
            <div className="flex items-center gap-6">
              <Link href="/legal" className="text-gray-400 hover:text-white transition-colors">
                Privacy & Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Sign In Modal */}
      <SignInModal open={signInModalOpen} onOpenChange={setSignInModalOpen} />
    </div>
  );
}
