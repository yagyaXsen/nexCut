'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, size = 'md', showLabel = false, variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const sizes = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    }

    const variants = {
      default: 'bg-brand-600',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
    }

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className={cn('relative w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700', sizes[size])}>
          <div
            className={cn('h-full transition-all duration-300 ease-out', variants[variant])}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
        {showLabel && (
          <div className="mt-1 flex justify-between text-xs text-surface-500 dark:text-surface-400">
            <span>{value}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export interface CircularProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
}

export const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ className, value, max = 100, size = 48, strokeWidth = 4, variant = 'default', showLabel = true, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    const variants = {
      default: 'text-brand-600',
      success: 'text-green-500',
      warning: 'text-yellow-500',
      error: 'text-red-500',
    }

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="text-surface-200 dark:text-surface-700"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={cn('transition-all duration-300 ease-out', variants[variant])}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {showLabel && (
          <span className="absolute text-center">
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {Math.round(percentage)}%
            </span>
          </span>
        )}
      </div>
    )
  }
)

CircularProgress.displayName = 'CircularProgress'