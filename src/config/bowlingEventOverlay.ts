export type BowlingOverlayRect = {
  left: string;
  top: string;
  width: string;
  height: string;
  fontSize?: string;
};

export type BowlingOverlayPoint = {
  left: string;
  top: string;
  width?: string;
};

export const bowlingEventBoard = {
  imageUrl: "/assets/bowl_bg.png",
  width: 724,
  height: 2172,
};

export const bowlingEventOverlay = {
  targetScore: { left: "26.5%", top: "7%", width: "47%", height: "5.2%" },
  levelTestButton: { left: "23.2%", top: "14.25%", width: "53.8%", height: "2.9%" },
  teamMembers: { left: "14.2%", top: "22%", width: "71.6%", height: "4.1%" },
  scoreInputButton: { left: "27%", top: "36.1%", width: "46%", height: "3%" },
  game1Score: {
    left: "20%",
    top: "45.5%",
    width: "23.8%",
    height: "4.9%",
    fontSize: "clamp(45px, 12vw, 76px)",
  },
  game2Score: {
    left: "57.3%",
    top: "45.5%",
    width: "23.8%",
    height: "4.9%",
    fontSize: "clamp(45px, 12vw, 76px)",
  },
  game1Diff: {
    left: "23.5%",
    top: "51%",
    width: "27%",
    height: "2.1%",
    fontSize: "clamp(12px, 2.9vw, 16px)",
  },
  game2Diff: {
    left: "61.5%",
    top: "51%",
    width: "27%",
    height: "2.1%",
    fontSize: "clamp(12px, 2.9vw, 16px)",
  },
  teamRankMessage: {
    left: "14.2%",
    top: "64.35%",
    width: "71.7%",
    height: "2.55%",
    fontSize: "clamp(13px, 3vw, 19px)",
  },
  rankingTable: {
    left: "13.6%",
    top: "67.45%",
    width: "72.8%",
    height: "15.8%",
    fontSize: "clamp(10px, 2.35vw, 14px)",
  },
  scoreBlur: { left: "9%", top: "29.2%", width: "82%", height: "23.6%" },
  rankingBlur: { left: "9%", top: "54.9%", width: "82%", height: "31.2%" },
};
