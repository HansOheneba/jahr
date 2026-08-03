import { addDays, format, getDay, setDate, startOfMonth } from "date-fns";

export interface PublicHoliday {
  date: string; // yyyy-MM-dd
  name: string;
}

function toKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Western Easter Sunday for a given year (Anonymous Gregorian algorithm). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function firstFridayOfDecember(year: number): Date {
  const december = startOfMonth(new Date(year, 11, 1));
  const day = getDay(december);
  const offset = (5 - day + 7) % 7;
  return setDate(december, 1 + offset);
}

export function getGhanaPublicHolidays(year: number): PublicHoliday[] {
  const easter = easterSunday(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);

  const fixed: Array<[number, number, string]> = [
    [0, 1, "New Year's Day"],
    [2, 6, "Independence Day"],
    [4, 1, "May Day"],
    [7, 4, "Founders' Day"],
    [8, 21, "Kwame Nkrumah Memorial Day"],
    [11, 25, "Christmas Day"],
    [11, 26, "Boxing Day"],
  ];

  const holidays: PublicHoliday[] = fixed.map(([month, day, name]) => ({
    date: toKey(new Date(year, month, day)),
    name,
  }));

  holidays.push(
    { date: toKey(goodFriday), name: "Good Friday" },
    { date: toKey(easterMonday), name: "Easter Monday" },
    {
      date: toKey(firstFridayOfDecember(year)),
      name: "Farmers' Day",
    },
  );

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidayMap(
  years: number[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const year of years) {
    for (const holiday of getGhanaPublicHolidays(year)) {
      map.set(holiday.date, holiday.name);
    }
  }
  return map;
}

export function isPublicHoliday(
  date: Date,
  holidayMap: Map<string, string>,
): boolean {
  return holidayMap.has(toKey(date));
}
