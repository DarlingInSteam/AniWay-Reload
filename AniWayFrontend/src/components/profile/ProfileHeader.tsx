import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserProfile } from '@/types/profile';
import { Camera, Edit, UserPlus, MessageCircle, Settings, MoreHorizontal } from 'lucide-react';
import { profileService } from '@/services/profileService';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

export function ProfileHeader({ profile, isOwnProfile, onProfileUpdate }: ProfileHeaderProps) {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile.username);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Simplified avatar upload (no modal / preview)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  // Auto-hide success after delay
  useEffect(() => {
    if (avatarSuccess) {
      const t = setTimeout(() => setAvatarSuccess(null), 2500);
      return () => clearTimeout(t);
    }
  }, [avatarSuccess]);

  // Вычисляем уровень пользователя и прогресс
  const levels = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 50 },
    { level: 3, xpRequired: 150 },
    { level: 4, xpRequired: 300 },
    { level: 5, xpRequired: 500 },
    { level: 6, xpRequired: 750 },
    { level: 7, xpRequired: 1000 },
    { level: 8, xpRequired: 1500 },
    { level: 9, xpRequired: 2000 },
    { level: 10, xpRequired: 3000 },
  ];
  const totalActivity = (profile.mangaRead || 0) * 10 + (profile.chaptersRead || 0);
  
  let userLevel = 1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalActivity >= levels[i].xpRequired) {
      userLevel = levels[i].level;
      break;
    }
  }
  const currentLevelData = levels[userLevel - 1];
  const nextLevelData = levels[userLevel] || levels[levels.length - 1];
  const xpForCurrentLevel = currentLevelData.xpRequired;
  const xpForNextLevel = nextLevelData.xpRequired;
  const progressXP = totalActivity - xpForCurrentLevel;
  const totalXPForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = userLevel >= 10 ? 100 : (totalXPForNextLevel > 0 ? Math.min(100, (progressXP / totalXPForNextLevel) * 100) : 0);

  const handleUsernameSubmit = () => {
    if (newUsername.trim() && newUsername !== profile.username) {
      onProfileUpdate?.({ username: newUsername.trim() });
    }
    setIsEditingUsername(false);
  };

  const validateAvatar = (file: File): string | null => {
    if (file.size > 5 * 1024 * 1024) return 'Файл превышает 5MB';
    if (!file.type.startsWith('image/')) return 'Можно загружать только изображения';
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return 'Поддерживаются JPEG, PNG, WebP';
    return null;
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateAvatar(file);
    if (err) {
      setAvatarError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setAvatarError(null);
    setAvatarSuccess(null);
    setUploadingAvatar(true);
    try {
      const res = await profileService.uploadAvatar(file);
      if (res.success) {
        onProfileUpdate?.({ avatar: res.avatarUrl });
        setAvatarSuccess('Аватар обновлён');
      } else {
        setAvatarError(res.message || 'Ошибка загрузки');
      }
    } catch (ex: any) {
      setAvatarError(ex?.message || 'Сбой загрузки');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getLevelBadgeColor = (level: number) => {
    if (level >= 50) return 'bg-purple-600 text-white';
    if (level >= 25) return 'bg-blue-600 text-white';
    if (level >= 10) return 'bg-green-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return '';
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д назад`;
    if (hours > 0) return `${hours}ч назад`;
    if (minutes > 0) return `${minutes}мин назад`;
    return 'только что';
  };

  return (
    <>
      <Card className="relative p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Аватар */}
        <div className="relative group">
          <Avatar className="w-44 h-44 border-4 border-white/20 rounded-none relative z-10 select-none">
            <AvatarImage
              src={profile.avatar || '/icon.png'}
              alt={profile.username}
              className="object-cover rounded-none w-full h-full"
            />
            <AvatarFallback className="text-2xl bg-white/20 text-white rounded-none w-full h-full flex items-center justify-center">
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOwnProfile && (avatarError || avatarSuccess) && (
            <div className="absolute -bottom-6 left-0 w-full text-center text-xs font-medium">
              {avatarError && <span className="text-red-400">{avatarError}</span>}
              {avatarSuccess && <span className="text-green-400">{avatarSuccess}</span>}
            </div>
          )}
        </div>

        {/* Основная информация пользователя */}
        <div className="flex-1 text-center md:text-left">
          {/* Имя пользователя */}
          <div className="mb-2">
            {isEditingUsername ? (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                  className="text-xl font-bold bg-white/10 border-white/20 text-white"
                  autoFocus
                />
                <Button onClick={handleUsernameSubmit} size="sm" className="bg-blue-500/20 hover:bg-blue-500/30">
                  Сохранить
                </Button>
                <Button
                  onClick={() => {
                    setIsEditingUsername(false);
                    setNewUsername(profile.username);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 hover:bg-white/10"
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {profile.username}
                </h1>
                {isOwnProfile && (
                  <>
                    <Button
                      onClick={() => setIsEditingUsername(true)}
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="ghost"
                      size="sm"
                      disabled={uploadingAvatar}
                      className="p-1 h-auto hover:bg-white/10 text-blue-300"
                    >
                      {uploadingAvatar ? (
                        <span className="w-4 h-4 animate-spin border-2 border-white/30 border-t-white rounded-full" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Статистика */}
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-200">
            <div className="text-center px-3 py-2 bg-white/5 rounded-lg backdrop-blur-sm">
              <div className="font-semibold text-white">{profile.mangaRead}</div>
              <div>Прочитано манги</div>
            </div>
            <div className="text-center px-3 py-2 bg-white/5 rounded-lg backdrop-blur-sm">
              <div className="font-semibold text-white">{profile.chaptersRead}</div>
              <div>Глав прочитано</div>
            </div>
            <div className="text-center px-3 py-2 bg-white/5 rounded-lg backdrop-blur-sm">
              <div className="font-semibold text-white">{Math.floor(profile.totalReadingTime / 60)}ч</div>
              <div>Время чтения</div>
            </div>
          </div>
        </div>

        {/* Правая панель с уровнем и кнопками на нижней границе */}
        <div className="flex flex-col justify-between items-end min-w-[260px] h-full">
          {/* Индикатор уровня посередине справа */}
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${getLevelBadgeColor(userLevel)} font-semibold backdrop-blur-sm text-lg px-4 py-2`}>
              Уровень {userLevel}
            </Badge>
            {/* Прогресс-бар уровня */}
            {userLevel < 10 && (
              <div className="w-48 mt-2 mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Прогресс</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-out rounded-full`}
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{Math.max(0, progressXP)} XP</span>
                  <span>{totalXPForNextLevel} XP</span>
                </div>
              </div>
            )}
            {userLevel >= 10 && (
              <div className="w-48 mt-2 mb-2 text-center">
                <div className="text-sm text-yellow-400 font-medium">
                  🌟 Максимальный уровень достигнут!
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full ${profile.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-200">
                {profile.isOnline ? 'В сети' : formatLastSeen(profile.lastSeen)}
              </span>
            </div>
          </div>

          {/* Кнопки действий строго на нижней границе справа */}
          <div className="flex flex-wrap items-center gap-2 justify-end mt-auto pt-6">
            {!isOwnProfile && (
              <>
                <Button className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 backdrop-blur-sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Добавить в друзья
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 backdrop-blur-sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Сообщение
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 backdrop-blur-sm">
                  <MoreHorizontal className="w-4 h-4 mr-2" />
                  Ещё...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnProfile && (
                  <DropdownMenuItem 
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Настройки
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>

    {/* Диалог настроек профиля */}
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="bg-black backdrop-blur-md border border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Настройки профиля</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Основные настройки */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Основные настройки</h3>
            
            {/* Отображаемое имя */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Отображаемое имя</label>
              <Input
                defaultValue={profile.displayName || profile.username}
                className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-gray-400"
                placeholder="Ваше отображаемое имя"
              />
              <p className="text-xs text-gray-400">Это имя будут видеть другие пользователи</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input
                defaultValue={profile.email}
                className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-gray-400"
                placeholder="your.email@example.com"
                type="email"
              />
            </div>
          </div>

          {/* Настройки приватности */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Настройки приватности</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Показывать мою активность</p>
                  <p className="text-xs text-gray-400">Другие пользователи смогут видеть ваши комментарии и отзывы</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-600">Включено</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Показывать прогресс чтения</p>
                  <p className="text-xs text-gray-400">Отображение текущего прогресса чтения в профиле</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-600">Включено</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Показывать избранное</p>
                  <p className="text-xs text-gray-400">Отображение списка любимой манги в профиле</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-600">Включено</Button>
              </div>
            </div>
          </div>

          {/* Уведомления */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Уведомления</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Email-уведомления</p>
                  <p className="text-xs text-gray-400">Получать уведомления на электронную почту</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-600">Отключено</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">Уведомления о новых главах</p>
                  <p className="text-xs text-gray-400">Получать уведомления о выходе новых глав</p>
                </div>
                <Button variant="outline" size="sm" className="border-gray-600">Включено</Button>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800/50"
            >
              Отмена
            </Button>
            <Button
              className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30"
              onClick={() => {
                // TODO: Сохранение настроек
                setSettingsOpen(false);
              }}
            >
              Сохранить изменения
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Avatar dialog removed - inline upload flow */}
    </>
  );
}
