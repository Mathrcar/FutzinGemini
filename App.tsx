
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Star, Dribbble, Plus, X, Wand2, Loader2, Trophy, Shield, History, Save, Banknote, CheckCircle2, Circle, Lock, Swords, Mail, Hash } from 'lucide-react';
import { Player, PlayerType, TabView, Team, GameHistory, FinancialSettings, PaymentRegistry, Match } from './types';
import * as storage from './services/storageService';
import * as geminiService from './services/geminiService';
import PlayerCard from './components/PlayerCard';
import StarRating from './components/StarRating';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>('PLAYERS');
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [generatedTeams, setGeneratedTeams] = useState<Team[]>([]);
  
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ monthlyFee: 0, perGameFee: 0, courtRentalCost: 0 });
  const [payments, setPayments] = useState<PaymentRegistry>({});
  const [isFinanceUnlocked, setIsFinanceUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  
  const [matchForm, setMatchForm] = useState({ teamAId: -1, teamBId: -1, scoreA: 0, scoreB: 0 });
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);

  const [formData, setFormData] = useState<Partial<Player>>({
    name: '', email: '', vestNumber: '', type: PlayerType.MENSALISTA, isGoalkeeper: false, stars: 3, photoUrl: '',
  });

  useEffect(() => {
    setPlayers(storage.getPlayers());
    setHistory(storage.getGameHistory());
    setFinancialSettings(storage.getFinancialSettings());
    setPayments(storage.getPayments());
  }, []);

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const finalPhotoUrl = formData.photoUrl || `https://picsum.photos/seed/${formData.name}-${Date.now()}/200/200`;
    const newPlayer: Player = {
      id: formData.id || crypto.randomUUID(),
      name: formData.name,
      email: formData.email || '',
      vestNumber: formData.vestNumber || '',
      type: formData.type || PlayerType.MENSALISTA,
      isGoalkeeper: formData.isGoalkeeper || false,
      stars: formData.stars || 3,
      isActive: true,
      linkedMensalistaId: formData.linkedMensalistaId,
      photoUrl: finalPhotoUrl,
      createdAt: Date.now()
    };
    setPlayers(storage.savePlayer(newPlayer));
    setIsModalOpen(false);
    setFormData({ name: '', email: '', vestNumber: '', type: PlayerType.MENSALISTA, isGoalkeeper: false, stars: 3, photoUrl: '' });
  };

  const handleGenerateAvatar = async () => {
    if (!formData.name) return;
    try {
      setLoadingAvatar(true);
      const avatarUrl = await geminiService.generatePlayerAvatar(formData.name, formData.isGoalkeeper || false);
      setFormData(prev => ({ ...prev, photoUrl: avatarUrl }));
    } catch (e) { console.error(e); } finally { setLoadingAvatar(false); }
  };

  const handleDelete = (id: string) => { 
    if (window.confirm('Excluir este atleta permanentemente?')) {
      setPlayers(storage.deletePlayer(id));
      if (selectedPlayerIds.has(id)) {
        const newSet = new Set(selectedPlayerIds);
        newSet.delete(id);
        setSelectedPlayerIds(newSet);
      }
    }
  };
  
  const handleToggleStatus = (id: string) => setPlayers(storage.togglePlayerStatus(id));
  const handleUpdateStars = (id: string, stars: number) => setPlayers(storage.updatePlayerStars(id, stars));
  const handlePromote = (id: string) => setPlayers(storage.promoteToMensalista(id));
  const handleDemote = (id: string) => {
    const others = players.filter(p => p.type === PlayerType.MENSALISTA && p.id !== id && p.isActive);
    if (others.length > 0 && window.confirm(`Mudar para Avulso sob responsabilidade de ${others[0].name}?`)) {
      setPlayers(storage.demoteToAvulso(id, others[0].id));
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedPlayerIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedPlayerIds(newSet);
  };

  const handleGenerateTeams = async () => {
     if (selectedPlayerIds.size < 4) return;
     const selected = players.filter(p => selectedPlayerIds.has(p.id));
     try {
         setLoadingAI(true);
         const aiTeams = await geminiService.generateTeamsWithAI(selected);
         setGeneratedTeams(aiTeams);
         setCurrentMatches([]);
     } catch (e) { alert("Erro ao sortear times."); } finally { setLoadingAI(false); }
  };

  const activeMensalistas = useMemo(() => players.filter(p => p.type === PlayerType.MENSALISTA && p.isActive), [players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);

  return (
    <div className="min-h-screen bg-spotify-base text-white pb-24 md:pb-0 md:pl-64 flex flex-col">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 w-64 bg-black p-6 gap-6 z-50 border-r border-white/5">
         <div className="flex items-center gap-3 font-black text-2xl text-white mb-6">
             <Trophy size={32} className="text-spotify-green" /> FutManager
         </div>
         <nav className="flex flex-col gap-2">
             {[
               {id: 'PLAYERS', icon: Users, label: 'Jogadores'},
               {id: 'STARS', icon: Star, label: 'Habilidades'},
               {id: 'TEAMS', icon: Dribbble, label: 'Sorteio'},
               {id: 'PLACAR', icon: Swords, label: 'Placar'},
               {id: 'HISTORY', icon: History, label: 'Histórico'},
               {id: 'FINANCE', icon: Banknote, label: 'Financeiro'}
             ].map(item => (
               <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as TabView)} 
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-black transition-all ${activeTab === item.id ? 'bg-spotify-highlight text-spotify-green' : 'text-spotify-subtext hover:text-white hover:bg-white/5'}`}
               >
                <item.icon size={20} /> {item.label}
               </button>
             ))}
         </nav>
      </aside>

      {/* Mobile Top Header (Sticky) */}
      <header className="md:hidden sticky top-0 z-40 bg-spotify-base/90 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex justify-between items-center safe-pt">
          <h1 className="font-black text-xl tracking-tight uppercase">{activeTab}</h1>
          {activeTab === 'PLAYERS' && (
            <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-spotify-green text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
              <Plus size={24} strokeWidth={3} />
            </button>
          )}
      </header>

      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full">
        {activeTab === 'PLAYERS' && (
          <div className="space-y-6 animate-slide-up">
            <div className="hidden md:flex justify-between items-center mb-8">
               <h2 className="text-5xl font-black tracking-tighter">Elenco</h2>
               <button onClick={() => setIsModalOpen(true)} className="bg-spotify-green text-black font-black rounded-full px-8 py-4 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl">
                 <Plus size={24} strokeWidth={3} /> NOVO ATLETA
               </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedPlayers.map(p => (
                <PlayerCard key={p.id} player={p} mode="MANAGE" onDelete={handleDelete} onToggleStatus={handleToggleStatus} onPromote={handlePromote} onDemote={handleDemote} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'STARS' && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-4xl font-black mb-6 hidden md:block">Avaliação Técnica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedPlayers.filter(p => p.isActive).map(p => (
                <PlayerCard key={p.id} player={p} mode="RATE" onDelete={handleDelete} onToggleStatus={handleToggleStatus} onUpdateStars={handleUpdateStars} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'TEAMS' && (
           <div className="space-y-6 animate-slide-up pb-10">
              <div className="bg-spotify-highlight p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                  <div>
                      <h2 className="text-2xl font-black mb-1">Sorteio IA</h2>
                      <p className="text-spotify-green text-xs font-black uppercase tracking-widest">{selectedPlayerIds.size} Confirmados</p>
                  </div>
                  <button onClick={handleGenerateTeams} disabled={loadingAI || selectedPlayerIds.size < 4} className="w-full md:w-auto bg-spotify-green text-black px-10 py-5 rounded-full font-black flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95 transition-all shadow-lg">
                     {loadingAI ? <Loader2 className="animate-spin" /> : <Wand2 />} GERAR TIMES
                  </button>
              </div>

              {generatedTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedTeams.map(t => (
                        <div key={t.id} className="bg-spotify-highlight/40 rounded-3xl p-6 border border-white/10">
                            <h3 className="font-black text-xl text-spotify-green mb-4 flex justify-between">
                              {t.name} <span className="text-white/20 text-sm">★ {t.averageStars}</span>
                            </h3>
                            <div className="space-y-3">
                                {t.players.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl">
                                        <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover" />
                                        <span className="font-bold text-sm">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {sortedPlayers.filter(p => p.isActive).map(p => (
                        <PlayerCard key={p.id} player={p} mode="SELECT" isSelected={selectedPlayerIds.has(p.id)} onSelectToggle={toggleSelection} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />
                    ))}
                </div>
              )}
           </div>
        )}
      </main>

      {/* MODAL NATIVO (RESTAURADO) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-end md:items-center justify-center">
          <div className="bg-spotify-highlight rounded-t-[40px] md:rounded-[40px] w-full max-w-lg overflow-hidden border-t md:border border-white/10 max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="p-8 flex justify-between items-center sticky top-0 bg-spotify-highlight/90 backdrop-blur-md z-10">
               <h2 className="font-black text-2xl tracking-tighter">Novo Atleta</h2>
               <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-transform"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSavePlayer} className="p-8 pt-2 space-y-6">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-black/50 border-2 border-spotify-green flex items-center justify-center relative shadow-2xl">
                      {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" /> : <Users size={40} className="text-white/10" />}
                      {loadingAvatar && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><Loader2 className="animate-spin text-spotify-green" /></div>}
                  </div>
                  <button type="button" onClick={handleGenerateAvatar} className="bg-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Gerar com IA</button>
               </div>

               <div className="space-y-4">
                  <input type="text" required className="w-full bg-black/40 text-white px-6 py-5 rounded-2xl font-bold border border-white/5 outline-none" placeholder="Nome do Jogador" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-1 rounded-2xl flex border border-white/5">
                        <button type="button" onClick={() => setFormData({...formData, isGoalkeeper: false})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase ${!formData.isGoalkeeper ? 'bg-spotify-green text-black' : 'text-spotify-subtext'}`}>Linha</button>
                        <button type="button" onClick={() => setFormData({...formData, isGoalkeeper: true})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase ${formData.isGoalkeeper ? 'bg-spotify-green text-black' : 'text-spotify-subtext'}`}>Goleiro</button>
                      </div>
                      <select className="bg-black/40 px-4 py-4 rounded-2xl font-bold border border-white/5 outline-none text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PlayerType})}>
                        <option value={PlayerType.MENSALISTA}>Mensal</option>
                        <option value={PlayerType.AVULSO}>Avulso</option>
                      </select>
                  </div>

                  <div className="flex flex-col items-center bg-black/20 p-6 rounded-3xl border border-white/5">
                    <label className="text-[10px] font-black text-spotify-subtext uppercase tracking-widest mb-4">Nível Técnico</label>
                    <StarRating value={formData.stars || 3} onChange={v => setFormData({...formData, stars: v})} size={32} />
                  </div>
               </div>

               <button type="submit" className="w-full bg-spotify-green text-black font-black py-6 rounded-full shadow-2xl active:scale-95 transition-all tracking-widest uppercase text-sm">Cadastrar Atleta</button>
            </form>
          </div>
        </div>
      )}

      {/* BOTTOM NAV NATIVO */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[40px] flex items-center justify-around px-4 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
         {[
           {id: 'PLAYERS', icon: Users},
           {id: 'TEAMS', icon: Dribbble},
           {id: 'PLACAR', icon: Swords},
           {id: 'HISTORY', icon: History},
           {id: 'FINANCE', icon: Banknote}
         ].map(item => (
           <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as TabView)} 
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${activeTab === item.id ? 'text-spotify-green scale-125' : 'text-spotify-subtext opacity-50'}`}
           >
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 2} />
           </button>
         ))}
      </nav>
    </div>
  );
}

export default App;
