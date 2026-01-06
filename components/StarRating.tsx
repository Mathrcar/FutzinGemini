import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, readOnly = false, size = 20 }) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readOnly && onChange && onChange(star)}
            className={`
              flex items-center justify-center
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-125 active:scale-90 transition-all p-1'}
            `}
            disabled={readOnly}
          >
            <Star
              size={size}
              className={`${
                isFilled 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'fill-transparent text-white/10 hover:text-white/30'
              }`}
              strokeWidth={isFilled ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;