'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Camera, Upload, Loader2, X } from 'lucide-react'

interface AvatarUploadProps {
  currentAvatar?: string
  onAvatarChange: (newAvatar: string) => void
  variant?: 'small' | 'large'
}

export function AvatarUpload({ 
  currentAvatar, 
  onAvatarChange, 
  variant = 'small' 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select a valid image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview) return

    setIsUploading(true)
    try {
      // Convert preview to blob
      const response = await fetch(preview)
      const blob = await response.blob()

      // Create FormData
      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.jpg')

      // Upload to server
      const uploadResponse = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload avatar')
      }

      const { url } = await uploadResponse.json()
      onAvatarChange(url)
      setPreview(null)

      toast({
        title: 'Success',
        description: 'Avatar updated successfully',
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload avatar',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const avatarSize = variant === 'large' ? 'h-32 w-32' : 'h-20 w-20'
  const buttonSize = variant === 'large' ? 'h-10 w-10' : 'h-8 w-8'

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className={avatarSize}>
          <AvatarImage src={preview || currentAvatar} />
          <AvatarFallback>
            <Camera className="h-8 w-8 text-gray-400" />
          </AvatarFallback>
        </Avatar>
        
        {!preview && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`absolute bottom-0 right-0 ${buttonSize} bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors`}
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && (
        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            size="sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            size="sm"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      )}

      {variant === 'large' && !preview && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          Change Avatar
        </Button>
      )}
    </div>
  )
}