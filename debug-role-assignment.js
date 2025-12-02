/**
 * Debug Role Assignment Issue
 * Letakkan console.log di komponen untuk debugging
 */

// Tambah logging di UserRoleAssignment component
export function UserRoleAssignment({ user, isOpen, onClose, onUpdate }: UserRoleAssignmentProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const fetchAvailableRoles = async () => {
    console.log('🔍 fetchAvailableRoles called, user:', user)
    if (!user) return
    
    try {
      setLoading(true)
      console.log('📡 Calling /api/roles...')
      
      const response = await fetch('/api/roles')
      
      console.log('📋 Response status:', response.status)
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error('Failed to fetch roles')
      }
      
      const allRoles: Role[] = await response.json()
      console.log('✅ Fetched roles:', allRoles)
      
      // Filter out roles that user already has
      const userRoleIds = user.userRoles.map(ur => ur.role.id)
      const available = allRoles.filter(role => !userRoleIds.includes(role.id))
      
      console.log('🔄 Available roles after filtering:', available)
      setAvailableRoles(available)
      
    } catch (error) {
      console.error('💥 fetchAvailableRoles error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch available roles',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Rest of component...
}