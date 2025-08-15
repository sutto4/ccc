import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Bot, Shield, Users, Zap, Star, CheckCircle, ArrowRight, Play, Crown, Sparkles, Rocket, Target, BarChart3 } from "lucide-react";

export default async function Page() {
  const session = await getServerSession(authOptions);
  
  // If user is authenticated, redirect to My Servers
  if (session) {
    redirect('/guilds');
  }

  return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-blue-900/20 text-blue-300 border border-blue-700/50 px-4 py-2 rounded-full text-sm font-medium mb-8">
                  <Sparkles className="h-4 w-4" />
                  <span>Discord Server Management Made Simple</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    DuckCord
                  </span>
                  <br />
                  <span className="text-gray-100">Admin</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                  The ultimate Discord server management platform. Manage roles, users, and features with powerful tools designed for modern communities.
                </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/signin"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <Rocket className="h-5 w-5" />
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              
              <Link
                href="#features"
                className="inline-flex items-center gap-3 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200 hover:border-gray-300"
              >
                <Play className="h-5 w-5" />
                Watch Demo
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
          <section id="features" className="py-20 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Everything You Need to
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"> Manage Your Server</span>
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Powerful tools designed specifically for Discord server administrators. Manage roles, users, and features with ease.
                </p>
              </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="group p-8 rounded-2xl border border-gray-700 hover:border-blue-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">Advanced Role Management</h3>
                  <p className="text-gray-300 mb-6">Create, edit, and manage roles with powerful tools. Set permissions, organize hierarchies, and automate role assignments.</p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>Bulk role operations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>Permission templates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>Role hierarchy management</span>
                    </li>
                  </ul>
                </div>

            <div className="group p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">User Management & Analytics</h3>
              <p className="text-gray-300 mb-6">Track user activity, manage custom groups, and get insights into your server's growth and engagement.</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>User activity tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Custom user groups</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Growth analytics</span>
                </li>
              </ul>
            </div>

            <div className="group p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Reaction Roles & Automation</h3>
              <p className="text-gray-300 mb-6">Create interactive role selection menus and automate server management tasks to save time and improve user experience.</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Interactive role menus</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Emoji reactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Automated workflows</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">Active Servers</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">2M+</div>
              <div className="text-blue-100">Users Managed</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-blue-100">Uptime</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Crown className="h-4 w-4" />
              <span>Premium Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Unlock Your Server's
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Full Potential</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Get access to advanced features, priority support, and unlimited server management capabilities.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics</h3>
                  <p className="text-gray-300">Get detailed insights into server growth, user engagement, and role distribution with advanced analytics dashboard.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Custom Integrations</h3>
                  <p className="text-gray-300">Connect with your favorite tools and services. Webhooks, API access, and custom automation workflows.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Priority Support</h3>
                  <p className="text-gray-300">Get fast, dedicated support from our team of Discord experts. 24/7 assistance for premium users.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                                  <h3 className="text-2xl font-bold text-white mb-2">Premium Plan</h3>
                  <div className="text-4xl font-bold text-white mb-2">$9.99<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-300">Perfect for growing communities</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-300">Unlimited servers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-300">Advanced analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-300">Custom integrations</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-300">Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-300">API access</span>
                </li>
              </ul>
              
              <button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Server?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of server administrators who trust DuckCord Admin to manage their communities effectively.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signin"
              className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <Rocket className="h-5 w-5" />
              Start Managing Your Server
              <ArrowRight className="h-5 w-5" />
            </Link>
            
            <Link
              href="#"
              className="inline-flex items-center gap-3 bg-transparent text-white border-2 border-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              <Bot className="h-5 w-5" />
              Add Bot to Server
            </Link>
          </div>
          
          <p className="text-blue-100 text-sm mt-6">
            No credit card required • Free forever plan • Setup in 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-lg"></div>
                <span className="text-xl font-bold">DuckCord Admin</span>
              </div>
              <p className="text-gray-400">The ultimate Discord server management platform for modern communities.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 DuckCord Admin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
