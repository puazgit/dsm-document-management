'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from '../../hooks/use-toast';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

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
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

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

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      documentTypeId: '',
      tags: '',
    });
    setSelectedFile(null);
    setSelectedGroups([]);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrors({});
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a file and fill in the document details below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="text-base font-medium mb-2">
                  {isDragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
                </div>
                <div className="text-sm text-muted-foreground">
                  PDF, Word, Excel, PowerPoint, Images, Text files
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Maximum file size: 50MB
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <FileText className={`w-10 h-10 flex-shrink-0 ${getFileTypeColor(selectedFile.type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{selectedFile.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(selectedFile.size)} • {(selectedFile.type.split('/')[1] || 'file').toUpperCase()}
                        </div>
                      </div>
                      {!uploading && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="h-8 w-8 p-0 hover:bg-red-100"
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
                <AlertCircle className="h-4 w-4" />
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
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
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
                Title * {errors.title && <span className="text-red-500 text-xs ml-1">({errors.title})</span>}
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
                Document Type * {errors.documentTypeId && <span className="text-red-500 text-xs ml-1">({errors.documentTypeId})</span>}
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
              <p className="text-xs text-muted-foreground mb-2">
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
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                {loadingGroups ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Loading groups...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No groups available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map(group => (
                      <label
                        key={group.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
