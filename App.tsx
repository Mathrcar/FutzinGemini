import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Star, Dribbble, Plus, X, Wand2, Loader2, Trophy, AlertTriangle, Shield, Search, Menu, History, Save, Calendar, Clock, Camera, Upload, ImagePlus, Banknote, ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock, ArrowRight, TrendingUp, TrendingDown, Beef, Flame, Receipt, SwatchBook, Swords, Trash2 } from 'lucide-react';
import { Player, PlayerType, TabView, Team, GameHistory, FinancialSettings, PaymentRegistry, BarbecueEvent, Match } from './types';
import * as storage from './services/storageService';
import * as geminiService from './services/geminiService';
import PlayerCard from './components/PlayerCard';
import StarRating from './components/StarRating';

const ALGO_LOCAL = 'LOCAL';
const ALGO_AI = 'AI';

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
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [bbqForm, setBbqForm] = useState({
      description: 'Churrasco da Semana',
      meatCost: 0,
      rentalCost: 0,
      otherCost: 0,
      useCashBalance: false
  });
  const [bbqSelectedPlayers, setBbqSelectedPlayers] = useState<Set<string>>(new Set());

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

  const playerPerformanceMap = useMemo(() => {
    const stats: Record<string, { wins: number, totalGames: number }> = {};
    history.forEach(game => {
      if (!game.matches) return;
      game.matches.forEach(match => {
        const teamA = game.teams.find(t => t.id === match.teamAId);
        const teamB = game.teams.find(t => t.id === match.teamBId);
        if (!teamA || !teamB) return;
        const teamAWins = match.scoreA > match.scoreB;
        const isDraw = match.scoreA === match.scoreB;
        teamA.players.forEach(p => {
          if (!stats[p.id]) stats[p.id] = { wins: 0, totalGames: 0 };
          stats[p.id].totalGames++;
          if (teamAWins) stats[p.id].wins++;
          else if (isDraw) stats[p.id].wins += 0.5;
        });
        teamB.players.forEach(p => {
          if (!stats[p.id]) stats[p.id] = { wins: 0, totalGames: 0 };
          stats[p.id].totalGames++;
          if (!teamAWins && !isDraw) stats[p.id].wins++;
          else if (isDraw) stats[p.id].wins += 0.5;
        });
      });
    });
    const result: Record<string, { winRate: number, totalGames: number }> = {};
    Object.keys(stats).forEach(id => {
      result[id] = { winRate: stats[id].wins / stats[id].totalGames, totalGames: stats[id].totalGames };
    });
    return result;
  }, [history]);

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
      email: formData.email,
      vestNumber: formData.vestNumber,
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

  const handleDelete = (id: string) => { if (confirm('Tem certeza que deseja excluir este jogador?')) setPlayers(storage.deletePlayer(id)); };
  const handleToggleStatus = (id: string) => setPlayers(storage.togglePlayerStatus(id));
  const handlePromote = (id: string) => setPlayers(storage.promoteToMensalista(id));
  const handleDemote = (id: string) => {
    const otherMensalistas = players.filter(p => p.type === PlayerType.MENSALISTA && p.id !== id && p.isActive);
    if (otherMensalistas.length === 0) { alert("Não é possível transformar em avulso porque não existem outros mensalistas ativos para serem responsáveis."); return; }
    if (confirm(`Transformar em Avulso? O jogador será vinculado a ${otherMensalistas[0].name} como responsável padrão.`)) {
      setPlayers(storage.demoteToAvulso(id, otherMensalistas[0].id));
    }
  };
  const handleUpdateStars = (id: string, stars: number) => setPlayers(storage.updatePlayerStars(id, stars));
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
    setTeamsError(null);
    alert("Jogo salvo no histórico com sucesso!");
  };

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchForm.teamAId === -1 || matchForm.teamBId === -1) { alert("Selecione os dois times para a partida."); return; }
    if (matchForm.teamAId === matchForm.teamBId) { alert("Um time não pode enfrentar ele mesmo."); return; }
    const newMatch: Match = { id: crypto.randomUUID(), teamAId: matchForm.teamAId, teamBId: matchForm.teamBId, scoreA: matchForm.scoreA, scoreB: matchForm.scoreB, timestamp: Date.now() };
    setCurrentMatches([newMatch, ...currentMatches]);
    setMatchForm({ ...matchForm, scoreA: 0, scoreB: 0 });
  };

  const handleDeleteMatch = (id: string) => { setCurrentMatches(currentMatches.filter(m => m.id !== id)); };
  const toggleBbqSelection = (id: string) => {
    const newSet = new Set(bbqSelectedPlayers);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setBbqSelectedPlayers(newSet);
  };

  const calculateBBQ = (availableCash: number) => {
      const totalCost = (Number(bbqForm.meatCost) || 0) + (Number(bbqForm.rentalCost) || 0) + (Number(bbqForm.otherCost) || 0);
      const participantsCount = bbqSelectedPlayers.size;
      let cashUsed = 0; let finalCostToSplit = totalCost;
      if (bbqForm.useCashBalance) { cashUsed = Math.min(totalCost, availableCash > 0 ? availableCash : 0); finalCostToSplit = totalCost - cashUsed; }
      const costPerPerson = participantsCount > 0 ? finalCostToSplit / participantsCount : 0;
      return { totalCost, cashUsed, finalCostToSplit, costPerPerson, participantsCount };
  };

  const handleSaveBBQ = (availableCash: number) => {
      if (bbqSelectedPlayers.size === 0) { alert("Selecione os participantes do churrasco."); return; }
      const calc = calculateBBQ(availableCash);
      const newBBQ: BarbecueEvent = {
          id: crypto.randomUUID(), dateString: new Date().toLocaleDateString('pt-BR'), timestamp: Date.now(), description: bbqForm.description, participants: Array.from(bbqSelectedPlayers),
          costs: { meat: Number(bbqForm.meatCost) || 0, rental: Number(bbqForm.rentalCost) || 0, others: Number(bbqForm.otherCost) || 0 },
          useCashBalance: bbqForm.useCashBalance, cashBalanceUsed: calc.cashUsed, finalCostPerPerson: calc.costPerPerson
      };
      setBarbecues(storage.saveBarbecue(newBBQ));
      setBbqForm({ description: 'Churrasco da Semana', meatCost: 0, rentalCost: 0, otherCost: 0, useCashBalance: false });
      setBbqSelectedPlayers(new Set());
      alert("Churrasco organizado com sucesso!");
  };

  const handleFinanceUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1234') { setIsFinanceUnlocked(true); setPasswordInput(''); } else { alert("Senha incorreta!"); }
  };

  const handleFinanceSettingChange = (key: keyof FinancialSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newSettings = { ...financialSettings, [key]: numValue };
    setFinancialSettings(newSettings);
    storage.saveFinancialSettings(newSettings);
  };

  const changeFinanceMonth = (delta: number) => {
    const newDate = new Date(financeDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setFinanceDate(newDate);
  };

  const togglePaymentStatus = (paymentKey: string) => setPayments(storage.togglePayment(paymentKey));

  const generateTeamsLocal = () => {
    setTeamsError(null);
    const selected = players.filter(p => selectedPlayerIds.has(p.id));
    const total = selected.length;
    const gks = selected.filter(p => p.isGoalkeeper);
    const outfield = selected.filter(p => !p.isGoalkeeper);
    let numTeams = 3; if (total >= 22) numTeams = 4;
    const getCompositeScore = (p: Player) => {
      const perf = playerPerformanceMap[p.id];
      const modifier = perf ? (perf.winRate - 0.5) * 2 : 0;
      return p.stars + modifier;
    };
    const sortedOutfield = [...outfield].sort((a, b) => getCompositeScore(b) - getCompositeScore(a));
    const teams: Player[][] = Array.from({ length: numTeams }, () => []);
    const sortedGKs = [...gks].sort((a,b) => getCompositeScore(b) - getCompositeScore(a));
    sortedGKs.forEach((gk, index) => { teams[index % numTeams].push(gk); });
    let teamIndex = 0; let direction = 1; 
    sortedOutfield.forEach((player) => {
       teams[teamIndex].push(player);
       teamIndex += direction;
       if (teamIndex >= numTeams) { teamIndex = numTeams - 1; direction = -1; } 
       else if (teamIndex < 0) { teamIndex = 0; direction = 1; }
    });
    setGeneratedTeams(teams.map((teamPlayers, idx) => {
        const totalStars = teamPlayers.reduce((acc, p) => acc + p.stars, 0);
        return { id: idx + 1, name: `Time ${idx + 1}`, players: teamPlayers, totalStars, averageStars: teamPlayers.length ? parseFloat((totalStars / teamPlayers.length).toFixed(1)) : 0 };
    }));
    setCurrentMatches([]); 
  };

  const handleGenerateTeams = async (method: typeof ALGO_LOCAL | typeof ALGO_AI) => {
     if (selectedPlayerIds.size < 4) { alert("Selecione pelo menos 4 jogadores."); return; }
     if (method === ALGO_LOCAL) { generateTeamsLocal(); } else {
         const selected = players.filter(p => selectedPlayerIds.has(p.id));
         try {
             setLoadingAI(true);
             const aiTeams = await geminiService.generateTeamsWithAI(selected, playerPerformanceMap);
             setGeneratedTeams(aiTeams);
             setCurrentMatches([]); 
         } catch (e) { alert("Erro ao gerar times com IA."); } finally { setLoadingAI(false); }
     }
  };

  const activeMensalistas = useMemo(() => players.filter(p => p.type === PlayerType.MENSALISTA && p.isActive), [players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const groupedPlayersForSelection = useMemo(() => {
    const active = sortedPlayers.filter(p => p.isActive);
    return { mensalistas: active.filter(p => p.type === PlayerType.MENSALISTA), avulsos: active.filter(p => p.type === PlayerType.AVULSO) };
  }, [sortedPlayers]);

  const stats = useMemo(() => {
     const total = selectedPlayerIds.size;
     const gks = players.filter(p => selectedPlayerIds.has(p.id) && p.isGoalkeeper).length;
     return { total, gks, outfield: total - gks };
  }, [selectedPlayerIds, players]);

  const financeDataResult = useMemo(() => {
    const selectedMonth = financeDate.getMonth();
    const selectedYear = financeDate.getFullYear();
    const allPlayersMap = new Map<string, Player>();
    players.forEach(p => allPlayersMap.set(p.id, p));
    history.forEach(h => h.teams.forEach(t => t.players.forEach(p => { if (!allPlayersMap.has(p.id)) allPlayersMap.set(p.id, p); })));
    const gamesInMonth = history.filter(game => { const d = new Date(game.timestamp); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; });
    const attendanceCurrent: Record<string, number> = {};
    gamesInMonth.forEach(game => { game.teams.forEach(team => { team.players.forEach(p => { attendanceCurrent[p.id] = (attendanceCurrent[p.id] || 0) + 1; }); }); });
    const bbqsInMonth = barbecues.filter(b => { const d = new Date(b.timestamp); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; });
    const list = players.map(player => {
       const isMensalista = player.type === PlayerType.MENSALISTA;
       const gamesPlayed = attendanceCurrent[player.id] || 0;
       let gameAmountDue = isMensalista ? (player.isActive ? financialSettings.monthlyFee : 0) : (gamesPlayed * financialSettings.perGameFee);
       const gamePaymentKey = `${selectedYear}-${selectedMonth}-${player.id}`;
       const isGamePaid = !!payments[gamePaymentKey];
       const playerBbqs = bbqsInMonth.filter(b => b.participants.includes(player.id));
       const bbqDetails = playerBbqs.map(b => { const key = `BBQ-${b.id}-${player.id}`; return { id: b.id, desc: b.description, cost: b.finalCostPerPerson, isPaid: !!payments[key], paymentKey: key }; });
       const totalBbqDebt = bbqDetails.reduce((acc, b) => acc + b.cost, 0);
       const totalBbqPaid = bbqDetails.filter(b => b.isPaid).reduce((acc, b) => acc + b.cost, 0);
       const linkedMensalista = player.linkedMensalistaId ? players.find(p => p.id === player.linkedMensalistaId) : undefined;
       return { ...player, gamesPlayed, gameAmountDue, isGamePaid, gamePaymentKey, bbqDetails, totalBbqDebt, totalBbqPaid, linkedMensalistaName: linkedMensalista?.name };
    }).filter(p => p.gameAmountDue > 0 || p.isGamePaid || p.bbqDetails.length > 0);
    const totalExpected = list.reduce((acc, p) => acc + p.gameAmountDue + p.totalBbqDebt, 0);
    const totalPaidCurrent = list.reduce((acc, p) => acc + (p.isGamePaid ? p.gameAmountDue : 0) + p.totalBbqPaid, 0);
    const historyMap: Record<string, Record<string, number>> = {};
    const activeMonths = new Set<string>();
    history.forEach(game => { const d = new Date(game.timestamp); const mKey = `${d.getFullYear()}-${d.getMonth()}`; activeMonths.add(mKey); if (!historyMap[mKey]) historyMap[mKey] = {}; game.teams.forEach(t => t.players.forEach(p => { historyMap[mKey][p.id] = (historyMap[mKey][p.id] || 0) + 1; })); });
    Object.keys(payments).forEach(key => { if (!key.startsWith('BBQ-')) { const parts = key.split('-'); if (parts.length >= 3) activeMonths.add(`${parts[0]}-${parts[1]}`); } });
    let cumulativeBalance = 0;
    const sortedMonths = Array.from(activeMonths).sort((a,b) => { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y1 * 12 + m1) - (y2 * 12 + m2); });
    sortedMonths.forEach(mKey => {
        const [y, m] = mKey.split('-').map(Number);
        if (y > selectedYear || (y === selectedYear && m > selectedMonth)) return; 
        cumulativeBalance -= (financialSettings.courtRentalCost || 0);
        allPlayersMap.forEach(p => { const pKey = `${y}-${m}-${p.id}`; if (payments[pKey]) { cumulativeBalance += (p.type === PlayerType.MENSALISTA ? financialSettings.monthlyFee : (historyMap[mKey]?.[p.id] || 0) * financialSettings.perGameFee); } });
    });
    barbecues.forEach(bbq => {
        const bbqDate = new Date(bbq.timestamp);
        if (bbqDate.getFullYear() > selectedYear || (bbqDate.getFullYear() === selectedYear && bbqDate.getMonth() > selectedMonth)) return;
        if (bbq.useCashBalance) cumulativeBalance -= bbq.cashBalanceUsed;
        bbq.participants.forEach(pid => { if (payments[`BBQ-${bbq.id}-${pid}`]) cumulativeBalance += bbq.finalCostPerPerson; });
    });
    return { mensalistas: list.filter(p => p.type === PlayerType.MENSALISTA), avulsos: list.filter(p => p.type === PlayerType.AVULSO), totalExpected, totalPaid: totalPaidCurrent, cashBalance: cumulativeBalance };
  }, [players, history, financialSettings, payments, financeDate, barbecues]);

  const currentBbqCalc = useMemo(() => ({ ...calculateBBQ(financeDataResult.cashBalance), available: financeDataResult.cashBalance }), [bbqForm, bbqSelectedPlayers, financeDataResult.cashBalance]);

  const renderBbqParticipant = (player: Player) => (
    <div key={player.id} onClick={() => toggleBbqSelection(player.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${bbqSelectedPlayers.has(player.id) ? 'bg-orange-500/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-spotify-highlight border-white/5 hover:bg-white/5'}`}>
        <img src={player.photoUrl} className="w-9 h-9 rounded-full object-cover" />
        <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold truncate">{player.name}</span>
            {player.type === PlayerType.AVULSO && <span className="text-[10px] text-yellow-500 font-bold">Resp: {getResponsibleName(player.linkedMensalistaId)}</span>}
        </div>
        {bbqSelectedPlayers.has(player.id) && <CheckCircle2 size={18} className="ml-auto text-orange-500" />}
    </div>
  );

  const getTabTitle = (tab: TabView) => {
    switch(tab) {
      case 'PLAYERS': return 'Elenco';
      case 'STARS': return 'Habilidades';
      case 'TEAMS': return 'Sorteio';
      case 'PLACAR': return 'Placar';
      case 'BBQ': return 'Churrasco';
      case 'HISTORY': return 'Histórico';
      case 'FINANCE': return 'Finanças';
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
               {id: 'TEAMS', icon: Dribbble, label: 'Sortear Times'},
               {id: 'PLACAR', icon: Swords, label: 'Placar'},
               {id: 'BBQ', icon: Beef, label: 'Churrasco'},
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

      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-0 z-40 bg-spotify-base/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center safe-pt">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-spotify-green" />
            <h1 className="font-black text-lg tracking-tight">{getTabTitle(activeTab)}</h1>
          </div>
          {activeTab === 'PLAYERS' && (
            <button onClick={() => setIsModalOpen(true)} className="p-2 bg-spotify-green text-black rounded-full shadow-lg active:scale-90 transition-transform">
              <Plus size={20} strokeWidth={3} />
            </button>
          )}
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto tab-transition">
        
        {activeTab === 'PLAYERS' && (
          <div className="space-y-8 animate-slide-up">
            <div className="hidden md:flex justify-between items-end">
               <div>
                   <h2 className="text-5xl font-black mb-2 tracking-tighter">Jogadores</h2>
                   <p className="text-spotify-subtext text-lg">Gerencie o elenco e disponibilidade.</p>
               </div>
               <button onClick={() => setIsModalOpen(true)} className="bg-spotify-green hover:bg-spotify-green-bright text-black font-bold rounded-full px-8 py-4 flex items-center gap-2 transform hover:scale-105 transition-all shadow-xl">
                 <Plus size={24} strokeWidth={3} /> NOVO JOGADOR
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

        {activeTab === 'STARS' && (
          <div className="space-y-8 animate-slide-up">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter hidden md:block">Avaliações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {sortedPlayers.filter(p => p.isActive).map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player}
                      mode="RATE"
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                      onUpdateStars={handleUpdateStars}
                      responsibleName={getResponsibleName(player.linkedMensalistaId)}
                    />
               ))}
            </div>
          </div>
        )}

        {activeTab === 'TEAMS' && (
           <div className="space-y-8 animate-slide-up">
              <div className="bg-spotify-highlight/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                     <div>
                         <h2 className="text-2xl font-black mb-1">Sorteio da Partida</h2>
                         <div className="flex items-center gap-4 text-[10px] font-black text-spotify-subtext uppercase tracking-widest">
                            <span>Total: <span className="text-white">{stats.total}</span></span>
                            <span>Goleiros: <span className="text-white">{stats.gks}</span></span>
                         </div>
                     </div>
                     <div className="flex w-full md:w-auto gap-3">
                        <button onClick={() => handleGenerateTeams(ALGO_LOCAL)} className="flex-1 md:flex-none bg-white text-black hover:scale-105 px-6 py-3 rounded-full font-black text-sm transition-all">Padrão</button>
                        <button onClick={() => handleGenerateTeams(ALGO_AI)} disabled={loadingAI} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 hover:scale-105 disabled:opacity-50 px-6 py-3 rounded-full font-black text-sm transition-all flex items-center justify-center gap-2">
                           {loadingAI ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />} IA
                        </button>
                     </div>
                 </div>
              </div>

              {generatedTeams.length > 0 ? (
                  <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-center bg-spotify-green/10 border border-spotify-green/20 p-5 rounded-2xl gap-4">
                         <span className="text-spotify-subtext text-sm font-medium">Times sorteados! Registre os resultados no Placar.</span>
                         <button onClick={() => setActiveTab('PLACAR')} className="w-full md:w-auto bg-spotify-green text-black px-6 py-2 rounded-full font-black flex items-center justify-center gap-2 hover:scale-105 transition-all"><Swords size={18}/> IR PARA PLACAR</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                          {generatedTeams.map(team => (
                              <div key={team.id} className="bg-spotify-highlight/30 rounded-2xl p-6 border border-white/5">
                                  <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-xl text-spotify-green tracking-tight">{team.name}</h3>
                                    <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-spotify-subtext uppercase tracking-widest">{team.averageStars} ★</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3">
                                      {team.players.map(p => (
                                          <div key={p.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl">
                                              <img src={p.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                                              <div className="flex flex-col min-w-0">
                                                  <span className="text-sm font-bold truncate">{p.name}</span>
                                                  {p.type === PlayerType.AVULSO && <span className="text-[10px] text-yellow-500 font-bold">Resp: {getResponsibleName(p.linkedMensalistaId)}</span>}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="space-y-12 pb-24">
                     {['MENSALISTAS', 'AVULSOS'].map(type => {
                       const playersOfType = type === 'MENSALISTAS' ? groupedPlayersForSelection.mensalistas : groupedPlayersForSelection.avulsos;
                       return playersOfType.length > 0 && (
                        <section key={type}>
                          <h3 className="text-spotify-subtext font-black text-[11px] uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <span className="h-px bg-white/10 flex-1"></span>
                            {type} ({playersOfType.length})
                            <span className="h-px bg-white/10 flex-1"></span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {playersOfType.map(player => (
                                  <PlayerCard 
                                    key={player.id} player={player} mode="SELECT" onDelete={()=>{}} onToggleStatus={()=>{}} 
                                    isSelected={selectedPlayerIds.has(player.id)} onSelectToggle={toggleSelection} 
                                    responsibleName={getResponsibleName(player.linkedMensalistaId)}
                                  />
                              ))}
                          </div>
                        </section>
                       );
                     })}
                  </div>
              )}
           </div>
        )}

        {activeTab === 'PLACAR' && (
          <div className="space-y-8 animate-slide-up pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
               <div className="hidden md:block">
                   <h2 className="text-5xl font-black mb-2 tracking-tighter">Placar</h2>
                   <p className="text-spotify-subtext text-lg">Registre as batalhas de hoje.</p>
               </div>
               {generatedTeams.length > 0 && (
                 <button onClick={handleSaveGame} className="w-full md:w-auto bg-spotify-green hover:bg-spotify-green-bright text-black font-black rounded-full px-8 py-4 flex items-center justify-center gap-3 transform active:scale-95 transition-all shadow-xl">
                   <Save size={22} /> FINALIZAR DIA
                 </button>
               )}
            </div>

            {generatedTeams.length < 2 ? (
              <div className="bg-spotify-highlight p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center gap-4">
                <Swords size={48} className="text-spotify-green mb-2" />
                <h3 className="text-xl font-black">Nenhum time escalado</h3>
                <p className="text-spotify-subtext max-w-xs mx-auto">Sorteie os times na aba de Sorteio para habilitar o placar em tempo real.</p>
                <button onClick={() => setActiveTab('TEAMS')} className="bg-white text-black px-8 py-3 rounded-full font-black mt-4 active:scale-95 transition-transform shadow-lg">IR PARA ESCALAÇÃO</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 order-2 lg:order-1">
                  <form onSubmit={handleAddMatch} className="bg-spotify-highlight p-8 rounded-3xl border border-white/5 space-y-8 sticky top-28">
                    <h3 className="font-black text-xl flex items-center gap-3 text-spotify-green"><Plus /> Novo Confronto</h3>
                    <div className="space-y-8">
                      {['A', 'B'].map(teamKey => (
                        <div key={teamKey} className="space-y-3">
                          <label className="text-[11px] uppercase font-black text-spotify-subtext tracking-widest">Time {teamKey}</label>
                          <select 
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:ring-2 ring-spotify-green text-sm font-bold appearance-none"
                            value={teamKey === 'A' ? matchForm.teamAId : matchForm.teamBId}
                            onChange={e => setMatchForm({ ...matchForm, [teamKey === 'A' ? 'teamAId' : 'teamBId']: parseInt(e.target.value)})}
                          >
                            <option value={-1}>Escolher Time...</option>
                            {generatedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setMatchForm(prev => ({ ...prev, [teamKey === 'A' ? 'scoreA' : 'scoreB']: Math.max(0, prev[teamKey === 'A' ? 'scoreA' : 'scoreB'] - 1)}))} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl">-</button>
                            <input type="number" readOnly className="flex-1 bg-black/20 border border-white/5 p-4 rounded-2xl text-center text-3xl font-black" value={teamKey === 'A' ? matchForm.scoreA : matchForm.scoreB} />
                            <button type="button" onClick={() => setMatchForm(prev => ({ ...prev, [teamKey === 'A' ? 'scoreA' : 'scoreB']: prev[teamKey === 'A' ? 'scoreA' : 'scoreB'] + 1}))} className="w-12 h-12 rounded-full bg-spotify-green/20 border border-spotify-green/30 text-spotify-green flex items-center justify-center font-black text-xl">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all">REGISTRAR PLACAR</button>
                  </form>
                </div>

                <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="font-black text-lg tracking-tight">Histórico de Hoje</h3>
                    <span className="text-xs font-bold text-spotify-subtext bg-white/5 px-3 py-1 rounded-full">{currentMatches.length} partidas</span>
                  </div>
                  {currentMatches.length === 0 ? (
                    <div className="bg-black/20 border border-dashed border-white/10 p-16 rounded-3xl text-center text-spotify-subtext italic">Nenhum confronto registrado.</div>
                  ) : (
                    <div className="grid gap-4">
                      {currentMatches.map((m) => {
                        const teamA = generatedTeams.find(t => t.id === m.teamAId);
                        const teamB = generatedTeams.find(t => t.id === m.teamBId);
                        return (
                          <div key={m.id} className="bg-spotify-highlight p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 group transition-all hover:border-spotify-green/30">
                            <div className="flex-1 flex items-center gap-4 w-full sm:justify-end">
                              <span className={`font-black text-lg truncate ${m.scoreA > m.scoreB ? 'text-spotify-green' : 'text-white'}`}>{teamA?.name}</span>
                              <span className="text-4xl font-black bg-black/60 min-w-[70px] text-center py-3 rounded-2xl shadow-inner">{m.scoreA}</span>
                            </div>
                            <div className="text-spotify-subtext font-black text-xs px-4 py-1 bg-white/5 rounded-full">VS</div>
                            <div className="flex-1 flex items-center gap-4 w-full sm:justify-start">
                              <span className="text-4xl font-black bg-black/60 min-w-[70px] text-center py-3 rounded-2xl shadow-inner">{m.scoreB}</span>
                              <span className={`font-black text-lg truncate ${m.scoreB > m.scoreA ? 'text-spotify-green' : 'text-white'}`}>{teamB?.name}</span>
                            </div>
                            <button onClick={() => handleDeleteMatch(m.id)} className="sm:ml-4 p-3 text-spotify-subtext hover:text-red-500 transition-colors bg-white/5 rounded-full"><Trash2 size={20} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'BBQ' && (
            <div className="space-y-8 animate-slide-up pb-24">
                 <div className="flex flex-col lg:flex-row gap-10">
                    <div className="flex-1 space-y-6">
                        <div className="bg-spotify-highlight p-8 rounded-3xl border border-white/5 shadow-xl">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Beef className="text-orange-500" /> O Churrasco</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-spotify-subtext uppercase tracking-widest mb-2 block">Onde / Quando</label>
                                    <input type="text" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-white outline-none focus:ring-1 ring-orange-500/50 transition-all" value={bbqForm.description} onChange={e => setBbqForm({...bbqForm, description: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                      {label: 'Carnes', key: 'meatCost'},
                                      {label: 'Aluguel', key: 'rentalCost'},
                                      {label: 'Diversos', key: 'otherCost'}
                                    ].map(field => (
                                      <div key={field.key}>
                                        <label className="text-[9px] uppercase font-black text-spotify-subtext block mb-1">{field.label}</label>
                                        <input type="number" className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white text-center outline-none" value={bbqForm[field.key as keyof typeof bbqForm] as number} onChange={e => setBbqForm({...bbqForm, [field.key]: parseFloat(e.target.value) || 0})} />
                                      </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between bg-black/30 p-5 rounded-2xl border border-white/5">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold">Usar Caixa?</span>
                                      <span className="text-[10px] text-spotify-green font-black uppercase tracking-wider">Saldo: R$ {currentBbqCalc.available.toFixed(2)}</span>
                                    </div>
                                    <button onClick={() => setBbqForm({...bbqForm, useCashBalance: !bbqForm.useCashBalance})} className={`w-14 h-8 rounded-full relative transition-all duration-300 ${bbqForm.useCashBalance ? 'bg-spotify-green' : 'bg-white/10'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all ${bbqForm.useCashBalance ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-3xl shadow-2xl text-center transform hover:scale-[1.02] transition-transform">
                             <p className="text-orange-200 text-xs uppercase font-black tracking-[0.2em] mb-2">Estimativa por Cabeça</p>
                             <p className="text-4xl font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBbqCalc.costPerPerson)}</p>
                             <button onClick={() => handleSaveBBQ(currentBbqCalc.available)} className="w-full mt-8 bg-white text-orange-700 font-black py-4 rounded-full text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">Organizar agora</button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-2">Participantes <span className="text-xs bg-white/5 px-3 py-1 rounded-full font-bold text-spotify-subtext ml-2">{bbqSelectedPlayers.size}</span></h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 pb-12">
                            {groupedPlayersForSelection.mensalistas.concat(groupedPlayersForSelection.avulsos).map(renderBbqParticipant)}
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {activeTab === 'FINANCE' && (
            <div className="h-full animate-slide-up pb-24">
                {!isFinanceUnlocked ? (
                    <div className="h-full flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="bg-spotify-highlight p-10 rounded-3xl border border-white/5 w-full max-w-sm text-center shadow-2xl backdrop-blur-md">
                             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
                                 <Lock size={36} className="text-spotify-green" />
                             </div>
                             <h2 className="text-2xl font-black mb-2 tracking-tighter">Área de Tesouraria</h2>
                             <p className="text-spotify-subtext mb-8 text-sm">Acesso restrito ao administrador do grupo.</p>
                             <form onSubmit={handleFinanceUnlock} className="space-y-6">
                                 <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••" className="w-full bg-black/50 text-center text-3xl tracking-[0.5em] p-4 rounded-2xl border border-white/10 outline-none focus:ring-2 ring-spotify-green" autoFocus />
                                 <button type="submit" className="w-full bg-spotify-green text-black font-black py-4 rounded-full shadow-lg hover:scale-105 transition-all">DESTRAVAR ACESSO</button>
                             </form>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="bg-spotify-highlight p-8 rounded-3xl border border-white/5">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => changeFinanceMonth(-1)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24}/></button>
                                    <div className="text-center min-w-[150px]">
                                        <h2 className="text-2xl font-black capitalize tracking-tight">{financeDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                                        <span className="text-[10px] text-spotify-green font-black uppercase tracking-widest block mt-1">Status de Caixa</span>
                                    </div>
                                    <button onClick={() => changeFinanceMonth(1)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={24}/></button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
                                    {[
                                      {label: 'MENSAL', key: 'monthlyFee'},
                                      {label: 'AVULSO', key: 'perGameFee'},
                                      {label: 'QUADRA', key: 'courtRentalCost'}
                                    ].map(setting => (
                                      <div key={setting.key} className="bg-black/20 p-3 rounded-xl border border-white/5">
                                        <label className="block text-[8px] font-black text-spotify-subtext mb-1 tracking-widest">{setting.label}</label>
                                        <input type="number" className="bg-transparent w-full text-right font-black text-sm outline-none text-spotify-green" value={financialSettings[setting.key as keyof FinancialSettings]} onChange={(e) => handleFinanceSettingChange(setting.key as keyof FinancialSettings, e.target.value)} />
                                      </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                  {label: 'Previsto', val: financeDataResult.totalExpected, color: 'text-white'},
                                  {label: 'Recebido', val: financeDataResult.totalPaid, color: 'text-spotify-green'},
                                  {label: 'Saldo Acumulado', val: financeDataResult.cashBalance, color: financeDataResult.cashBalance >= 0 ? 'text-spotify-green' : 'text-red-500', isBalance: true}
                                ].map((stat, i) => (
                                  <div key={i} className="bg-black/30 p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[110px]">
                                    <span className="text-[10px] font-black text-spotify-subtext uppercase tracking-widest">{stat.label}</span>
                                    <div className="flex items-end justify-between">
                                      <span className={`text-2xl font-black ${stat.color}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.val)}</span>
                                      {stat.isBalance && (stat.val >= 0 ? <TrendingUp size={24} className="text-spotify-green opacity-50"/> : <TrendingDown size={24} className="text-red-500 opacity-50"/>)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {[
                              {title: 'Mensalistas', data: financeDataResult.mensalistas, iconColor: 'bg-spotify-green'},
                              {title: 'Avulsos', data: financeDataResult.avulsos, iconColor: 'bg-yellow-500'}
                            ].map((group, idx) => (
                              <div key={idx}>
                                <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${group.iconColor}`}></div>
                                  {group.title}
                                </h3>
                                <div className="space-y-3">
                                    {group.data.map(p => (
                                        <div key={p.id} className="bg-spotify-highlight/40 border border-white/5 hover:bg-spotify-highlight p-4 rounded-2xl flex flex-col gap-3 transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover shadow-lg" />
                                                    <div className="flex flex-col">
                                                      <div className="font-black text-sm">{p.name}</div>
                                                      {p.linkedMensalistaName && <div className="text-[9px] text-yellow-500 font-black uppercase tracking-tighter">Resp: {p.linkedMensalistaName}</div>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-black text-xs text-white/80">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.gameAmountDue)}</span>
                                                    <button onClick={() => togglePaymentStatus(p.gamePaymentKey)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${p.isGamePaid ? 'bg-spotify-green text-black scale-110 shadow-lg' : 'bg-white/5 text-spotify-subtext'}`}>
                                                        {p.isGamePaid ? <CheckCircle2 size={20} strokeWidth={3} /> : <Circle size={20} />}
                                                    </button>
                                                </div>
                                            </div>
                                            {p.bbqDetails.length > 0 && (
                                              <div className="pl-14 space-y-1">
                                                {p.bbqDetails.map(bbq => (
                                                  <div key={bbq.id} className="flex justify-between items-center text-[10px] bg-orange-500/5 px-3 py-1.5 rounded-lg border border-orange-500/10">
                                                    <span className="text-orange-300 font-bold">{bbq.desc}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bbq.cost)}</span>
                                                        <button onClick={() => togglePaymentStatus(bbq.paymentKey)} className={bbq.isPaid ? 'text-orange-500' : 'text-white/20'}>{bbq.isPaid ? <CheckCircle2 size={12}/> : <Circle size={12}/>}</button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
        
        {activeTab === 'HISTORY' && (
          <div className="space-y-8 animate-slide-up pb-24">
             <h2 className="text-3xl md:text-5xl font-black tracking-tighter hidden md:block">Histórico</h2>
             {history.length === 0 ? (
               <div className="bg-spotify-highlight p-20 rounded-3xl border border-white/5 text-center text-spotify-subtext italic">Nenhuma rodada finalizada ainda.</div>
             ) : (
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                  <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {history.map(game => (
                      <button 
                        key={game.id} 
                        onClick={() => setSelectedHistoryId(game.id)}
                        className={`w-full text-left p-5 rounded-2xl transition-all border ${selectedHistoryId === game.id ? 'bg-spotify-green text-black font-black border-transparent shadow-xl translate-x-1' : 'bg-spotify-highlight text-white hover:bg-white/5 border-white/5'}`}
                      >
                        <div className="flex justify-between items-center">
                           <span className="text-sm">{game.dateString}</span>
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${selectedHistoryId === game.id ? 'bg-black/20 text-black' : 'bg-white/5 text-spotify-subtext'}`}>{game.stats.totalPlayers} JOG</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="lg:col-span-3">
                    {selectedHistoryId && history.find(h => h.id === selectedHistoryId) && (
                      <div className="bg-spotify-highlight rounded-3xl border border-white/10 p-8 shadow-2xl animate-slide-up">
                         {(() => {
                           const game = history.find(h => h.id === selectedHistoryId)!;
                           return (
                             <div className="space-y-10">
                                <div className="flex justify-between items-start border-b border-white/5 pb-6">
                                   <div>
                                     <h3 className="text-3xl font-black tracking-tight">{game.dateString}</h3>
                                     <p className="text-spotify-subtext font-bold">Resumo estatístico da rodada</p>
                                   </div>
                                </div>

                                {game.matches && game.matches.length > 0 && (
                                  <section className="space-y-5">
                                    <h4 className="text-[11px] font-black text-spotify-subtext uppercase tracking-[0.2em] flex items-center gap-3"><span className="h-px bg-white/10 flex-1"></span> Confrontos do Dia <span className="h-px bg-white/10 flex-1"></span></h4>
                                    <div className="grid gap-3">
                                       {game.matches.map(m => {
                                          const tA = game.teams.find(t => t.id === m.teamAId);
                                          const tB = game.teams.find(t => t.id === m.teamBId);
                                          return (
                                            <div key={m.id} className="bg-black/40 p-5 rounded-2xl flex items-center justify-between text-sm shadow-inner">
                                               <span className="flex-1 text-right font-black pr-6 text-base truncate">{tA?.name}</span>
                                               <span className="bg-white/10 px-4 py-2 rounded-xl font-black text-lg min-w-[90px] text-center border border-white/5">{m.scoreA} x {m.scoreB}</span>
                                               <span className="flex-1 text-left font-black pl-6 text-base truncate">{tB?.name}</span>
                                            </div>
                                          );
                                       })}
                                    </div>
                                  </section>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   {game.teams.map(team => (
                                     <div key={team.id} className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
                                          <h4 className="font-black text-spotify-green uppercase tracking-wider text-xs">{team.name}</h4>
                                          <span className="text-[10px] text-spotify-subtext font-bold">{team.players.length} Atletas</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                          {team.players.map(p => (
                                            <div key={p.id} className="flex items-center gap-3 text-xs font-bold text-white/80">
                                               <img src={p.photoUrl} className="w-6 h-6 rounded-full object-cover" />
                                               <span className="truncate">{p.name}</span>
                                            </div>
                                          ))}
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           );
                         })()}
                      </div>
                    )}
                  </div>
               </div>
             )}
          </div>
        )}
      </main>

      {/* NEW PLAYER MODAL - Revamped for mobile bottom-sheet feel */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end md:items-center justify-center">
          <div className="bg-spotify-highlight rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-t md:border border-white/10 max-h-[92vh] overflow-y-auto animate-slide-up">
            <div className="p-6 md:p-8 flex justify-between items-center sticky top-0 bg-spotify-highlight/95 backdrop-blur-sm z-10 border-b border-white/5">
               <h2 className="font-black text-2xl text-white tracking-tight">Novo Atleta</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSavePlayer} className="p-6 md:p-10 space-y-8">
               <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-black/50 border-2 border-spotify-green shadow-2xl flex items-center justify-center">
                        {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Users size={48} className="text-white/20" />
                        )}
                        {loadingAvatar && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-full">
                              <Loader2 className="animate-spin text-spotify-green" size={32} />
                          </div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-spotify-green rounded-full p-2 shadow-lg border-2 border-spotify-highlight">
                       <Camera size={18} className="text-black" />
                    </div>
                  </div>

                  <div className="flex gap-3 w-full max-w-xs">
                     <label className="flex-1 cursor-pointer bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest py-3 px-2 rounded-2xl text-center transition-all border border-white/5">
                        Upload
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                     </label>
                     <button type="button" onClick={handleGenerateAvatar} disabled={loadingAvatar || !formData.name} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white text-[10px] font-black uppercase tracking-widest py-3 px-2 rounded-2xl transition-all shadow-lg">IA Avatar</button>
                  </div>
               </div>

               <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Nome Completo</label>
                    <input type="text" required className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-base font-bold border border-white/5 focus:ring-2 ring-spotify-green outline-none transition-all placeholder-white/10" placeholder="Ex: Cristiano Ronaldo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Nº Colete</label>
                        <input type="number" className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-base font-bold border border-white/5 focus:ring-2 ring-spotify-green outline-none" value={formData.vestNumber} onChange={e => setFormData({...formData, vestNumber: e.target.value})} />
                     </div>
                     <div>
                         <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Posição</label>
                         <div className="flex bg-black/30 rounded-2xl p-1 border border-white/5">
                             {[{val: false, label: 'Linha'}, {val: true, label: 'Goleiro'}].map(pos => (
                               <button key={pos.label} type="button" onClick={() => setFormData({...formData, isGoalkeeper: pos.val})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.isGoalkeeper === pos.val ? 'bg-spotify-green text-black shadow-md' : 'text-spotify-subtext'}`}>{pos.label}</button>
                             ))}
                         </div>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                       <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Contrato</label>
                       <select className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-sm font-bold border border-white/5 focus:ring-2 ring-spotify-green outline-none appearance-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PlayerType})}>
                           <option value={PlayerType.MENSALISTA}>Mensalista</option>
                           <option value={PlayerType.AVULSO}>Avulso</option>
                       </select>
                   </div>
                   {formData.type === PlayerType.AVULSO && (
                       <div>
                           <label className="block text-[10px] font-black text-spotify-subtext mb-2 uppercase tracking-[0.2em]">Responsável</label>
                           <select className="w-full bg-black/30 text-white px-5 py-4 rounded-2xl text-sm font-bold border border-white/5 focus:ring-2 ring-spotify-green outline-none appearance-none" value={formData.linkedMensalistaId || ''} onChange={e => setFormData({...formData, linkedMensalistaId: e.target.value})} required>
                               <option value="">Escolher Mensalista...</option>
                               {activeMensalistas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                       </div>
                   )}
                 </div>

                 <div className="pt-4">
                     <label className="block text-[10px] font-black text-spotify-subtext mb-4 uppercase tracking-[0.2em] text-center">Nível Técnico (Estrelas)</label>
                     <div className="flex justify-center bg-black/20 p-6 rounded-3xl border border-white/5">
                         <StarRating value={formData.stars || 3} onChange={v => setFormData({...formData, stars: v})} size={36} />
                     </div>
                 </div>
               </div>

               <button type="submit" className="w-full bg-spotify-green hover:bg-spotify-green-bright text-black font-black py-5 rounded-full shadow-2xl transform active:scale-95 transition-all uppercase tracking-[0.2em] text-sm mt-8">
                   SALVAR ATLETA
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - High Quality UI */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-20 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] flex items-center justify-around px-6 z-[60] shadow-[0_20px_40px_rgba(0,0,0,0.4)] safe-pb">
         {[
           {id: 'PLAYERS', icon: Users},
           {id: 'STARS', icon: Star},
           {id: 'TEAMS', icon: Dribbble},
           {id: 'PLACAR', icon: Swords},
           {id: 'BBQ', icon: Beef},
           {id: 'FINANCE', icon: Banknote}
         ].map(item => (
           <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as TabView)} 
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all relative ${activeTab === item.id ? 'text-spotify-green scale-110' : 'text-spotify-subtext'}`}
           >
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            {activeTab === item.id && <span className="absolute -bottom-1 w-1 h-1 bg-spotify-green rounded-full shadow-[0_0_5px_#1DB954]"></span>}
           </button>
         ))}
      </nav>

    </div>
  );
}

export default App;