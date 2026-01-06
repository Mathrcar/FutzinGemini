import React from 'react';
import { Player, PlayerType } from '../types';
import { Trash2, UserPlus, UserMinus, CheckCircle, Shield, Circle, Power } from 'lucide-react';
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
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Apenas seleciona se estivermos no modo SELECT
    if (mode === 'SELECT' && onSelectToggle) {
      onSelectToggle(player.id);
    }
  };

  // Funções de escape robustas para garantir que o clique no botão dispare apenas o delete
  const onActionClick = (e: React.MouseEvent | React.TouchEvent, action: (id: string) => void) => {
    e.stopPropagation(); 
    if ('preventDefault' in e) e.preventDefault();
    action(player.id);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`
        relative rounded-2xl p-5 transition-all duration-300 group
        ${mode === 'SELECT' ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${isSelected 
            ? 'bg-spotify-highlight border border-spotify-green/40 shadow-[0_10px_20px_rgba(29,185,84,0.1)]' 
            : 'bg-spotify-highlight/40 hover:bg-spotify-highlight border border-white/5'}
        ${!player.isActive && mode !== 'SELECT' && mode !== 'MANAGE' ? 'opacity-30 grayscale' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img 
            src={player.photoUrl} 
            alt={player.name} 
            className={`w-14 h-14 rounded-full object-cover shadow-xl transition-all 
              ${isSelected ? 'ring-2 ring-spotify-green' : 'ring-1 ring-white/10'}
              ${!player.isActive && mode === 'MANAGE' ? 'grayscale opacity-40' : ''}
            `}
          />
          {player.isGoalkeeper && (
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-1 rounded-full border-2 border-spotify-highlight">
              <Shield size={10} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-black text-base truncate tracking-tight 
              ${isSelected ? 'text-spotify-green' : 'text-white'}
              ${!player.isActive && mode === 'MANAGE' ? 'text-spotify-subtext' : ''}
            `}>
              {player.name}
            </h3>
            {!player.isActive && mode === 'MANAGE' && (
               <span className="text-[7px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase">Inativo</span>
            )}
          </div>
          
          <div className="flex flex-col">
             <div className="flex items-center gap-2 text-[9px] font-black text-spotify-subtext uppercase tracking-widest truncate">
                <span className={player.type === PlayerType.MENSALISTA ? 'text-spotify-green/80' : 'text-yellow-500/80'}>
                  {player.type === PlayerType.MENSALISTA ? 'Mensal' : 'Avulso'}
                </span>
                {player.vestNumber && <span className="opacity-40">#{player.vestNumber}</span>}
             </div>
             
             {player.type === PlayerType.AVULSO && responsibleName && (
               <div className="text-[8px] font-black text-white/30 truncate uppercase">
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

      {/* Botoes de Ação Flutuantes */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-50">
        
        {mode === 'MANAGE' && (
          <div className="flex items-center bg-black/90 rounded-full p-1 border border-white/20 shadow-2xl backdrop-blur-xl">
            
            {/* Toggle Tipo */}
            {player.type === PlayerType.AVULSO && onPromote && (
               <button 
                type="button"
                className="w-8 h-8 flex items-center justify-center text-spotify-subtext hover:text-spotify-green transition-all"
                onClick={(e) => onActionClick(e, onPromote)}
                title="Tornar Mensalista"
               >
                 <UserPlus size={16} />
               </button>
            )}
            
            {player.type === PlayerType.MENSALISTA && onDemote && (
               <button 
                type="button"
                className="w-8 h-8 flex items-center justify-center text-spotify-subtext hover:text-yellow-500 transition-all"
                onClick={(e) => onActionClick(e, onDemote)}
                title="Tornar Avulso"
               >
                 <UserMinus size={16} />
               </button>
            )}
            
            {/* Toggle Ativo/Inativo */}
            <button 
              type="button"
              className={`w-8 h-8 flex items-center justify-center transition-all ${player.isActive ? 'text-spotify-green' : 'text-red-500'}`}
              onClick={(e) => onActionClick(e, onToggleStatus)}
              title={player.isActive ? 'Desativar' : 'Ativar'}
            >
              <Power size={16} />
            </button>
            
            {/* Botão de Excluir da Base (Destaque Vermelho) */}
            <button 
              type="button"
              className="w-8 h-8 flex items-center justify-center text-spotify-subtext hover:text-red-600 hover:bg-red-600/10 rounded-full transition-all"
              onClick={(e) => onActionClick(e, onDelete)}
              title="Excluir Permanentemente"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {mode === 'SELECT' && (
           <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-spotify-green text-black scale-110 shadow-lg' : 'bg-white/5 border border-white/10'}`}>
             {isSelected ? <CheckCircle size={20} strokeWidth={3} /> : <Circle size={20} className="text-white/10" />}
           </div>
        )}
      </div>

      {mode === 'RATE' && onUpdateStars && (
        <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center" onClick={e => e.stopPropagation()}>
            <span className="text-[9px] text-spotify-subtext uppercase font-black tracking-widest">Nível</span>
            <StarRating value={player.stars} onChange={(v) => onUpdateStars(player.id, v)} size={20} />
        </div>
      )}
    </div>
  );
};

export default PlayerCard;