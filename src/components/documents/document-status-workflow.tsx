'use client'

import React, { useState } from 'react'
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
  minLevel: number
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    
    if (dropdownOpen) {
      // Use setTimeout to avoid immediate closing
      setTimeout(() => {
        window.document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      return () => {
        window.document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    return () => {};
  }, [dropdownOpen])

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
      case 'DRAFT': return 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      case 'IN_REVIEW': return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
      case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50'
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
      case 'PUBLISHED': return 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
      case 'REJECTED': return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      case 'EXPIRED': return 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50'
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
    }
  }



  // Load allowed transitions
  const loadAllowedTransitions = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/status`)
      if (!response.ok) {
        throw new Error('Failed to load status info')
      }
      
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
        console.log('📤 Uploading file:', selectedFile.name, selectedFile.size);
        setUploadProgress(10)
        
        const formData = new FormData()
        formData.append('file', selectedFile)
        
        const uploadResponse = await fetch(`/api/documents/${document.id}/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        })
        
        console.log('📥 Upload response status:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('Upload error response:', errorText)
          let error
          try {
            error = JSON.parse(errorText)
          } catch (e) {
            error = { error: errorText }
          }
          throw new Error(error.error || 'Failed to upload file')
        }
        
        fileUploadResult = await uploadResponse.json()
        console.log('✅ File uploaded successfully:', fileUploadResult)
        setUploadProgress(60)
        
        // Small delay to ensure file is fully processed
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Then change status
      console.log('🔄 Changing status to:', selectedTransition.to)
      setUploadProgress(selectedFile ? 70 : 30)
      
      const response = await fetch(`/api/documents/${document.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newStatus: selectedTransition.to,
          comment: comment.trim() || undefined,
          fileUpdated: !!selectedFile
        })
      })

      console.log('📥 Status change response:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Status change error:', errorText)
        let error
        try {
          error = JSON.parse(errorText)
        } catch (e) {
          error = { error: errorText }
        }
        throw new Error(error.error || 'Failed to change status')
      }

      const result = await response.json()
      console.log('✅ Status changed successfully:', result)
      setUploadProgress(100)
      
      const successMessage = selectedFile 
        ? `File uploaded and status changed to ${capitalizeStatus(selectedTransition.to)}`
        : `Status changed to ${capitalizeStatus(selectedTransition.to)}`
      
      toast.success(successMessage)
      
      // Wait a moment before closing to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setShowConfirmDialog(false)
      setSelectedTransition(null)
      setComment('')
      setSelectedFile(null)
      setUploadProgress(0)
      
      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error: any) {
      console.error('❌ Error in status change workflow:', error)
      toast.error(error.message || 'Failed to update document')
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
          <div className="relative">
            <button
              ref={buttonRef} 
              className={`${getStatusColor(document.status)} border-0 text-xs font-medium hover:opacity-80 transition-opacity h-auto px-2 py-1 rounded-full inline-flex items-center justify-center`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDropdownOpen(!dropdownOpen)
                if (!dropdownOpen) loadAllowedTransitions()
              }}
              type="button"
            >
              {capitalizeStatus(document.status)}
            </button>
            {dropdownOpen && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 z-50 w-64 mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 text-xs font-semibold border-b dark:border-gray-700 dark:text-gray-200">Change Status</div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {allowedTransitions.length > 0 ? (
                    allowedTransitions.map((transition) => (
                      <button
                        key={transition.to}
                        onClick={() => {
                          openTransitionDialog(transition)
                          setDropdownOpen(false)
                        }}
                        className="flex flex-col w-full gap-1 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="font-medium dark:text-gray-200">{capitalizeStatus(transition.to)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{transition.description}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No actions available</div>
                  )}
                </div>
              </div>
            )}
          </div>
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
              <div className="p-4 border-2 border-dashed rounded-lg border-muted-foreground/25">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div className="text-center">
                    <Label htmlFor="file-upload" className="text-sm cursor-pointer text-primary hover:text-primary/80">
                      Click to upload new document file
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                  <div className="flex items-center p-2 mt-3 space-x-2 rounded bg-muted">
                    <File className="w-4 h-4 text-muted-foreground" />
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
                    <div className="h-2 rounded-full bg-muted">
                      <div 
                        className="h-2 transition-all duration-300 rounded-full bg-primary"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
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