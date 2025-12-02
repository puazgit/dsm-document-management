'use client';

import { useState, useCallback } from 'react';
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

interface DocumentUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (document: any) => void;
  documentTypes: any[];
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document to the system. Choose a file and fill in the details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Drop Zone */}
          <div className="space-y-2">
            <Label>File</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm font-medium">{selectedFile.name}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                  <Badge variant="outline">{selectedFile.type}</Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm">
                    {isDragActive ? 'Drop the file here' : 'Click to upload or drag and drop'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, Images, ZIP (Max 50MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Document title"
                required
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
              <Select
                value={formData.documentTypeId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, documentTypeId: value }))}
                disabled={uploading}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Document description"
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                disabled={uploading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                disabled={uploading}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isPublic" className="text-sm">
                Make this document public (visible to all users)
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
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
              disabled={uploading || !selectedFile}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}