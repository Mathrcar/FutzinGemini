import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Star, Dribbble, Plus, X, Wand2, Loader2, Trophy, Shield, History, Save, Camera, Banknote, ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock, TrendingUp, TrendingDown, Beef, Swords, Trash2, Mail, Hash } from 'lucide-react';
import { Player, PlayerType, TabView, Team, GameHistory, FinancialSettings, PaymentRegistry, BarbecueEvent, Match } from './types';
import * as storage from './services/storageService';
import * as geminiService from './services/geminiService';
import PlayerCard from './components/PlayerCard';
import StarRating from './components/StarRating';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>('PLAYERS');
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [barbecues, setBarbecues] = useState<BarbecueEvent[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [matchForm, setMatchForm] = useState({ teamAId: -1, teamBId: -1, scoreA: 0, scoreB: 0 });

  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ monthlyFee: 0, perGameFee: 0, courtRentalCost: 0 });
  const [payments, setPayments] = useState<PaymentRegistry>({});
  const [financeDate, setFinanceDate] = useState(new Date());
  const [isFinanceUnlocked, setIsFinanceUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [generatedTeams, setGeneratedTeams] = useState<Team[]>([]);

  const [formData, setFormData] = useState<Partial<Player>>({
    name: '',
    email: '',
    vestNumber: '',
    type: PlayerType.MENSALISTA,
    isGoalkeeper: false,
    stars: 3,
    photoUrl: '',
  });

  useEffect(() => {
    setPlayers(storage.getPlayers());
    const loadedHistory = storage.getGameHistory();
    setHistory(loadedHistory);
    setBarbecues(storage.getBarbecues());
    setFinancialSettings(storage.getFinancialSettings());
    setPayments(storage.getPayments());
    
    if (loadedHistory.length > 0) {
      setSelectedHistoryId(loadedHistory[0].id);
    }
  }, []);

  const getResponsibleName = useCallback((linkedId?: string) => {
    if (!linkedId) return undefined;
    return players.find(p => p.id === linkedId)?.name;
  }, [players]);

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
    const updatedList = storage.savePlayer(newPlayer);
    setPlayers(updatedList);
    setIsModalOpen(false);
    setFormData({ name: '', email: '', vestNumber: '', type: PlayerType.MENSALISTA, isGoalkeeper: false, stars: 3, photoUrl: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!formData.name) { alert("Preencha o nome antes de gerar o avatar."); return; }
    try {
      setLoadingAvatar(true);
      const avatarUrl = await geminiService.generatePlayerAvatar(formData.name, formData.isGoalkeeper || false);
      setFormData(prev => ({ ...prev, photoUrl: avatarUrl }));
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar avatar. Tente novamente.");
    } finally { setLoadingAvatar(false); }
  };

  const handleDelete = (id: string) => { 
    if (window.confirm('Deseja EXCLUIR este jogador permanentemente da base?')) {
      const updated = storage.deletePlayer(id);
      setPlayers([...updated]);
      if (selectedPlayerIds.has(id)) {
        const newSet = new Set(selectedPlayerIds);
        newSet.delete(id);
        setSelectedPlayerIds(newSet);
      }
    }
  };
  
  const handleToggleStatus = (id: string) => {
    const updated = storage.togglePlayerStatus(id);
    setPlayers([...updated]);
  };

  const handlePromote = (id: string) => {
    const updated = storage.promoteToMensalista(id);
    setPlayers([...updated]);
  };

  const handleDemote = (id: string) => {
    const otherMensalistas = players.filter(p => p.type === PlayerType.MENSALISTA && p.id !== id && p.isActive);
    if (otherMensalistas.length === 0) { 
      alert("Não há outros mensalistas ativos para serem responsáveis."); 
      return; 
    }
    if (window.confirm(`Mudar para Avulso? Responsável: ${otherMensalistas[0].name}`)) {
      const updated = storage.demoteToAvulso(id, otherMensalistas[0].id);
      setPlayers([...updated]);
    }
  };

  const handleUpdateStars = (id: string, stars: number) => {
    const updated = storage.updatePlayerStars(id, stars);
    setPlayers([...updated]);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedPlayerIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedPlayerIds(newSet);
  };

  const handleSaveGame = () => {
    if (generatedTeams.length === 0) return;
    const date = new Date();
    const newGame: GameHistory = {
      id: crypto.randomUUID(),
      timestamp: date.getTime(),
      dateString: date.toLocaleDateString('pt-BR'),
      teams: generatedTeams,
      matches: currentMatches.length > 0 ? currentMatches : undefined,
      stats: {
        totalPlayers: generatedTeams.reduce((acc, t) => acc + t.players.length, 0),
        averageBalance: generatedTeams.reduce((acc, t) => acc + t.averageStars, 0) / generatedTeams.length
      }
    };
    const updatedHistory = storage.saveGameHistory(newGame);
    setHistory(updatedHistory);
    setSelectedHistoryId(newGame.id);
    setActiveTab('HISTORY');
    setGeneratedTeams([]); 
    setCurrentMatches([]);
    alert("Rodada salva com sucesso!");
  };

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchForm.teamAId === -1 || matchForm.teamBId === -1) return;
    const newMatch: Match = { id: crypto.randomUUID(), teamAId: matchForm.teamAId, teamBId: matchForm.teamBId, scoreA: matchForm.scoreA, scoreB: matchForm.scoreB, timestamp: Date.now() };
    setCurrentMatches([newMatch, ...currentMatches]);
    setMatchForm({ ...matchForm, scoreA: 0, scoreB: 0 });
  };

  const handleGenerateTeams = async () => {
     if (selectedPlayerIds.size < 4) { alert("Mínimo 4 jogadores."); return; }
     const selected = players.filter(p => selectedPlayerIds.has(p.id));
     try {
         setLoadingAI(true);
         const aiTeams = await geminiService.generateTeamsWithAI(selected);
         setGeneratedTeams(aiTeams);
         setCurrentMatches([]); 
     } catch (e) { 
         alert("Erro no sorteio. Tente novamente."); 
     } finally { 
         setLoadingAI(false); 
     }
  };

  const activeMensalistas = useMemo(() => players.filter(p => p.type === PlayerType.MENSALISTA && p.isActive), [players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  
  const groupedPlayersForSelection = useMemo(() => {
    const active = sortedPlayers.filter(p => p.isActive);
    return { mensalistas: active.filter(p => p.type === PlayerType.MENSALISTA), avulsos: active.filter(p => p.type === PlayerType.AVULSO) };
  }, [sortedPlayers]);

  const financeDataResult = useMemo(() => {
    const selectedMonth = financeDate.getMonth();
    const selectedYear = financeDate.getFullYear();
    const gamesInMonth = history.filter(game => { const d = new Date(game.timestamp); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; });
    const attendance: Record<string, number> = {};
    gamesInMonth.forEach(game => game.teams.forEach(t => t.players.forEach(p => attendance[p.id] = (attendance[p.id] || 0) + 1)));
    
    const list = players.map(p => {
       const isMensalista = p.type === PlayerType.MENSALISTA;
       const gamesCount = attendance[p.id] || 0;
       const amount = isMensalista ? (p.isActive ? financialSettings.monthlyFee : 0) : (gamesCount * financialSettings.perGameFee);
       const key = `${selectedYear}-${selectedMonth}-${p.id}`;
       return { ...p, gamesPlayed: gamesCount, amountDue: amount, isPaid: !!payments[key], paymentKey: key };
    }).filter(p => p.amountDue > 0 || p.isPaid);

    const totalExpected = list.reduce((acc, p) => acc + p.amountDue, 0);
    const totalPaid = list.reduce((acc, p) => acc + (p.isPaid ? p.amountDue : 0), 0);
    return { mensalistas: list.filter(p => p.type === PlayerType.MENSALISTA), avulsos: list.filter(p => p.type === PlayerType.AVULSO), totalExpected, totalPaid };
  }, [players, history, financialSettings, payments, financeDate]);

  const getTabTitle = (tab: TabView) => {
    switch(tab) {
      case 'PLAYERS': return 'Jogadores';
      case 'STARS': return 'Habilidades';
      case 'TEAMS': return 'Sorteio';
      case 'PLACAR': return 'Placar';
      case 'BBQ': return 'Churrasco';
      case 'HISTORY': return 'Histórico';
      case 'FINANCE': return 'Financeiro';
      default: return 'FutManager';
    }
  };

  return (
    <div className="min-h-screen bg-spotify-base text-white pb-28 md:pb-0 md:pl-64">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col h-screen fixed left-0 w-64 bg-black p-6 gap-6 z-50 border-r border-white/5">
         <div className="flex items-center gap-3 font-bold text-2xl text-white mb-6">
             <Trophy size={32} className="text-spotify-green" />
             <span className="tracking-tighter">FutManager</span>
         </div>
         <nav className="flex flex-col gap-1">
             {[
               {id: 'PLAYERS', icon: Users, label: 'Jogadores'},
               {id: 'STARS', icon: Star, label: 'Avaliações'},
               {id: 'TEAMS', icon: Dribbble, label: 'Sorteio'},
               {id: 'PLACAR', icon: Swords, label: 'Placar'},
               {id: 'HISTORY', icon: History, label: 'Histórico'},
               {id: 'FINANCE', icon: Banknote, label: 'Financeiro'}
             ].map(item => (
               <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as TabView)} 
                className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === item.id ? 'bg-spotify-highlight text-white' : 'text-spotify-subtext hover:text-white hover:bg-white/5'}`}
               >
                <item.icon size={22} className={activeTab === item.id ? 'text-spotify-green' : ''} /> {item.label}
               </button>
             ))}
         </nav>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-spotify-base/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center safe-pt">
          <h1 className="font-black text-lg tracking-tight">{getTabTitle(activeTab)}</h1>
          {activeTab === 'PLAYERS' && (
            <button onClick={() => setIsModalOpen(true)} className="p-2 bg-spotify-green text-black rounded-full">
              <Plus size={20} strokeWidth={3} />
            </button>
          )}
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        {activeTab === 'PLAYERS' && (
          <div className="space-y-8 animate-slide-up">
            <div className="hidden md:flex justify-between items-end">
               <div>
                   <h2 className="text-5xl font-black mb-2 tracking-tighter">Jogadores</h2>
                   <p className="text-spotify-subtext text-lg">Gerencie seu elenco oficial.</p>
               </div>
               <button onClick={() => setIsModalOpen(true)} className="bg-spotify-green hover:bg-spotify-green-bright text-black font-bold rounded-full px-8 py-4 flex items-center gap-2 transform hover:scale-105 transition-all shadow-xl">
                 <Plus size={24} strokeWidth={3} /> NOVO ATLETA
               </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedPlayers.map(player => (
                <PlayerCard 
                  key={player.id} 
                  player={player}
                  mode="MANAGE"
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                  onPromote={handlePromote}
                  onDemote={handleDemote}
                  responsibleName={getResponsibleName(player.linkedMensalistaId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ... outras tabs mantidas (Stars, Teams, Placar, History, Finance) ... */}
        {activeTab === 'STARS' && (
          <div className="space-y-8 animate-slide-up">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter hidden md:block">Avaliações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {sortedPlayers.filter(p => p.isActive).map(player => (
                    <PlayerCard 
                      key={player.id} player={player} mode="RATE" 
                      onDelete={handleDelete} onToggleStatus={handleToggleStatus} onUpdateStars={handleUpdateStars} 
                    />
               ))}
            </div>
          </div>
        )}

        {activeTab === 'TEAMS' && (
           <div className="space-y-8 animate-slide-up">
              <div className="bg-spotify-highlight/50 p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                      <h2 className="text-2xl font-black mb-1">Sorteio Inteligente</h2>
                      <p className="text-spotify-subtext text-xs uppercase font-black tracking-widest">{selectedPlayerIds.size} Confirmados</p>
                  </div>
                  <button onClick={handleGenerateTeams} disabled={loadingAI || selectedPlayerIds.size < 4} className="bg-spotify-green text-black px-10 py-4 rounded-full font-black flex items-center gap-3 disabled:opacity-30">
                     {loadingAI ? <Loader2 className="animate-spin" /> : <Wand2 />} SORTEAR AGORA
                  </button>
              </div>

              {generatedTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {generatedTeams.map(team => (
                        <div key={team.id} className="bg-spotify-highlight/30 rounded-2xl p-6 border border-white/5">
                            <h3 className="font-black text-xl text-spotify-green mb-4">{team.name}</h3>
                            <div className="space-y-2">
                                {team.players.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 bg-black/20 p-2 rounded-xl text-sm font-bold">
                                        <img src={p.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                                        <span>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    {sortedPlayers.filter(p => p.isActive).map(player => (
                        <PlayerCard 
                          key={player.id} player={player} mode="SELECT" isSelected={selectedPlayerIds.has(player.id)} 
                          onSelectToggle={toggleSelection} onDelete={handleDelete} onToggleStatus={handleToggleStatus} 
                        />
                    ))}
                </div>
              )}
           </div>
        )}

        {activeTab === 'PLACAR' && (
          <div className="space-y-8 animate-slide-up">
              <div className="flex justify-between items-center">
                  <h2 className="text-4xl font-black">Placar</h2>
                  {generatedTeams.length > 0 && (
                    <button onClick={handleSaveGame} className="bg-spotify-green text-black px-8 py-3 rounded-full font-black flex items-center gap-2"><Save size={18}/> SALVAR JOGOS</button>
                  )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-spotify-highlight p-6 rounded-3xl border border-white/5 space-y-6">
                      <h3 className="font-black flex items-center gap-2 text-spotify-green"><Plus/> Nova Partida</h3>
                      <form onSubmit={handleAddMatch} className="space-y-4">
                          <select className="w-full bg-black/40 p-4 rounded-xl font-bold" value={matchForm.teamAId} onChange={e => setMatchForm({...matchForm, teamAId: parseInt(e.target.value)})}>
                             <option value={-1}>Time A</option>
                             {generatedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <select className="w-full bg-black/40 p-4 rounded-xl font-bold" value={matchForm.teamBId} onChange={e => setMatchForm({...matchForm, teamBId: parseInt(e.target.value)})}>
                             <option value={-1}>Time B</option>
                             {generatedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-4">
                              <input type="number" placeholder="Gols A" className="bg-black/40 p-4 rounded-xl text-center font-black text-2xl" value={matchForm.scoreA} onChange={e => setMatchForm({...matchForm, scoreA: parseInt(e.target.value)})}/>
                              <input type="number" placeholder="Gols B" className="bg-black/40 p-4 rounded-xl text-center font-black text-2xl" value={matchForm.scoreB} onChange={e => setMatchForm({...matchForm, scoreB: parseInt(e.target.value)})}/>
                          </div>
                          <button type="submit" className="w-full bg-white text-black py-4 rounded-full font-black">ADICIONAR PLACAR</button>
                      </form>
                  </div>
                  <div className="space-y-4">
                      {currentMatches.map(m => (
                          <div key={m.id} className="bg-spotify-highlight p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                              <span className="font-black flex-1 text-right">{generatedTeams.find(t => t.id === m.teamAId)?.name}</span>
                              <span className="bg-black px-4 py-2 rounded-lg font-black mx-4">{m.scoreA} x {m.scoreB}</span>
                              <span className="font-black flex-1">{generatedTeams.find(t => t.id === m.teamBId)?.name}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-8 animate-slide-up">
             <h2 className="text-4xl font-black">Histórico</h2>
             <div className="grid gap-4">
                {history.map(game => (
                  <div key={game.id} className="bg-spotify-highlight p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                      <div>
                        <div className="font-black text-xl">{game.dateString}</div>
                        <div className="text-spotify-subtext text-xs font-bold uppercase tracking-widest">{game.stats.totalPlayers} Atletas Presentes</div>
                      </div>
                      <div className="flex gap-4">
                          {game.teams.map(t => (
                            <div key={t.id} className="text-center">
                              <div className="text-[10px] font-black uppercase text-spotify-green">{t.name}</div>
                              <div className="text-xs font-bold">{t.players.length} jog</div>
                            </div>
                          ))}
                      </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'FINANCE' && (
          <div className="space-y-8 animate-slide-up">
             {!isFinanceUnlocked ? (
               <div className="max-w-sm mx-auto bg-spotify-highlight p-10 rounded-3xl border border-white/5 text-center">
                  <Lock size={40} className="mx-auto mb-6 text-spotify-green" />
                  <h3 className="text-xl font-black mb-4">Acesso Administrativo</h3>
                  <input type="password" placeholder="Senha" className="w-full bg-black p-4 rounded-xl text-center mb-4" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                  <button onClick={() => passwordInput === '1234' ? setIsFinanceUnlocked(true) : alert("Erro")} className="w-full bg-spotify-green text-black py-4 rounded-full font-black">DESTRAVAR</button>
               </div>
             ) : (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-spotify-highlight p-6 rounded-2xl border border-white/5">
                          <label className="text-xs font-black text-spotify-subtext uppercase">Mensalidade</label>
                          <input type="number" className="bg-transparent text-3xl font-black block w-full outline-none text-spotify-green" value={financialSettings.monthlyFee} onChange={e => storage.saveFinancialSettings({...financialSettings, monthlyFee: parseInt(e.target.value)})}/>
                      </div>
                      <div className="bg-spotify-highlight p-6 rounded-2xl border border-white/5">
                          <label className="text-xs font-black text-spotify-subtext uppercase">Preço Avulso</label>
                          <input type="number" className="bg-transparent text-3xl font-black block w-full outline-none text-spotify-green" value={financialSettings.perGameFee} onChange={e => storage.saveFinancialSettings({...financialSettings, perGameFee: parseInt(e.target.value)})}/>
                      </div>
                  </div>
                  <div className="space-y-4">
                      {financeDataResult.mensalistas.concat(financeDataResult.avulsos).map(p => (
                        <div key={p.id} className="bg-spotify-highlight p-4 rounded-2xl flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-4">
                                <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <div className="font-black text-sm">{p.name}</div>
                                    <div className="text-[10px] text-spotify-subtext font-bold">Dívida: R$ {p.amountDue}</div>
                                </div>
                            </div>
                            <button onClick={() => setPayments(storage.togglePayment(p.paymentKey))} className={`w-10 h-10 rounded-full flex items-center justify-center ${p.isPaid ? 'bg-spotify-green text-black' : 'bg-white/5'}`}>
                                <CheckCircle2 size={20}/>
                            </button>
                        </div>
                      ))}
                  </div>
               </div>
             )}
          </div>
        )}
      </main>

      {/* NEW PLAYER MODAL (VERSÃO ANTERIOR RESTAURADA E COMPLETA) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end md:items-center justify-center">
          <div className="bg-spotify-highlight rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-t md:border border-white/10 max-h-[95vh] overflow-y-auto animate-slide-up">
            <div className="p-6 md:p-8 flex justify-between items-center sticky top-0 bg-spotify-highlight/95 backdrop-blur-sm z-10 border-b border-white/5">
               <h2 className="font-black text-2xl text-white tracking-tight">Novo Atleta</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSavePlayer} className="p-6 md:p-8 space-y-6">
               {/* Avatar Section */}
               <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-black/50 border-2 border-spotify-green shadow-2xl flex items-center justify-center">
                        {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Users size={40} className="text-white/20" />
                        )}
                        {loadingAvatar && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-full">
                              <Loader2 className="animate-spin text-spotify-green" size={24} />
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full max-w-xs">
                     <label className="flex-1 cursor-pointer bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest py-3 rounded-xl text-center transition-all border border-white/5">
                        Upload Foto
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                     </label>
                     <button type="button" onClick={handleGenerateAvatar} disabled={loadingAvatar || !formData.name} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white text-[9px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg">IA Avatar</button>
                  </div>
               </div>

               {/* Personal Info */}
               <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Nome Completo</label>
                    <input type="text" required className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-base font-bold border border-white/5 focus:ring-1 ring-spotify-green outline-none transition-all" placeholder="Ex: Cristiano Ronaldo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em] flex items-center gap-2"><Mail size={12}/> E-mail (Opcional)</label>
                      <input type="email" className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-sm border border-white/5 focus:ring-1 ring-spotify-green outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em] flex items-center gap-2"><Hash size={12}/> Nº Colete</label>
                      <input type="number" className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-sm border border-white/5 focus:ring-1 ring-spotify-green outline-none" value={formData.vestNumber} onChange={e => setFormData({...formData, vestNumber: e.target.value})} />
                   </div>
                 </div>

                 {/* Contract & Position */}
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Contrato</label>
                        <select className="w-full bg-black/30 text-white px-4 py-4 rounded-2xl text-sm font-bold border border-white/5 outline-none appearance-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PlayerType})}>
                           <option value={PlayerType.MENSALISTA}>Mensalista</option>
                           <option value={PlayerType.AVULSO}>Avulso</option>
                        </select>
                     </div>
                     <div>
                         <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Posição</label>
                         <div className="flex bg-black/30 rounded-2xl p-1 border border-white/5">
                             {[{val: false, label: 'Linha'}, {val: true, label: 'Goleiro'}].map(pos => (
                               <button key={pos.label} type="button" onClick={() => setFormData({...formData, isGoalkeeper: pos.val})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isGoalkeeper === pos.val ? 'bg-spotify-green text-black shadow-md' : 'text-spotify-subtext'}`}>{pos.label}</button>
                             ))}
                         </div>
                     </div>
                 </div>

                 {/* Responsible Selection (Conditional) */}
                 {formData.type === PlayerType.AVULSO && (
                   <div className="animate-slide-up">
                       <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Responsável Financeiro</label>
                       <select className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-sm font-bold border border-white/5 outline-none appearance-none" value={formData.linkedMensalistaId || ''} onChange={e => setFormData({...formData, linkedMensalistaId: e.target.value})} required>
                           <option value="">Escolher Mensalista...</option>
                           {activeMensalistas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                   </div>
                 )}

                 {/* Skill Level */}
                 <div className="pt-2">
                     <label className="block text-[10px] font-black text-spotify-subtext mb-4 uppercase tracking-[0.2em] text-center">Nível Técnico Inicial</label>
                     <div className="flex justify-center bg-black/20 p-4 rounded-2xl border border-white/5">
                         <StarRating value={formData.stars || 3} onChange={v => setFormData({...formData, stars: v})} size={28} />
                     </div>
                 </div>
               </div>

               <button type="submit" className="w-full bg-spotify-green hover:bg-spotify-green-bright text-black font-black py-5 rounded-full shadow-2xl transform active:scale-95 transition-all uppercase tracking-widest text-xs mt-4">
                   SALVAR NO ELENCO
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-20 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] flex items-center justify-around px-6 z-50">
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
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all ${activeTab === item.id ? 'text-spotify-green scale-110' : 'text-spotify-subtext'}`}
           >
            <item.icon size={24} />
           </button>
         ))}
      </nav>

    </div>
  );
}

export default App;