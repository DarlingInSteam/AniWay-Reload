import React from 'react';
import { useParams } from 'react-router-dom';
import { UserProfile } from '@/components/profile/UserProfile';
import { useAuth } from '@/contexts/AuthContext';

export function ProfilePage(): React.ReactElement {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  // Если userId не передан, используем ID текущего пользователя
  const targetUserId = userId || user?.id?.toString();

  // Определяем, является ли это собственным профилем пользователя
  // Если userId не передан или равен ID текущего пользователя, то это собственный профиль
  const isOwnProfile = !userId || user?.id?.toString() === userId;

  if (!targetUserId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ошибка</h2>
          <p className="text-gray-400">Не удалось определить пользователя</p>
        </div>
      </div>
    );
  }

  return (
    <UserProfile
      userId={targetUserId}
      isOwnProfile={isOwnProfile}
    />
  );
}
