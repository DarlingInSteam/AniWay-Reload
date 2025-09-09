import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { CommentResponseDTO } from '@/types/comments';

export function useCommentReplies(parentCommentId: number | null, enabled = false) {
  const [replies, setReplies] = useState<CommentResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const fetchReplies = async () => {
      if (!parentCommentId || !enabled) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.getCommentReplies(parentCommentId);
        if (!cancelled) {
          setReplies(data);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(`Ошибка загрузки ответов на комментарий ${parentCommentId}:`, e);
          setError('Ошибка загрузки ответов');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReplies();

    return () => { 
      cancelled = true; 
    };
  }, [parentCommentId, enabled]);

  return { replies, loading, error };
}
