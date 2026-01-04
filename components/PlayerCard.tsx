import React from 'react';
import { Player, PlayerType } from '../types';
import { Trash2, UserCog, CheckCircle, XCircle, Shield, MoreHorizontal, Play } from 'lucide-react';
import StarRating from './StarRating';

interface PlayerCardProps {
  player: Player;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onPromote?: (id: string) => void;
  onUpdateStars?: (id: string, stars: number) => void;
  mode: 'MANAGE' | 'RATE' | 'SELECT';
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  responsibleName?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onDelete, 
  onToggleStatus, 
  onPromote,
  onUpdateStars,
  mode,
  isSelected,
  onSelectToggle,
  responsibleName
}) => {
  
  const handleSelect = () => {
    if (mode === 'SELECT' && onSelectToggle) {
      onSelectToggle(player.id);
    }
  };

  return (
    <div 
      className={`
        group relative rounded-md p-4 transition-all duration-300
        ${mode === 'SELECT' ? 'cursor-pointer' : ''}
        ${isSelected 
            ? 'bg-spotify-highlight border border-spotify-green/50' 
            : 'bg-spotify-elevated hover:bg-spotify-highlight border border-transparent'}
        ${!player.isActive && mode !== 'SELECT' ? 'opacity-40 grayscale' : ''}
      `}
      onClick={handleSelect}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img 
            src={player.photoUrl} 
            alt={player.name} 
            className={`w-12 h-12 rounded-full object-cover shadow-lg transition-all group-hover:shadow-xl ${isSelected ? 'ring-2 ring-spotify-green' : ''}`}
          />
          {player.isGoalkeeper && (
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-0.5 rounded-full shadow-sm" title="Goleiro">
              <Shield size={10} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-base truncate ${isSelected ? 'text-spotify-green' : 'text-white'}`}>
            {player.name}
          </h3>
          <div className="flex flex-col">
             <div className="flex items-center gap-2 text-xs text-spotify-subtext truncate">
                {player.vestNumber && <span>#{player.vestNumber}</span>}
                <span className="w-1 h-1 rounded-full bg-spotify-subtext"></span>
                <span>{player.type === PlayerType.MENSALISTA ? 'Mensalista' : 'Avulso'}</span>
             </div>
             
             {player.type === PlayerType.AVULSO && responsibleName && (
               <div className="text-[10px] font-bold text-yellow-500/80 truncate mt-0.5">
                  Resp: {responsibleName}
               </div>
             )}
             
             {mode !== 'RATE' && (
               <div className="mt-1 flex">
                 <StarRating value={player.stars} readOnly size={10} />
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Actions based on Mode */}
      <div className="flex items-center gap-2 mt-0 absolute top-4 right-4" onClick={e => e.stopPropagation()}>
        
        {mode === 'MANAGE' && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-black/50 rounded-full backdrop-blur-sm p-1">
            {player.type === PlayerType.AVULSO && onPromote && (
               <button 
                 onClick={() => onPromote(player.id)}
                 className="p-1.5 text-spotify-subtext hover:text-white transition-colors"
                 title="Tornar Mensalista"
               >
                 <UserCog size={16} />
               </button>
            )}
            
            <button 
              onClick={() => onToggleStatus(player.id)}
              className={`p-1.5 transition-colors ${player.isActive ? 'text-spotify-green hover:text-green-300' : 'text-spotify-subtext hover:text-white'}`}
              title={player.isActive ? 'Desativar' : 'Ativar'}
            >
              {player.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
            </button>

            <button 
              onClick={() => onDelete(player.id)}
              className="p-1.5 text-spotify-subtext hover:text-red-500 transition-colors"
              title="Excluir"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {mode === 'SELECT' && isSelected && (
           <div className="text-spotify-green">
             <CheckCircle size={20} fill="#1DB954" className="text-black" />
           </div>
        )}

      </div>

      {/* Rating Mode layout is different */}
      {mode === 'RATE' && onUpdateStars && (
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
            <span className="text-xs text-spotify-subtext uppercase font-bold tracking-wider">Habilidade</span>
            <StarRating value={player.stars} onChange={(v) => onUpdateStars(player.id, v)} size={18} />
        </div>
      )}
    </div>
  );
};

export default PlayerCard;