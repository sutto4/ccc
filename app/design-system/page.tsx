"use client";

import { useState } from "react";
import { 
  Input, 
  Textarea, 
  Select, 
  Button, 
  IconButton, 
  Checkbox, 
  Radio,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  cn,
  spacing,
  layout,
  text
} from "@/components/ui";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Settings
} from "lucide-react";

export default function DesignSystemPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "Example Command",
    description: "This is an example description for the command",
    category: "utility",
    enabled: true,
    notifications: false,
    responseType: "message"
  });

  const [searchTerm, setSearchTerm] = useState("Search example");
  const [isLoading, setIsLoading] = useState(false);

  const toggleLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200/60'} border-b backdrop-blur-sm sticky top-0 z-10 transition-colors duration-200`}>
        <div className="px-6 sm:px-8 lg:px-12 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">DS</span>
              </div>
              <div>
                <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Design System
                </h1>
                <p className={`text-base mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Vercel/Tailwind/VS Code inspired component showcase for ServerMate.gg
                </p>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 sm:px-8 lg:px-12 py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Theme Info */}
          <div className="text-center mb-12">
            <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'} - Vercel/Tailwind/VS Code Inspired
            </h2>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              {isDarkMode ? 'VS Code dark theme styling' : 'Vercel-inspired modern styling'}
            </p>
          </div>

          {/* Form Components */}
          <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader 
              title="Form Components" 
              subtitle="Inputs, selects, and form controls with modern aesthetics"
              action={<Button variant="outline" size="sm">View Code</Button>}
              className={isDarkMode ? 'text-white border-gray-700' : ''}
            />
            <CardContent className={`space-y-8 ${isDarkMode ? 'text-white' : ''}`}>
              
              {/* Basic Inputs */}
              <div className="space-y-6">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Text Inputs</h4>
                <div className="space-y-4">
                  <Input
                    label="Command Name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter command name"
                    helperText="Choose a descriptive name for your command"
                  />
                  
                  <Input
                    label="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search commands..."
                    icon={<Search className="h-4 w-4" />}
                  />
                  
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="user@example.com"
                    error="Please enter a valid email address"
                  />
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Textarea</h4>
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe what this command does..."
                  helperText="Be specific about the command's purpose"
                />
              </div>

              {/* Select */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Dropdown</h4>
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  options={[
                    { value: "utility", label: "Utility" },
                    { value: "moderation", label: "Moderation" },
                    { value: "fun", label: "Fun" },
                    { value: "admin", label: "Administration" }
                  ]}
                />
              </div>

              {/* Checkboxes and Radios */}
              <div className="space-y-6">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Checkboxes & Radio Buttons</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Checkbox
                    label="Enable command"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <Checkbox
                    label="Send notifications"
                    checked={formData.notifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, notifications: e.target.checked }))}
                    helperText="Notify users when used"
                  />
                </div>
                
                <div className="space-y-4">
                  <Radio
                    name="responseType"
                    value="message"
                    checked={formData.responseType === "message"}
                    onChange={(e) => setFormData(prev => ({ ...prev, responseType: e.target.value }))}
                    label="Regular Message"
                  />
                  <Radio
                    name="responseType"
                    value="embed"
                    checked={formData.responseType === "embed"}
                    onChange={(e) => setFormData(prev => ({ ...prev, responseType: e.target.value }))}
                    label="Embed Message"
                  />
                  <Radio
                    name="responseType"
                    value="dm"
                    checked={formData.responseType === "dm"}
                    onChange={(e) => setFormData(prev => ({ ...prev, responseType: e.target.value }))}
                    label="Direct Message"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Button Components */}
          <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader 
              title="Button Components" 
              subtitle="Modern button styles inspired by Vercel and Tailwind"
              action={<Button variant="outline" size="sm">View Code</Button>}
              className={isDarkMode ? 'text-white border-gray-700' : ''}
            />
            <CardContent className={`space-y-8 ${isDarkMode ? 'text-white' : ''}`}>
              
              {/* Button Variants */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Button Variants</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </div>

              {/* Button Sizes */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Button Sizes</h4>
                <div className="flex items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>

              {/* Button States */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Button States</h4>
                <div className="flex items-center gap-3">
                  <Button loading={isLoading} onClick={toggleLoading}>
                    {isLoading ? "Loading..." : "Click to Load"}
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button icon={<Plus className="h-4 w-4" />}>
                    With Icon
                  </Button>
                </div>
              </div>

              {/* Icon Buttons */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Icon Buttons</h4>
                <div className="flex items-center gap-3">
                  <IconButton size="sm" variant="ghost">
                    <Edit3 className="h-4 w-4" />
                  </IconButton>
                  <IconButton size="md" variant="outline">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                  <IconButton size="lg" variant="primary">
                    <Settings className="h-5 w-5" />
                  </IconButton>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layout Components */}
          <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader 
              title="Layout Components" 
              subtitle="Cards and layout patterns with modern shadows and borders"
              action={<Button variant="outline" size="sm">View Code</Button>}
              className={isDarkMode ? 'text-white border-gray-700' : ''}
            />
            <CardContent className={`space-y-6 ${isDarkMode ? 'text-white' : ''}`}>
              <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                This card demonstrates the CardHeader with an action button. 
                The content area shows how cards can be used for consistent layouts with subtle shadows and smooth transitions.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="outlined" className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                  <CardContent className={isDarkMode ? 'text-white' : ''}>
                    <h5 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Outlined Card</h5>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Different card variant for subtle emphasis with clean borders.</p>
                  </CardContent>
                </Card>
                
                <Card variant="elevated" className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                  <CardContent className={isDarkMode ? 'text-white' : ''}>
                    <h5 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Elevated Card</h5>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Card with enhanced shadow for prominence and depth.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            <CardFooter 
              action={<Button variant="primary">Save Changes</Button>}
              className={isDarkMode ? 'border-gray-700 bg-gray-750/50' : ''}
            >
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Card footer with action button and subtle background</p>
            </CardFooter>
          </Card>

          {/* Utility Examples */}
          <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader 
              title="Utility Functions" 
              subtitle="Spacing, layout, and text utilities for consistent design"
              action={<Button variant="outline" size="sm">View Code</Button>}
              className={isDarkMode ? 'text-white border-gray-700' : ''}
            />
            <CardContent className={`space-y-8 ${isDarkMode ? 'text-white' : ''}`}>
              
              {/* Spacing Utilities */}
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Spacing Utilities</h4>
                <div className={spacing.sm}>
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>Small spacing (8px)</div>
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>Small spacing (8px)</div>
                </div>
                <div className={spacing.md}>
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-200'}`}>Medium spacing (16px)</div>
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-200'}`}>Medium spacing (16px)</div>
                </div>
                <div className={spacing.lg}>
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-purple-900/50 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>Large spacing (24px)</div>
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-purple-900/50 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>Large spacing (24px)</div>
                </div>
              </div>

                             {/* Text Utilities */}
               <div className="space-y-4">
                 <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Text Utilities</h4>
                 <h3 className={`${text.heading} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Heading Style</h3>
                 <p className={`${text.body} ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Body text style for regular content with proper line height.</p>
                 <span className={`${text.caption} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Caption text for small details and metadata.</span>
               </div>

                             {/* Layout Utilities */}
               <div className="space-y-4">
                 <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Layout Utilities</h4>
                 <div className={`${layout.card} ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                   <div className="p-4">
                     <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Using layout.card utility class for consistent card styling</p>
                   </div>
                 </div>
               </div>
            </CardContent>
          </Card>

                     {/* Custom Application Components */}
           <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
             <CardHeader 
               title="Custom Application Components" 
               subtitle="ServerMate.gg specific components for Discord bot management"
               action={<Button variant="outline" size="sm">View Docs</Button>}
               className={isDarkMode ? 'text-white border-gray-700' : ''}
             />
             <CardContent className={`space-y-8 ${isDarkMode ? 'text-white' : ''}`}>
               
               {/* Embedded Message Builder */}
               <div className="space-y-4">
                 <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Embedded Message Builder</h4>
                 <div className={`rounded-xl p-6 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Form Section */}
                     <div className="space-y-4">
                                               <h5 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Message Configuration</h5>
                       <div className="space-y-4">
                         {/* Channel Selection */}
                         <div>
                           <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Channel</label>
                           <select className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                             isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                           }`}>
                             <option>📢 #announcements</option>
                             <option>👋 #welcome</option>
                             <option>💬 #general</option>
                             <option>🎮 #gaming</option>
                           </select>
                         </div>

                         {/* Title */}
                         <div>
                           <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Title</label>
                           <input 
                             type="text" 
                             className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                               isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                             }`}
                             placeholder="Enter embed title..."
                             value="Welcome to ServerMate Community!"
                           />
                         </div>

                         {/* Description */}
                         <div>
                           <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                           <textarea 
                             className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-vertical ${
                               isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                             }`}
                             placeholder="Enter embed description..."
                             value="We're excited to have you join our community!"
                           />
                         </div>

                         {/* Color Picker */}
                         <div>
                           <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Accent Color</label>
                           <div className="flex items-center space-x-3">
                             <div className="w-12 h-12 bg-blue-500 rounded-lg border-2 cursor-pointer shadow-sm hover:shadow-md transition-shadow border-gray-500"></div>
                             <input 
                               type="text" 
                               className={`flex-1 px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm ${
                                 isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                               }`}
                               value="#3B82F6"
                               readOnly
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                     
                     {/* Discord Embed Preview */}
                     <div className="space-y-4">
                                               <h5 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Discord Embed Preview</h5>
                       <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-l-blue-500 shadow-lg">
                         <div className="text-white space-y-3">
                           <h6 className="font-semibold text-lg text-white">Welcome to ServerMate Community!</h6>
                           <p className="text-gray-300 text-sm leading-relaxed">
                             We're excited to have you join our community!
                           </p>
                           <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                             <span className="text-xs text-gray-400">Powered by ServerMate.gg</span>
                             <span className="text-xs text-gray-400">Today at 12:00 PM</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Role Selection Components */}
               <div className="space-y-4">
                 <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Role Selection Components</h4>
                 <div className="space-y-6">
                   {/* Role Chips */}
                   <div>
                                           <h5 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Role Chips</h5>
                     <div className="flex flex-wrap gap-2">
                       <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium border ${
                         isDarkMode ? 'bg-blue-900/50 border-blue-700 text-blue-200' : 'bg-blue-100 border-blue-200 text-blue-800'
                       }`}>
                         <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                         <span>Admin</span>
                         <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                           <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                           </svg>
                         </div>
                       </div>
                       <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium border ${
                         isDarkMode ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-green-100 border-green-200 text-green-800'
                       }`}>
                         <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                         <span>Moderator</span>
                       </div>
                       <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium border ${
                         isDarkMode ? 'bg-purple-900/50 border-purple-700 text-purple-200' : 'bg-purple-100 border-purple-200 text-purple-800'
                       }`}>
                         <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                         <span>Member</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Modals and Popups */}
               <div className="space-y-4">
                 <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Modals and Popups</h4>
                 <div className="space-y-6">
                   {/* Image URL Dialog */}
                   <div>
                                           <h5 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Image URL Dialog</h5>
                     <div className={`border rounded-xl shadow-lg p-6 max-w-md ${
                       isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                     }`}>
                       <div className="flex items-center justify-between mb-4">
                         <h6 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Image</h6>
                         <button className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                         </button>
                       </div>
                       
                       <div className="space-y-4">
                         <div>
                           <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Image URL</label>
                           <input 
                             type="url" 
                             className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                               isDarkMode ? 'border-gray-600 bg-gray-600 text-white' : 'border-gray-300'
                             }`}
                             placeholder="https://example.com/image.jpg"
                             value="https://images.unsplash.com/photo-1611224923853-80b023f02d71"
                           />
                         </div>
                         
                         <div className="flex space-x-3 pt-2">
                           <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                             Add Image
                           </button>
                           <button className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                             isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                           }`}>
                             Cancel
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Notification Toasts */}
           <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
             <CardHeader 
               title="Notification Toasts" 
               subtitle="Toast notifications for user feedback and alerts"
               action={<Button variant="outline" size="sm">View Code</Button>}
               className={isDarkMode ? 'text-white border-gray-700' : ''}
             />
             <CardContent className={`space-y-6 ${isDarkMode ? 'text-white' : ''}`}>
               {/* Success Toast */}
               <div className={`flex items-center p-4 border rounded-lg ${
                 isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-200'
               }`}>
                 <div className="flex-shrink-0">
                   <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                     <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                     </svg>
                   </div>
                 </div>
                 <div className="ml-3 flex-1">
                   <p className={`text-sm font-medium ${isDarkMode ? 'text-green-200' : 'text-green-800'}`}>Success!</p>
                   <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Your message has been published successfully.</p>
                 </div>
                 <button className={`ml-auto transition-colors ${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-400 hover:text-green-600'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Error Toast */}
               <div className={`flex items-center p-4 border rounded-lg ${
                 isDarkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'
               }`}>
                 <div className="flex-shrink-0">
                   <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                     <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                     </svg>
                   </div>
                 </div>
                 <div className="ml-3 flex-1">
                   <p className={`text-sm font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>Error</p>
                   <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>Failed to publish message. Please try again.</p>
                 </div>
                 <button className={`ml-auto transition-colors ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Toast Stack Example */}
               <div className="space-y-2">
                 <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Toast Stack</h4>
                 <div className={`relative h-32 rounded-lg border p-4 ${
                   isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
                 }`}>
                   <div className="absolute top-2 right-2 w-80 space-y-2">
                     <div className={`flex items-center p-3 border rounded-lg shadow-lg ${
                       isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-200'
                     }`}>
                       <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                         <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <div className="ml-2 flex-1">
                         <p className={`text-xs font-medium ${isDarkMode ? 'text-green-200' : 'text-green-800'}`}>Published</p>
                       </div>
                     </div>
                   </div>
                   <div className={`text-center text-sm ${
                     isDarkMode ? 'text-gray-400' : 'text-gray-500'
                   }`}>
                     Toast notifications appear here
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Usage Guidelines */}
           <Card variant="elevated" className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
             <CardHeader 
               title="Usage Guidelines" 
               subtitle="How to implement these components consistently with Vercel/Tailwind/VS Code aesthetics"
               action={<Button variant="outline" size="sm">View Docs</Button>}
               className={isDarkMode ? 'text-white border-gray-700' : ''}
             />
             <CardContent className={`space-y-8 ${isDarkMode ? 'text-white' : ''}`}>
               <div className="prose prose-gray max-w-none">
                 <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Getting Started</h3>
                 <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                   Import components from the UI library: <code className={`px-2 py-1 rounded text-sm font-mono ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>import { '{Input, Button, Card}' } from "@/components/ui"</code>
                 </p>
                 
                 <h3 className={`text-xl font-semibold mt-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Design Principles</h3>
                 <ul className={`list-disc list-inside space-y-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                   <li><strong>Subtle Shadows:</strong> Use <code className={`px-1.5 py-0.5 rounded text-xs ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>shadow-sm</code> and <code className={`px-1.5 py-0.5 rounded text-xs ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>shadow-md</code> for depth</li>
                   <li><strong>Smooth Transitions:</strong> Always include <code className={`px-1.5 py-0.5 rounded text-xs ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>transition-all duration-200</code> for interactions</li>
                   <li><strong>Focus Rings:</strong> Use <code className={`px-1.5 py-0.5 rounded text-xs ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>focus:ring-2 focus:ring-blue-500/20</code> for accessibility</li>
                   <li><strong>Rounded Corners:</strong> Prefer <code className={`px-1.5 py-0.5 rounded text-xs ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>rounded-lg</code> and <code className={`px-1.5 py-0.5 rounded text-xs ${
                     isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'
                   }`}>rounded-xl</code> for modern look</li>
                   <li><strong>Color Consistency:</strong> Follow the established color palette for visual hierarchy</li>
                 </ul>

                 <h3 className={`text-xl font-semibold mt-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Best Practices</h3>
                 <ul className={`list-disc list-inside space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                   <li>Always use the standardized components instead of raw HTML</li>
                   <li>Use the utility functions for consistent spacing and layout</li>
                   <li>Follow the color palette for consistent visual hierarchy</li>
                   <li>Include proper labels and helper text for accessibility</li>
                   <li>Test components across different screen sizes</li>
                   <li>Implement smooth hover and focus states</li>
                 </ul>

                 <h3 className={`text-xl font-semibold mt-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Theme Switching</h3>
                 <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                   The design system supports both light and dark themes. Components automatically adapt based on the current theme context.
                   Use the utility functions and consistent color classes to ensure proper theming across your application.
                 </p>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
