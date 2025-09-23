import { useState, useEffect, useMemo } from 'react'
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
import { Users, Search, RefreshCw, UserCheck, Ban, Shield, HelpCircle, ChevronDown, ChevronUp, Activity, Loader2 } from 'lucide-react'
import { ModerationDrawer } from './ModerationDrawer'
import { apiClient } from '@/lib/api'
import { authService } from '@/services/authService'
import { toast } from 'sonner'
import { UserActionHistory, AdminActionLogger } from './AdminActionLogger'
import { AdminUserData, AdminUserFilter } from '@/types'
import { MOD_REASON_CATEGORIES, buildReason, parseReason } from '@/constants/modReasons'
import { useRemainingTime } from '@/hooks/useRemainingTime'
import { BanTypeBadge } from './BanTypeBadge'
import { isFeatureEnabled } from '@/constants/featureFlags'
import { useAuth } from '@/contexts/AuthContext'

// Компонент фильтров пользователей
function UserFilters({ filters, onFiltersChange, onImmediateSearchChange }: { filters: AdminUserFilter; onFiltersChange: (f: AdminUserFilter)=>void; onImmediateSearchChange: (value: string)=>void }) {
  return (
    <div className="glass-panel p-4 flex flex-wrap gap-3 items-center rounded-lg border border-white/10">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Search className="h-4 w-4 opacity-60" />
        <Input
          placeholder="Поиск пользователя..."
          value={filters.search}
          onChange={(e)=>onImmediateSearchChange(e.target.value)}
          className="h-8 text-sm bg-transparent"
          aria-label="Поиск пользователя"
        />
      </div>
      <Select value={filters.status} onValueChange={(v:any)=>onFiltersChange({...filters, status: v})}>
        <SelectTrigger className="h-8 w-[130px] text-xs bg-transparent"><SelectValue placeholder="Статус" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="active">Активные</SelectItem>
          <SelectItem value="banned">Заблок.</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.role} onValueChange={(v:any)=>onFiltersChange({...filters, role: v})}>
        <SelectTrigger className="h-8 w-[150px] text-xs bg-transparent"><SelectValue placeholder="Роль" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все роли</SelectItem>
          <SelectItem value="USER">Пользователь</SelectItem>
          <SelectItem value="TRANSLATOR">Переводчик</SelectItem>
          <SelectItem value="ADMIN">Админ</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.sortBy} onValueChange={(v:any)=>onFiltersChange({...filters, sortBy: v})}>
        <SelectTrigger className="h-8 w-[150px] text-xs bg-transparent"><SelectValue placeholder="Сортировка" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="username">Имя</SelectItem>
          <SelectItem value="createdAt">Регистрация</SelectItem>
          <SelectItem value="lastLogin">Вход</SelectItem>
          <SelectItem value="role">Роль</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.sortOrder} onValueChange={(v:any)=>onFiltersChange({...filters, sortOrder: v})}>
        <SelectTrigger className="h-8 w-[110px] text-xs bg-transparent"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">ASC</SelectItem>
          <SelectItem value="desc">DESC</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={()=>onFiltersChange({ search: '', status: 'all', role: 'all', sortBy: 'username', sortOrder: 'asc'})} className="h-8 text-xs">Сброс</Button>
    </div>
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
  const [expanded, setExpanded] = useState(false)
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
  const remaining = useRemainingTime((user as any).banExpiresAt)
  
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
  <>
  <TableRow className={`group border-b border-white/5 hover:bg-white/5 transition-all duration-200 ${ (user as any).banType === 'SHADOW' && !user.isEnabled ? 'opacity-70 bg-slate-900/20' : ''}`}>
      <TableCell className="py-4 px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={()=>setExpanded(e=>!e)}
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
            aria-expanded={expanded}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-200 text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <div className="relative">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
            )}
            
            {user.isEnabled && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                {user.displayName || user.username}
              </div>
              <BanTypeBadge banType={(user as any).banType} />
            </div>
            <div className="text-sm text-slate-400 flex items-center gap-2">
              @{user.username}
              {currentAdminUsername === user.username && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
                  Это вы
                </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="hidden xl:table-cell py-4 px-6">
        <div className="text-slate-300 truncate max-w-48">
          {user.email}
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-6">{getRoleBadge(user.role)}</TableCell>
      
      <TableCell className="py-4 px-6">
        <div className="space-y-2">
          {getStatusBadge(user.isEnabled)}
          {(!user.isEnabled && (user as any).banType === 'TEMP' && (user as any).banExpiresAt && isFeatureEnabled('TEMP_BAN_REMAINING_BADGE')) && remaining.label && (
            <div className="text-xs uppercase tracking-wide text-amber-400 border border-amber-500/30 bg-amber-900/20 rounded-md px-2 py-1 inline-block">
              Осталось: {remaining.label}
            </div>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-6">
        <div className="text-sm text-slate-300">
          <div className="font-medium">Регистрация:</div>
          <div className="text-slate-400">{formatDate(user.registrationDate || user.createdAt)}</div>
          <div className="font-medium mt-2">Последний вход:</div>
          <div className="text-slate-400">{formatDate(user.lastLoginDate || user.lastLogin)}</div>
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-6">
        <div className="grid grid-cols-1 gap-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-slate-400">Главы:</span>
            <span className="text-white font-medium">{user.chaptersReadCount || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-slate-400">Лайки:</span>
            <span className="text-white font-medium">{user.likesGivenCount || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-slate-400">Комменты:</span>
            <span className="text-white font-medium">{user.commentsCount || 0}</span>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-6">
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={user.isEnabled ? 'destructive' : 'default'}
                size="icon"
                className="h-8 w-8"
                title={user.isEnabled ? 'Заблокировать' : 'Разблокировать'}
                aria-label={user.isEnabled ? 'Заблокировать пользователя' : 'Разблокировать пользователя'}
              >
                {user.isEnabled ? (
                  <Ban className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
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
              <Button variant="outline" size="icon" className="h-8 w-8" title="Изменить роль" aria-label="Изменить роль">
                <Shield className="h-4 w-4" />
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
          
          <div title="История действий" aria-label="История действий">
            <UserActionHistory username={user.username} />
          </div>
        </div>
      </TableCell>
    </TableRow>
    {expanded && (
      <TableRow className="bg-white/5">
        <TableCell colSpan={7} className="p-4 text-xs space-y-3">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-[11px] uppercase tracking-wide opacity-70">Аккаунт</div>
              <div>Создан: {formatDate(user.registrationDate || user.createdAt)}</div>
              <div>Последний вход: {formatDate(user.lastLoginDate || user.lastLogin)}</div>
              {(user as any).banType && <div>Тип блокировки: {(user as any).banType}</div>}
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-[11px] uppercase tracking-wide opacity-70">Статистика</div>
              <div>Главы: {user.chaptersReadCount || 0}</div>
              <div>Лайки: {user.likesGivenCount || 0}</div>
              <div>Комментарии: {user.commentsCount || 0}</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-[11px] uppercase tracking-wide opacity-70">Действия</div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={()=>setExpanded(false)} className="h-7 px-2 text-[11px]">Скрыть</Button>
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )}
  </>
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
  // Debounce search typing
  const [rawSearch, setRawSearch] = useState('')
  useEffect(() => {
    const h = setTimeout(() => {
      setFilters(f => f.search === rawSearch ? f : { ...f, search: rawSearch })
    }, 400)
    return () => clearTimeout(h)
  }, [rawSearch])
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

  // Новая статистика
  const { data: userStats } = useQuery({
    queryKey: ['users-stats'],
    queryFn: apiClient.getAdminUserStats,
    retry: 1
  })
  const totalUsers = userStats?.totalUsers

  // Мутация для переключения статуса бана
  const toggleBanMutation = useMutation({
    mutationFn: async ({ userId, reason, structured }: { userId: number; reason: string; structured?: {
      banType: 'PERM' | 'TEMP' | 'SHADOW'; banExpiresAt?: string | null; reasonCode: string; reasonDetails: string; diff: any[]; meta: any;
    } }) => {
      const adminId = await authService.getCurrentUserId()
      if (!adminId) throw new Error('Не удалось получить ID администратора')
      if (structured && isFeatureEnabled('STRUCTURED_ADMIN_REASON')) {
        await apiClient.applyBan({
          userId,
            adminId,
            banType: structured.banType,
            banExpiresAt: structured.banExpiresAt,
            reasonCode: structured.reasonCode,
            reasonDetails: structured.reasonDetails,
            diff: structured.diff,
            meta: structured.meta,
            legacyReason: reason
        })
        return
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
    // Attempt to parse legacy reason back into structured for new endpoint usage
    let structured: any = undefined
    if (isFeatureEnabled('STRUCTURED_ADMIN_REASON')) {
      const parsed = parseReason(reason)
      const metaBanType = (parsed.meta?.banType as any) || 'PERM'
      structured = {
        banType: metaBanType,
        banExpiresAt: parsed.meta?.banExpiresAt || null,
        reasonCode: parsed.code,
        reasonDetails: parsed.text,
        diff: parsed.diff || [],
        meta: parsed.meta || {}
      }
    }
    toggleBanMutation.mutate({ userId, reason, structured })
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

  // Drawer state (moderation side panel)
  const [drawerUser, setDrawerUser] = useState<AdminUserData | null>(null)
  const [drawerMode, setDrawerMode] = useState<'BAN' | 'ROLE' | null>(null)
  const openDrawer = (user: AdminUserData, mode: 'BAN' | 'ROLE') => { setDrawerUser(user); setDrawerMode(mode) }
  const closeDrawer = () => { setDrawerUser(null); setDrawerMode(null) }

  // Фильтрация данных по статусу
  const filteredUsers = (usersData?.content || []).filter((user: AdminUserData) => {
    if (filters.status === 'active') return user.isEnabled
    if (filters.status === 'banned') return !user.isEnabled
    return true
  })

  return (
    <div className="space-y-5">
      {/* Статистика пользователей (новая панель будет подключена после запроса stats) */}
      {/* Placeholder removed old single-card layout */}

        {/* Enhanced Filters */}
        <UserFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
          onImmediateSearchChange={setRawSearch}
        />

        {/* Modern Data Table */}
        <div className="glass-panel w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { key: 'totalUsers', label: 'Всего', value: userStats?.totalUsers },
            { key: 'translators', label: 'Переводчики', value: userStats?.translators },
            { key: 'admins', label: 'Админы', value: userStats?.admins },
            { key: 'banned', label: 'Забаненные', value: userStats?.banned },
            { key: 'activeLast7Days', label: 'Активные 7д', value: userStats?.activeLast7Days }
          ].map(stat => (
            <div key={stat.key} className="flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-wide opacity-60">{stat.label}</div>
              <div className="text-xl font-semibold text-white">{stat.value ?? '—'}</div>
            </div>
          ))}
          {!userStats && (
            <div className="col-span-full flex justify-center py-2 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка статистики...
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Показано {filteredUsers.length} из {(usersData as any)?.totalElements || 0}</span>
              <div className="w-px h-4 bg-white/20" />
              <span>Страница {currentPage + 1} из {(usersData as any)?.totalPages || 1}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= ((usersData as any)?.totalPages || 1) - 1}
                onClick={() => setCurrentPage(p => p + 1)}
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
              >
                Далее
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">{isLoading ? (
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  {['Пользователь','Email','Роль','Статус','Активность','Статистика','Действия'].map(h => (
                    <TableHead key={h} className="text-slate-300 font-semibold py-4 px-6">
                      <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_,i)=> (
                  <TableRow key={i} className="border-b border-white/5">
                    {Array.from({ length: 7 }).map((__,c)=>(
                      <TableCell key={c} className="py-4 px-6">
                        <div className="h-4 bg-white/10 rounded animate-pulse" style={{width: `${60 + Math.random() * 40}%`}} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  {[
                    { key: 'username', label: 'Пользователь', sortable: true },
                    { key: 'email', label: 'Email', className: 'hidden xl:table-cell', sortable: true },
                    { key: 'role', label: 'Роль', sortable: true },
                    { key: 'isEnabled', label: 'Статус', sortable: false },
                    { key: 'createdAt', label: 'Активность', sortable: true },
                    { key: 'activity', label: 'Статистика', sortable: false },
                    { key: 'actions', label: 'Действия', sortable: false }
                  ].map(col => {
                    const active = filters.sortBy === col.key
                    const sortable = col.sortable !== false
                    const direction = active ? filters.sortOrder : undefined
                    return (
                      <TableHead
                        key={col.key}
                        className={`text-slate-300 font-semibold py-4 px-6 ${col.className||''} ${sortable ? 'cursor-pointer select-none hover:text-white' : ''}`}
                        onClick={() => {
                          if (!sortable) return
                          setFilters(f => {
                            if (f.sortBy === col.key) {
                              return { ...f, sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc' }
                            }
                            return { ...f, sortBy: col.key, sortOrder: 'asc' }
                          })
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {sortable && (
                            <div className={`transition-all duration-200 ${active ? 'opacity-100' : 'opacity-40'}`}>
                              {active ? (direction==='asc' ? '↗️' : '↘️') : '↕️'}
                            </div>
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
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
                  // Provide handlers for drawer activation via context substitution later if needed
                />
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                      <div className="p-4 rounded-full bg-white/10">
                        <Users className="h-12 w-12 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Пользователи не найдены</h3>
                        <p className="text-slate-400 max-w-md">
                          {filters.search ? 
                            `Нет пользователей, соответствующих запросу "${filters.search}"` :
                            'Попробуйте изменить фильтры или добавить нового пользователя'
                          }
                        </p>
                      </div>
                      {filters.search && (
                        <Button 
                          variant="outline"
                          onClick={() => setFilters(f => ({ ...f, search: '' }))}
                          className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        >
                          Очистить поиск
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        </div>
      </div>
      {/* Журнал действий администраторов */}
      <AdminActionLogger />
      <ModerationDrawer
        open={!!drawerUser}
        onClose={closeDrawer}
        title={drawerMode === 'ROLE' ? 'Изменение роли' : 'Управление блокировкой'}
      >
        {/* Placeholder: existing dialogs still in row; next step could migrate forms here */}
        {drawerUser && (
          <div className="text-sm space-y-4">
            <div>
              <div className="font-semibold mb-1">Пользователь</div>
              {drawerUser.username}
            </div>
            <div className="opacity-70 text-xs">(Форма будет перенесена сюда на следующем шаге)</div>
          </div>
        )}
      </ModerationDrawer>
    </div>
  )
}