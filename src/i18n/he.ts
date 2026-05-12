import type { Locale } from "../types";

export const he: Locale = {
  code: "he",
  rtl: true,
  weekStart: 0,
  days: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
  daysShort: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"],
  months: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
  monthsShort: ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"],
  placeholder: "בחר תאריך…",
  placeholderRange: "בחר טווח תאריכים…",
  numericOrder: "dmy",
  tokens: {
    today: ["היום"],
    tomorrow: ["מחר"],
    yesterday: ["אתמול"],
    units: {
      day: ["יום", "ימים"],
      week: ["שבוע", "שבועות"],
      month: ["חודש", "חודשים"],
    },
    inPrefix: ["בעוד"],
    agoSuffix: ["לפני"],
    nextPrefix: ["הבא", "הקרוב"],
    lastPrefix: ["האחרון", "הקודם"],
    thisPrefix: ["ה"],
    rangeConnectors: ["עד", "-"],
    rangeFromPrefix: ["מ", "מ-", "בין"],
    rangeToSuffix: ["עד", "ל", "ל-"],
  },
};
