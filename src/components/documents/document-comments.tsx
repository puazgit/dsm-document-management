'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { toast } from '../../hooks/use-toast';

interface DocumentCommentsProps {
  documentId: string;
  onRefresh?: () => void;
}

export function DocumentComments({ documentId, onRefresh }: DocumentCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchComments();
  }, [documentId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
        onRefresh?.();
        toast({
          title: 'Success',
          description: 'Comment added successfully',
        });
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyText,
          parentId,
        }),
      });

      if (response.ok) {
        setReplyText('');
        setReplyingTo(null);
        fetchComments();
        onRefresh?.();
        toast({
          title: 'Success',
          description: 'Reply added successfully',
        });
      } else {
        throw new Error('Failed to add reply');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reply',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplayName = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Unknown User';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments ({comments.length})</CardTitle>
        <CardDescription>
          Share your thoughts and feedback on this document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Comment */}
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting || !newComment.trim()}>
            {submitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </form>

        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-4">
                {/* Main Comment */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <div className="bg-primary/10 text-primary text-sm font-medium rounded-full h-8 w-8 flex items-center justify-center">
                        {getUserDisplayName(comment.user).charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(comment.user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                        {comment.isEdited && (
                          <Badge variant="outline" className="text-xs">
                            Edited
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{comment.content}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(comment.id)}
                        disabled={submitting}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <div className="ml-11 space-y-3">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        disabled={submitting}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={submitting || !replyText.trim()}
                        >
                          {submitting ? 'Replying...' : 'Reply'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText('');
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-11 space-y-4 border-l-2 border-gray-100 pl-4">
                    {comment.replies.map((reply: any) => (
                      <div key={reply.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-6 w-6">
                            <div className="bg-primary/10 text-primary text-xs font-medium rounded-full h-6 w-6 flex items-center justify-center">
                              {getUserDisplayName(reply.user).charAt(0).toUpperCase()}
                            </div>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {getUserDisplayName(reply.user)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.createdAt)}
                              </span>
                              {reply.isEdited && (
                                <Badge variant="outline" className="text-xs">
                                  Edited
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No comments yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to leave a comment on this document.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}