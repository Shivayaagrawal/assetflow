export const APP_LOCALE = "en-IN";
export const APP_TIME_ZONE = "Asia/Kolkata";

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZone: APP_TIME_ZONE,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
};

const CALENDAR_DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
};

export function toAppDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateTime(value: string | Date) {
  return toAppDate(value).toLocaleString(APP_LOCALE, DATE_TIME_OPTIONS);
}

export function formatDate(value: string | Date) {
  return toAppDate(value).toLocaleDateString(APP_LOCALE, DATE_OPTIONS);
}

export function formatCalendarDay(value: string | Date) {
  return toAppDate(value).toLocaleDateString(APP_LOCALE, CALENDAR_DAY_OPTIONS);
}

export function formatTime(value: string | Date) {
  return toAppDate(value).toLocaleTimeString(APP_LOCALE, TIME_OPTIONS);
}
