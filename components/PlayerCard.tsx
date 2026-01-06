
import React from 'react';
import { Player, PlayerType } from '../types';
// Added Circle to the imports from lucide-react
import { Trash2, UserPlus, UserMinus, CheckCircle, XCircle, Shield, MoreHorizontal, Circle } from 'lucide-react';
import StarRating from './StarRating';

interface PlayerCardProps {
  player: Player;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onPromote?: (id: string) => void;
  onDemote?: (id: string) => void;
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
  onDemote,
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
        group relative rounded-2xl p-5 transition-all duration-300 active:scale-[0.98]
        ${mode === 'SELECT' ? 'cursor-pointer' : ''}
        ${isSelected 
            ? 'bg-spotify-highlight border border-spotify-green/40 shadow-[0_10px_20px_rgba(29,185,84,0.1)]' 
            : 'bg-spotify-highlight/40 hover:bg-spotify-highlight border border-white/5'}
        ${!player.isActive && mode !== 'SELECT' ? 'opacity-30 grayscale' : ''}
      `}
      onClick={handleSelect}
    >
      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img 
            src={player.photoUrl} 
            alt={player.name} 
            className={`w-14 h-14 rounded-full object-cover shadow-xl transition-all ${isSelected ? 'ring-2 ring-spotify-green' : 'ring-1 ring-white/10'}`}
          />
          {player.isGoalkeeper && (
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-1 rounded-full shadow-lg border-2 border-spotify-highlight" title="Goleiro">
              <Shield size={12} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-black text-lg truncate tracking-tight ${isSelected ? 'text-spotify-green' : 'text-white'}`}>
            {player.name}
          </h3>
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2 text-[10px] font-black text-spotify-subtext uppercase tracking-widest truncate">
                {player.vestNumber && <span className="text-white/40">#{player.vestNumber}</span>}
                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                <span className={player.type === PlayerType.MENSALISTA ? 'text-spotify-green/80' : 'text-yellow-500/80'}>{player.type === PlayerType.MENSALISTA ? 'Mensal' : 'Avulso'}</span>
             </div>
             
             {player.type === PlayerType.AVULSO && responsibleName && (
               <div className="text-[9px] font-black text-white/30 truncate uppercase tracking-tighter">
                  Resp: {responsibleName}
               </div>
             )}
             
             {mode !== 'RATE' && (
               <div className="mt-1 flex opacity-60">
                 <StarRating value={player.stars} readOnly size={10} />
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Actions based on Mode */}
      <div className="flex items-center gap-2 absolute top-5 right-5" onClick={e => e.stopPropagation()}>
        
        {mode === 'MANAGE' && (
          <div className="opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center bg-black/60 rounded-full backdrop-blur-xl p-1.5 border border-white/10 shadow-2xl">
            {/* Using a dot or icon for mobile if needed, but keeping functionality intact */}
            {player.type === PlayerType.AVULSO && onPromote && (
               <button onClick={() => onPromote(player.id)} className="w-9 h-9 flex items-center justify-center text-spotify-subtext hover:text-white active:scale-90 transition-all" title="Promover">
                 <UserPlus size={18} />
               </button>
            )}
            {player.type === PlayerType.MENSALISTA && onDemote && (
               <button onClick={() => onDemote(player.id)} className="w-9 h-9 flex items-center justify-center text-spotify-subtext hover:text-white active:scale-90 transition-all" title="Rebaixar">
                 <UserMinus size={18} />
               </button>
            )}
            <button onClick={() => onToggleStatus(player.id)} className={`w-9 h-9 flex items-center justify-center transition-all active:scale-90 ${player.isActive ? 'text-spotify-green' : 'text-spotify-subtext'}`}>
              {player.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
            </button>
            <button onClick={() => onDelete(player.id)} className="w-9 h-9 flex items-center justify-center text-spotify-subtext hover:text-red-500 active:scale-90 transition-all">
              <Trash2 size={18} />
            </button>
          </div>
        )}

        {mode === 'SELECT' && (
           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-spotify-green text-black scale-110 shadow-lg' : 'bg-white/5 border border-white/10'}`}>
             {isSelected ? <CheckCircle size={18} strokeWidth={3} /> : <Circle size={18} className="text-white/10" />}
           </div>
        )}
      </div>

      {/* For mobile MANAGE mode, show a "more" hint if not hovered */}
      {mode === 'MANAGE' && (
        <div className="md:hidden absolute top-5 right-5 text-white/20">
          <MoreHorizontal size={20} />
        </div>
      )}

      {mode === 'RATE' && onUpdateStars && (
        <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-[10px] text-spotify-subtext uppercase font-black tracking-[0.2em]">Habilidade</span>
            <StarRating value={player.stars} onChange={(v) => onUpdateStars(player.id, v)} size={22} />
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
