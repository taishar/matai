import type { Locale } from "../types";

export const en: Locale = {
  code: "en",
  rtl: false,
  weekStart: 0,
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  placeholder: "Select a date…",
  placeholderRange: "Select a date range…",
  numericOrder: "mdy",
  tokens: {
    today: ["today", "now"],
    tomorrow: ["tomorrow"],
    yesterday: ["yesterday"],
    units: {
      day: ["day", "days"],
      week: ["week", "weeks"],
      month: ["month", "months"],
    },
    inPrefix: ["in"],
    agoSuffix: ["ago"],
    nextPrefix: ["next"],
    lastPrefix: ["last"],
    thisPrefix: ["this"],
    rangeConnectors: ["to", "-"],
    rangeFromPrefix: ["from", "between"],
    rangeToSuffix: ["to", "and"],
  },
};
