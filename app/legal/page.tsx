"use client";

import Link from "next/link";
import { Shield, FileText, Calendar, Mail, ArrowLeft } from "lucide-react";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white">Legal Information</h1>
          <p className="text-gray-400 mt-2">Privacy Policy and Terms of Service for ServerMate</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => document.getElementById('privacy')?.scrollIntoView({ behavior: 'smooth' })}
              className="py-4 px-1 border-b-2 border-blue-500 text-blue-400 font-medium whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </div>
            </button>
            <button 
              onClick={() => document.getElementById('terms')?.scrollIntoView({ behavior: 'smooth' })}
              className="py-4 px-1 border-b-2 border-transparent text-gray-400 hover:text-white font-medium whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Terms of Service
              </div>
            </button>
            <button 
              onClick={() => document.getElementById('cookies')?.scrollIntoView({ behavior: 'smooth' })}
              className="py-4 px-1 border-b-2 border-transparent text-gray-400 hover:text-white font-medium whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Cookie Policy
              </div>
            </button>
            <button 
              onClick={() => document.getElementById('sla')?.scrollIntoView({ behavior: 'smooth' })}
              className="py-4 px-1 border-b-2 border-transparent text-gray-400 hover:text-white font-medium whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Service Level
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Privacy Policy */}
        <section id="privacy" className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="h-3 w-3" />
                <span>Effective Date: January 1, 2024</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="space-y-6 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h3>
                <p className="mb-3">We only collect the minimum data required to provide ServerMate services:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Discord Data:</strong> User IDs, server IDs, usernames, and role information needed for verification, sync, and bot functionality.</li>
                  <li><strong>Payment Data:</strong> Billing details are handled securely by Stripe. We do not store full payment details on our systems.</li>
                  <li><strong>Basic Usage Data:</strong> Logs of feature use, error tracking, and service activity.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h3>
                <p className="mb-3">We use your data to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and improve ServerMate features.</li>
                  <li>Process payments and manage subscriptions.</li>
                  <li>Respond to support requests.</li>
                  <li>Prevent abuse or misuse of the service.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">3. Sharing of Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>With Stripe:</strong> For payment processing. Stripe's privacy policy can be found at <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">stripe.com/privacy</a>.</li>
                  <li><strong>With Discord:</strong> To deliver bot functionality.</li>
                  <li><strong>With Service Providers:</strong> Limited cases for hosting, analytics, or support.</li>
                </ul>
                <p className="mt-3">We never sell or rent your data.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">4. Data Storage & Security</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Data is stored securely and only kept as long as necessary.</li>
                  <li>We use encryption and industry-standard practices to protect information.</li>
                  <li>We comply with the Privacy Act 1988 (Cth) and Australian Privacy Principles.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">5. Your Rights</h3>
                <p className="mb-3">Under Australian law, you have rights to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Request access to your data.</li>
                  <li>Request correction or deletion.</li>
                  <li>Withdraw consent (though this may limit use of the Service).</li>
                  <li>Make a complaint to the Office of the Australian Information Commissioner (OAIC).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">6. Children</h3>
                <p>ServerMate is not directed to users under 13. If you are under 13, you must not use the Service.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">7. Changes</h3>
                <p>We may update this Privacy Policy from time to time. If changes are significant, we'll provide notice via our website or Discord.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">8. International Users</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-white mb-2">European Union (GDPR)</h4>
                    <p className="mb-2">If you are in the EU, you have additional rights under GDPR:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Right to data portability</li>
                      <li>Right to erasure ("right to be forgotten")</li>
                      <li>Right to restrict processing</li>
                      <li>Right to object to processing</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-semibold text-white mb-2">California (CCPA/CPRA)</h4>
                    <p className="mb-2">If you are a California resident, you have rights under CCPA:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Right to know what personal information is collected</li>
                      <li>Right to delete personal information</li>
                      <li>Right to opt-out of the sale of personal information</li>
                      <li>Right to non-discrimination for exercising your rights</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">9. Contact</h3>
                <p>For questions about privacy, please contact: <a href="mailto:privacy@servermate.gg" className="text-blue-400 hover:text-blue-300">privacy@servermate.gg</a></p>
              </div>
            </div>
          </div>
        </section>

                 {/* Terms of Service */}
         <section id="terms" className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Terms & Conditions</h2>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="h-3 w-3" />
                <span>Effective Date: January 1, 2024</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="space-y-6 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">1. Agreement</h3>
                <p>By using ServerMate ("the Service"), you agree to these Terms & Conditions. If you do not agree, you must not use the Service.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">2. Service Description</h3>
                <p>ServerMate provides Discord server management tools, integrations, and features. Some features are free, others require a paid subscription.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">3. Eligibility</h3>
                <p>You must be at least 13 years old and comply with Discord's Terms of Service to use ServerMate.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">4. Accounts & Access</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You are responsible for the actions taken through your Discord account when using ServerMate.</li>
                  <li>ServerMate may suspend or terminate access if you violate these Terms or misuse the Service.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">5. Payments & Subscriptions</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Paid features are billed through Stripe. Stripe's terms of service apply and can be found at <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">stripe.com/legal</a>.</li>
                  <li>Prices are shown in AUD unless stated otherwise.</li>
                  <li>Subscriptions are billed monthly unless otherwise specified.</li>
                  <li>Early Adopter subscriptions are lifetime price-locked but remain subject to these Terms.</li>
                  <li>Australian Consumer Law applies. You may have rights to refunds, repairs, or replacements if our services fail to meet consumer guarantees.</li>
                  <li>No refunds will be issued unless required by law or if we cannot provide the service as described.</li>
                </ul>
                
                <div className="mt-4">
                  <h4 className="text-md font-semibold text-white mb-2">Refund Policy</h4>
                  <p className="mb-2">We want you to be completely satisfied with ServerMate. If you're not happy with our service, we'll work with you to resolve any issues or provide a refund when appropriate.</p>
                  
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-white mb-2">When Refunds Are Available</h5>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li><strong>Service Not Working:</strong> If we cannot provide the service as described</li>
                      <li><strong>Technical Issues:</strong> If our service is unavailable for extended periods</li>
                      <li><strong>Billing Errors:</strong> If you were charged incorrectly</li>
                      <li><strong>Duplicate Charges:</strong> If you were charged multiple times</li>
                      <li><strong>Australian Consumer Law:</strong> If our service fails to meet consumer guarantees</li>
                    </ul>
                  </div>
                  
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-white mb-2">Refund Process</h5>
                    <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                      <li>Contact our support team at <a href="mailto:support@servermate.gg" className="text-blue-400 hover:text-blue-300">support@servermate.gg</a></li>
                      <li>Describe the issue you're experiencing</li>
                      <li>Provide your account details and transaction information</li>
                      <li>We'll investigate and respond within 2 business days</li>
                      <li>If approved, refunds are processed within 5-10 business days</li>
                    </ol>
                  </div>
                  
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-white mb-2">No Refund Scenarios</h5>
                    <p className="text-sm">Refunds are generally not provided for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Change of mind after purchase</li>
                      <li>Failure to read service descriptions</li>
                      <li>Violation of our Terms of Service</li>
                      <li>Account termination due to policy violations</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">6. Usage Rules</h3>
                <p className="mb-3">You agree NOT to use ServerMate to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Use the Service for illegal activity.</li>
                  <li>Abuse, reverse-engineer, or attempt to exploit the Service.</li>
                  <li>Violate Discord's Terms of Service or Community Guidelines.</li>
                  <li>Send spam or unsolicited messages through the Service.</li>
                  <li>Infringe on intellectual property rights.</li>
                  <li>Harass, abuse, or harm other users.</li>
                  <li>Spread malware, viruses, or harmful code.</li>
                  <li>Attempt to gain unauthorized access to our systems.</li>
                  <li>Use automated tools to abuse our services.</li>
                  <li>Impersonate other users or entities.</li>
                </ul>
                
                <div className="mt-4">
                  <h4 className="text-md font-semibold text-white mb-2">Content Guidelines</h4>
                  <p className="mb-2">When using ServerMate features:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Ensure all content complies with Discord's guidelines</li>
                    <li>Respect intellectual property rights</li>
                    <li>Maintain appropriate content for your audience</li>
                    <li>Do not use our services to distribute harmful or inappropriate content</li>
                  </ul>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-md font-semibold text-white mb-2">Consequences of Violations</h4>
                  <p className="mb-2">Violations of these rules may result in:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Temporary suspension of your account</li>
                    <li>Permanent termination of access</li>
                    <li>Reporting to Discord for violations of their terms</li>
                    <li>Legal action if necessary</li>
                  </ul>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-md font-semibold text-white mb-2">Reporting Violations</h4>
                  <p>If you encounter violations of these rules, please report them to <a href="mailto:support@servermate.gg" className="text-blue-400 hover:text-blue-300">support@servermate.gg</a> with relevant details.</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">7. Availability & Changes</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>ServerMate is provided "as is" and may be updated, changed, or discontinued at any time without prior notice.</li>
                  <li>Features may change or be removed at our discretion.</li>
                  <li>We will provide reasonable notice for significant changes that affect your use of the Service.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">8. Liability</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>ServerMate is not responsible for downtime, data loss, or any indirect damages.</li>
                  <li>Maximum liability is limited to the amount paid for the Service in the last 30 days.</li>
                  <li>Australian Consumer Law may provide additional rights that cannot be excluded.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">9. Termination</h3>
                <p>We may suspend or terminate your access if you breach these Terms, misuse the Service, or at our discretion. We will provide reasonable notice where possible.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">10. Governing Law</h3>
                <p>These Terms are governed by the laws of Australia. Any disputes will be resolved in Australian courts.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">11. Contact</h3>
                <p>For support or questions, please contact: <a href="mailto:support@servermate.gg" className="text-blue-400 hover:text-blue-300">support@servermate.gg</a></p>
              </div>
            </div>
          </div>
        </section>

        {/* Cookie Policy */}
        <section id="cookies" className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Cookie Policy</h2>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="h-3 w-3" />
                <span>Effective Date: January 1, 2024</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="space-y-6 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">What Are Cookies?</h3>
                <p>Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience and analyze how our services are used.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">How We Use Cookies</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Essential Cookies:</strong> Required for basic website functionality and security</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our services</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                  <li><strong>Session Cookies:</strong> Maintain your login status and session information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Third-Party Cookies</h3>
                <p>We may use third-party services that set their own cookies:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Stripe:</strong> For payment processing and security</li>
                  <li><strong>Analytics Services:</strong> To understand website usage and improve our services</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Managing Cookies</h3>
                <p>You can control and manage cookies through your browser settings. However, disabling certain cookies may limit your ability to use some features of our service.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Updates to This Policy</h3>
                <p>We may update this Cookie Policy from time to time. Please check back regularly for any changes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Level Agreement */}
        <section id="sla">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Service Level Agreement</h2>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="h-3 w-3" />
                <span>Effective Date: January 1, 2024</span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="space-y-6 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Service Availability</h3>
                <p>We aim to keep ServerMate running smoothly, but we can't guarantee 100% uptime. We'll do our best to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Keep the service available most of the time</li>
                  <li>Schedule maintenance during quiet periods when possible</li>
                  <li>Let you know about planned downtime in advance</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">What We Don't Promise</h3>
                <p>We're not responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Discord being down or having issues</li>
                  <li>Stripe payment processing problems</li>
                  <li>Your internet connection issues</li>
                  <li>Force majeure events (natural disasters, etc.)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Support</h3>
                <p>We'll try to help when you have issues, but we can't promise specific response times. We're a small team doing our best!</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Contact</h3>
                <p>For any service issues, contact us at <a href="mailto:support@servermate.gg" className="text-blue-400 hover:text-blue-300">support@servermate.gg</a>.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-700 text-center">
          <div className="space-y-4">
            <div className="text-gray-400 text-sm">
              <p>Last updated: January 1, 2024</p>
              <p>ServerMate operates under Australian law and complies with all applicable Australian regulations.</p>
            </div>
            
            <div className="flex justify-center gap-6 text-sm">
              <a href="mailto:privacy@servermate.gg" className="text-blue-400 hover:text-blue-300">Privacy</a>
              <a href="mailto:support@servermate.gg" className="text-blue-400 hover:text-blue-300">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
