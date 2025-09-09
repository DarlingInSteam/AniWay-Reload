import React from 'react';
import { UserComments } from '@/components/profile/ShowcaseModules';
import { CommentResponseDTO } from '@/types/comments';

// Простые тестовые комментарии
const testComments: CommentResponseDTO[] = [
  {
    id: 1,
    content: "Отличная манга! Очень понравился сюжет.",
    userId: 1,
    username: "TestUser",
    targetId: 2, // ID манги, которая существует
    type: "MANGA",
    parentCommentId: undefined,
    createdAt: "2025-09-08T00:47:00Z",
    updatedAt: "2025-09-08T00:47:00Z",
    isEdited: false,
    isDeleted: false,
    likesCount: 5,
    dislikesCount: 1,
    repliesCount: 0
  },
  {
    id: 2,
    content: "Эта глава была невероятной!",
    userId: 2,
    username: "ChapterFan",
    targetId: 1, // ID главы
    type: "CHAPTER", 
    parentCommentId: undefined,
    createdAt: "2025-09-07T15:30:00Z",
    updatedAt: "2025-09-07T15:30:00Z",
    isEdited: false,
    isDeleted: false,
    likesCount: 3,
    dislikesCount: 0,
    repliesCount: 0
  },
  {
    id: 3,
    content: "У тебя отличный вкус в манге!",
    userId: 3,
    username: "ProfileVisitor",
    targetId: 1, // ID пользователя
    type: "PROFILE",
    parentCommentId: undefined,
    createdAt: "2025-09-06T12:00:00Z",
    updatedAt: "2025-09-06T12:00:00Z",
    isEdited: false,
    isDeleted: false,
    likesCount: 2,
    dislikesCount: 0,
    repliesCount: 0
  }
];

export default function CommentTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Тестирование комментариев</h1>
          <p className="text-gray-300 mb-4">
            Откройте консоль разработчика (F12) чтобы увидеть логи загрузки данных.
          </p>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Тестовые данные:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Комментарий к манге (ID: 2)</li>
              <li>• Комментарий к главе (ID: 1)</li>
              <li>• Комментарий к профилю (ID: 1)</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <UserComments 
            userId={1} 
            isOwnProfile={true} 
          />
        </div>
        
        <div className="mt-8 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">Отладочная информация:</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>Если вы видите "undefined #2" вместо названия манги, проверьте:</p>
            <ul className="ml-4 space-y-1">
              <li>1. Работают ли API endpoints (/api/manga/2, /api/chapters/1, /api/auth/users/1)</li>
              <li>2. Правильно ли настроен прокси в vite.config.ts</li>
              <li>3. Запущен ли бэкенд сервер</li>
              <li>4. Есть ли CORS ошибки в консоли</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
