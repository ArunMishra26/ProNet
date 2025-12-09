import UserLayout from '@/layout/UserLayout'
import React from 'react'
import DashboardLayout from '@/layout/DashboardLayout'

export default function MyConnectionsPage() {
  return (
    <UserLayout>
          <DashboardLayout>
            <div>
              <h1>My Connections</h1>
            </div>
          </DashboardLayout>
        </UserLayout>
  )
}
