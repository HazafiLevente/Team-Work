export interface LeaderboardUser {
  id: number;
  user_id?: number;
  username: string;
  fullname: string;
  email?: string;
  points: number;
  rank: string;
  nextRank: string;
  pointsToNextRank: number;

  currentLevelNumber?: number;
  currentMinPoints?: number;
  currentMaxPoints?: number;
  nextLevelNumber?: number | null;
}
