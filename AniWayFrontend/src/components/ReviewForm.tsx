import React, { useState, useEffect } from 'react';
import RatingStars from './RatingStars';
import { ReviewData } from './ReviewCard';

interface ReviewFormProps {
  mangaId: number;
  existingReview?: ReviewData;
  onSubmit: (rating: number, comment: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  mangaId,
  existingReview,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const isEditing = !!existingReview;

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    }
  }, [existingReview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 10) {
      alert('Оценка должна быть от 1 до 10');
      return;
    }
    onSubmit(rating, comment.trim());
  };

  const handleRatingClick = (newRating: number) => {
    setRating(newRating);
  };

  const handleRatingHover = (newRating: number) => {
    setHoveredRating(newRating);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

  const renderRatingSelector = () => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      const isActive = i <= (hoveredRating || rating);
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => handleRatingClick(i)}
          onMouseEnter={() => handleRatingHover(i)}
          onMouseLeave={handleRatingLeave}
          className={`w-8 h-8 transition-all duration-200 hover:scale-110 ${
            isActive ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          <svg
            fill="currentColor"
            viewBox="0 0 24 24"
            className="w-full h-full"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      );
    }
    return stars;
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6">
        {isEditing ? 'Редактировать отзыв' : 'Написать отзыв'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-3">
            Оценка *
          </label>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              {renderRatingSelector()}
            </div>
            <span className="text-lg font-medium text-white ml-2">
              {hoveredRating || rating}/10
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Нажмите на звезду для выбора оценки
          </p>
        </div>

        {/* Comment Section */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-200 mb-2">
            Комментарий
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[120px] bg-white/10 backdrop-blur-sm text-white placeholder:text-gray-400"
            placeholder="Поделитесь своими впечатлениями о манге..."
            maxLength={2000}
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">
              Расскажите о сюжете, персонажах, рисовке...
            </p>
            <span className="text-xs text-gray-400">
              {comment.length}/2000
            </span>
          </div>
        </div>

        {/* Preview */}
        {comment.trim() && (
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <p className="text-sm font-medium text-gray-200 mb-2">Предварительный просмотр:</p>
            <div className="flex items-center gap-3 mb-2">
              <RatingStars rating={rating} maxRating={10} size="sm" showValue={false} />
              <span className="text-sm font-medium text-white">{rating}/10</span>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">
              {comment.trim()}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-300 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting || rating < 1 || rating > 10}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditing ? 'Сохранение...' : 'Отправка...'}
              </>
            ) : (
              isEditing ? 'Сохранить изменения' : 'Опубликовать отзыв'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
