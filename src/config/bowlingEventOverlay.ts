export type BowlingOverlayRect = {
  left: string;
  top: string;
  width: string;
  height: string;
};

export type BowlingOverlayPoint = {
  left: string;
  top: string;
  width?: string;
};

export type BowlingRankingRowOverlay = {
  rank: BowlingOverlayRect;
  team: BowlingOverlayRect;
  score: BowlingOverlayRect;
  members: BowlingOverlayRect;
};

export const bowlingEventBoard = {
  imageUrl: "/assets/bowl_bg.png",
  width: 724,
  height: 2172,
};

export const bowlingEventOverlay = {
  targetScore: { left: "29.5%", top: "7%", width: "47%", height: "5.2%" },
  levelTestButton: { left: "23.2%", top: "14.25%", width: "53.8%", height: "2.9%" },
  teamMembers: { left: "14.2%", top: "22%", width: "71.6%", height: "4.1%" },
  scoreInputButton: { left: "27%", top: "34.3%", width: "46%", height: "2.8%" },
  game1Score: { left: "17.2%", top: "42.15%", width: "23.8%", height: "4.9%" },
  game2Score: { left: "56.1%", top: "42.15%", width: "23.8%", height: "4.9%" },
  game1Diff: { left: "20.4%", top: "48.55%", width: "18.5%", height: "1.6%" },
  game2Diff: { left: "59.5%", top: "48.55%", width: "18.5%", height: "1.6%" },
  teamRankMessage: { left: "14.2%", top: "64.35%", width: "71.7%", height: "2.55%" },
  scoreBlur: { left: "9%", top: "29.2%", width: "82%", height: "23.6%" },
  rankingBlur: { left: "9%", top: "54.9%", width: "82%", height: "31.2%" },
};

export const bowlingRankingRows: BowlingRankingRowOverlay[] = [
  {
    rank: { left: "14.2%", top: "64.5%", width: "9.5%", height: "2.2%" },
    team: { left: "24.2%", top: "64.5%", width: "15%", height: "2.2%" },
    score: { left: "40.4%", top: "64.5%", width: "16.6%", height: "2.2%" },
    members: { left: "58%", top: "64.5%", width: "28%", height: "2.2%" },
  },
  {
    rank: { left: "14.2%", top: "67.35%", width: "9.5%", height: "2.2%" },
    team: { left: "24.2%", top: "67.35%", width: "15%", height: "2.2%" },
    score: { left: "40.4%", top: "67.35%", width: "16.6%", height: "2.2%" },
    members: { left: "58%", top: "67.35%", width: "28%", height: "2.2%" },
  },
  {
    rank: { left: "14.2%", top: "70.2%", width: "9.5%", height: "2.2%" },
    team: { left: "24.2%", top: "70.2%", width: "15%", height: "2.2%" },
    score: { left: "40.4%", top: "70.2%", width: "16.6%", height: "2.2%" },
    members: { left: "58%", top: "70.2%", width: "28%", height: "2.2%" },
  },
  {
    rank: { left: "14.2%", top: "73.05%", width: "9.5%", height: "2.2%" },
    team: { left: "24.2%", top: "73.05%", width: "15%", height: "2.2%" },
    score: { left: "40.4%", top: "73.05%", width: "16.6%", height: "2.2%" },
    members: { left: "58%", top: "73.05%", width: "28%", height: "2.2%" },
  },
  {
    rank: { left: "14.2%", top: "75.9%", width: "9.5%", height: "2.2%" },
    team: { left: "24.2%", top: "75.9%", width: "15%", height: "2.2%" },
    score: { left: "40.4%", top: "75.9%", width: "16.6%", height: "2.2%" },
    members: { left: "58%", top: "75.9%", width: "28%", height: "2.2%" },
  },
];
