"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Clock, MessageSquare, Upload, X, FileText, Image, Link } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ModerationCase {
  id: number;
  case_id: string;
  action_type: string;
  target_user_id: string;
  target_username: string;
  moderator_user_id: string;
  moderator_username: string;
  reason: string | null;
  duration_ms: number | null;
  duration_label: string | null;
  active: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  evidence_count: number;
}

interface Evidence {
  id: number;
  case_id: string;
  evidence_type: 'text' | 'image' | 'link' | 'file';
  content: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface CaseDetailProps {
  guildId: string;
  caseId: string;
  isPartOfGroup: boolean;
}

export default function CaseDetail({ guildId, caseId, isPartOfGroup }: CaseDetailProps) {
  const [caseData, setCaseData] = useState<ModerationCase | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'text' | 'image' | 'link' | 'file' | 'video'>('text');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Fetch case details
  const fetchCaseDetails = async () => {
    if (!caseId || !guildId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/guilds/${guildId}/moderation/cases/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Raw API response:', data);
        setCaseData(data.case);
        setEvidence(data.evidence || []);
        console.log('📋 Fetched case details:', data);
        console.log('📋 Evidence count:', data.evidence?.length || 0);
        console.log('📋 Evidence array:', data.evidence);
      } else {
        console.error('Failed to fetch case details:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching case details:', error);
    } finally {
      setLoading(false);
    }
  };



  // Upload evidence
  const uploadEvidence = async (type?: string, content?: string) => {
    const evidenceTypeToUse = type || evidenceType;
    const evidenceContentToUse = content || evidenceContent.trim();

    if (!evidenceContentToUse) return;

    try {
      setUploadingEvidence(true);
      const response = await fetch(`/api/guilds/${guildId}/moderation/cases/${caseId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evidence_type: evidenceTypeToUse,
          content: evidenceContentToUse,
          uploaded_by: currentUser?.name || currentUser?.username || currentUser?.id || 'Unknown User',
          uploaded_by_id: currentUser?.id || 'unknown',
        }),
      });

      if (response.ok) {
        const newEvidence = await response.json();
        setEvidenceContent('');
        setShowEvidenceForm(false);
        setUploadSuccess(true);
        
        // Add new evidence to the list
        if (newEvidence.evidence) {
          setEvidence(prev => [...prev, newEvidence.evidence]);
        }
        console.log('✅ Evidence uploaded successfully!');

        // Hide success message after 3 seconds
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        console.error('❌ Failed to upload evidence:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error uploading evidence:', error);
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Fetch current user session
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();
          setCurrentUser(session?.user);
          // Removed console logs that exposed sensitive session data
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    console.log('🔄 CaseDetail useEffect triggered:', { guildId, caseId });
    if (guildId && caseId) {
      fetchCaseDetails();
    }
  }, [guildId, caseId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading case details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Case Not Found</h3>
              <p className="text-muted-foreground">The requested moderation case could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Case Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold">Case #{caseData.case_id}</h1>
                <Badge variant="outline" className={caseData.active ? "text-green-600" : "text-red-600"}>
                  {caseData.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {caseData.action_type} action on {caseData.target_username}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Target User</Label>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{caseData.target_username}</span>
                <Badge variant="outline">{caseData.target_user_id}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Moderator</Label>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>{caseData.moderator_username}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Action</Label>
              <Badge
                variant={
                  caseData.action_type === 'ban' ? 'destructive' :
                  caseData.action_type === 'kick' ? 'secondary' :
                  caseData.action_type === 'mute' ? 'outline' :
                  caseData.action_type === 'timeout' ? 'outline' :
                  'default'
                }
                className="capitalize"
              >
                {caseData.action_type}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(caseData.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {caseData.duration_label && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
              <Badge variant="outline">{caseData.duration_label}</Badge>
            </div>
          )}

          {caseData.expires_at && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Expires</Label>
              <span className="text-sm">{new Date(caseData.expires_at).toLocaleString()}</span>
            </div>
          )}

          {caseData.reason && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
              <p className="text-sm bg-gray-50 p-3 rounded-md">{caseData.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Section - Always Visible */}
      <div className="space-y-6">
                            {/* Evidence Actions - Always visible */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-800 mb-3">📋 Evidence Management</div>
          <div className="flex items-center space-x-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowEvidenceForm(!showEvidenceForm)}
              disabled={!caseId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-1" />
              Add Evidence
            </Button>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            Case ID: {caseId || 'None'} | Evidence Count: {evidence.length}
          </div>
        </div>



      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Evidence ({evidence.length}) {caseId ? `- Case ${caseId}` : ''}</span>
            </CardTitle>
            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
              <div className="text-xs font-medium text-gray-600 mr-2">Actions:</div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                disabled={!caseId}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                <Upload className="h-4 w-4 mr-1" />
                Add Evidence
              </Button>

            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <span className="text-sm font-medium text-green-800">✓ Evidence uploaded successfully!</span>
            </div>
          )}
          {showEvidenceForm && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Add Evidence</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEvidenceForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image URL</option>
                    <option value="link">Link</option>
                    <option value="file">File Description</option>
                    <option value="video">Video URL</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Content</Label>
                  {evidenceType === 'text' ? (
                    <Textarea
                      value={evidenceContent}
                      onChange={(e) => setEvidenceContent(e.target.value)}
                      placeholder="Enter evidence details..."
                      className="mt-1"
                      rows={4}
                    />
                  ) : (
                    <Input
                      value={evidenceContent}
                      onChange={(e) => setEvidenceContent(e.target.value)}
                      placeholder={
                        evidenceType === 'image' ? 'Enter image URL...' :
                        evidenceType === 'link' ? 'Enter link URL...' :
                        evidenceType === 'video' ? 'Enter video URL...' :
                        'Describe the file...'
                      }
                      className="mt-1"
                    />
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEvidenceForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => uploadEvidence()}
                    disabled={uploadingEvidence || !evidenceContent.trim()}
                  >
                    {uploadingEvidence ? 'Adding...' : 'Add Evidence'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {evidence.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">No evidence attached</h3>
              <p className="text-muted-foreground mb-4">
                Attach screenshots, logs, or other evidence to support this case.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    {item.evidence_type === 'image' && <Image className="h-5 w-5 text-muted-foreground" />}
                    {item.evidence_type === 'video' && <span className="text-lg">🎥</span>}
                    {item.evidence_type === 'link' && <Link className="h-5 w-5 text-muted-foreground" />}
                    {item.evidence_type === 'file' && <FileText className="h-5 w-5 text-muted-foreground" />}
                    {item.evidence_type === 'text' && <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.evidence_type}
                        </Badge>
                        <span className="text-xs text-blue-600 font-medium">
                          Added by: {item.uploaded_by}
                          {item.uploaded_by_id && ` (${item.uploaded_by_id})`}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.uploaded_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2">
                      {item.evidence_type === 'image' && item.content.startsWith('http') ? (
                        <img
                          src={item.content}
                          alt="Evidence"
                          className="max-w-full h-auto rounded border"
                          style={{ maxHeight: '200px' }}
                        />
                      ) : item.evidence_type === 'video' && item.content.startsWith('http') ? (
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          📹 Video: {item.content}
                        </a>
                      ) : item.evidence_type === 'link' && item.content.startsWith('http') ? (
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          🔗 {item.content}
                        </a>
                      ) : (
                        <p className="text-sm break-words">{item.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
