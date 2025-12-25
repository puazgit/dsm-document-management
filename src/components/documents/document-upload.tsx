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
import { X } from 'lucide-react';

interface DocumentUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (document: any) => void;
  documentTypes: any[];
}

interface Group {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
}

export function DocumentUpload({ open, onClose, onSuccess, documentTypes }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    documentTypeId: '',
    isPublic: false,
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch groups when dialog opens
  useEffect(() => {
    if (open) {
      fetchGroups();
    }
  }, [open]);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      console.log('📥 Fetching groups...');
      const response = await fetch('/api/groups');
      console.log('📥 Groups response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Groups data:', data);
        const groupsList = data.groups || data || [];
        setGroups(groupsList);
        console.log('✅ Groups loaded:', groupsList.length);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch groups:', response.status, errorData);
        toast({
          title: 'Warning',
          description: 'Could not load groups. You can still upload without group restrictions.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      toast({
        title: 'Warning',
        description: 'Could not load groups. You can still upload without group restrictions.',
        variant: 'default',
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const toggleGroupSelection = (groupName: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupName)) {
        return prev.filter(g => g !== groupName);
      } else {
        return [...prev, groupName];
      }
    });
  };

  const removeGroup = (groupName: string) => {
    setSelectedGroups(prev => prev.filter(g => g !== groupName));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        if (!formData.title) {
          const fileName = file.name.split('.')[0] || 'Untitled Document';
          setFormData(prev => ({ ...prev, title: fileName }));
        }
      }
    }
  }, [formData.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/zip': ['.zip'],
      'application/json': ['.json'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.documentTypeId) {
      toast({
        title: 'Error',
        description: 'Please select a document type',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('documentTypeId', formData.documentTypeId);
      uploadFormData.append('isPublic', formData.isPublic.toString());
      uploadFormData.append('accessGroups', JSON.stringify(selectedGroups));
      uploadFormData.append('tags', JSON.stringify(formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)));

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          onSuccess(response.document);
          resetForm();
        } else {
          const error = JSON.parse(xhr.responseText);
          toast({
            title: 'Upload Failed',
            description: error.error || 'Failed to upload document',
            variant: 'destructive',
          });
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        toast({
          title: 'Upload Failed',
          description: 'Network error occurred during upload',
          variant: 'destructive',
        });
        setUploading(false);
      });

      xhr.open('POST', '/api/documents/upload');
      xhr.send(uploadFormData);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      documentTypeId: '',
      isPublic: false,
      tags: '',
    });
    setSelectedFile(null);
    setSelectedGroups([]);
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">Upload Document</DialogTitle>
          <DialogDescription className="text-sm">
            Upload file, fill details, and select access groups
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Drop Zone - Compact */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-3 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center min-w-0 gap-2">
                  <svg className="flex-shrink-0 w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                    <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                  </div>
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs">{selectedFile.type.split('/')[1]}</Badge>
              </div>
            ) : (
              <div className="py-2">
                <div className="mb-1 text-sm">
                  {isDragActive ? 'Drop file here' : '📁 Click or drag file here'}
                </div>
                <div className="text-xs text-muted-foreground">
                  PDF, DOC, XLS, PPT, Images (Max 50MB)
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}

          {/* Form Fields - Two Column Layout */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="title" className="text-sm">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Document title"
                required
                disabled={uploading}
                className="h-9"
              />
            </div>

            <div className="col-span-1">
              <Label htmlFor="documentType" className="text-sm">Document Type *</Label>
              <Select
                value={formData.documentTypeId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, documentTypeId: value }))}
                disabled={uploading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        {type.icon && <span className="text-sm">{type.icon}</span>}
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Document description"
                rows={2}
                disabled={uploading}
                className="resize-none"
              />
            </div>

            <div className="col-span-1">
              <Label htmlFor="tags" className="text-sm">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                disabled={uploading}
                className="h-9"
              />
            </div>

            <div className="flex items-end col-span-1">
              <label className="flex items-center space-x-2 h-9">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  disabled={uploading}
                  className="border-gray-300 rounded"
                />
                <Label htmlFor="isPublic" className="text-sm cursor-pointer">
                  Public document
                </Label>
              </label>
            </div>
          </div>

          {/* Access Groups Multi-Select */}
          <div className="space-y-2">
            <Label htmlFor="accessGroups" className="text-sm">Access Groups</Label>
            <p className="text-xs text-muted-foreground">
              Select groups that can access this document. If none selected, document follows default access rules.
            </p>
            
            {/* Selected Groups Display */}
            {selectedGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                  {selectedGroups.map(groupName => {
                    const group = groups.find(g => g.name === groupName);
                    return (
                      <Badge key={groupName} variant="secondary" className="flex items-center gap-1">
                        {group?.displayName || groupName}
                        <button
                          type="button"
                          onClick={() => removeGroup(groupName)}
                          disabled={uploading}
                          className="ml-1 rounded-full hover:bg-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Groups Selection - Compact Grid */}
              <div className="p-2 overflow-y-auto border rounded-md max-h-40">
                {loadingGroups ? (
                  <div className="py-2 text-xs text-muted-foreground">Loading groups...</div>
                ) : groups.length === 0 ? (
                  <div className="py-2 text-xs text-muted-foreground">No groups available</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {groups.map(group => (
                      <label
                        key={group.id}
                        className="flex items-start space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.name)}
                          onChange={() => toggleGroupSelection(group.name)}
                          disabled={uploading}
                          className="mt-0.5 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{group.displayName}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

          {/* Actions - Compact */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              className="h-9"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}