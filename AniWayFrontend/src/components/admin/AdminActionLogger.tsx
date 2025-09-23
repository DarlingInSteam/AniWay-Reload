import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { History, User, Calendar, Shield, Activity, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { AdminActionLogDTO } from '@/types'
import { parseReason } from '@/constants/modReasons'

// Helper to unify legacy serialized reason with new structured fields from backend
function extractReason(log: AdminActionLogDTO) {
  const hasStructured = !!(log.reasonCode || log.reasonDetails || (log as any).metaJson || (log as any).diffJson || log.diff)
  if (hasStructured) {
    let meta: any = (log as any).meta || (log as any).metaJson
    if (typeof meta === 'string') {
      try { meta = meta ? JSON.parse(meta) : {} } catch { meta = { raw: meta } }
    }
    if (!meta) meta = {}
    let diff: any = (log as any).diff || (log as any).diffJson
    if (typeof diff === 'string') {
      try { diff = diff ? JSON.parse(diff) : [] } catch { diff = [] }
    }
    if (!Array.isArray(diff)) diff = []
    return {
      code: log.reasonCode || 'UNKNOWN',
      text: log.reasonDetails || log.description || '',
      meta,
      diff,
      raw: log.reason || ''
    }
  }
  return parseReason(log.reason || '')
}

// Компонент для отображения деталей лога
function LogDetailsDialog({ log }: { log: AdminActionLogDTO }) {
  const parsed = extractReason(log)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const getActionColor = (action: string) => {
    const colors = {
      BAN_USER: 'destructive',
      UNBAN_USER: 'default',
      CHANGE_ROLE: 'secondary',
      DELETE: 'destructive',
      CREATE: 'default',
      UNKNOWN: 'outline'
    } as const
    return colors[action as keyof typeof colors] || 'outline'
  }

  const formatDate = (dateString: string) => {
    // Проверяем наличие индикатора временной зоны в конце строки
    const hasTimezone = dateString.endsWith('Z') || 
                       /[+-]\d{2}:?\d{2}$/.test(dateString)
    
    const utcString = hasTimezone ? dateString : dateString + 'Z'
    const date = new Date(utcString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionName = (action: string): string => {
    switch (action) {
      case "BAN_USER":
        return "Блокировка"
      case "UNBAN_USER":
        return "Разблокировка"
      case "CHANGE_ROLE":
        return "Изменение роли"
      case "UNKNOWN":
        return "Неизвестно"
      default:
        return action
    }
  }

  const getTargetUsername = (log: AdminActionLogDTO) => {
    return log.targetUsername || log.targetUserName || 'Неизвестен'
  }

  const getActionType = (log: AdminActionLogDTO) => {
    return log.actionType || 'UNKNOWN'
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Детали
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Детали действия #{log.id}</DialogTitle>
          <DialogDescription>
            Подробная информация о действии администратора
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Администратор</label>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4" />
                <span className="font-medium">{log.adminName}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Целевой пользователь</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <span className="font-medium">{getTargetUsername(log)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Действие</label>
            <div className="mt-1">
              {(() => {
                const actionType = getActionType(log)
                return (
                  <Badge variant={getActionColor(actionType)}>
                    {getActionName(actionType)}
                  </Badge>
                )
              })()}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Описание</label>
            <p className="mt-1 text-sm">{log.description}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Причина</label>
            <div className="mt-1 text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="secondary">{parsed.code}</Badge>
                <span>{parsed.text}</span>
                {(parsed.meta && Object.keys(parsed.meta).length > 0) && (
                  <Badge variant="outline" className="text-xs">meta:{Object.keys(parsed.meta).length}</Badge>
                )}
                {parsed.diff.length > 0 && (
                  <Badge variant="outline" className="text-xs">diff:{parsed.diff.length}</Badge>
                )}
              </div>
              {(parsed.meta && Object.keys(parsed.meta).length > 0 || parsed.diff.length > 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="h-6 px-2 text-xs"
                >
                  {showAdvanced ? 'Скрыть детали' : 'Показать детали'}
                </Button>
              )}
              {showAdvanced && (
                <div className="mt-3 space-y-3 border border-border rounded p-3 bg-muted/20">
                  {parsed.meta && Object.keys(parsed.meta).length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1 opacity-70">Meta</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(parsed.meta).map(([k,v]) => (
                          <span key={k} className="text-[10px] bg-slate-700/50 px-2 py-1 rounded border border-slate-600">{k}=<strong>{String(v)}</strong></span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsed.diff.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1 opacity-70">Изменения</div>
                      <div className="space-y-1">
                        {parsed.diff.map((d: any, i: number) => (
                          <div key={i} className="text-xs grid grid-cols-3 gap-2 bg-slate-800/40 px-2 py-1 rounded">
                            <span className="truncate text-slate-300">{d.field}</span>
                            <span className="truncate text-red-400">{d.old===null?'∅':String(d.old)}</span>
                            <span className="truncate text-green-400">{d.new===null?'∅':String(d.new)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Время</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{formatDate(log.timestamp)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Основной компонент истории действий пользователя
function UserActionHistory({ username }: { username: string }) {
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ['user-action-history', username],
    queryFn: () => apiClient.getAdminLogs(),
    enabled: !!username
  })

  // Фильтруем логи для конкретного пользователя
  const userLogs = allLogs?.filter((log: AdminActionLogDTO) => {
    const targetUsername = log.targetUsername || log.targetUserName
    return targetUsername === username
  }) || []

  const formatDate = (dateString: string) => {
    // Проверяем наличие индикатора временной зоны в конце строки
    const hasTimezone = dateString.endsWith('Z') || 
                       /[+-]\d{2}:?\d{2}$/.test(dateString)
    
    const utcString = hasTimezone ? dateString : dateString + 'Z'
    const date = new Date(utcString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    const colors = {
      BAN_USER: 'destructive',
      UNBAN_USER: 'default',
      CHANGE_ROLE: 'secondary',
      DELETE: 'destructive',
      CREATE: 'default',
      UNKNOWN: 'outline'
    } as const
    return colors[action as keyof typeof colors] || 'outline'
  }

  const getActionName = (action: string): string => {
    switch (action) {
      case "BAN_USER":
        return "Блокировка"
      case "UNBAN_USER":
        return "Разблокировка"
      case "CHANGE_ROLE":
        return "Изменение роли"
      case "UNKNOWN":
        return "Неизвестно"
      default:
        return action
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          История
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История действий: {username}</DialogTitle>
          <DialogDescription>
            Все действия администраторов в отношении данного пользователя
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Activity className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {userLogs && userLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Администратор</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Детали</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLogs.map((log: AdminActionLogDTO) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {log.adminName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const actionType = log.actionType || 'UNKNOWN'
                          return (
                            <Badge variant={getActionColor(actionType)}>
                              {getActionName(actionType)}
                            </Badge>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.description}
                      </TableCell>
                      <TableCell>
                        <LogDetailsDialog log={log} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                История действий не найдена
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Основной компонент логирования действий админов
export function AdminActionLogger() {
  // Фильтры
  const [filters, setFilters] = useState({
    adminUsername: '',
    targetUsername: '',
    action: 'all'
  })

  // Получение логов
  const { data: allLogs, isLoading, refetch } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => apiClient.getAdminLogs()
  })

  // Вспомогательные функции (определяем ДО использования в фильтре, чтобы избежать ReferenceError)
  const getTargetUsername = (log: AdminActionLogDTO) => log.targetUsername || log.targetUserName || 'Неизвестен'
  const getActionType = (log: AdminActionLogDTO) => log.actionType || 'UNKNOWN'

  // Уникальные типы действий (для динамического списка если в будущем появятся новые)
  const actionTypes = useMemo(() => {
    const set = new Set<string>()
    ;(allLogs||[]).forEach(l => set.add(getActionType(l)))
    return Array.from(set)
  }, [allLogs])

  // Мемоизированная фильтрация
  const filteredLogs = useMemo(() => {
    if (!allLogs) return []
    return allLogs.filter(log => {
      if (filters.adminUsername) {
        if (!log.adminName?.toLowerCase().includes(filters.adminUsername.toLowerCase())) return false
      }
      if (filters.targetUsername) {
        const uname = getTargetUsername(log)
        if (!uname.toLowerCase().includes(filters.targetUsername.toLowerCase())) return false
      }
      if (filters.action !== 'all') {
        if (getActionType(log) !== filters.action) return false
      }
      return true
    })
  }, [allLogs, filters])

  const formatDate = (dateString: string) => {
    // Проверяем наличие индикатора временной зоны в конце строки
    const hasTimezone = dateString.endsWith('Z') || 
                       /[+-]\d{2}:?\d{2}$/.test(dateString)
    
    const utcString = hasTimezone ? dateString : dateString + 'Z'
    const date = new Date(utcString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    const colors = {
      BAN_USER: 'destructive',
      UNBAN_USER: 'default', 
      CHANGE_ROLE: 'secondary',
      DELETE: 'destructive',
      CREATE: 'default',
      UNKNOWN: 'outline'
    } as const
    return colors[action as keyof typeof colors] || 'outline'
  }

  // Возвращает читаемое название действия
  const getActionName = (action: string): string => {
    switch (action) {
      case "BAN_USER":
        return "Блокировка"
      case "UNBAN_USER":
        return "Разблокировка"
      case "CHANGE_ROLE":
        return "Изменение роли"
      case "DELETE":
        return "Удаление"
      case "CREATE":
        return "Создание"
      case "UNKNOWN":
        return "Неизвестно"
      default:
        return action
    }
  }

  // Функция для получения цвета badge для действия
  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'BAN_USER':
        return 'destructive' as const
      case 'UNBAN_USER':
        return 'default' as const
      case 'CHANGE_ROLE':
        return 'secondary' as const
      case 'UNKNOWN':
        return 'outline' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <History className="h-5 w-5" />
          Журнал действий администраторов
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ adminUsername: '', targetUsername: '', action: 'all' })}
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
          >
            Сброс
          </Button>
        </div>
      </div>

      {/* Панель фильтров */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide text-[10px] opacity-60">Администратор</span>
          <input
            className="px-3 py-2 rounded bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-slate-400"
            placeholder="Имя администратора"
            value={filters.adminUsername}
            onChange={e => setFilters(f => ({ ...f, adminUsername: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide text-[10px] opacity-60">Пользователь</span>
          <input
            className="px-3 py-2 rounded bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-slate-400"
            placeholder="Имя пользователя"
            value={filters.targetUsername}
            onChange={e => setFilters(f => ({ ...f, targetUsername: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide text-[10px] opacity-60">Действие</span>
          <select
            className="px-3 py-2 rounded bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 text-white"
            value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          >
            <option className="bg-slate-900" value="all">Все</option>
            {actionTypes.sort().map(a => (
              <option className="bg-slate-900" key={a} value={a}>{getActionName(a)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide text-[10px] opacity-60">Статистика</span>
          <div className="px-3 py-2 rounded bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2 text-xs">
            <span>Показано {filteredLogs.length}</span>
            {allLogs && allLogs.length !== filteredLogs.length && (
              <span className="opacity-60">/ {allLogs.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Таблица */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Activity className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="rounded border border-white/10 overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-white/10">
                <TableHead className="text-slate-300 font-medium">Дата</TableHead>
                <TableHead className="text-slate-300 font-medium">Администратор</TableHead>
                <TableHead className="text-slate-300 font-medium">Пользователь</TableHead>
                <TableHead className="text-slate-300 font-medium">Действие</TableHead>
                <TableHead className="text-slate-300 font-medium">Описание</TableHead>
                <TableHead className="text-slate-300 font-medium">Подробнее</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id} className="hover:bg-white/5">
                  <TableCell className="text-white whitespace-nowrap">{formatDate(log.timestamp)}</TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 opacity-60" />
                      {log.adminName}
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 opacity-60" />
                      {getTargetUsername(log)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const actionType = getActionType(log)
                      return (
                        <Badge variant={getActionBadgeVariant(actionType)}>
                          {getActionName(actionType)}
                        </Badge>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-slate-300">{log.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <LogDetailsDialog log={log} />
                      <UserActionHistory username={getTargetUsername(log)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                    Записи не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export { UserActionHistory }