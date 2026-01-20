'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '../ui/command';
import { FolderTree } from 'lucide-react';
import { Spinner } from '../ui/loading';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from '../../hooks/use-toast';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
// ParentDocumentSelector removed for cleanup

// Types
interface DocumentType {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

interface Group {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

interface DocumentUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (document: any) => void;
  documentTypes: DocumentType[];
}

interface UploadFormData {
  title: string;
  description: string;
  documentTypeId: string;
  tags: string;
  parentDocumentId: string | null;
}

interface ValidationErrors {
  file?: string;
  title?: string;
  documentTypeId?: string;
}

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Archives
  'application/zip': ['.zip'],
  'application/json': ['.json'],
};

export function DocumentUploadV2({ open, onClose, onSuccess, documentTypes }: DocumentUploadProps) {
  // State management
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    documentTypeId: '',
    tags: '',
    parentDocumentId: null,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  // Parent document combobox state
  const [parentDocs, setParentDocs] = useState<any[]>([]);
  const [parentResults, setParentResults] = useState<any[]>([]);
  const [parentQuery, setParentQuery] = useState('');
  const [parentLoading, setParentLoading] = useState(false);
  const parentDebounce = useRef<NodeJS.Timeout | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const parentContainerRef = useRef<HTMLDivElement | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  // Flatten a document tree into a flat list for client-side search
  const flattenDocuments = (docs: any[], depth = 0): any[] => {
    const out: any[] = [];
    for (const d of docs) {
      out.push({
        id: String(d.id),
        title: d.title || d.name || d.displayName || d.subject || '',
        depth,
        raw: d,
      });
      if (Array.isArray(d.children) && d.children.length > 0) {
        out.push(...flattenDocuments(d.children, depth + 1));
      }
    }
    return out;
  };

  // Fetch groups when dialog opens
  useEffect(() => {
    if (open) {
      fetchGroups();
      // Reset form when dialog opens
      if (uploadStatus === 'success') {
        resetForm();
      }
    }
  }, [open]);

  // Fetch parent documents tree on mount/open
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const fetchTree = async () => {
      try {
        setParentLoading(true);
        const res = await fetch('/api/documents/tree?includeChildren=true');
        if (!res.ok) return;
        const data = await res.json();
        const flattened = flattenDocuments(data.documents || []);
        if (mounted) {
          setParentDocs(flattened);
          setParentResults(flattened);
        }
      } catch (e) {
        console.error('Failed to fetch parent docs', e);
      } finally {
        setParentLoading(false);
      }
    };
    fetchTree();
    return () => { mounted = false; if (parentDebounce.current) clearTimeout(parentDebounce.current); };
  }, [open]);

  // Debounced/conditional parent search (client filter for short queries, server search for >=3 chars)
  useEffect(() => {
    if (parentDebounce.current) {
      clearTimeout(parentDebounce.current);
    }

    const q = parentQuery?.trim();
    if (!q) {
      setParentResults(parentDocs);
      return;
    }

    // For very short queries (< 3 chars), use simple client filter
    // For 3+ char queries, always use server search for better accuracy
    if (q.length < 3) {
      const qq = q.toLowerCase();
      const filtered = parentDocs.filter(d => (d.title || '').toLowerCase().includes(qq) || d.id.includes(qq));
      setParentResults(filtered);
      return;
    }

    setParentLoading(true);
    parentDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setParentResults([]);
          return;
        }
        const body = await res.json();
        const docs = (body.documents || []).map((dd: any) => ({ id: String(dd.id), title: dd.title || dd.name || '', raw: dd }));
        setParentResults(docs);
      } catch (err) {
        console.error('Parent server search failed', err, { q });
        setParentResults([]);
      } finally {
        setParentLoading(false);
      }
    }, 400);

    return () => { if (parentDebounce.current) clearTimeout(parentDebounce.current); };
  }, [parentQuery, parentDocs]);

  // Reset highlight when results change
  useEffect(() => {
    if (parentResults.length > 0) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  }, [parentResults]);

  // Click-away to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!parentContainerRef.current) return;
      if (!parentOpen) return;
      if (e.target instanceof Node && !parentContainerRef.current.contains(e.target)) {
        setParentOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [parentOpen]);

  // Fetch available groups
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch('/api/groups');
      
      if (response.ok) {
        const data = await response.json();
        const groupsList = data.groups || data || [];
        setGroups(groupsList);
      } else {
        console.warn('Failed to fetch groups:', response.status);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!selectedFile) {
      newErrors.file = 'Please select a file to upload';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.documentTypeId) {
      newErrors.documentTypeId = 'Please select a document type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setErrors(prev => ({ ...prev, file: 'File is too large. Maximum size is 50MB' }));
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setErrors(prev => ({ ...prev, file: 'File type is not supported' }));
      } else {
        setErrors(prev => ({ ...prev, file: 'File was rejected' }));
      }
      return;
    }

    // Handle accepted file
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        setErrors(prev => ({ ...prev, file: undefined }));
        
        // Auto-fill title from filename if empty
        if (!formData.title) {
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          setFormData(prev => ({ ...prev, title: fileName }));
        }
      }
    }
  }, [formData.title]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      // Prepare form data
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile!);
      uploadFormData.append('title', formData.title.trim());
      uploadFormData.append('description', formData.description.trim());
      uploadFormData.append('documentTypeId', formData.documentTypeId);
      uploadFormData.append('accessGroups', JSON.stringify(selectedGroups));
      if (formData.parentDocumentId) {
        uploadFormData.append('parentDocumentId', formData.parentDocumentId);
      }
      
      // Parse and clean tags
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      uploadFormData.append('tags', JSON.stringify(tags));
      uploadFormData.append('metadata', JSON.stringify({}));

      // Upload using XMLHttpRequest for progress tracking
      await uploadFile(uploadFormData);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      setUploading(false);
    }
  };

  // Upload file with progress tracking
  const uploadFile = (uploadFormData: FormData): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Upload complete
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            setUploadStatus('success');
            
            toast({
              title: 'Upload Successful',
              description: `Document "${formData.title}" has been uploaded successfully`,
            });

            // Call success callback with delay to show success message
            setTimeout(() => {
              onSuccess(response.document);
              handleClose();
            }, 1000);
            
            resolve();
          } catch (error) {
            reject(new Error('Invalid server response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || error.details || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
        setUploading(false);
      });

      // Network error
      xhr.addEventListener('error', () => {
        setUploadStatus('error');
        setUploading(false);
        reject(new Error('Network error occurred during upload'));
      });

      // Upload aborted
      xhr.addEventListener('abort', () => {
        setUploadStatus('error');
        setUploading(false);
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', '/api/documents/upload');
      xhr.send(uploadFormData);
    });
  };

  // Toggle group selection
  const toggleGroupSelection = (groupName: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  // Remove selected group
  const removeGroup = (groupName: string) => {
    setSelectedGroups(prev => prev.filter(g => g !== groupName));
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setErrors(prev => ({ ...prev, file: undefined }));
  };

  // Select a parent document from results
  const selectParent = (doc: any) => {
    setFormData(prev => ({ ...prev, parentDocumentId: String(doc.id) }));
    setParentQuery(doc.title || String(doc.id));
    setParentResults([doc]);
    setParentOpen(false);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      documentTypeId: '',
      tags: '',
      parentDocumentId: null,
    });
    setSelectedFile(null);
    setSelectedGroups([]);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrors({});
    setParentQuery('');
    setParentResults([]);
    setParentOpen(false);
  };

  // Handle dialog close
  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Get file icon color based on type
  const getFileTypeColor = (type: string): string => {
    if (type.includes('pdf')) return 'text-red-600';
    if (type.includes('word') || type.includes('document')) return 'text-blue-600';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'text-green-600';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'text-orange-600';
    if (type.includes('image')) return 'text-purple-600';
    return 'text-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a file and fill in the document details below
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-1">
        <form id="upload-form" onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>File *</Label>
            
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800'
                } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <div className="mb-2 text-base font-medium">
                  {isDragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
                </div>
                <div className="text-sm text-muted-foreground">
                  PDF, Word, Excel, PowerPoint, Images, Text files
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Maximum file size: 50MB
                </div>
              </div>
            ) : (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-start gap-3">
                  <FileText className={`w-10 h-10 flex-shrink-0 ${getFileTypeColor(selectedFile.type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)} • {(selectedFile.type.split('/')[1] || 'file').toUpperCase()}
                        </div>
                      </div>
                      {!uploading && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="w-8 h-8 p-0 hover:bg-red-100"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {errors.file && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">{errors.file}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Upload Progress */}
          {uploadStatus === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                Document uploaded successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title * {errors.title && <span className="ml-1 text-xs text-red-500">({errors.title})</span>}
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  setErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="Enter document title"
                disabled={uploading}
                className={errors.title ? 'border-red-500' : ''}
              />
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="documentType">
                Document Type * {errors.documentTypeId && <span className="ml-1 text-xs text-red-500">({errors.documentTypeId})</span>}
              </Label>
              <Select
                value={formData.documentTypeId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, documentTypeId: value }));
                  setErrors(prev => ({ ...prev, documentTypeId: undefined }));
                }}
                disabled={uploading}
              >
                <SelectTrigger className={errors.documentTypeId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        {type.icon && <span>{type.icon}</span>}
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter document description (optional)"
                rows={3}
                disabled={uploading}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentDocumentId">Parent Document (Optional)</Label>
              <div ref={parentContainerRef} className="relative">
                <Command>
                  <CommandInput
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-expanded={parentOpen}
                    aria-controls="parent-results-list"
                    aria-activedescendant={
                      parentOpen && highlightIndex >= 0 && parentResults[highlightIndex]
                        ? `parent-results-option-${parentResults[highlightIndex].id}`
                        : undefined
                    }
                    value={parentQuery}
                    onValueChange={(v) => { setParentQuery(v); setParentOpen(true); }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (!parentOpen) return;
                      const len = parentResults.length;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightIndex(prev => (prev + 1 + len) % len);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightIndex(prev => (prev - 1 + len) % len);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (highlightIndex >= 0 && highlightIndex < parentResults.length) {
                          selectParent(parentResults[highlightIndex]);
                        }
                      } else if (e.key === 'Escape') {
                        setParentOpen(false);
                      }
                    }}
                    placeholder="Search parent document by title or ID"
                    className="w-full"
                    aria-label="Parent document"
                  />
                  {parentResults.length === 0 && (
                    <CommandList>
                      <CommandEmpty>No parent documents found.</CommandEmpty>
                    </CommandList>
                  )}
                </Command>
                {parentResults.length > 0 && parentOpen && (
                  <div className="absolute z-20 w-full mt-1 border rounded-md shadow-sm top-full bg-popover">
                    <div id="parent-results-list" role="listbox" className="overflow-y-auto max-h-60">
                      {parentResults.map((doc, idx) => (
                        <div key={doc.id} className="px-0">
                          <button
                            id={`parent-results-option-${doc.id}`}
                            role="option"
                            aria-selected={highlightIndex === idx}
                            type="button"
                            onClick={() => selectParent(doc)}
                            className={`w-full text-left px-3 py-2 hover:bg-accent/10 flex flex-col ${highlightIndex === idx ? 'bg-accent/20' : ''}`}
                          >
                            <span className="text-sm font-medium truncate">{doc.title || doc.id}</span>
                            <span className="text-xs text-muted-foreground">{doc.id}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parentLoading && (
                  <div className="absolute right-2 top-2">
                    <Spinner className="w-4 h-4" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Select parent document or leave empty to upload at root level.</p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Example: contract, legal, 2024
              </p>
            </div>

            {/* Access Groups */}
            <div className="space-y-2">
              <Label>Access Groups</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Select groups that can access this document. Leave empty for default access.
              </p>

              {/* Selected Groups */}
              {selectedGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedGroups.map(groupName => {
                    const group = groups.find(g => g.name === groupName);
                    return (
                      <Badge key={groupName} variant="secondary" className="flex items-center gap-1.5">
                        {group?.displayName || groupName}
                        <button
                          type="button"
                          onClick={() => removeGroup(groupName)}
                          disabled={uploading}
                          className="hover:bg-gray-400 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Groups List */}
              <div className="p-3 overflow-y-auto border rounded-lg max-h-48">
                {loadingGroups ? (
                  <div className="py-4 text-sm text-center text-muted-foreground">
                    Loading groups...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-4 text-sm text-center text-muted-foreground">
                    No groups available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map(group => (
                      <label
                        key={group.id}
                        className="flex items-start gap-3 p-2 transition-colors rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.name)}
                          onChange={() => toggleGroupSelection(group.name)}
                          disabled={uploading}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{group.displayName}</div>
                          {group.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {group.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="upload-form"
            disabled={uploading || !selectedFile || uploadStatus === 'success'}
          >
            {uploading ? (
              <>Uploading... {uploadProgress}%</>
            ) : uploadStatus === 'success' ? (
              'Uploaded'
            ) : (
              'Upload Document'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
