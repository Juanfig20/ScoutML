export interface BasePlayer {
  id?: string;
  name: string;
  birth_date: string;
  weight: number;
  height: number;
  position: 'batter' | 'pitcher';
}

export interface Batter extends BasePlayer {
  position: 'batter';
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  sacrificeFlies: number;
  putouts: number;
  assists: number;
  errors: number;
}

export interface Pitcher extends BasePlayer {
  position: 'pitcher';
  earnedRuns: number;
  inningsPitched: number;
  hits: number;
  walks: number;
  strikeouts: number;
  putouts: number;
  assists: number;
  errors: number;
}

export type Player = Batter | Pitcher;

export interface Prediction {
  id: string;
  playerId: string;
  playerName: string;
  position: 'batter' | 'pitcher';
  percentage: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  date: string;
  analysis: string;
}