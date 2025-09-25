import React, { useState } from 'react';
import XpHistoryList from '@/components/profile/XpHistoryList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, BookOpen, Trophy, Target } from 'lucide-react';

interface LevelData {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXPForNextLevel: number;
  levelName: string;
  levelIcon: string;
  levelColor: string;
  achievements: string[];
}

interface LevelIndicatorProps {
  levelData: LevelData;
  className?: string;
}

// Мокданные для демонстрации
export const getMockLevelData = (mangaRead: number, chaptersRead: number): LevelData => {
  // Расчет уровня на основе активности
  const totalActivity = mangaRead * 10 + chaptersRead;
  
  const levels = [
    { level: 1, name: "Новичок", xpRequired: 0, icon: "🌱", color: "from-green-400 to-green-600" },
    { level: 2, name: "Читатель", xpRequired: 50, icon: "📖", color: "from-blue-400 to-blue-600" },
    { level: 3, name: "Знаток", xpRequired: 150, icon: "🎓", color: "from-purple-400 to-purple-600" },
    { level: 4, name: "Эксперт", xpRequired: 300, icon: "⭐", color: "from-yellow-400 to-yellow-600" },
    { level: 5, name: "Мастер", xpRequired: 500, icon: "👑", color: "from-orange-400 to-orange-600" },
    { level: 6, name: "Гуру", xpRequired: 750, icon: "🔥", color: "from-red-400 to-red-600" },
    { level: 7, name: "Легенда", xpRequired: 1000, icon: "💎", color: "from-cyan-400 to-cyan-600" },
    { level: 8, name: "Мифический", xpRequired: 1500, icon: "🌟", color: "from-pink-400 to-pink-600" },
    { level: 9, name: "Божественный", xpRequired: 2000, icon: "⚡", color: "from-indigo-400 to-indigo-600" },
    { level: 10, name: "Вечный", xpRequired: 3000, icon: "🌌", color: "from-violet-400 via-purple-500 to-pink-500" },
  ];
  
  let currentLevel = 1;
  let currentXP = totalActivity;
  
  // Найти текущий уровень
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalActivity >= levels[i].xpRequired) {
      currentLevel = levels[i].level;
      break;
    }
  }
  
  const currentLevelData = levels[currentLevel - 1];
  const nextLevelData = levels[currentLevel] || levels[levels.length - 1];
  
  const xpForCurrentLevel = currentLevelData.xpRequired;
  const xpForNextLevel = nextLevelData.xpRequired;
  const progressXP = currentXP - xpForCurrentLevel;
  const xpToNextLevel = xpForNextLevel - currentXP;
  const totalXPForNextLevel = xpForNextLevel - xpForCurrentLevel;
  
  // Генерируем достижения на основе активности
  const achievements = [];
  if (mangaRead >= 1) achievements.push("Первое чтение");
  if (mangaRead >= 5) achievements.push("Коллекционер");
  if (mangaRead >= 10) achievements.push("Библиофил");
  if (chaptersRead >= 50) achievements.push("Марафонец");
  if (chaptersRead >= 100) achievements.push("Неутомимый");
  if (chaptersRead >= 200) achievements.push("Легенда чтения");
  
  return {
    currentLevel,
    currentXP: Math.max(0, progressXP),
    xpToNextLevel: Math.max(0, xpToNextLevel),
    totalXPForNextLevel,
    levelName: currentLevelData.name,
    levelIcon: currentLevelData.icon,
    levelColor: currentLevelData.color,
    achievements
  };
};

export function LevelIndicator({ levelData, className = "" }: LevelIndicatorProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const progressPercentage = levelData.totalXPForNextLevel > 0 
    ? Math.min(100, (levelData.currentXP / levelData.totalXPForNextLevel) * 100)
    : 100;
  
  const isMaxLevel = levelData.currentLevel >= 10;
  
  return (
    <>
    <Card onClick={() => setOpen(true)} className={`cursor-pointer hover:shadow-xl transition-shadow bg-white/3 backdrop-blur-md border border-white/8 shadow-lg overflow-hidden ${className}`}>
      <CardContent className="p-6">
        {/* Заголовок с уровнем */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${levelData.levelColor} flex items-center justify-center text-2xl shadow-lg`}>
              {levelData.levelIcon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Уровень {levelData.currentLevel}
              </h3>
              <p className={`text-sm font-medium bg-gradient-to-r ${levelData.levelColor} bg-clip-text text-transparent`}>
                {levelData.levelName}
              </p>
            </div>
          </div>
          
          {/* Статистика */}
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400 mb-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{levelData.currentLevel}</span>
            </div>
            <div className="text-xs text-gray-400">
              {isMaxLevel ? "Макс. уровень" : `${levelData.xpToNextLevel} до след.`}
            </div>
          </div>
        </div>
        
        {/* Прогресс бар */}
        {!isMaxLevel && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Прогресс</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full bg-gradient-to-r ${levelData.levelColor} transition-all duration-500 ease-out rounded-full`}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{levelData.currentXP} XP</span>
              <span>{levelData.totalXPForNextLevel} XP</span>
            </div>
          </div>
        )}
        
        {/* Последние достижения */}
        {levelData.achievements.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Достижения</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {levelData.achievements.slice(-3).map((achievement, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-white/8 text-gray-200 hover:bg-white/15 border-white/15 text-xs"
                >
                  {achievement}
                </Badge>
              ))}
              {levelData.achievements.length > 3 && (
                <Badge
                  variant="secondary"
                  className="bg-white/5 text-gray-400 border-white/10 text-xs"
                >
                  +{levelData.achievements.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Быстрая статистика */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium text-white">{Math.floor(levelData.currentXP / 10)}</div>
            <div className="text-xs text-gray-400">Манга</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium text-white">{levelData.currentXP}</div>
            <div className="text-xs text-gray-400">Активность</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium text-white">{levelData.achievements.length}</div>
            <div className="text-xs text-gray-400">Награды</div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg bg-neutral-900/95 border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">История опыта</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-gray-400 mb-3">Последние действия, дающие вам XP</div>
        <XpHistoryList userId={user?.id} />
      </DialogContent>
    </Dialog>
    </>
  );
}
