type OverlayPosition = {
  left: string;
  top: string;
  width?: string;
  height?: string;
};

export const preGuideOverlay = {
  backButton: { left: "16px", top: "16px" },
  dDay: { left: "0%", top: "18%", width: "100%" },
  transportButton: { left: "22%", top: "24%", width: "56%", height: "3%" },
  surveyButton: { left: "22%", top: "29%", width: "56%", height: "3%" },
  kakaoMap: { left: "14%", top: "70%", width: "72%", height: "19.5%" },
  mapButton: { left: "14%", top: "90.5%", width: "72%", height: "3%" },
} satisfies Record<string, OverlayPosition>;
