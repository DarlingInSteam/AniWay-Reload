import { UserProfile } from '@/types/profile';

interface ProfileBackgroundProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  children: React.ReactNode;
}

export function ProfileBackground({
  profile,
  isOwnProfile,
  children
}: ProfileBackgroundProps) {

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
  <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Контент профиля */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
