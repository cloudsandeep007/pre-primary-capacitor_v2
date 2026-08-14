import { subDays, subMonths, startOfDay, format } from 'date-fns';

export type DateFilterType = 'Daily' | '7 Days' | '15 Days' | '30 Days' | '3 Months' | '6 Months' | 'Academic Year';

export const DATE_FILTERS: DateFilterType[] = ['Daily', '7 Days', '15 Days', '30 Days', '3 Months', '6 Months', 'Academic Year'];

export const getDateFromFilter = (filter: DateFilterType): string => {
  const today = new Date();
  let date: Date;

  switch (filter) {
    case 'Daily':
      date = startOfDay(today);
      break;
    case '7 Days':
      date = subDays(today, 7);
      break;
    case '15 Days':
      date = subDays(today, 15);
      break;
    case '30 Days':
      date = subDays(today, 30);
      break;
    case '3 Months':
      date = subMonths(today, 3);
      break;
    case '6 Months':
      date = subMonths(today, 6);
      break;
    case 'Academic Year': {
      const year = today.getMonth() < 5 ? today.getFullYear() - 1 : today.getFullYear();
      date = new Date(year, 5, 1);
      break;
    }
    default:
      date = subDays(today, 30);
  }

  return format(date, 'yyyy-MM-dd');
};
