"use client"

import { formatDistanceToNow } from "date-fns"
import { FileText, Download, Eye, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"
import { Button } from "./button"

interface Document {
  id: string
  title: string
  type: string
  size: string
  uploadedBy: string
  uploadedAt: Date
  views: number
}

export function RecentDocuments() {
  // Mock data - will be replaced with real API calls later
  const recentDocuments: Document[] = [
    {
      id: "1",
      title: "Project Proposal 2024.pdf",
      type: "PDF",
      size: "2.4 MB",
      uploadedBy: "John Doe",
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      views: 45,
    },
    {
      id: "2", 
      title: "Financial Report Q3.xlsx",
      type: "Excel",
      size: "1.8 MB",
      uploadedBy: "Jane Smith",
      uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      views: 32,
    },
    {
      id: "3",
      title: "Marketing Strategy.docx",
      type: "Word",
      size: "856 KB", 
      uploadedBy: "Mike Johnson",
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      views: 18,
    },
    {
      id: "4",
      title: "System Architecture.png",
      type: "Image",
      size: "3.2 MB",
      uploadedBy: "Sarah Wilson",
      uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      views: 67,
    },
    {
      id: "5",
      title: "Meeting Notes.txt",
      type: "Text",
      size: "24 KB",
      uploadedBy: "David Brown",
      uploadedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      views: 12,
    },
  ]

  const getFileIcon = (type: string) => {
    return <FileText className="h-4 w-4 text-blue-600" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>
          Latest uploaded documents in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Views</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    {getFileIcon(doc.type)}
                    <div>
                      <div className="font-medium text-foreground">
                        {doc.title}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                    {doc.type}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.size}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.uploadedBy}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{doc.views}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}