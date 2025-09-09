import { apiClient } from '@/lib/api';
import { FavoriteManga } from '@/types/profile';

class FavoritesService {
  /**
   * Обновить весь список избранных манга
   */
  async updateFavorites(mangaIds: number[]): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.updateFavorites(mangaIds);
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
      throw new Error('Не удалось обновить список избранного');
    }
  }

  /**
   * Добавить мангу в избранное
   */
  async addToFavorites(mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.addToFavorites(mangaId);
    } catch (error) {
      console.error('Ошибка при добавлении в избранное:', error);
      throw new Error('Не удалось добавить в избранное');
    }
  }

  /**
   * Удалить мангу из избранного
   */
  async removeFromFavorites(mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.removeFromFavorites(mangaId);
    } catch (error) {
      console.error('Ошибка при удалении из избранного:', error);
      throw new Error('Не удалось удалить из избранного');
    }
  }

  /**
   * Получить список избранных манга (используем исправленный API)
   */
  async getFavorites(): Promise<FavoriteManga[]> {
    try {
      const bookmarks = await apiClient.getUserFavorites();
      return bookmarks
        .filter(bookmark => bookmark.isFavorite && bookmark.manga)
        .map(bookmark => ({
          id: bookmark.manga!.id,
          title: bookmark.manga!.title,
          coverImage: bookmark.manga!.coverImageUrl || '/placeholder-manga.png',
          rating: 8.5, // TODO: Добавить систему рейтингов
          manga: bookmark.manga
        }));
    } catch (error) {
      console.error('Ошибка при получении избранного:', error);
      throw new Error('Не удалось загрузить избранное');
    }
  }

  /**
   * Переключить статус избранного для манги
   */
  async toggleFavorite(mangaId: number): Promise<{ success: boolean; message: string; isFavorite: boolean }> {
    try {
      // Сначала получаем текущие избранные
      const favorites = await this.getFavorites();
      const isFavorite = favorites.some(fav => fav.id === mangaId);

      let result;
      if (isFavorite) {
        result = await this.removeFromFavorites(mangaId);
        return { ...result, isFavorite: false };
      } else {
        result = await this.addToFavorites(mangaId);
        return { ...result, isFavorite: true };
      }
    } catch (error) {
      console.error('Ошибка при переключении избранного:', error);
      throw new Error('Не удалось изменить статус избранного');
    }
  }

  /**
   * Проверить, находится ли манга в избранном
   */
  async isFavorite(mangaId: number): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.id === mangaId);
    } catch (error) {
      console.error('Ошибка при проверке избранного:', error);
      return false;
    }
  }

  /**
   * Получить количество избранных манга
   */
  async getFavoritesCount(): Promise<number> {
    try {
      const favorites = await this.getFavorites();
      return favorites.length;
    } catch (error) {
      console.error('Ошибка при получении количества избранного:', error);
      return 0;
    }
  }

  /**
   * Очистить все избранное
   */
  async clearFavorites(): Promise<{ success: boolean; message: string }> {
    try {
      return await this.updateFavorites([]);
    } catch (error) {
      console.error('Ошибка при очистке избранного:', error);
      throw new Error('Не удалось очистить избранное');
    }
  }

  /**
   * Добавить несколько манга в избранное
   */
  async addMultipleToFavorites(mangaIds: number[]): Promise<{ success: boolean; message: string; added: number }> {
    try {
      // Получаем текущие избранные
      const currentFavorites = await this.getFavorites();
      const currentIds = currentFavorites.map(fav => fav.id);

      // Добавляем новые ID, избегая дубликатов
      const newIds = mangaIds.filter(id => !currentIds.includes(id));
      const updatedIds = [...currentIds, ...newIds];

      const result = await this.updateFavorites(updatedIds);
      return { ...result, added: newIds.length };
    } catch (error) {
      console.error('Ошибка при добавлении нескольких манга в избранное:', error);
      throw new Error('Не удалось добавить манга в избранное');
    }
  }

  /**
   * Удалить несколько манга из избранного
   */
  async removeMultipleFromFavorites(mangaIds: number[]): Promise<{ success: boolean; message: string; removed: number }> {
    try {
      // Получаем текущие избранные
      const currentFavorites = await this.getFavorites();
      const currentIds = currentFavorites.map(fav => fav.id);

      // Удаляем указанные ID
      const updatedIds = currentIds.filter(id => !mangaIds.includes(id));
      const removedCount = currentIds.length - updatedIds.length;

      const result = await this.updateFavorites(updatedIds);
      return { ...result, removed: removedCount };
    } catch (error) {
      console.error('Ошибка при удалении нескольких манга из избранного:', error);
      throw new Error('Не удалось удалить манга из избранного');
    }
  }
}

export const favoritesService = new FavoritesService();
