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
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readOnly && onChange && onChange(star)}
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
            disabled={readOnly}
          >
            <Star
              size={size}
              className={`${
                isFilled 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'fill-transparent text-[#555] hover:text-[#777]'
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