import { useState, useEffect, useCallback } from 'react';
import { FilterDataService, Genre, Tag } from '../services/filterDataService';

// Хук для загрузки и кэширования данных фильтров
export const useFilterData = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [genresError, setGenresError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);

  // Загрузка жанров
  const loadGenres = useCallback(async () => {
    try {
      setIsLoadingGenres(true);
      setGenresError(null);
      const data = await FilterDataService.getActiveGenres();
      setGenres(data);
    } catch (error) {
      console.error('Ошибка загрузки жанров:', error);
      setGenresError('Не удалось загрузить жанры');
    } finally {
      setIsLoadingGenres(false);
    }
  }, []);

  // Загрузка тегов
  const loadTags = useCallback(async () => {
    try {
      setIsLoadingTags(true);
      setTagsError(null);
      const data = await FilterDataService.getActiveTags();
      setTags(data);
    } catch (error) {
      console.error('Ошибка загрузки тегов:', error);
      setTagsError('Не удалось загрузить теги');
    } finally {
      setIsLoadingTags(false);
    }
  }, []);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadGenres();
    loadTags();
  }, [loadGenres, loadTags]);

  return {
    genres,
    tags,
    isLoadingGenres,
    isLoadingTags,
    genresError,
    tagsError,
    reloadGenres: loadGenres,
    reloadTags: loadTags,
    isLoading: isLoadingGenres || isLoadingTags,
    hasError: genresError !== null || tagsError !== null
  };
};

// Хук для поиска жанров и тегов
export const useFilterSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchGenres = useCallback(async (query: string): Promise<Genre[]> => {
    if (!query.trim()) return [];
    
    try {
      setIsSearching(true);
      setSearchError(null);
      return await FilterDataService.searchGenres(query);
    } catch (error) {
      console.error('Ошибка поиска жанров:', error);
      setSearchError('Ошибка поиска жанров');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchTags = useCallback(async (query: string): Promise<Tag[]> => {
    if (!query.trim()) return [];
    
    try {
      setIsSearching(true);
      setSearchError(null);
      return await FilterDataService.searchTags(query);
    } catch (error) {
      console.error('Ошибка поиска тегов:', error);
      setSearchError('Ошибка поиска тегов');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const autocompleteGenres = useCallback(async (query: string, limit: number = 10): Promise<Genre[]> => {
    if (!query.trim()) return [];
    
    try {
      return await FilterDataService.autocompleteGenres(query, limit);
    } catch (error) {
      console.error('Ошибка автодополнения жанров:', error);
      return [];
    }
  }, []);

  const autocompleteTags = useCallback(async (query: string, limit: number = 15): Promise<Tag[]> => {
    if (!query.trim()) return [];
    
    try {
      return await FilterDataService.autocompleteTags(query, limit);
    } catch (error) {
      console.error('Ошибка автодополнения тегов:', error);
      return [];
    }
  }, []);

  return {
    searchGenres,
    searchTags,
    autocompleteGenres,
    autocompleteTags,
    isSearching,
    searchError
  };
};