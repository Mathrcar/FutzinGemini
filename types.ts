export enum PlayerType {
  MENSALISTA = 'MENSALISTA',
  AVULSO = 'AVULSO',
}

export interface Player {
  id: string;
  name: string;
  email?: string;
  vestNumber?: string;
  photoUrl?: string; // We will use picsum or local placeholder
  isGoalkeeper: boolean;
  type: PlayerType;
  linkedMensalistaId?: string; // If type is AVULSO, must link to a valid Mensalista ID
  stars: number; // 1 to 5
  isActive: boolean; // Soft delete / inactivation
  createdAt: number;
}

export interface Team {
  id: number;
  name: string;
  players: Player[];
  averageStars: number;
  totalStars: number;
}

export interface GameSettings {
  players: Player[];
  generatedTeams: Team[];
  date: string;
}

export interface GameHistory {
  id: string;
  timestamp: number;
  dateString: string; // DD/MM/YYYY
  teams: Team[];
  stats: {
    totalPlayers: number;
    averageBalance: number;
  }
}

export interface BarbecueEvent {
  id: string;
  dateString: string;
  timestamp: number;
  description: string;
  participants: string[]; // Player IDs
  costs: {
    meat: number;
    rental: number;
    others: number;
  };
  useCashBalance: boolean;
  cashBalanceUsed: number; // How much was taken from the pot
  finalCostPerPerson: number;
}

export interface FinancialSettings {
  monthlyFee: number;
  perGameFee: number;
  courtRentalCost: number;
}

// Key format: "YYYY-MM-PLAYERID" or "BBQ-ID-PLAYERID"
export interface PaymentRegistry {
  [key: string]: boolean;
}

export type TabView = 'PLAYERS' | 'STARS' | 'TEAMS' | 'HISTORY' | 'FINANCE' | 'BBQ';