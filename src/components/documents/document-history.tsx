'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
// import { ScrollArea } from '../ui/scroll-area';
// import { Separator } from '../ui/separator';
import { 
  History, 
  FileText, 
  Edit, 
  Check, 
  X, 
  Archive, 
  Upload, 
  Eye,
  Clock,
  User,
  ChevronRight,
  Activity,
  ExternalLink,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface DocumentHistoryEntry {
  id: string;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  statusFrom?: string;
  statusTo?: string;
  changeReason?: string;
  metadata?: {
    oldFile?: {
      fileName: string;
      filePath: string;
      version: string;
    };
    newFile?: {
      fileName: string;
      filePath: string;
      version: string;
    };
    [key: string]: any;
  };
  createdAt: string;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface DocumentHistoryProps {
  documentId: string;
  documentTitle: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function DocumentHistory({ documentId, documentTitle, isOpen: externalIsOpen, onClose }: DocumentHistoryProps) {
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external isOpen if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleOpenChange = (open: boolean) => {
    if (externalIsOpen !== undefined && onClose) {
      // External control
      if (!open) {
        onClose();
      }
    } else {
      // Internal control
      setInternalIsOpen(open);
    }
  };

  // Render file link for version access
  const renderFileLink = (fileInfo: { fileName: string; filePath: string; version: string }, label: string) => {
    return (
      <div className="inline-flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border">
        <FileText className="h-4 w-4 text-blue-600" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-blue-800">{label}</span>
          <Link 
            href={`/api/documents/${documentId}/version/${fileInfo.version}`}
            target="_blank"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span className="truncate max-w-[200px]">{fileInfo.fileName}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </Link>
        </div>
      </div>
    );
  };

  const fetchHistory = async () => {
    if (!isOpen) return; // Only fetch when dialog is opened
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch document history');
      }
      
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isOpen, documentId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4" />;
      case 'updated':
        return <Edit className="h-4 w-4" />;
      case 'published':
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      case 'archived':
        return <Archive className="h-4 w-4" />;
      case 'file_uploaded':
      case 'file_replaced':
        return <Upload className="h-4 w-4" />;
      case 'status_changed':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'published':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'updated':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'file_uploaded':
      case 'file_replaced':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'status_changed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  };

  const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return null;
    
    const statusColors: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'PENDING_REVIEW': 'bg-yellow-100 text-yellow-800',
      'PENDING_APPROVAL': 'bg-orange-100 text-orange-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'PUBLISHED': 'bg-blue-100 text-blue-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'ARCHIVED': 'bg-gray-100 text-gray-600',
    };

    return (
      <Badge className={`text-xs ${statusColors[status] || statusColors['DRAFT']}`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {externalIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Document History: {documentTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading history...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Failed to load document history</div>
              <div className="text-sm text-gray-500">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchHistory}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <div className="text-gray-600">No history available</div>
              <div className="text-sm text-gray-500">Document activities will appear here</div>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="max-h-[500px] overflow-y-auto pr-4">
              <div className="space-y-4">
                {history.map((entry, index) => {
                  const { date, time } = formatTimestamp(entry.createdAt);
                  
                  return (
                    <div key={entry.id} className="relative">
                      {/* Timeline line */}
                      {index < history.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                      )}
                      
                      <Card className="ml-0">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${getActionColor(entry.action)}`}>
                              {getActionIcon(entry.action)}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900">
                                  {entry.changeReason || `Document ${entry.action}`}
                                </h4>
                                {entry.statusFrom && entry.statusTo && (
                                  <div className="flex items-center gap-2">
                                    <StatusBadge status={entry.statusFrom} />
                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                    <StatusBadge status={entry.statusTo} />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {`${entry.changedBy.firstName} ${entry.changedBy.lastName}`}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {date} at {time}
                                </div>
                              </div>
                              
                              {entry.changeReason && (
                                <div className="text-sm text-gray-700 italic">
                                  "{entry.changeReason}"
                                </div>
                              )}
                              
                              {/* File Links for file_replaced actions */}
                              {entry.action === 'file_replaced' && entry.metadata?.oldFile && entry.metadata?.newFile && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="space-y-3">
                                    <div className="text-sm font-medium text-gray-700">Document Files:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {renderFileLink(entry.metadata.oldFile, "Previous Version")}
                                      {renderFileLink(entry.metadata.newFile, "Current Version")}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Additional details for other actions */}
                              {entry.action !== 'file_replaced' && (entry.oldValue || entry.newValue) && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    {entry.oldValue && (
                                      <div>
                                        <div className="font-medium text-gray-700 mb-1">Before:</div>
                                        <div className="bg-red-50 p-2 rounded text-red-800 font-mono text-xs">
                                          {typeof entry.oldValue === 'string'
                                            ? entry.oldValue
                                            : JSON.stringify(entry.oldValue, null, 2)}
                                        </div>
                                      </div>
                                    )}
                                    {entry.newValue && (
                                      <div>
                                        <div className="font-medium text-gray-700 mb-1">After:</div>
                                        <div className="bg-green-50 p-2 rounded text-green-800 font-mono text-xs">
                                          {typeof entry.newValue === 'string'
                                            ? entry.newValue
                                            : JSON.stringify(entry.newValue, null, 2)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}