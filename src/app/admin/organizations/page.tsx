import { redirect } from 'next/navigation'

export default function OrganizationsRedirect() {
  redirect('/admin/groups')
}
