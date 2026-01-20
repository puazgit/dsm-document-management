'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DocumentTree } from './document-tree';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  status: string;
  hierarchyLevel: number;
  sortOrder: number;
  parentDocumentId?: string | null;
  childDocuments?: Document[];
}

interface MoveDocumentDialogProps {
  documentId: string;
  currentTitle: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveDocumentDialog({
  documentId,
  currentTitle,
  open,
  onClose,
  onSuccess,
}: MoveDocumentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [rootDocuments, setRootDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (open) {
      fetchRootDocuments();
    }
  }, [open]);

  const fetchRootDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/tree?includeChildren=true');
      const data = await response.json();
      
      if (response.ok) {
        // Filter out the current document and its descendants
        const filtered = filterDocuments(data.documents, documentId);
        setRootDocuments(filtered);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recursively filter out the document and its children
  const filterDocuments = (docs: Document[], excludeId: string): Document[] => {
    return docs
      .filter((doc) => doc.id !== excludeId)
      .map((doc) => ({
        ...doc,
        childDocuments: doc.childDocuments
          ? filterDocuments(doc.childDocuments, excludeId)
          : undefined,
      }));
  };

  const handleMove = async () => {
    try {
      setSubmitting(true);

      const response = await fetch(`/api/documents/${documentId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newParentId: selectedParentId,
          reason: 'Moved via UI',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document moved successfully',
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to move document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move document',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Document</DialogTitle>
          <DialogDescription>
            Select a new parent document or leave unselected to move to root level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current document info */}
          <div className="p-3 bg-muted rounded-md">
            <Label className="text-sm font-medium">Moving:</Label>
            <p className="text-sm mt-1">{currentTitle}</p>
          </div>

          {/* Parent selection */}
          <div className="space-y-2">
            <Label>New Parent Document</Label>
            
            {/* Root option */}
            <div
              className={`p-2 rounded-md cursor-pointer border ${
                selectedParentId === null
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => setSelectedParentId(null)}
            >
              <span className="text-sm font-medium">📁 Root Level (No Parent)</span>
            </div>

            {/* Document tree */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md p-2 max-h-[300px] overflow-y-auto">
                {rootDocuments.length > 0 ? (
                  <DocumentTree
                    documents={rootDocuments}
                    onSelect={(doc) => setSelectedParentId(doc.id)}
                    selectedId={selectedParentId || undefined}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No available parent documents
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Selected parent info */}
          {selectedParentId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Label className="text-sm font-medium text-blue-900">
                Selected Parent:
              </Label>
              <p className="text-sm mt-1 text-blue-800">
                {rootDocuments.find((d) => d.id === selectedParentId)?.title || 'Unknown'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
