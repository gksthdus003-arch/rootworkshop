const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getStartDate = (value: string) => {
  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const getDateKey = (value: string) => {
  const date = getStartDate(value);

  if (!date) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const getTodayDateKey = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

export const formatKoreanStartDate = (value: string) => {
  const date = getStartDate(value);

  if (!date) {
    return "곧 만나요!";
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일에 만나요!`;
};

export const getDayCountdownLabel = (value: string) => {
  const date = getStartDate(value);

  if (!date) {
    return "D-DAY";
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil((targetStart - todayStart) / DAY_IN_MS);

  if (diffDays <= 0) {
    return "D-0";
  }

  return `D-${diffDays}`;
};
