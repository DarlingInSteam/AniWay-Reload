import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Search, RefreshCw, UserCheck, Ban, Shield } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { authService } from '@/services/authService'
import { toast } from 'sonner'
import { UserActionHistory, AdminActionLogger } from './AdminActionLogger'
import { AdminUserData, AdminUserFilter } from '@/types'
import { MOD_REASON_CATEGORIES, buildReason } from '@/constants/modReasons'
import { isFeatureEnabled } from '@/constants/featureFlags'
import { useAuth } from '@/contexts/AuthContext'

// Компонент фильтров пользователей
function UserFilters({ 
  filters, 
  onFiltersChange 
}: { 
  filters: AdminUserFilter
  onFiltersChange: (filters: AdminUserFilter) => void 
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Фильтры и поиск
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="search">Поиск по имени</Label>
            <Input
              id="search"
              placeholder="Введите имя пользователя"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="status">Статус</Label>
            <Select 
              value={filters.status} 
              onValueChange={(value: 'all' | 'active' | 'banned') => 
                onFiltersChange({ ...filters, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="banned">Заблокированные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="role">Роль</Label>
            <Select 
              value={filters.role} 
              onValueChange={(value: 'all' | 'USER' | 'ADMIN' | 'TRANSLATOR') => 
                onFiltersChange({ ...filters, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="USER">Пользователь</SelectItem>
                <SelectItem value="ADMIN">Администратор</SelectItem>
                <SelectItem value="TRANSLATOR">Переводчик</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sortBy">Сортировка</Label>
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="username">По имени</SelectItem>
                <SelectItem value="createdAt">По дате регистрации</SelectItem>
                <SelectItem value="lastLogin">По последнему входу</SelectItem>
                <SelectItem value="role">По роли</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sortOrder">Порядок</Label>
            <Select 
              value={filters.sortOrder} 
              onValueChange={(value: 'asc' | 'desc') => 
                onFiltersChange({ ...filters, sortOrder: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">По возрастанию</SelectItem>
                <SelectItem value="desc">По убыванию</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Компонент строки пользователя в таблице
function UserRow({ 
  user, 
  onToggleBan,
  onChangeRole,
  currentAdminUsername,
  mutationBusy
}: { 
  user: AdminUserData
  onToggleBan: (userId: number, reason: string) => void
  onChangeRole: (userId: number, role: string, reason: string) => void
  currentAdminUsername: string | undefined
  mutationBusy: boolean
}) {
  const [banReason, setBanReason] = useState('')
  const [roleChangeReason, setRoleChangeReason] = useState('')
  const [banReasonCode, setBanReasonCode] = useState('ABUSE')
  const [banTemplate, setBanTemplate] = useState('')
  const [banType, setBanType] = useState<'PERM' | 'TEMP' | 'SHADOW'>('PERM')
  const [banExpiresAt, setBanExpiresAt] = useState<string>('')
  const [confirmShadow, setConfirmShadow] = useState('')
  const [roleReasonCode, setRoleReasonCode] = useState('OTHER')
  const [cooldownUntil, setCooldownUntil] = useState<number>(0)
  const [confirmElevate, setConfirmElevate] = useState('')
  const [selectedRole, setSelectedRole] = useState<"USER" | "ADMIN" | "TRANSLATOR">(user.role as any)
  const [nowTs, setNowTs] = useState(Date.now())

  useEffect(() => {
    if (!isFeatureEnabled('TEMP_BAN_REMAINING_BADGE')) return
    const id = setInterval(() => setNowTs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const formatRemaining = (iso?: string | null) => {
    if (!iso) return null
    const end = new Date(iso).getTime()
    if (isNaN(end)) return null
    const diffMs = end - nowTs
    if (diffMs <= 0) return 'истек'
    const mins = Math.floor(diffMs / 60000)
    if (mins < 60) return mins + 'м'
    const hours = Math.floor(mins / 60)
    if (hours < 24) return hours + 'ч'
    const days = Math.floor(hours / 24)
    return days + 'д'
  }
  
  const getRoleBadge = (role: string) => {
    const variants = {
      USER: 'secondary',
      ADMIN: 'destructive',
      TRANSLATOR: 'default'
    } as const
    
    return (
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'}>
        {role === 'USER' ? 'Пользователь' : 
         role === 'ADMIN' ? 'Администратор' : 
         'Переводчик'}
      </Badge>
    )
  }

  const getStatusBadge = (isEnabled: boolean) => {
    const shadow = (user as any).banType === 'SHADOW' && !isEnabled
    if (shadow) {
      return (
        <Badge variant="secondary" className="bg-gradient-to-r from-slate-700 to-slate-800 border border-dashed border-slate-500 animate-pulse">
          Теневая
        </Badge>
      )
    }
    return (
      <Badge variant={isEnabled ? 'default' : 'destructive'}>
        {isEnabled ? 'Активен' : 'Заблокирован'}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Никогда'
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
  <TableRow className={(user as any).banType === 'SHADOW' && !user.isEnabled ? 'opacity-75 backdrop-blur-sm' : ''}>
      <TableCell>
        <div className="flex items-center gap-3">
          {user.avatar && (
            <img 
              src={user.avatar} 
              alt={user.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <div>
            <div className="font-medium flex items-center gap-2">
              {user.displayName || user.username}
              {(user as any).banType === 'SHADOW' && !user.isEnabled && (
                <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-600 px-1 py-0.5 rounded">shadow</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">@{user.username}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{getRoleBadge(user.role)}</TableCell>
      <TableCell className="space-y-1">
        {getStatusBadge(user.isEnabled)}
        {(!user.isEnabled && (user as any).banType === 'TEMP' && (user as any).banExpiresAt && isFeatureEnabled('TEMP_BAN_REMAINING_BADGE')) && (
          <div className="text-[10px] uppercase tracking-wide text-amber-400 border border-amber-500/30 bg-amber-900/20 rounded px-1 py-0.5 inline-block">
            Осталось: {formatRemaining((user as any).banExpiresAt)}
          </div>
        )}
      </TableCell>
      <TableCell>{formatDate(user.registrationDate || user.createdAt)}</TableCell>
      <TableCell>{formatDate(user.lastLoginDate || user.lastLogin)}</TableCell>
      <TableCell>
        <div className="text-sm">
          <div>Главы: {user.chaptersReadCount || 0}</div>
          <div>Лайки: {user.likesGivenCount || 0}</div>
          <div>Комментарии: {user.commentsCount || 0}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={user.isEnabled ? 'destructive' : 'default'}
                size="sm"
              >
                {user.isEnabled ? (
                  <>
                    <Ban className="h-4 w-4 mr-1" />
                    Заблокировать
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-1" />
                    Разблокировать
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {user.isEnabled ? 'Заблокировать' : 'Разблокировать'} пользователя?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Вы действительно хотите {user.isEnabled ? 'заблокировать' : 'разблокировать'} 
                  пользователя <strong>{user.username}</strong>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-4">
                {/* Ban type & expiry */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Тип блокировки</Label>
                    <select
                      className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                      value={banType}
                      onChange={e => { const v = e.target.value as any; setBanType(v); if (v !== 'TEMP') setBanExpiresAt(''); }}
                    >
                      <option value="PERM">Перманентная</option>
                      <option value="TEMP">Временная</option>
                      <option value="SHADOW">Теневая</option>
                    </select>
                  </div>
                  {banType === 'TEMP' && (
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wide">Истекает (UTC)</Label>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                        value={banExpiresAt}
                        onChange={e => setBanExpiresAt(e.target.value)}
                      />
                    </div>
                  )}
                  {banType === 'SHADOW' && (
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wide text-amber-400">Подтверждение теневой блокировки — введите имя пользователя</Label>
                      <input
                        type="text"
                        className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                        placeholder={user.username}
                        value={confirmShadow}
                        onChange={e => setConfirmShadow(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {/* Reason category & template */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Категория</Label>
                    <select
                      className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                      value={banReasonCode}
                      onChange={e => { setBanReasonCode(e.target.value); setBanTemplate(''); }}
                    >
                      {MOD_REASON_CATEGORIES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wide">Шаблон (опционально)</Label>
                    <select
                      className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                      value={banTemplate}
                      onChange={e => setBanTemplate(e.target.value)}
                    >
                      <option value="">—</option>
                      {MOD_REASON_CATEGORIES.find(c => c.code === banReasonCode)?.templates.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="banReason">
                    Причина {user.isEnabled ? 'блокировки' : 'разблокировки'}
                    <span className="text-red-500"> *</span>
                  </Label>
                  <Input
                    id="banReason"
                    placeholder={user.isEnabled 
                      ? "Укажите причину блокировки пользователя..." 
                      : "Укажите причину разблокировки пользователя..."
                    }
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="mt-2"
                  />
                  {banReason.trim().length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      Причина {user.isEnabled ? 'блокировки' : 'разблокировки'} обязательна для заполнения
                    </p>
                  )}
                </div>
              </div>
              
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBanReason('')}>
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (banReason.trim().length === 0 || mutationBusy || Date.now() < cooldownUntil) return
                    if (banType === 'TEMP' && !banExpiresAt) return
                    if (banType === 'SHADOW' && confirmShadow !== user.username) return
                      const diff = [{ field: 'isEnabled', old: user.isEnabled, new: !user.isEnabled }]
                      const meta: any = { banType }
                    if (banType === 'TEMP') meta.banExpiresAt = banExpiresAt
                    const combined = buildReason(
                      banReasonCode,
                      banTemplate ? `${banTemplate}. ${banReason.trim()}` : banReason.trim(),
                      diff,
                      meta
                    )
                    onToggleBan(user.id, combined)
                    setBanReason('')
                    setBanTemplate('')
                    setBanExpiresAt('')
                    setConfirmShadow('')
                    setCooldownUntil(Date.now() + 3000)
                  }}
                  disabled={banReason.trim().length === 0 || mutationBusy || Date.now() < cooldownUntil || (banType==='TEMP' && !banExpiresAt) || (banType==='SHADOW' && confirmShadow !== user.username)}
                  className={user.isEnabled ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  {user.isEnabled ? 'Заблокировать' : 'Разблокировать'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Диалог смены роли */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-1" />
                Роль
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Изменить роль пользователя</DialogTitle>
                <DialogDescription>
                  Выберите новую роль для пользователя <strong>{user.username}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm flex items-center gap-2">
                  Текущая роль: {getRoleBadge(user.role)}
                  {currentAdminUsername === user.username && (
                    <span className="text-xs text-amber-400">(Вы)</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(['USER', 'TRANSLATOR', 'ADMIN'] as const).map((role) => (
                    <Button
                      key={role}
                      variant={selectedRole === role ? "default" : "outline"}
                      disabled={user.role === role || mutationBusy || (role !== 'ADMIN' && currentAdminUsername === user.username && user.role === 'ADMIN' && selectedRole !== 'ADMIN' && !roleChangeReason)}
                      onClick={() => setSelectedRole(role)}
                      className="justify-start"
                    >
                      {role === 'USER' ? 'Пользователь' : 
                       role === 'ADMIN' ? 'Администратор' : 
                       'Переводчик'}
                    </Button>
                  ))}
                </div>
                
                {selectedRole !== user.role && (
                  <div>
                    <Label htmlFor="roleChangeReason">
                      Причина изменения роли <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Категория</Label>
                        <select
                          className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                          value={roleReasonCode}
                          onChange={e => setRoleReasonCode(e.target.value)}
                        >
                          {MOD_REASON_CATEGORIES.map(c => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs uppercase tracking-wide">Текст причины</Label>
                        <Input
                          id="roleChangeReason"
                          placeholder="Укажите причину изменения роли..."
                          value={roleChangeReason}
                          onChange={(e) => setRoleChangeReason(e.target.value)}
                        />
                      </div>
                      {selectedRole === 'ADMIN' && user.role !== 'ADMIN' && (
                        <div className="md:col-span-3">
                          <Label className="text-xs uppercase tracking-wide text-amber-400">Подтверждение повышения — введите имя пользователя</Label>
                          <input
                            type="text"
                            className="mt-1 w-full bg-background border border-border rounded px-2 py-1 text-sm"
                            placeholder={user.username}
                            value={confirmElevate}
                            onChange={e => setConfirmElevate(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    {roleChangeReason.trim().length === 0 && (
                      <p className="text-sm text-red-500 mt-1">
                        Причина изменения роли обязательна для заполнения
                      </p>
                    )}
                    {selectedRole === 'ADMIN' && user.role !== 'ADMIN' && confirmElevate !== user.username && (
                      <p className="text-sm text-red-500 mt-1">
                        Для подтверждения повышения введите точное имя пользователя.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setSelectedRole(user.role)
                    setRoleChangeReason('')
                  }}
                >
                  Отмена
                </Button>
                {selectedRole !== user.role && (
                  <Button
                    onClick={() => {
                      const elevateNeedsConfirm = selectedRole === 'ADMIN' && user.role !== 'ADMIN'
                      if (roleChangeReason.trim().length > 0 && !mutationBusy && (!elevateNeedsConfirm || confirmElevate === user.username)) {
                        const diff = [{ field: 'role', old: user.role, new: selectedRole }]
                        const reason = buildReason(roleReasonCode, roleChangeReason.trim(), diff, { elevated: elevateNeedsConfirm ? '1' : '0' })
                        onChangeRole(user.id, selectedRole, reason)
                        setRoleChangeReason('')
                        setSelectedRole(user.role)
                        setConfirmElevate('')
                      }
                    }}
                    disabled={roleChangeReason.trim().length === 0 || mutationBusy || (selectedRole === 'ADMIN' && user.role !== 'ADMIN' && confirmElevate !== user.username)}
                  >
                    Изменить роль
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <UserActionHistory username={user.username} />
        </div>
      </TableCell>
    </TableRow>
  )
}

// Основной компонент управления пользователями
export function UserManager() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [filters, setFilters] = useState<AdminUserFilter>({
    status: 'all',
    role: 'all',
    search: '',
    sortBy: 'username',
    sortOrder: 'asc'
  })
  const [busy, setBusy] = useState(false)

  // Получение пользователей
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', currentPage, pageSize, filters],
    queryFn: () => apiClient.getAdminUsers({
      page: currentPage,
      size: pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      query: filters.search,
      role: filters.role === 'all' ? '' : filters.role
    }),
    placeholderData: (previousData) => previousData
  })

  // Получение общего количества пользователей
  const { data: totalUsersCount } = useQuery({
    queryKey: ['users-count'],
    queryFn: apiClient.getAdminUsersCount
  })

  // Мутация для переключения статуса бана
  const toggleBanMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      const adminId = await authService.getCurrentUserId()
      
      if (!adminId) {
        throw new Error('Не удалось получить ID администратора')
      }
      return apiClient.toggleUserBanStatus(userId, adminId, reason)
    },
    onSuccess: async (_data, variables) => {
      toast.success('Статус пользователя успешно изменен')
      // Пытаемся инвалидировать активные сессии (если бан произошел)
      try {
        await apiClient.invalidateUserSessions(variables.userId)
      } catch {}
      // Optimistic refresh already applied; still schedule background refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-count'] })
      setBusy(false)
    },
    onError: (error) => {
      console.error('Error toggling ban status:', error)
      toast.error('Ошибка при изменении статуса пользователя')
      setBusy(false)
    }
  })

  // Мутация для смены роли пользователя
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role, reason }: { userId: number; role: string; reason: string }) => {
      const adminId = await authService.getCurrentUserId()
      if (!adminId) {
        throw new Error('Не удалось получить ID администратора')
      }
      return apiClient.changeUserRole(userId, adminId, role, reason)
    },
    onSuccess: async (_data, variables) => {
      toast.success('Роль пользователя успешно изменена')
      // Инвалидация сессий если роль понижена или пользователь лишён доступа
      try {
        if (variables.role !== 'ADMIN') {
          await apiClient.invalidateUserSessions(variables.userId)
        }
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-count'] })
      setBusy(false)
    },
    onError: (error) => {
      console.error('Error changing user role:', error)
      toast.error('Ошибка при изменении роли пользователя')
      setBusy(false)
    }
  })

  // Обработчики событий
  const handleToggleBan = (userId: number, reason: string) => {
    setBusy(true)
    // Optimistic: patch cached list
    queryClient.setQueryData(['users', currentPage, pageSize, filters], (old: any) => {
      if (!old) return old
      return {
        ...old,
        content: old.content.map((u: AdminUserData) => {
          if (u.id !== userId) return u
          // Пытаемся извлечь banType из reason строки (meta(banType=...)) для немедленного UI
          let banType: any = (u as any).banType
          const m = reason.match(/meta\(([^)]*)\)/)
          if (m) {
            const pairs = m[1].split(';')
            pairs.forEach(p => {
              const [k,v] = p.split('=')
              if (k === 'banType') banType = v
            })
          }
          return { ...u, isEnabled: !u.isEnabled, banType }
        })
      }
    })
    toggleBanMutation.mutate({ userId, reason })
    if (currentUser?.id === userId) {
      // Самостоятельная блокировка — сразу выходим локально
      setTimeout(() => {
        authService.logout()
        toast.warning('Ваша сессия завершена из-за изменения статуса аккаунта.')
        try { window.location.href = '/' } catch {}
      }, 300)
    }
  }

  const handleChangeRole = (userId: number, role: string, reason: string) => {
    setBusy(true)
    queryClient.setQueryData(['users', currentPage, pageSize, filters], (old: any) => {
      if (!old) return old
      return {
        ...old,
        content: old.content.map((u: AdminUserData) => u.id === userId ? { ...u, role } : u)
      }
    })
    changeRoleMutation.mutate({ userId, role, reason })
    // If self demote from ADMIN -> force logout strategy placeholder (frontend only for now)
    if (currentUser?.id === userId && role !== 'ADMIN') {
      toast.info('Ваша роль снижена. Сессия будет завершена.')
      setTimeout(() => {
        authService.logout()
        try { window.location.href = '/' } catch {}
      }, 500)
    }
  }

  // Фильтрация данных по статусу
  const filteredUsers = (usersData?.content || []).filter((user: AdminUserData) => {
    if (filters.status === 'active') return user.isEnabled
    if (filters.status === 'banned') return !user.isEnabled
    return true
  })

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6" />
            Управление пользователями
          </h2>
          <p className="text-muted-foreground mt-1">
            Всего пользователей в системе: {totalUsersCount || 0}
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </Button>
      </div>

      {/* Фильтры */}
      <UserFilters filters={filters} onFiltersChange={setFilters} />

      {/* Таблица пользователей */}
      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Отображается {filteredUsers.length} из {(usersData as any)?.totalElements || 0} пользователей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead>Активность</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: AdminUserData) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onToggleBan={handleToggleBan}
                      onChangeRole={handleChangeRole}
                      currentAdminUsername={currentUser?.username}
                      mutationBusy={busy}
                    />
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Пользователи не найдены
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Пагинация */}
          {usersData && (usersData as any).totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Страница {currentPage + 1} из {(usersData as any).totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                >
                  Предыдущая
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= (usersData as any).totalPages - 1}
                  onClick={() => setCurrentPage(prev => Math.min((usersData as any).totalPages - 1, prev + 1))}
                >
                  Следующая
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Журнал действий администраторов */}
      <AdminActionLogger />
    </div>
  )
}