import Image from 'next/image'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  size?: number
  className?: string
  priority?: boolean
}

export function BrandLogo({ size = 36, className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/icon.png"
      alt="Athletic Kids"
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-lg object-cover', className)}
    />
  )
}
