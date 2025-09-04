import React from 'react';
import { useParams } from 'react-router-dom';
import { UserProfile } from '@/components/profile/UserProfile';
import { useAuth } from '@/contexts/AuthContext';

export function ProfilePage(): React.ReactElement {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  // Определяем, является ли это собственным профилем пользователя
  const isOwnProfile = user?.id === userId;

  // Если userId не передан, используем ID текущего пользователя
  const targetUserId = userId || user?.id;

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
