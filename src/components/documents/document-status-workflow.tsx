'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Upload, File } from 'lucide-react'
import { 
  DocumentStatus, 
  WORKFLOW_DESCRIPTIONS 
} from '../../config/document-workflow'

interface DocumentStatusWorkflowProps {
  document: {
    id: string
    title: string
    status: string
  }
  onStatusChange?: () => void
  className?: string
}

interface StatusTransition {
  to: DocumentStatus
  description: string
  requiredRoles: string[]
  allowedBy: string[]
}

export function DocumentStatusWorkflow({ 
  document, 
  onStatusChange, 
  className 
}: DocumentStatusWorkflowProps) {
  const { data: session } = useSession()
  const [allowedTransitions, setAllowedTransitions] = useState<StatusTransition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null)
  const [comment, setComment] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Helper function to capitalize status text
  const capitalizeStatus = (status: string) => {
    return status.replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      case 'PENDING_REVIEW': return 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-700 hover:bg-orange-200'
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      case 'PUBLISHED': return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      case 'REJECTED': return 'bg-red-100 text-red-700 hover:bg-red-200'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      case 'EXPIRED': return 'bg-violet-100 text-violet-700 hover:bg-violet-200'
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }
  }



  // Load allowed transitions
  const loadAllowedTransitions = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/status`)
      if (!response.ok) throw new Error('Failed to load status info')
      
      const data = await response.json()
      setAllowedTransitions(data.allowedTransitions || [])
    } catch (error) {
      console.error('Error loading transitions:', error)
      toast.error('Failed to load status transitions')
    }
  }

  // Handle status change with optional file upload
  const handleStatusChange = async () => {
    if (!selectedTransition) return

    setIsLoading(true)
    setUploadProgress(0)
    
    try {
      let fileUploadResult = null
      
      // Upload file first if selected
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', document.title)
        formData.append('description', `Updated file during status change to ${selectedTransition.to}`)
        
        const uploadResponse = await fetch(`/api/documents/${document.id}/upload`, {
          method: 'POST',
          body: formData
        })
        
        if (!uploadResponse.ok) {
          const error = await uploadResponse.json()
          throw new Error(error.error || 'Failed to upload file')
        }
        
        fileUploadResult = await uploadResponse.json()
        setUploadProgress(50)
      }
      
      // Then change status
      const response = await fetch(`/api/documents/${document.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus: selectedTransition.to,
          comment: comment.trim() || undefined,
          fileUpdated: !!selectedFile
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change status')
      }

      const result = await response.json()
      setUploadProgress(100)
      
      const successMessage = selectedFile 
        ? `Document updated and status changed to ${selectedTransition.to}`
        : `Document status changed to ${selectedTransition.to}`
      
      toast.success(successMessage)
      setShowConfirmDialog(false)
      setSelectedTransition(null)
      setComment('')
      setSelectedFile(null)
      setUploadProgress(0)
      
      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error: any) {
      console.error('Error changing status:', error)
      toast.error(error.message || 'Failed to change document status')
      setUploadProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  // Open transition dialog
  const openTransitionDialog = async (transition: StatusTransition) => {
    setSelectedTransition(transition)
    setShowConfirmDialog(true)
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {/* Status Actions Dropdown - Only show if user has session */}
        {session?.user ? (
          <DropdownMenu onOpenChange={(open) => open && loadAllowedTransitions()}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`${getStatusColor(document.status)} border-0 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity h-auto px-2 py-1 rounded-full`}
              >
                {capitalizeStatus(document.status)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {allowedTransitions.length > 0 ? (
                allowedTransitions.map((transition) => (
                  <DropdownMenuItem
                    key={transition.to}
                    onClick={() => openTransitionDialog(transition)}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{capitalizeStatus(transition.to)}</div>
                      <div className="text-xs text-muted-foreground">{transition.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled className="text-sm">
                  No actions available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge className={`${getStatusColor(document.status)} border-0 text-xs font-medium`}>
            {capitalizeStatus(document.status)}
          </Badge>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Change Status to {selectedTransition?.to.replace('_', ' ')}
            </DialogTitle>
            <DialogDescription>
              {selectedTransition?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-sm font-medium">
                Update Document File (Optional)
              </Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <Label htmlFor="file-upload" className="cursor-pointer text-sm text-primary hover:text-primary/80">
                      Click to upload new document file
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX files up to 10MB
                    </p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {selectedFile && (
                  <div className="mt-3 p-2 bg-muted rounded flex items-center space-x-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      ✕
                    </Button>
                  </div>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Comment Section */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                placeholder="Add a comment about this status change..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              disabled={isLoading}
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isLoading}
              className="bg-primary text-primary-foreground"
            >
              {isLoading ? 'Changing...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}