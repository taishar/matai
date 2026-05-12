export interface LocaleTokens {
  today: string[];
  tomorrow: string[];
  yesterday: string[];
  units: {
    day: string[];
    week: string[];
    month: string[];
  };
  inPrefix: string[];
  agoSuffix: string[];
  nextPrefix: string[];
  lastPrefix: string[];
  thisPrefix: string[];
  rangeConnectors: string[];
  rangeFromPrefix: string[];
  rangeToSuffix: string[];
}

export interface Locale {
  code: string;
  rtl: boolean;
  weekStart: number;
  days: string[];
  daysShort: string[];
  months: string[];
  monthsShort: string[];
  placeholder: string;
  placeholderRange: string;
  tokens: LocaleTokens;
  numericOrder: "dmy" | "mdy";
}

export type Lang = "en" | "he";
export type Mode = "single" | "range";
export type DateValue = Date | [Date, Date] | null;

export interface MataiOptions {
  lang?: Lang | Lang[];
  mode?: Mode;
  format?: string;
  onChange?: (value: DateValue) => void;
  placeholder?: string;
  color?: string;
}
