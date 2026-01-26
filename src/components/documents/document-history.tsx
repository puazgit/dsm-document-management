'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
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
  Download,
  MessageSquare
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

  const renderFileLink = (fileInfo: { fileName: string; filePath: string; version: string }, label: string) => {
    return (
      <Link 
        href={`/api/documents/${documentId}/version/${fileInfo.version}`}
        target="_blank"
        className="flex items-center gap-2 bg-blue-50 px-2 py-1.5 rounded border hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30"
      >
        <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 dark:text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
          <div className="text-xs font-medium text-blue-700 truncate dark:text-blue-400">{fileInfo.fileName}</div>
        </div>
        <ExternalLink className="flex-shrink-0 w-3 h-3 text-blue-500 dark:text-blue-400" />
      </Link>
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
        return <FileText className="w-4 h-4" />;
      case 'updated':
        return <Edit className="w-4 h-4" />;
      case 'published':
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      case 'archived':
        return <Archive className="w-4 h-4" />;
      case 'file_uploaded':
      case 'file_replaced':
        return <Upload className="w-4 h-4" />;
      case 'status_changed':
        return <Activity className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      case 'updated':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
      case 'file_uploaded':
      case 'file_replaced':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
      case 'status_changed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
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
      'DRAFT': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'IN_REVIEW': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'PENDING_APPROVAL': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'APPROVED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'PUBLISHED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'REJECTED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'ARCHIVED': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4" />
            History: {documentTitle}
          </DialogTitle>
          <DialogDescription>
            View all changes and activities for this document
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-b-2 border-gray-900 rounded-full animate-spin"></div>
              <span className="ml-2">Loading history...</span>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <div className="mb-2 text-red-600 dark:text-red-400">Failed to load document history</div>
              <div className="text-sm text-muted-foreground">{error}</div>
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
            <div className="py-8 text-center">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
              <div className="text-muted-foreground">No history available</div>
              <div className="text-sm text-muted-foreground">Document activities will appear here</div>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="max-h-[520px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {history.map((entry, index) => {
                  const { date, time } = formatTimestamp(entry.createdAt);
                  
                  return (
                    <div key={entry.id} className="relative">
                      {index < history.length - 1 && (
                        <div className="absolute left-4 top-10 w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
                      )}
                      
                      <div className="flex items-start gap-3 p-3 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${getActionColor(entry.action)} flex-shrink-0`}>
                          {getActionIcon(entry.action)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {entry.changeReason || `Document ${entry.action}`}
                              </span>
                              {entry.statusFrom && entry.statusTo && (
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={entry.statusFrom} />
                                  <ChevronRight className="w-3 h-3 text-gray-400" />
                                  <StatusBadge status={entry.statusTo} />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {`${entry.changedBy.firstName} ${entry.changedBy.lastName}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {date} at {time}
                            </span>
                          </div>
                          
                          {entry.changeReason && entry.action !== 'file_replaced' && (
                            <div className="flex items-start gap-2 p-2 mt-2 border border-blue-100 rounded-md bg-blue-50">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-blue-900">Penjelasan: </span>
                                <span className="text-xs leading-relaxed text-blue-800">
                                  {entry.changeReason}
                                </span>
                              </div>
                            </div>
                          )}
                              
                              {entry.action === 'file_replaced' && entry.metadata?.oldFile && entry.metadata?.newFile && (
                                <div className="pt-2 mt-2 space-y-2 border-t">
                                  <div className="grid grid-cols-2 gap-2">
                                    {renderFileLink(entry.metadata.oldFile, "Previous")}
                                    {renderFileLink(entry.metadata.newFile, "Current")}
                                  </div>
                                </div>
                              )}
                              
                              {entry.action !== 'file_replaced' && (entry.oldValue || entry.newValue) && (
                                <div className="pt-2 mt-2 border-t">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {entry.oldValue && (
                                      <div>
                                        <div className="text-gray-600 mb-0.5">Before:</div>
                                        <div className="bg-red-50 p-1.5 rounded text-red-800 font-mono">
                                          {typeof entry.oldValue === 'string'
                                            ? entry.oldValue
                                            : JSON.stringify(entry.oldValue, null, 2)}
                                        </div>
                                      </div>
                                    )}
                                    {entry.newValue && (
                                      <div>
                                        <div className="text-gray-600 mb-0.5">After:</div>
                                        <div className="bg-green-50 p-1.5 rounded text-green-800 font-mono">
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