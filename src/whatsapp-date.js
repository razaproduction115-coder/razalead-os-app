const TIME_ZONE = "Asia/Karachi";

const dateKey = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const dayDistance = (fromKey, toKey) => {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86400000));
};

export const karachiDateParts = (value, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { key: "", day: "", date: "", weekday: "", time: "", full: "" };
  }
  const key = dateKey(date);
  const today = dateKey(now);
  const daysAgo = dayDistance(key, today);
  const exactDate = new Intl.DateTimeFormat("en-PK", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const weekday = new Intl.DateTimeFormat("en-PK", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-PK", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  const day =
    daysAgo === 0
      ? "Today"
      : daysAgo === 1
        ? `Yesterday - ${exactDate}`
        : daysAgo <= 6
          ? `${daysAgo} days ago - ${weekday}, ${exactDate}`
          : `${weekday}, ${exactDate}`;
  return {
    key,
    day,
    date: exactDate,
    weekday,
    time,
    daysAgo,
    full: `${day} - ${time}`,
  };
};

export const chatListTime = (value, now = new Date()) => {
  const parts = karachiDateParts(value, now);
  if (!parts.key) return "";
  return parts.daysAgo === 0 ? parts.time : parts.day;
};
