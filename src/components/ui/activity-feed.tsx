"use client"

import { formatDistanceToNow } from "date-fns"
import { 
  FileText, 
  Upload, 
  User, 
  Settings, 
  Eye,
  MessageCircle,
  UserPlus 
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

interface ActivityItem {
  id: string
  type: "upload" | "view" | "comment" | "user_added" | "settings_changed"
  user: string
  description: string
  timestamp: Date
  target?: string
}

export function ActivityFeed() {
  // Mock data - will be replaced with real API calls later
  const activities: ActivityItem[] = [
    {
      id: "1",
      type: "upload",
      user: "John Doe", 
      description: "uploaded Project Proposal 2024.pdf",
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      target: "Project Proposal 2024.pdf",
    },
    {
      id: "2",
      type: "comment",
      user: "Jane Smith",
      description: "commented on Financial Report Q3.xlsx",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      target: "Financial Report Q3.xlsx",
    },
    {
      id: "3", 
      type: "view",
      user: "Mike Johnson",
      description: "viewed Marketing Strategy.docx",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      target: "Marketing Strategy.docx",
    },
    {
      id: "4",
      type: "user_added",
      user: "Admin",
      description: "added new user Sarah Wilson",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      target: "Sarah Wilson",
    },
    {
      id: "5",
      type: "upload",
      user: "David Brown",
      description: "uploaded System Architecture.png", 
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      target: "System Architecture.png",
    },
    {
      id: "6",
      type: "settings_changed",
      user: "Admin",
      description: "updated system settings",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
  ]

  const getActivityIcon = (type: ActivityItem["type"]) => {
    const iconProps = { className: "h-4 w-4" }
    
    switch (type) {
      case "upload":
        return <Upload {...iconProps} className="h-4 w-4 text-blue-600" />
      case "view":
        return <Eye {...iconProps} className="h-4 w-4 text-green-600" />
      case "comment":
        return <MessageCircle {...iconProps} className="h-4 w-4 text-purple-600" />
      case "user_added":
        return <UserPlus {...iconProps} className="h-4 w-4 text-orange-600" />
      case 'settings_changed':
        return <Settings {...iconProps} className="h-4 w-4 text-muted-foreground" />
      default:
        return <FileText {...iconProps} className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "upload":
        return "border-blue-200 bg-blue-50"
      case "view":
        return "border-green-200 bg-green-50"
      case "comment":
        return "border-purple-200 bg-purple-50"
      case "user_added":
        return "border-orange-200 bg-orange-50"
      case "settings_changed":
        return "border-gray-200 bg-gray-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest system activity and user actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-full border ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">
                  <span className="font-medium">{activity.user}</span>{" "}
                  {activity.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all activity
          </button>
        </div>
      </CardContent>
    </Card>
  )
}