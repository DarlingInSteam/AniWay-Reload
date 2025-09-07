import { apiClient } from '@/lib/api';
import { UserCollection } from '@/types/profile';

export interface CreateCollectionData {
  name: string;
  description?: string;
  isPublic?: boolean;
  mangaIds?: number[];
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  isPublic?: boolean;
  mangaIds?: number[];
}

class CollectionService {
  /**
   * Получить все коллекции пользователя
   */
  async getUserCollections(): Promise<UserCollection[]> {
    try {
      return await apiClient.getUserCollections();
    } catch (error) {
      console.error('Ошибка при получении коллекций:', error);
      throw new Error('Не удалось загрузить коллекции');
    }
  }

  /**
   * Получить коллекцию по ID
   */
  async getCollectionById(id: string): Promise<UserCollection> {
    try {
      return await apiClient.getCollectionById(id);
    } catch (error) {
      console.error('Ошибка при получении коллекции:', error);
      throw new Error('Коллекция не найдена');
    }
  }

  /**
   * Создать новую коллекцию
   */
  async createCollection(data: CreateCollectionData): Promise<UserCollection> {
    try {
      if (!data.name.trim()) {
        throw new Error('Название коллекции не может быть пустым');
      }

      return await apiClient.createCollection(data);
    } catch (error) {
      console.error('Ошибка при создании коллекции:', error);
      throw error instanceof Error ? error : new Error('Не удалось создать коллекцию');
    }
  }

  /**
   * Обновить существующую коллекцию
   */
  async updateCollection(id: string, data: UpdateCollectionData): Promise<UserCollection> {
    try {
      if (data.name && !data.name.trim()) {
        throw new Error('Название коллекции не может быть пустым');
      }

      return await apiClient.updateCollection(id, data);
    } catch (error) {
      console.error('Ошибка при обновлении коллекции:', error);
      throw error instanceof Error ? error : new Error('Не удалось обновить коллекцию');
    }
  }

  /**
   * Удалить коллекцию
   */
  async deleteCollection(id: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.deleteCollection(id);
    } catch (error) {
      console.error('Ошибка при удалении коллекции:', error);
      throw new Error('Не удалось удалить коллекцию');
    }
  }

  /**
   * Добавить мангу в коллекцию
   */
  async addMangaToCollection(collectionId: string, mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.addMangaToCollection(collectionId, mangaId);
    } catch (error) {
      console.error('Ошибка при добавлении манги в коллекцию:', error);
      throw new Error('Не удалось добавить мангу в коллекцию');
    }
  }

  /**
   * Удалить мангу из коллекции
   */
  async removeMangaFromCollection(collectionId: string, mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.removeMangaFromCollection(collectionId, mangaId);
    } catch (error) {
      console.error('Ошибка при удалении манги из коллекции:', error);
      throw new Error('Не удалось удалить мангу из коллекции');
    }
  }

  /**
   * Создать коллекцию со стандартными настройками
   */
  async createQuickCollection(name: string, mangaIds: number[] = []): Promise<UserCollection> {
    return this.createCollection({
      name,
      description: `Коллекция "${name}"`,
      isPublic: false,
      mangaIds
    });
  }

  /**
   * Проверить, есть ли манга в коллекции
   */
  async isMangaInCollection(collectionId: string, mangaId: number): Promise<boolean> {
    try {
      const collection = await this.getCollectionById(collectionId);
      return collection.bookmarks?.some(bookmark => bookmark.mangaId === mangaId) || false;
    } catch (error) {
      console.error('Ошибка при проверке манги в коллекции:', error);
      return false;
    }
  }

  /**
   * Получить количество манги в коллекции
   */
  async getCollectionMangaCount(collectionId: string): Promise<number> {
    try {
      const collection = await this.getCollectionById(collectionId);
      return collection.mangaCount || collection.bookmarks?.length || 0;
    } catch (error) {
      console.error('Ошибка при получении количества манги в коллекции:', error);
      return 0;
    }
  }
}

export const collectionService = new CollectionService();
