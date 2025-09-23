import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { History, User, Calendar, Shield, Activity } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { AdminActionLogDTO } from '@/types'

// Компонент для отображения деталей лога
function LogDetailsDialog({ log }: { log: AdminActionLogDTO }) {
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
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Причина</label>
            <p className="mt-1 text-sm">{log.reason}</p>
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
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [filters, setFilters] = useState({
    adminUsername: '',
    targetUsername: '',
    action: 'all'
  })

  const { data: allLogs, isLoading, refetch } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => apiClient.getAdminLogs()
  })

  // Клиентская фильтрация данных
  const filteredLogs = allLogs?.filter(log => {
    // Фильтр по имени администратора
    if (filters.adminUsername && filters.adminUsername.trim() !== '') {
      if (!log.adminName?.toLowerCase().includes(filters.adminUsername.toLowerCase())) {
        return false
      }
    }
    
    // Фильтр по имени пользователя
    if (filters.targetUsername && filters.targetUsername.trim() !== '') {
      const targetUsername = getTargetUsername(log)
      if (!targetUsername.toLowerCase().includes(filters.targetUsername.toLowerCase())) {
        return false
      }
    }
    
    // Фильтр по типу действия
    if (filters.action !== 'all') {
      const actionType = getActionType(log)
      if (actionType !== filters.action) {
        return false
      }
    }
    
    return true
  }) || []

  // Вспомогательные функции для работы с данными
  const getTargetUsername = (log: AdminActionLogDTO) => {
    return log.targetUsername || log.targetUserName || 'Неизвестен'
  }

  const getActionType = (log: AdminActionLogDTO) => {
    return log.actionType || 'UNKNOWN'
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Журнал действий администраторов
        </CardTitle>
        <CardDescription>
          История всех действий администраторов в системе
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Администратор</label>
            <input
              type="text"
              placeholder="Имя администратора"
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.adminUsername}
              onChange={(e) => setFilters(prev => ({ ...prev, adminUsername: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Пользователь</label>
            <input
              type="text"
              placeholder="Имя пользователя"
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.targetUsername}
              onChange={(e) => setFilters(prev => ({ ...prev, targetUsername: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Действие</label>
            <select
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            >
              <option value="all">Все действия</option>
              <option value="BAN_USER">Блокировка</option>
              <option value="UNBAN_USER">Разблокировка</option>
              <option value="CHANGE_ROLE">Изменение роли</option>
              <option value="UNKNOWN">Неизвестно</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => refetch()} variant="outline" className="flex-1">
              Обновить
            </Button>
            <Button 
              onClick={() => setFilters({ adminUsername: '', targetUsername: '', action: 'all' })} 
              variant="secondary" 
              className="flex-1"
            >
              Очистить
            </Button>
          </div>
        </div>

        {/* Таблица логов */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Activity className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Счетчик записей */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Показано записей: <span className="font-semibold">{filteredLogs.length}</span> 
              {allLogs && allLogs.length !== filteredLogs.length && (
                <span> из <span className="font-semibold">{allLogs.length}</span></span>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Дата</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Администратор</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Пользователь</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Действие</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Описание</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(log.timestamp)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-foreground">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{log.adminName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-foreground">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{getTargetUsername(log)}</span>
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
                    <TableCell className="max-w-xs truncate text-gray-700 dark:text-gray-300">
                      {log.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <LogDetailsDialog log={log} />
                        <UserActionHistory username={getTargetUsername(log)} />
                      </div>
                    </TableCell>
                  </TableRow>
                )) || []}
                {(filteredLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Записи не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Пагинация */}
            {/* Pagination logic is not implemented for filteredLogs; implement if needed */}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { UserActionHistory }