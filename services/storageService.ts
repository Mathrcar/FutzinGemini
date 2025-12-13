import { Player, PlayerType, GameHistory, FinancialSettings, PaymentRegistry, BarbecueEvent } from '../types';

const STORAGE_KEY = 'futmanager_players';
const HISTORY_KEY = 'futmanager_history';
const FINANCE_SETTINGS_KEY = 'futmanager_finance_settings';
const PAYMENTS_KEY = 'futmanager_payments';
const BBQ_KEY = 'futmanager_bbqs';

// --- Players ---

export const getPlayers = (): Player[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const savePlayer = (player: Player): Player[] => {
  const players = getPlayers();
  const existingIndex = players.findIndex((p) => p.id === player.id);
  
  let newPlayers;
  if (existingIndex >= 0) {
    newPlayers = [...players];
    newPlayers[existingIndex] = player;
  } else {
    newPlayers = [...players, player];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlayers));
  return newPlayers;
};

export const deletePlayer = (id: string): Player[] => {
  const players = getPlayers().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  return players;
};

export const togglePlayerStatus = (id: string): Player[] => {
  const players = getPlayers().map(p => 
    p.id === id ? { ...p, isActive: !p.isActive } : p
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  return players;
};

export const promoteToMensalista = (id: string): Player[] => {
  const players = getPlayers().map(p => 
    p.id === id ? { ...p, type: PlayerType.MENSALISTA, linkedMensalistaId: undefined } : p
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  return players;
};

export const updatePlayerStars = (id: string, stars: number): Player[] => {
  const players = getPlayers().map(p => 
    p.id === id ? { ...p, stars } : p
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  return players;
};

// --- History ---

export const getGameHistory = (): GameHistory[] => {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveGameHistory = (game: GameHistory): GameHistory[] => {
  const history = getGameHistory();
  // Add to beginning of array (newest first)
  const newHistory = [game, ...history];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  return newHistory;
};

// --- Barbecue ---

export const getBarbecues = (): BarbecueEvent[] => {
  const data = localStorage.getItem(BBQ_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveBarbecue = (bbq: BarbecueEvent): BarbecueEvent[] => {
  const bbqs = getBarbecues();
  // Newest first
  const newBbqs = [bbq, ...bbqs];
  localStorage.setItem(BBQ_KEY, JSON.stringify(newBbqs));
  return newBbqs;
};

export const deleteBarbecue = (id: string): BarbecueEvent[] => {
  const bbqs = getBarbecues().filter(b => b.id !== id);
  localStorage.setItem(BBQ_KEY, JSON.stringify(bbqs));
  return bbqs;
};

// --- Finance ---

export const getFinancialSettings = (): FinancialSettings => {
  const data = localStorage.getItem(FINANCE_SETTINGS_KEY);
  return data ? JSON.parse(data) : { monthlyFee: 100, perGameFee: 25, courtRentalCost: 0 };
};

export const saveFinancialSettings = (settings: FinancialSettings) => {
  localStorage.setItem(FINANCE_SETTINGS_KEY, JSON.stringify(settings));
};

export const getPayments = (): PaymentRegistry => {
  const data = localStorage.getItem(PAYMENTS_KEY);
  return data ? JSON.parse(data) : {};
};

export const togglePayment = (key: string): PaymentRegistry => {
  const payments = getPayments();
  if (payments[key]) {
    delete payments[key];
  } else {
    payments[key] = true;
  }
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  return payments;
};