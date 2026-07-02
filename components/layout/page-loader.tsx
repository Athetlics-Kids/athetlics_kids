'use client'

import { LoadingSkeleton } from '@/components/dashboard'

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4">
        <LoadingSkeleton className="mx-auto h-12 w-12 rounded-full" />
        <LoadingSkeleton className="h-4 w-40 mx-auto" />
        <LoadingSkeleton className="h-3 w-56 mx-auto" />
      </div>
    </div>
  )
}
