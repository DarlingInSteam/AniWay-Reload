// Типы для мониторинга очереди импорта
export interface ImportQueueItem {
  importTaskId: string
  slug: string
  filename?: string
  priority: 'HIGH' | 'NORMAL' | 'LOW'
  queuedAt: string
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  errorMessage?: string
  startedAt?: string
  completedAt?: string
}

export interface ImportQueueStats {
  queueSize: number
  activeImports: number
  statusCounts: {
    [key: string]: number
  }
}

export interface ImportQueueMonitorProps {
  isAutoParsing: boolean
  className?: string
}