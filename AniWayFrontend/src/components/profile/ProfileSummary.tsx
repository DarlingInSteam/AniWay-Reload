import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/types/profile';
import { Edit, Save, X, ExternalLink } from 'lucide-react';

interface ProfileSummaryProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

export function ProfileSummary({ profile, isOwnProfile, onProfileUpdate }: ProfileSummaryProps) {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState(profile.bio || '');

  const handleBioSubmit = () => {
    onProfileUpdate?.({ bio: newBio });
    setIsEditingBio(false);
  };

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long'
    }).format(date);
  };

  const socialIcons = {
    twitter: '𝕏',
    discord: '💬',
    telegram: '✈️',
    vk: 'VK'
  };

  return (
    <div className="space-y-6">
      {/* Карточка "О пользователе" */}
      <Card className="bg-white/3 backdrop-blur-md border border-white/8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          О пользователе
          {isOwnProfile && !isEditingBio && (
            <Button
              onClick={() => setIsEditingBio(true)}
              variant="ghost"
              size="sm"
              className="p-1 h-auto hover:bg-white/8"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Биография */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Биография</h4>
          {isEditingBio ? (
            <div className="space-y-3">
              <Textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Расскажите о себе..."
                className="min-h-[100px] bg-gray-800/50 border-gray-600 resize-none text-gray-100 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {newBio.length}/1000 символов
                </span>
                <div className="flex gap-2">
                  <Button onClick={handleBioSubmit} size="sm" className="bg-blue-500/15 hover:bg-blue-500/25 border-blue-400/25">
                    <Save className="w-4 h-4 mr-1" />
                    Сохранить
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingBio(false);
                      setNewBio(profile.bio || '');
                    }}
                    variant="outline"
                    size="sm"
                    className="border-white/15 bg-white/3 hover:bg-white/8"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-200 whitespace-pre-wrap p-3 rounded-lg bg-white/3">
              {profile.bio ? (
                profile.bio 
              ) : isOwnProfile ? (
                'Добавьте описание о себе'
              ) : (
                <div>
                  <p className="text-gray-400">Пользователь не добавил описание</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Любимые жанры */}
        {profile.favoriteGenres && profile.favoriteGenres.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Любимые жанры</h4>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="bg-white/8 text-gray-200 hover:bg-white/15 border-white/15"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Любимые жанры</h4>
            <div className="text-center py-4 text-gray-400 text-sm bg-white/3 rounded-lg">
              <p>Жанры определяются автоматически</p>
              <p className="text-xs mt-1">На основе ваших закладок</p>
            </div>
          </div>
        )}

        {/* Социальные сети */}
        {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Социальные сети</h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(profile.socialLinks).map(([platform, url]) => {
                if (!url) return null;
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-white/8 hover:bg-white/15 rounded-lg transition-colors text-sm text-gray-200 hover:text-white border border-white/8"
                  >
                    <span>{socialIcons[platform as keyof typeof socialIcons] || '🔗'}</span>
                    <span className="capitalize">{platform}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Социальные сети</h4>
            <div className="text-center py-4 text-gray-400 text-sm bg-white/3 rounded-lg">
              <p>Социальные сети не добавлены</p>
              <p className="text-xs mt-1">Функция находится в разработке</p>
            </div>
          </div>
        )}

        {/* Дата регистрации и статистика активности */}
        <div className="pt-4 border-t border-white/8 space-y-3">
          <div className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-white/3">
            <span className="text-gray-300">Присоединился</span>
            <span className="text-gray-200">{formatJoinDate(profile.joinedDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
