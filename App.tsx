import React, { useState, useEffect, useMemo } from 'react';
import { Users, Star, Shirt, Plus, X, Wand2, Loader2, Trophy, AlertTriangle, Shield, Search, Menu, History, Save, Calendar, Clock, Camera, Upload, ImagePlus, Banknote, ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock, ArrowRight, TrendingUp, TrendingDown, Utensils, Flame, Receipt } from 'lucide-react';
import { Player, PlayerType, TabView, Team, GameHistory, FinancialSettings, PaymentRegistry, BarbecueEvent } from './types';
import * as storage from './services/storageService';
import * as geminiService from './services/geminiService';
import PlayerCard from './components/PlayerCard';
import StarRating from './components/StarRating';

// --- Constants & Helper Logic ---
const ALGO_LOCAL = 'LOCAL';
const ALGO_AI = 'AI';

function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabView>('PLAYERS');
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [barbecues, setBarbecues] = useState<BarbecueEvent[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Finance State
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ monthlyFee: 0, perGameFee: 0, courtRentalCost: 0 });
  const [payments, setPayments] = useState<PaymentRegistry>({});
  const [financeDate, setFinanceDate] = useState(new Date());
  const [isFinanceUnlocked, setIsFinanceUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  
  // Selection State for Teams
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [generatedTeams, setGeneratedTeams] = useState<Team[]>([]);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // BBQ Form State
  const [bbqForm, setBbqForm] = useState({
      description: 'Churrasco da Semana',
      meatCost: 0,
      rentalCost: 0,
      otherCost: 0,
      useCashBalance: false
  });
  const [bbqSelectedPlayers, setBbqSelectedPlayers] = useState<Set<string>>(new Set());

  // Player Form State
  const [formData, setFormData] = useState<Partial<Player>>({
    name: '',
    email: '',
    vestNumber: '',
    type: PlayerType.MENSALISTA,
    isGoalkeeper: false,
    stars: 3,
    photoUrl: '',
  });

  // --- Effects ---
  useEffect(() => {
    setPlayers(storage.getPlayers());
    const loadedHistory = storage.getGameHistory();
    setHistory(loadedHistory);
    setBarbecues(storage.getBarbecues());
    setFinancialSettings(storage.getFinancialSettings());
    setPayments(storage.getPayments());
    
    // Default select the first history item if available
    if (loadedHistory.length > 0) {
      setSelectedHistoryId(loadedHistory[0].id);
    }
  }, []);

  // --- Actions ---

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Use uploaded/generated photo OR fallback to Picsum
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
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!formData.name) {
      alert("Preencha o nome antes de gerar o avatar.");
      return;
    }
    
    try {
      setLoadingAvatar(true);
      const avatarUrl = await geminiService.generatePlayerAvatar(formData.name, formData.isGoalkeeper || false);
      setFormData(prev => ({ ...prev, photoUrl: avatarUrl }));
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar avatar. Tente novamente.");
    } finally {
      setLoadingAvatar(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este jogador?')) {
      setPlayers(storage.deletePlayer(id));
    }
  };

  const handleToggleStatus = (id: string) => setPlayers(storage.togglePlayerStatus(id));
  const handlePromote = (id: string) => setPlayers(storage.promoteToMensalista(id));
  const handleUpdateStars = (id: string, stars: number) => setPlayers(storage.updatePlayerStars(id, stars));

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedPlayerIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
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
      stats: {
        totalPlayers: generatedTeams.reduce((acc, t) => acc + t.players.length, 0),
        averageBalance: generatedTeams.reduce((acc, t) => acc + t.averageStars, 0) / generatedTeams.length
      }
    };

    const updatedHistory = storage.saveGameHistory(newGame);
    setHistory(updatedHistory);
    setSelectedHistoryId(newGame.id);
    setActiveTab('HISTORY');
    setGeneratedTeams([]); // Clear current generation
    setTeamsError(null);
    alert("Jogo salvo no histórico com sucesso!");
  };

  // --- BBQ Logic ---

  const toggleBbqSelection = (id: string) => {
    const newSet = new Set(bbqSelectedPlayers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setBbqSelectedPlayers(newSet);
  };

  const calculateBBQ = (availableCash: number) => {
      const totalCost = (Number(bbqForm.meatCost) || 0) + (Number(bbqForm.rentalCost) || 0) + (Number(bbqForm.otherCost) || 0);
      const participantsCount = bbqSelectedPlayers.size;
      
      let cashUsed = 0;
      let finalCostToSplit = totalCost;

      if (bbqForm.useCashBalance) {
          cashUsed = Math.min(totalCost, availableCash > 0 ? availableCash : 0);
          finalCostToSplit = totalCost - cashUsed;
      }

      const costPerPerson = participantsCount > 0 ? finalCostToSplit / participantsCount : 0;
      
      return { totalCost, cashUsed, finalCostToSplit, costPerPerson, participantsCount };
  };

  const handleSaveBBQ = (availableCash: number) => {
      if (bbqSelectedPlayers.size === 0) {
          alert("Selecione os participantes do churrasco.");
          return;
      }

      const calc = calculateBBQ(availableCash);

      const newBBQ: BarbecueEvent = {
          id: crypto.randomUUID(),
          dateString: new Date().toLocaleDateString('pt-BR'),
          timestamp: Date.now(),
          description: bbqForm.description,
          participants: Array.from(bbqSelectedPlayers),
          costs: {
              meat: Number(bbqForm.meatCost) || 0,
              rental: Number(bbqForm.rentalCost) || 0,
              others: Number(bbqForm.otherCost) || 0
          },
          useCashBalance: bbqForm.useCashBalance,
          cashBalanceUsed: calc.cashUsed,
          finalCostPerPerson: calc.costPerPerson
      };

      const updated = storage.saveBarbecue(newBBQ);
      setBarbecues(updated);
      
      // Reset
      setBbqForm({ description: 'Churrasco da Semana', meatCost: 0, rentalCost: 0, otherCost: 0, useCashBalance: false });
      setBbqSelectedPlayers(new Set());
      alert("Churrasco organizado com sucesso! As dívidas foram geradas no Financeiro.");
  };

  const handleDeleteBBQ = (id: string) => {
      if (confirm("Excluir este churrasco? Isso removerá as cobranças associadas no financeiro.")) {
          setBarbecues(storage.deleteBarbecue(id));
      }
  };

  // --- Finance Actions ---
  const handleFinanceUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1234') {
        setIsFinanceUnlocked(true);
        setPasswordInput('');
    } else {
        alert("Senha incorreta!");
    }
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

  const togglePaymentStatus = (paymentKey: string) => {
    setPayments(storage.togglePayment(paymentKey));
  };

  // --- Team Generation Logic (Local) ---
  const generateTeamsLocal = () => {
    setTeamsError(null);
    const selected = players.filter(p => selectedPlayerIds.has(p.id));
    const total = selected.length;
    const gks = selected.filter(p => p.isGoalkeeper);
    const outfield = selected.filter(p => !p.isGoalkeeper);

    // Rule: Cannot have 2 GKs in same team (handled by distributing GKs first)
    
    // Determine Team Count based on constraints
    let numTeams = 3; 
    if (total >= 22) numTeams = 4;
    
    // Sort outfielders by stars (Descending) for Snake Draft
    const sortedOutfield = [...outfield].sort((a, b) => b.stars - a.stars);
    
    const teams: Player[][] = Array.from({ length: numTeams }, () => []);
    
    // 1. Distribute Goalkeepers
    const sortedGKs = [...gks].sort((a,b) => b.stars - a.stars);
    sortedGKs.forEach((gk, index) => {
       teams[index % numTeams].push(gk);
    });

    // 2. Distribute Outfielders (Snake Draft)
    let teamIndex = 0;
    let direction = 1; // 1 for forward, -1 for backward

    sortedOutfield.forEach((player) => {
       teams[teamIndex].push(player);
       
       teamIndex += direction;
       if (teamIndex >= numTeams) {
         teamIndex = numTeams - 1;
         direction = -1;
       } else if (teamIndex < 0) {
         teamIndex = 0;
         direction = 1;
       }
    });

    // Format Result
    const resultTeams: Team[] = teams.map((teamPlayers, idx) => {
        const totalStars = teamPlayers.reduce((acc, p) => acc + p.stars, 0);
        return {
            id: idx + 1,
            name: `Time ${idx + 1}`,
            players: teamPlayers,
            totalStars,
            averageStars: teamPlayers.length ? parseFloat((totalStars / teamPlayers.length).toFixed(1)) : 0
        };
    });

    setGeneratedTeams(resultTeams);
  };

  const handleGenerateTeams = async (method: typeof ALGO_LOCAL | typeof ALGO_AI) => {
     if (selectedPlayerIds.size < 4) {
         setTeamsError("Selecione pelo menos 4 jogadores.");
         return;
     }

     if (method === ALGO_LOCAL) {
         generateTeamsLocal();
     } else {
         const selected = players.filter(p => selectedPlayerIds.has(p.id));
         try {
             setLoadingAI(true);
             const aiTeams = await geminiService.generateTeamsWithAI(selected);
             setGeneratedTeams(aiTeams);
         } catch (e) {
             setTeamsError("Erro ao gerar times com IA. Verifique sua chave API ou tente o modo padrão.");
             console.error(e);
         } finally {
             setLoadingAI(false);
         }
     }
  };

  // --- Derived Data ---
  const activeMensalistas = useMemo(() => players.filter(p => p.type === PlayerType.MENSALISTA && p.isActive), [players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  
  const stats = useMemo(() => {
     const total = selectedPlayerIds.size;
     const gks = players.filter(p => selectedPlayerIds.has(p.id) && p.isGoalkeeper).length;
     return { total, gks, outfield: total - gks };
  }, [selectedPlayerIds, players]);

  // Financial Calculations
  const financeData = useMemo(() => {
    const selectedMonth = financeDate.getMonth();
    const selectedYear = financeDate.getFullYear();

    // Map players
    const allPlayersMap = new Map<string, Player>();
    players.forEach(p => allPlayersMap.set(p.id, p));
    history.forEach(h => h.teams.forEach(t => t.players.forEach(p => {
        if (!allPlayersMap.has(p.id)) allPlayersMap.set(p.id, p);
    })));

    // --- 1. Current Month View Data (Standard Games) ---
    const gamesInMonth = history.filter(game => {
       const d = new Date(game.timestamp);
       return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const attendanceCurrent: Record<string, number> = {};
    gamesInMonth.forEach(game => {
       game.teams.forEach(team => {
          team.players.forEach(p => {
             attendanceCurrent[p.id] = (attendanceCurrent[p.id] || 0) + 1;
          });
       });
    });

    // --- 2. BBQ Data for Current Month ---
    // We only show debt for BBQs that happened this month in the "Debt" section
    const bbqsInMonth = barbecues.filter(b => {
        const d = new Date(b.timestamp);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // Build Player Finance List
    const list = players.map(player => {
       // A. Game/Monthly Fees
       const isMensalista = player.type === PlayerType.MENSALISTA;
       const gamesPlayed = attendanceCurrent[player.id] || 0;
       let gameAmountDue = 0;
       
       if (isMensalista) {
          gameAmountDue = player.isActive ? financialSettings.monthlyFee : 0;
       } else {
          gameAmountDue = gamesPlayed * financialSettings.perGameFee;
       }
       const gamePaymentKey = `${selectedYear}-${selectedMonth}-${player.id}`;
       const isGamePaid = !!payments[gamePaymentKey];

       // B. BBQ Fees (Sum of all BBQs this month this player participated in)
       const playerBbqs = bbqsInMonth.filter(b => b.participants.includes(player.id));
       const bbqDetails = playerBbqs.map(b => {
           const key = `BBQ-${b.id}-${player.id}`;
           return {
               id: b.id,
               desc: b.description,
               cost: b.finalCostPerPerson,
               isPaid: !!payments[key],
               paymentKey: key
           };
       });
       
       const totalBbqDebt = bbqDetails.reduce((acc, b) => acc + b.cost, 0);
       const totalBbqPaid = bbqDetails.filter(b => b.isPaid).reduce((acc, b) => acc + b.cost, 0);

       const linkedMensalista = player.linkedMensalistaId 
            ? players.find(p => p.id === player.linkedMensalistaId) 
            : undefined;

       return {
          ...player,
          gamesPlayed,
          gameAmountDue,
          isGamePaid,
          gamePaymentKey,
          bbqDetails,
          totalBbqDebt,
          totalBbqPaid,
          linkedMensalistaName: linkedMensalista?.name
       };
    }).filter(p => p.gameAmountDue > 0 || p.isGamePaid || p.bbqDetails.length > 0);

    const mensalistas = list.filter(p => p.type === PlayerType.MENSALISTA);
    const avulsos = list.filter(p => p.type === PlayerType.AVULSO);

    // Totals for current month view
    const totalExpected = list.reduce((acc, p) => acc + p.gameAmountDue + p.totalBbqDebt, 0);
    const totalPaidCurrent = list.reduce((acc, p) => acc + (p.isGamePaid ? p.gameAmountDue : 0) + p.totalBbqPaid, 0);

    // --- 3. Accumulated Balance Calculation (Global) ---
    
    // Games Revenue logic
    const historyMap: Record<string, Record<string, number>> = {};
    const activeMonths = new Set<string>();

    history.forEach(game => {
        const d = new Date(game.timestamp);
        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
        activeMonths.add(mKey);
        if (!historyMap[mKey]) historyMap[mKey] = {};
        game.teams.forEach(t => t.players.forEach(p => {
            historyMap[mKey][p.id] = (historyMap[mKey][p.id] || 0) + 1;
        }));
    });
    Object.keys(payments).forEach(key => {
        if (!key.startsWith('BBQ-')) {
            const parts = key.split('-');
            if (parts.length >= 3) {
                const y = parts[0];
                const m = parts[1];
                activeMonths.add(`${y}-${m}`);
            }
        }
    });

    let cumulativeBalance = 0;
    
    // Sort months to process linearly
    const sortedMonths = Array.from(activeMonths).sort((a,b) => {
        const [y1, m1] = a.split('-').map(Number);
        const [y2, m2] = b.split('-').map(Number);
        return (y1 * 12 + m1) - (y2 * 12 + m2);
    });

    // 1. Calculate Revenue from Games/Fees & Subtract Court Costs
    sortedMonths.forEach(mKey => {
        const [y, m] = mKey.split('-').map(Number);
        if (y > selectedYear || (y === selectedYear && m > selectedMonth)) return; // Don't count future

        // Court Cost
        cumulativeBalance -= (financialSettings.courtRentalCost || 0);

        // Revenue
        allPlayersMap.forEach(p => {
             const pKey = `${y}-${m}-${p.id}`;
             if (payments[pKey]) {
                 if (p.type === PlayerType.MENSALISTA) {
                     cumulativeBalance += financialSettings.monthlyFee;
                 } else {
                     const gCount = historyMap[mKey]?.[p.id] || 0;
                     cumulativeBalance += (gCount * financialSettings.perGameFee);
                 }
             }
        });
    });

    // 2. Handle BBQ Cash Flow (Global)
    // - Add revenue from people paying for BBQ
    // - Subtract cash taken from the box to pay for BBQ
    barbecues.forEach(bbq => {
        const bbqDate = new Date(bbq.timestamp);
        // Only count if it happened before or in current view (simplification: actually cash balance is global)
        // Let's make cash balance global up to current time, but filtering by view date might be confusing.
        // Usually "Cash Balance" is "Today's Balance".
        // Let's follow the previous logic: Accumulate everything up to selected month.
        if (bbqDate.getFullYear() > selectedYear || (bbqDate.getFullYear() === selectedYear && bbqDate.getMonth() > selectedMonth)) return;

        // Subtract amount used from cash
        if (bbq.useCashBalance) {
            cumulativeBalance -= bbq.cashBalanceUsed;
        }

        // Add revenue from participants who paid
        bbq.participants.forEach(pid => {
            const payKey = `BBQ-${bbq.id}-${pid}`;
            if (payments[payKey]) {
                cumulativeBalance += bbq.finalCostPerPerson;
            }
        });
    });

    return { mensalistas, avulsos, totalExpected, totalPaid: totalPaidCurrent, cashBalance: cumulativeBalance };

  }, [players, history, financialSettings, payments, financeDate, barbecues]);

  // Current calculation for BBQ Form (Realtime)
  const currentBbqCalc = useMemo(() => {
     // We need the *latest* cash balance for the form. 
     // Reusing financeData might be stale if user is viewing a past month.
     // For simplicity, we assume financeData.cashBalance is what they have available based on current view context,
     // OR we could recalculate total global balance. Let's use financeData.cashBalance as "Available in this context".
     return {
        ...calculateBBQ(financeData.cashBalance),
        available: financeData.cashBalance
     };
  }, [bbqForm, bbqSelectedPlayers, financeData.cashBalance]);

  return (
    <div className="min-h-screen bg-spotify-base text-white pb-24 md:pb-0 font-sans">
      
      {/* Header (Desktop) - Spotify Style */}
      <div className="hidden md:flex flex-col h-screen fixed w-64 bg-black p-6 gap-6 z-50">
         <div className="flex items-center gap-2 font-bold text-2xl text-white mb-4">
             <Trophy size={32} className="text-white" />
             <span>FutManager</span>
         </div>
         
         <nav className="flex flex-col gap-4">
             <button 
                onClick={() => setActiveTab('PLAYERS')} 
                className={`flex items-center gap-4 text-sm font-bold transition-colors ${activeTab === 'PLAYERS' ? 'text-white' : 'text-spotify-subtext hover:text-white'}`}
             >
                <Users size={24} />
                Jogadores
             </button>
             <button 
                onClick={() => setActiveTab('STARS')} 
                className={`flex items-center gap-4 text-sm font-bold transition-colors ${activeTab === 'STARS' ? 'text-white' : 'text-spotify-subtext hover:text-white'}`}
             >
                <Star size={24} />
                Avaliações
             </button>
             <button 
                onClick={() => setActiveTab('TEAMS')} 
                className={`flex items-center gap-4 text-sm font-bold transition-colors ${activeTab === 'TEAMS' ? 'text-white' : 'text-spotify-subtext hover:text-white'}`}
             >
                <Shirt size={24} />
                Sortear Times
             </button>
             <button 
                onClick={() => setActiveTab('BBQ')} 
                className={`flex items-center gap-4 text-sm font-bold transition-colors ${activeTab === 'BBQ' ? 'text-white' : 'text-spotify-subtext hover:text-white'}`}
             >
                <Utensils size={24} />
                Churrasco
             </button>
             <button 
                onClick={() => setActiveTab('HISTORY')} 
                className={`flex items-center gap-4 text-sm font-bold transition-colors ${activeTab === 'HISTORY' ? 'text-white' : 'text-spotify-subtext hover:text-white'}`}
             >
                <History size={24} />
                Histórico
             </button>
             <button 
                onClick={() => setActiveTab('FINANCE')} 
                className={`flex items-center gap-4 text-sm font-bold transition-colors ${activeTab === 'FINANCE' ? 'text-white' : 'text-spotify-subtext hover:text-white'}`}
             >
                <Banknote size={24} />
                Financeiro
             </button>
         </nav>
      </div>

      {/* Main Content Area */}
      <main className="md:ml-64 p-4 md:p-8 bg-gradient-to-b from-spotify-elevated to-spotify-base min-h-screen">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6 sticky top-0 bg-spotify-base/90 backdrop-blur-md py-4 z-40 -mx-4 px-4">
            <h1 className="text-xl font-bold">FutManager</h1>
            <div className="flex gap-4">
                <Search className="text-white" />
                <Menu className="text-white" />
            </div>
        </div>

        {/* -- PLAYERS TAB -- */}
        {activeTab === 'PLAYERS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
               <div>
                   <h2 className="text-3xl md:text-5xl font-bold mb-2 tracking-tighter">Jogadores</h2>
                   <p className="text-spotify-subtext text-sm">Gerencie o elenco do futebol semanal.</p>
               </div>
               
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="bg-spotify-green hover:bg-spotify-green-bright text-black font-bold rounded-full px-6 py-3 flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg"
               >
                 <Plus size={20} strokeWidth={3} />
                 NOVO JOGADOR
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
              {sortedPlayers.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-spotify-subtext">
                      <Users size={64} strokeWidth={1} className="mb-4 opacity-50"/>
                      <p className="text-lg">Nenhum jogador cadastrado.</p>
                      <p className="text-sm">Comece adicionando a galera!</p>
                  </div>
              ) : (
                  sortedPlayers.map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player}
                      mode="MANAGE"
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                      onPromote={handlePromote}
                    />
                  ))
              )}
            </div>
          </div>
        )}

        {/* -- STARS TAB -- */}
        {activeTab === 'STARS' && (
          <div className="space-y-6">
            <div>
               <h2 className="text-3xl md:text-5xl font-bold mb-2 tracking-tighter">Avaliações</h2>
               <p className="text-spotify-subtext text-sm">Defina o nível técnico (1 a 5 estrelas).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
               {sortedPlayers.filter(p => p.isActive).map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player}
                      mode="RATE"
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                      onUpdateStars={handleUpdateStars}
                    />
               ))}
            </div>
          </div>
        )}

        {/* -- TEAMS TAB -- */}
        {activeTab === 'TEAMS' && (
           <div className="space-y-8">
              <div className="bg-gradient-to-r from-spotify-elevated to-transparent p-6 rounded-lg border border-white/5 sticky top-20 md:static z-30">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                         <h2 className="text-2xl font-bold mb-1">Sorteio da Partida</h2>
                         <div className="flex items-center gap-4 text-xs font-medium text-spotify-subtext uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Users size={14}/> Total: <span className="text-white">{stats.total}</span></span>
                            <span className="flex items-center gap-1"><Shield size={14}/> Goleiros: <span className="text-white">{stats.gks}</span></span>
                            <span className="flex items-center gap-1"><Shirt size={14}/> Linha: <span className="text-white">{stats.outfield}</span></span>
                         </div>
                     </div>

                     <div className="flex gap-3 w-full md:w-auto">
                        <button 
                           onClick={() => handleGenerateTeams(ALGO_LOCAL)}
                           className="flex-1 md:flex-none bg-white text-black hover:scale-105 px-6 py-2 rounded-full font-bold transition-transform"
                        >
                           Sorteio Rápido
                        </button>
                        <button 
                           onClick={() => handleGenerateTeams(ALGO_AI)}
                           disabled={loadingAI}
                           className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 hover:scale-105 disabled:opacity-50 disabled:scale-100 px-6 py-2 rounded-full font-bold transition-all flex items-center justify-center gap-2"
                        >
                           {loadingAI ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                           IA Balance
                        </button>
                     </div>
                 </div>
                 
                 {teamsError && (
                     <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-md flex items-center gap-2 text-sm">
                         <AlertTriangle size={16} /> {teamsError}
                     </div>
                 )}
              </div>

              {generatedTeams.length > 0 ? (
                  <div className="space-y-6 pb-20">
                      
                      {/* Save Action */}
                      <div className="flex justify-end">
                         <button 
                           onClick={handleSaveGame}
                           className="bg-spotify-green text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                         >
                            <Save size={18} />
                            Salvar Resultado
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                          {generatedTeams.map(team => (
                              <div key={team.id} className="bg-spotify-elevated rounded-lg p-6 hover:bg-spotify-highlight transition-colors group">
                                  <div className="flex justify-between items-center mb-4">
                                      <h3 className="font-bold text-xl group-hover:text-spotify-green transition-colors">{team.name}</h3>
                                      <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-spotify-subtext">
                                          {team.averageStars} ★
                                      </span>
                                  </div>
                                  <div className="space-y-3">
                                      {team.players.map((p, idx) => (
                                          <div key={p.id} className="flex items-center justify-between group/player">
                                              <div className="flex items-center gap-3">
                                                  <span className="text-spotify-subtext w-4 text-center text-sm font-mono">{idx + 1}</span>
                                                  <img src={p.photoUrl} alt="" className="w-8 h-8 rounded-full bg-spotify-highlight object-cover" />
                                                  <div className="flex flex-col">
                                                      <span className={`text-sm font-medium ${p.isGoalkeeper ? 'text-yellow-400' : 'text-white'}`}>
                                                          {p.name} {p.isGoalkeeper && '(GK)'}
                                                      </span>
                                                  </div>
                                              </div>
                                              <div className="flex gap-0.5 opacity-0 group-hover/player:opacity-100 transition-opacity">
                                                  {Array.from({length: p.stars}).map((_, i) => (
                                                      <Star key={i} size={10} className="fill-white text-white" />
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-center">
                          <button 
                             onClick={() => setGeneratedTeams([])}
                             className="text-spotify-subtext hover:text-white uppercase text-xs font-bold tracking-widest border-b border-transparent hover:border-white pb-1 transition-all"
                          >
                              Limpar e Sortear Novamente
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="mt-8">
                     <h3 className="text-white font-bold text-xl mb-4">Selecione o Elenco</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedPlayers.filter(p => p.isActive).map(player => (
                             <PlayerCard 
                               key={player.id}
                               player={player}
                               mode="SELECT"
                               onDelete={()=>{}}
                               onToggleStatus={()=>{}}
                               isSelected={selectedPlayerIds.has(player.id)}
                               onSelectToggle={toggleSelection}
                             />
                        ))}
                     </div>
                  </div>
              )}
           </div>
        )}

        {/* -- BBQ TAB -- */}
        {activeTab === 'BBQ' && (
            <div className="space-y-8 animate-in fade-in">
                 <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Configuration */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-spotify-elevated p-6 rounded-lg border border-white/5">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <Flame className="text-orange-500" /> Organizar Churrasco
                            </h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-spotify-subtext uppercase">Descrição</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-black/30 border-b border-white/10 p-2 text-white focus:border-spotify-green outline-none"
                                        value={bbqForm.description}
                                        onChange={e => setBbqForm({...bbqForm, description: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-spotify-subtext uppercase">Carnes (R$)</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-black/30 border-b border-white/10 p-2 text-white text-right focus:border-spotify-green outline-none"
                                            value={bbqForm.meatCost}
                                            onChange={e => setBbqForm({...bbqForm, meatCost: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-spotify-subtext uppercase">Aluguel (R$)</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-black/30 border-b border-white/10 p-2 text-white text-right focus:border-spotify-green outline-none"
                                            value={bbqForm.rentalCost}
                                            onChange={e => setBbqForm({...bbqForm, rentalCost: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-spotify-subtext uppercase">Outros (R$)</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-black/30 border-b border-white/10 p-2 text-white text-right focus:border-spotify-green outline-none"
                                            value={bbqForm.otherCost}
                                            onChange={e => setBbqForm({...bbqForm, otherCost: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-black/20 p-3 rounded border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">Usar Caixa Disponível?</span>
                                        <span className="text-xs text-spotify-subtext">
                                            Disponível: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBbqCalc.available)}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setBbqForm({...bbqForm, useCashBalance: !bbqForm.useCashBalance})}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${bbqForm.useCashBalance ? 'bg-spotify-green' : 'bg-white/20'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${bbqForm.useCashBalance ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-orange-900/50 to-black p-6 rounded-lg border border-orange-500/20">
                             <div className="flex justify-between items-end mb-4">
                                 <div>
                                     <p className="text-spotify-subtext text-xs uppercase font-bold">Custo Total</p>
                                     <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBbqCalc.totalCost)}</p>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-spotify-subtext text-xs uppercase font-bold">Abatido do Caixa</p>
                                     <p className="text-lg font-bold text-spotify-green">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBbqCalc.cashUsed)}</p>
                                 </div>
                             </div>
                             <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                 <div>
                                     <p className="text-spotify-subtext text-xs uppercase font-bold">Participantes</p>
                                     <p className="text-xl font-bold">{currentBbqCalc.participantsCount}</p>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-orange-400 text-xs uppercase font-bold">Por Pessoa</p>
                                     <p className="text-3xl font-bold text-orange-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBbqCalc.costPerPerson)}</p>
                                 </div>
                             </div>

                             <button 
                                onClick={() => handleSaveBBQ(currentBbqCalc.available)}
                                className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-full shadow-lg transition-transform hover:scale-105"
                             >
                                Finalizar e Gerar Cobranças
                             </button>
                        </div>
                    </div>

                    {/* Right: Participants */}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-4">Quem vai participar?</h3>
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2">
                             {sortedPlayers.filter(p => p.isActive).map(player => (
                                 <div 
                                    key={player.id}
                                    onClick={() => toggleBbqSelection(player.id)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded cursor-pointer transition-colors border
                                        ${bbqSelectedPlayers.has(player.id) ? 'bg-orange-900/40 border-orange-500' : 'bg-spotify-elevated border-transparent hover:bg-white/5'}
                                    `}
                                 >
                                     <img src={player.photoUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                                     <span className="text-sm font-medium truncate">{player.name}</span>
                                     {bbqSelectedPlayers.has(player.id) && <CheckCircle2 size={16} className="ml-auto text-orange-500" />}
                                 </div>
                             ))}
                        </div>
                    </div>
                 </div>

                 {/* BBQ History List */}
                 {barbecues.length > 0 && (
                     <div className="mt-12 pt-8 border-t border-white/5">
                         <h3 className="text-xl font-bold mb-6">Histórico de Churrascos</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {barbecues.map(bbq => (
                                 <div key={bbq.id} className="bg-spotify-elevated p-4 rounded border-l-4 border-orange-500 relative group">
                                     <button 
                                        onClick={() => handleDeleteBBQ(bbq.id)}
                                        className="absolute top-2 right-2 text-spotify-subtext hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                     >
                                        <X size={16} />
                                     </button>
                                     <div className="flex justify-between items-start mb-2">
                                         <div>
                                             <h4 className="font-bold">{bbq.description}</h4>
                                             <span className="text-xs text-spotify-subtext">{bbq.dateString}</span>
                                         </div>
                                         <div className="text-right">
                                             <span className="block font-bold text-orange-500">
                                                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bbq.finalCostPerPerson)} / pessoa
                                             </span>
                                             {bbq.useCashBalance && <span className="text-[10px] text-spotify-green">Caixa usado</span>}
                                         </div>
                                     </div>
                                     <div className="flex gap-4 text-xs text-spotify-subtext mt-2">
                                         <span>Participantes: {bbq.participants.length}</span>
                                         <span>Custo Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bbq.costs.meat + bbq.costs.rental + bbq.costs.others)}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
            </div>
        )}

        {/* -- FINANCE TAB -- */}
        {activeTab === 'FINANCE' && (
            <div className="h-full">
                {!isFinanceUnlocked ? (
                    <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="bg-spotify-elevated p-8 rounded-xl shadow-2xl border border-white/5 w-full max-w-sm text-center">
                             <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                 <Lock size={32} className="text-white" />
                             </div>
                             <h2 className="text-2xl font-bold mb-2">Área Restrita</h2>
                             <p className="text-spotify-subtext mb-6">Digite a senha para gerenciar o financeiro.</p>
                             
                             <form onSubmit={handleFinanceUnlock} className="space-y-4">
                                 <input 
                                     type="password"
                                     value={passwordInput}
                                     onChange={(e) => setPasswordInput(e.target.value)}
                                     placeholder="Senha"
                                     className="w-full bg-black/50 text-center text-xl tracking-widest px-4 py-3 rounded border border-white/10 focus:border-spotify-green focus:outline-none transition-colors"
                                     autoFocus
                                 />
                                 <button 
                                     type="submit"
                                     className="w-full bg-spotify-green hover:bg-spotify-green-bright text-black font-bold py-3 rounded transition-colors flex items-center justify-center gap-2"
                                 >
                                     Acessar <ArrowRight size={18} />
                                 </button>
                             </form>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Finance Header & Controls */}
                        <div className="bg-gradient-to-r from-spotify-elevated to-transparent p-6 rounded-lg border border-white/5">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                
                                {/* Month Selector */}
                                <div className="flex items-center gap-4">
                                    <button onClick={() => changeFinanceMonth(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft/></button>
                                    <div className="text-center">
                                        <h2 className="text-2xl font-bold capitalize">{financeDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                                        <p className="text-xs text-spotify-subtext font-medium uppercase tracking-widest mt-1">Gestão Financeira</p>
                                    </div>
                                    <button onClick={() => changeFinanceMonth(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight/></button>
                                </div>

                                {/* Settings Inputs */}
                                <div className="flex flex-wrap md:flex-nowrap gap-4 w-full md:w-auto">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-spotify-subtext mb-1">Mensalidade</label>
                                        <input 
                                            type="number" 
                                            className="bg-black/30 border-b border-white/10 focus:border-spotify-green outline-none text-white font-bold p-2 w-24 text-right"
                                            value={financialSettings.monthlyFee}
                                            onChange={(e) => handleFinanceSettingChange('monthlyFee', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-spotify-subtext mb-1">Jogo Avulso</label>
                                        <input 
                                            type="number" 
                                            className="bg-black/30 border-b border-white/10 focus:border-spotify-green outline-none text-white font-bold p-2 w-24 text-right"
                                            value={financialSettings.perGameFee}
                                            onChange={(e) => handleFinanceSettingChange('perGameFee', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-spotify-subtext mb-1">Aluguel (Mês)</label>
                                        <input 
                                            type="number" 
                                            className="bg-black/30 border-b border-white/10 focus:border-spotify-green outline-none text-white font-bold p-2 w-24 text-right"
                                            value={financialSettings.courtRentalCost || 0}
                                            onChange={(e) => handleFinanceSettingChange('courtRentalCost', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
                                <div className="bg-black/20 p-4 rounded flex flex-col justify-between h-24">
                                    <span className="text-sm text-spotify-subtext">Total Previsto</span>
                                    <span className="text-xl font-bold text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financeData.totalExpected)}
                                    </span>
                                </div>
                                <div className="bg-black/20 p-4 rounded flex flex-col justify-between h-24 border border-spotify-green/20">
                                    <span className="text-sm text-spotify-subtext">Total Recebido</span>
                                    <span className="text-xl font-bold text-spotify-green">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financeData.totalPaid)}
                                    </span>
                                </div>
                                <div className="bg-black/20 p-4 rounded flex flex-col justify-between h-24 border border-white/5 relative overflow-hidden">
                                    <div className="z-10 flex flex-col justify-between h-full">
                                        <span className="text-sm text-spotify-subtext">Caixa (Acumulado)</span>
                                        <span className={`text-xl font-bold ${financeData.cashBalance >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financeData.cashBalance)}
                                        </span>
                                    </div>
                                    {/* Background Icon */}
                                    <div className={`absolute -bottom-2 -right-2 opacity-10 ${financeData.cashBalance >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                                        {financeData.cashBalance >= 0 ? <TrendingUp size={64} /> : <TrendingDown size={64} />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lists */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Mensalistas Section */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-spotify-green rounded-full"></span>
                                    Mensalistas
                                </h3>
                                <div className="space-y-2">
                                    {financeData.mensalistas.length === 0 ? (
                                        <p className="text-spotify-subtext text-sm italic">Nenhum mensalista ativo com cobrança.</p>
                                    ) : (
                                        financeData.mensalistas.map(p => (
                                            <div key={p.id} className="bg-spotify-elevated hover:bg-spotify-highlight p-3 rounded flex flex-col gap-2 group transition-colors">
                                                {/* Main Row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                                                        <div>
                                                            <div className="font-bold text-sm">{p.name}</div>
                                                            <div className="text-xs text-spotify-subtext">Mensalidade Fixa</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.gameAmountDue)}
                                                        </span>
                                                        <button 
                                                            onClick={() => togglePaymentStatus(p.gamePaymentKey)}
                                                            className={`p-2 rounded-full transition-all ${p.isGamePaid ? 'text-spotify-green bg-green-900/20' : 'text-spotify-subtext hover:text-white bg-white/5'}`}
                                                        >
                                                            {p.isGamePaid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* BBQ Sub-section */}
                                                {p.bbqDetails.length > 0 && (
                                                    <div className="ml-12 mt-1 border-t border-white/5 pt-2 space-y-2">
                                                        {p.bbqDetails.map(bbq => (
                                                            <div key={bbq.id} className="flex justify-between items-center text-xs">
                                                                <span className="text-orange-400 flex items-center gap-1"><Flame size={10}/> {bbq.desc}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-mono text-spotify-subtext">
                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bbq.cost)}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => togglePaymentStatus(bbq.paymentKey)}
                                                                        className={`transition-all ${bbq.isPaid ? 'text-orange-500' : 'text-spotify-subtext hover:text-white'}`}
                                                                    >
                                                                        {bbq.isPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Avulsos Section */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                    Avulsos
                                </h3>
                                <div className="space-y-2">
                                    {financeData.avulsos.length === 0 ? (
                                        <p className="text-spotify-subtext text-sm italic">Nenhum avulso jogou neste mês.</p>
                                    ) : (
                                        financeData.avulsos.map(p => (
                                            <div key={p.id} className="bg-spotify-elevated hover:bg-spotify-highlight p-3 rounded flex flex-col gap-2 group transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                                                        <div>
                                                            <div className="font-bold text-sm">{p.name}</div>
                                                            <div className="text-xs text-spotify-subtext">
                                                                {p.gamesPlayed} jogos • {p.linkedMensalistaName ? <span className="text-yellow-500">Resp: {p.linkedMensalistaName}</span> : 'Sem vínculo'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.gameAmountDue)}
                                                        </span>
                                                        <button 
                                                            onClick={() => togglePaymentStatus(p.gamePaymentKey)}
                                                            className={`p-2 rounded-full transition-all ${p.isGamePaid ? 'text-spotify-green bg-green-900/20' : 'text-spotify-subtext hover:text-white bg-white/5'}`}
                                                        >
                                                            {p.isGamePaid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* BBQ Sub-section */}
                                                {p.bbqDetails.length > 0 && (
                                                    <div className="ml-12 mt-1 border-t border-white/5 pt-2 space-y-2">
                                                        {p.bbqDetails.map(bbq => (
                                                            <div key={bbq.id} className="flex justify-between items-center text-xs">
                                                                <span className="text-orange-400 flex items-center gap-1"><Flame size={10}/> {bbq.desc}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-mono text-spotify-subtext">
                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bbq.cost)}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => togglePaymentStatus(bbq.paymentKey)}
                                                                        className={`transition-all ${bbq.isPaid ? 'text-orange-500' : 'text-spotify-subtext hover:text-white'}`}
                                                                    >
                                                                        {bbq.isPaid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        )}

      </main>

      {/* Modal - Dark Theme - With Upload Logic */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-spotify-elevated rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center bg-gradient-to-b from-spotify-highlight to-spotify-elevated">
               <h2 className="font-bold text-xl text-white">Novo Jogador</h2>
               <button onClick={() => setIsModalOpen(false)} className="text-spotify-subtext hover:text-white transition-colors"><X /></button>
            </div>
            
            <form onSubmit={handleSavePlayer} className="p-6 space-y-5">
               
               {/* Avatar Upload / Generate Section */}
               <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-black/50 border-2 border-spotify-green shadow-lg flex items-center justify-center">
                        {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Users size={40} className="text-spotify-subtext" />
                        )}
                        {loadingAvatar && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="animate-spin text-spotify-green" />
                          </div>
                        )}
                    </div>
                    {/* Hover Overlay for Edit hint */}
                    <div className="absolute -bottom-1 -right-1 bg-spotify-elevated rounded-full p-1 border border-white/10 shadow-sm">
                       <ImagePlus size={14} className="text-white" />
                    </div>
                  </div>

                  <div className="flex gap-2 w-full justify-center">
                     <label className="cursor-pointer bg-[#333] hover:bg-[#444] text-white text-xs font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors">
                        <Camera size={14} /> Upload
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                     </label>
                     <button 
                        type="button"
                        onClick={handleGenerateAvatar}
                        disabled={loadingAvatar || !formData.name}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors"
                     >
                        <Wand2 size={14} /> Gerar com IA
                     </button>
                  </div>
                  {!formData.name && <p className="text-[10px] text-red-400">Digite o nome para gerar com IA</p>}
               </div>

               <div>
                  <label className="block text-xs font-bold text-spotify-subtext mb-1.5 uppercase tracking-wider">Nome</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-[#333] text-white px-3 py-3 rounded text-sm focus:ring-2 focus:ring-spotify-green focus:outline-none placeholder-gray-500"
                    placeholder="Nome do craque"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-spotify-subtext mb-1.5 uppercase tracking-wider">Colete</label>
                      <input 
                        type="number" 
                        className="w-full bg-[#333] text-white px-3 py-3 rounded text-sm focus:ring-2 focus:ring-spotify-green focus:outline-none"
                        value={formData.vestNumber}
                        onChange={e => setFormData({...formData, vestNumber: e.target.value})}
                      />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-spotify-subtext mb-1.5 uppercase tracking-wider">Posição</label>
                       <div className="flex bg-[#333] rounded p-1">
                           <button
                             type="button"
                             onClick={() => setFormData({...formData, isGoalkeeper: false})}
                             className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${!formData.isGoalkeeper ? 'bg-spotify-green text-black' : 'text-spotify-subtext hover:text-white'}`}
                           >Linha</button>
                           <button
                             type="button"
                             onClick={() => setFormData({...formData, isGoalkeeper: true})}
                             className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${formData.isGoalkeeper ? 'bg-spotify-green text-black' : 'text-spotify-subtext hover:text-white'}`}
                           >Goleiro</button>
                       </div>
                   </div>
               </div>

               <div>
                   <label className="block text-xs font-bold text-spotify-subtext mb-1.5 uppercase tracking-wider">Tipo</label>
                   <select 
                      className="w-full bg-[#333] text-white px-3 py-3 rounded text-sm focus:ring-2 focus:ring-spotify-green focus:outline-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as PlayerType})}
                   >
                       <option value={PlayerType.MENSALISTA}>Mensalista</option>
                       <option value={PlayerType.AVULSO}>Avulso</option>
                   </select>
               </div>

               {formData.type === PlayerType.AVULSO && (
                   <div>
                       <label className="block text-xs font-bold text-spotify-subtext mb-1.5 uppercase tracking-wider">Vinculado a</label>
                       <select 
                          className="w-full bg-[#333] text-white px-3 py-3 rounded text-sm focus:ring-2 focus:ring-spotify-green focus:outline-none"
                          value={formData.linkedMensalistaId || ''}
                          onChange={e => setFormData({...formData, linkedMensalistaId: e.target.value})}
                          required
                       >
                           <option value="">Selecione...</option>
                           {activeMensalistas.map(m => (
                               <option key={m.id} value={m.id}>{m.name}</option>
                           ))}
                       </select>
                   </div>
               )}

               <div>
                   <label className="block text-xs font-bold text-spotify-subtext mb-1.5 uppercase tracking-wider">Nível Técnico</label>
                   <div className="flex justify-center p-3 rounded bg-[#333]">
                       <StarRating value={formData.stars || 3} onChange={v => setFormData({...formData, stars: v})} size={28} />
                   </div>
               </div>

               <button type="submit" className="w-full bg-spotify-green hover:bg-spotify-green-bright text-black font-bold py-3.5 rounded-full shadow-lg transform active:scale-95 transition-all uppercase tracking-widest text-xs mt-2">
                   Salvar Jogador
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Spotify Style */}
      <nav className="md:hidden fixed bottom-0 w-full bg-gradient-to-t from-black via-black to-transparent/90 border-t border-white/5 flex justify-around py-4 z-40 backdrop-blur-lg">
         <button onClick={() => setActiveTab('PLAYERS')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'PLAYERS' ? 'text-white' : 'text-spotify-subtext'}`}>
            <Users size={24} />
            <span className="text-[10px] font-medium">Jogadores</span>
         </button>
         <button onClick={() => setActiveTab('STARS')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'STARS' ? 'text-white' : 'text-spotify-subtext'}`}>
            <Star size={24} />
            <span className="text-[10px] font-medium">Avaliar</span>
         </button>
         <button onClick={() => setActiveTab('TEAMS')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'TEAMS' ? 'text-white' : 'text-spotify-subtext'}`}>
            <Shirt size={24} />
            <span className="text-[10px] font-medium">Times</span>
         </button>
         <button onClick={() => setActiveTab('BBQ')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'BBQ' ? 'text-white' : 'text-spotify-subtext'}`}>
            <Utensils size={24} />
            <span className="text-[10px] font-medium">Churras</span>
         </button>
         <button onClick={() => setActiveTab('FINANCE')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'FINANCE' ? 'text-white' : 'text-spotify-subtext'}`}>
            <Banknote size={24} />
            <span className="text-[10px] font-medium">Financeiro</span>
         </button>
      </nav>

    </div>
  );
}

export default App;