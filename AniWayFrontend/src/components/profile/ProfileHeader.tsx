import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserProfile } from '@/types/profile';
import { Camera, Edit, UserPlus, MessageCircle, Settings } from 'lucide-react';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

export function ProfileHeader({ profile, isOwnProfile, onProfileUpdate }: ProfileHeaderProps) {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile.username);
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);

  const handleUsernameSubmit = () => {
    if (newUsername.trim() && newUsername !== profile.username) {
      onProfileUpdate?.({ username: newUsername.trim() });
    }
    setIsEditingUsername(false);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Реализовать загрузку аватара
      console.log('Uploading avatar:', file);
      setAvatarUploadOpen(false);
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
    <Card className="relative p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Аватар */}
        <div className="relative group">
          <Avatar className="w-44 h-44 border-4 border-white/20 rounded-none">
            <AvatarImage
              src={profile.avatar || '/placeholder-avatar.png'}
              alt={profile.username}
              className="object-cover rounded-none w-full h-full"
            />
            <AvatarFallback className="text-2xl bg-white/20 text-white rounded-none w-full h-full flex items-center justify-center">
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {isOwnProfile && (
            <Dialog open={avatarUploadOpen} onOpenChange={setAvatarUploadOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-none w-10 h-10 p-0 bg-blue-500/30 hover:bg-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-blue-400/30"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900/95 backdrop-blur-md border border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Изменить аватар</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleAvatarUpload}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <p className="text-sm text-gray-300">
                    Поддерживаются JPG и PNG файлы. Рекомендуемый размер: 184x184px
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Информация о пользователе */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {profile.username}
                </h1>
                {isOwnProfile && (
                  <Button
                    onClick={() => setIsEditingUsername(true)}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
            <Badge className={`${getLevelBadgeColor(profile.level)} font-semibold backdrop-blur-sm`}>
              Уровень {profile.level}
            </Badge>

            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full ${profile.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-200">
                {profile.isOnline ? 'В сети' : formatLastSeen(profile.lastSeen)}
              </span>
            </div>
          </div>

          {/* Статистика */}
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-200 mb-4">
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

        {/* Кнопки действий */}
        <div className="flex flex-col gap-2 min-w-[140px]">
          {isOwnProfile ? (
            <Button className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 backdrop-blur-sm">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </Button>
          ) : (
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
        </div>
      </div>
    </Card>
  );
}
