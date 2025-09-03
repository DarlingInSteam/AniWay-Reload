import React from 'react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 10,
  size = 'md',
  showValue = true,
  interactive = false,
  onRatingChange
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const renderStars = () => {
    const stars = [];
    
    // For 10-star rating system, show all 10 stars
    if (maxRating === 10) {
      for (let i = 1; i <= 10; i++) {
        const isActive = i <= rating;
        stars.push(
          <button
            key={i}
            onClick={() => handleStarClick(i)}
            disabled={!interactive}
            className={`${sizeClasses[size]} ${
              interactive 
                ? 'cursor-pointer hover:scale-110 transition-transform' 
                : 'cursor-default'
            }`}
          >
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className={isActive ? "text-yellow-400" : "text-gray-300"}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      }
      return stars;
    }

    // For 5-star rating system (legacy)
    const fullStars = Math.floor(rating / 2); // Convert 10-point to 5-point scale
    const hasHalfStar = (rating % 2) >= 1;

    // Render full stars
    for (let i = 1; i <= fullStars; i++) {
      stars.push(
        <button
          key={i}
          onClick={() => handleStarClick(i * 2)}
          disabled={!interactive}
          className={`${sizeClasses[size]} ${
            interactive 
              ? 'cursor-pointer hover:scale-110 transition-transform' 
              : 'cursor-default'
          }`}
        >
          <svg
            fill="currentColor"
            viewBox="0 0 24 24"
            className="text-yellow-400"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      );
    }

    // Render half star if needed
    if (hasHalfStar) {
      stars.push(
        <button
          key={fullStars + 1}
          onClick={() => handleStarClick((fullStars + 1) * 2 - 1)}
          disabled={!interactive}
          className={`${sizeClasses[size]} ${
            interactive 
              ? 'cursor-pointer hover:scale-110 transition-transform' 
              : 'cursor-default'
          } relative`}
        >
          <svg
            fill="currentColor"
            viewBox="0 0 24 24"
            className="text-gray-300"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <svg
            fill="currentColor"
            viewBox="0 0 24 24"
            className="text-yellow-400 absolute top-0 left-0 overflow-hidden"
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      );
    }

    // Render empty stars
    const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 1; i <= remainingStars; i++) {
      const starValue = (fullStars + (hasHalfStar ? 1 : 0) + i) * 2;
      stars.push(
        <button
          key={starValue}
          onClick={() => handleStarClick(starValue)}
          disabled={!interactive}
          className={`${sizeClasses[size]} ${
            interactive 
              ? 'cursor-pointer hover:scale-110 transition-transform' 
              : 'cursor-default'
          }`}
        >
          <svg
            fill="currentColor"
            viewBox="0 0 24 24"
            className="text-gray-300"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      );
    }

    return stars;
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {renderStars()}
      </div>
      {showValue && (
        <span className={`${textSizeClasses[size]} text-gray-600 ml-1 font-medium`}>
          {rating.toFixed(1)}/{maxRating}
        </span>
      )}
    </div>
  );
};

export default RatingStars;
