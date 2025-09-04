import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/types/profile';
import { Camera } from 'lucide-react';

interface ProfileBackgroundProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onBackgroundUpdate?: (backgroundImage: string) => void;
  children: React.ReactNode;
}

export function ProfileBackground({
  profile,
  isOwnProfile,
  onBackgroundUpdate,
  children
}: ProfileBackgroundProps) {
  const [backgroundUploadOpen, setBackgroundUploadOpen] = useState(false);

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Реализовать загрузку фона
      console.log('Uploading background:', file);
      setBackgroundUploadOpen(false);
    }
  };

  const defaultBackground = '/api/placeholder/1920/1080';
  const backgroundImage = profile.backgroundImage || defaultBackground;

  return (
    <div className="relative min-h-screen">
      {/* Фоновое изображение */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Полупрозрачный overlay для читаемости */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Кнопка смены фона для владельца профиля */}
      {isOwnProfile && (
        <Dialog open={backgroundUploadOpen} onOpenChange={setBackgroundUploadOpen}>
          <DialogTrigger asChild>
            <Button
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm"
              size="sm"
            >
              <Camera className="w-4 h-4 mr-2" />
              Изменить фон
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изменить фон профиля</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBackgroundUpload}
              />
              <p className="text-sm text-gray-400">
                Поддерживаются JPG, PNG и WebP файлы. Рекомендуемый размер: 1920x1080px
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Контент профиля */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
