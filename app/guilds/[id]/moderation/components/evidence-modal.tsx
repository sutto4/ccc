"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileText, Image, Link, Video, X, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onEvidenceAdded: () => void;
}

export default function EvidenceModal({ isOpen, onClose, caseId, onEvidenceAdded }: EvidenceModalProps) {
  const [evidenceType, setEvidenceType] = useState<'text' | 'image' | 'link' | 'file' | 'video'>('text');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getEvidenceTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return '📄 Text';
      case 'image': return '🖼️ Image';
      case 'link': return '🔗 Link';
      case 'file': return '📁 File';
      case 'video': return '🎥 Video';
      default: return '📄 Text';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!evidenceContent.trim()) {
      toast({
        title: "Error",
        description: "Please provide evidence content",
        variant: "destructive"
      });
      return;
    }

    setUploadingEvidence(true);
    
    try {
      // Simulate API call - replace with actual evidence upload endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Evidence added successfully",
      });
      
      setEvidenceContent('');
      setEvidenceType('text');
      onEvidenceAdded();
      onClose();
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast({
        title: "Error",
        description: "Failed to upload evidence",
        variant: "destructive"
      });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleClose = () => {
    setEvidenceContent('');
    setEvidenceType('text');
    onClose();
  };

  const getPlaceholder = () => {
    switch (evidenceType) {
      case 'text':
        return 'Enter evidence text...';
      case 'image':
        return 'Paste image URL or upload file...';
      case 'link':
        return 'Enter link URL...';
      case 'file':
        return 'Upload file or paste file URL...';
      case 'video':
        return 'Paste video URL...';
      default:
        return 'Enter evidence...';
    }
  };

  const getIcon = () => {
    switch (evidenceType) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'link':
        return <Link className="h-4 w-4" />;
      case 'file':
        return <Upload className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            Add Evidence
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evidence-type">Evidence Type</Label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
              >
                <span>{getEvidenceTypeLabel(evidenceType)}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceType('text');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    📄 Text
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceType('image');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    🖼️ Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceType('link');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    🔗 Link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceType('file');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    📁 File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceType('video');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  >
                    🎥 Video
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-content">Evidence Content</Label>
            {evidenceType === 'text' ? (
              <Textarea
                id="evidence-content"
                placeholder={getPlaceholder()}
                value={evidenceContent}
                onChange={(e) => setEvidenceContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
            ) : (
              <Input
                id="evidence-content"
                placeholder={getPlaceholder()}
                value={evidenceContent}
                onChange={(e) => setEvidenceContent(e.target.value)}
              />
            )}
          </div>

          {evidenceType === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="file-upload">Or Upload File</Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Handle file upload logic here
                    console.log('File selected:', file);
                  }
                }}
                className="cursor-pointer"
              />
            </div>
          )}

          {evidenceType === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Handle file upload logic here
                    console.log('File selected:', file);
                  }
                }}
                className="cursor-pointer"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploadingEvidence}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploadingEvidence || !evidenceContent.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadingEvidence ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Evidence
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
