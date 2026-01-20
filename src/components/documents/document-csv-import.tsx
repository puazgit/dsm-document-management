'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  Info
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  row: number;
  id?: string;
  title: string;
  error?: string;
}

interface ImportResponse {
  message: string;
  total: number;
  success: number;
  failed: number;
  results: ImportResult[];
}

interface DocumentCSVImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentCSVImport({ open, onClose, onSuccess }: DocumentCSVImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [showResults, setShowResults] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
        setSelectedFile(file);
        setImportResult(null);
        setShowResults(false);
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: importing
  });

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/documents/import-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result: ImportResponse = await response.json();
      setImportResult(result);
      setShowResults(true);

      if (result.success > 0) {
        toast({
          title: 'Import Completed',
          description: `Successfully imported ${result.success} of ${result.total} documents`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Import Failed',
          description: 'No documents were imported. Check the results for details.',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `title,description,documentTypeId,accessGroups,tags,metadata_department,metadata_documentNumber,metadata_priority,expiresAt
"Example Document 1","This is a sample document","PASTE_DOCUMENT_TYPE_ID_HERE","administrator,keuangan","Finance,SOP,2024","Finance","DOC-001-2024","high","2025-12-31T23:59:59Z"
"Example Document 2","Another sample","PASTE_DOCUMENT_TYPE_ID_HERE","administrator","IT,Security","IT","DOC-002-2024","medium",""`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documents-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'Edit the CSV file and import it when ready',
    });
  };

  const handleClose = () => {
    if (!importing) {
      setSelectedFile(null);
      setImportResult(null);
      setShowResults(false);
      setImportProgress(0);
      onClose();
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    setShowResults(false);
    setImportProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Documents from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple documents at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Upload CSV to create document metadata. Files can be uploaded later via Edit Document.
              <Button
                variant="link"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-auto p-0 ml-2"
              >
                Download Template
              </Button>
            </AlertDescription>
          </Alert>

          {!showResults ? (
            <>
              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                } ${importing ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input {...getInputProps()} />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                      <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    {!importing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        Remove File
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-muted">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isDragActive ? 'Drop the CSV file here' : 'Drag & drop CSV file here'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                    <Badge variant="outline">CSV files only</Badge>
                  </div>
                )}
              </div>

              {/* Import Progress */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Importing documents...</span>
                    <span className="font-medium">{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              {/* CSV Format Info */}
              <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Required CSV Columns:</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>• <code className="px-1 py-0.5 rounded bg-background">title</code> - Document title (required)</li>
                  <li>• <code className="px-1 py-0.5 rounded bg-background">documentTypeId</code> - Document type ID (required)</li>
                  <li>• <code className="px-1 py-0.5 rounded bg-background">description</code> - Document description (optional)</li>
                  <li>• <code className="px-1 py-0.5 rounded bg-background">accessGroups</code> - Comma-separated group names (optional)</li>
                  <li>• <code className="px-1 py-0.5 rounded bg-background">tags</code> - Comma-separated tags (optional)</li>
                  <li>• <code className="px-1 py-0.5 rounded bg-background">metadata_*</code> - Custom metadata fields (optional)</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Import Results */}
              {importResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold">{importResult.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="p-4 border rounded-lg text-center bg-green-50 dark:bg-green-900/20">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {importResult.success}
                      </div>
                      <div className="text-sm text-muted-foreground">Success</div>
                    </div>
                    <div className="p-4 border rounded-lg text-center bg-red-50 dark:bg-red-900/20">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {importResult.failed}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Import Details:</p>
                    <ScrollArea className="h-[300px] border rounded-lg">
                      <div className="p-4 space-y-2">
                        {importResult.results.map((result, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              result.success
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900'
                                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{result.title}</p>
                                <p className="text-xs text-muted-foreground">Row {result.row}</p>
                                {result.error && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {result.error}
                                  </p>
                                )}
                                {result.id && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ID: {result.id}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {importResult.success > 0 && (
                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        {importResult.success} document(s) created successfully. Files can now be uploaded via Edit Document menu.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {showResults && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={importing}
              >
                Import Another
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={importing}
            >
              {showResults ? 'Close' : 'Cancel'}
            </Button>
            {!showResults && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importing}
              >
                {importing ? 'Importing...' : 'Import Documents'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
