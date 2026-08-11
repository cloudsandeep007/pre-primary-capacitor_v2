import { MealStatus, NapStatus, MoodStatus } from './types';

export const CLASS_LEVELS = ['Nursery', 'Junior KG', 'Senior KG'] as const;

export const MEAL_OPTIONS: { value: MealStatus; label: string; emoji: string; color: string }[] = [
  { value: 'finished', label: 'Finished', emoji: '🍽️', color: 'bg-emerald-500' },
  { value: 'half', label: 'Half', emoji: '🥄', color: 'bg-amber-500' },
  { value: 'barely', label: 'Barely Ate', emoji: '😶', color: 'bg-rose-500' },
];

export const NAP_OPTIONS: { value: NapStatus; label: string; emoji: string; color: string }[] = [
  { value: 'none', label: 'No Nap', emoji: '👁️', color: 'bg-sky-500' },
  { value: '30min', label: '30 Mins', emoji: '😴', color: 'bg-indigo-500' },
  { value: '1hour+', label: '1 Hour+', emoji: '💤', color: 'bg-violet-500' },
];

export const MOOD_OPTIONS: { value: MoodStatus; label: string; emoji: string; color: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: 'bg-amber-400' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡', color: 'bg-orange-500' },
  { value: 'tearful', label: 'Tearful', emoji: '😢', color: 'bg-blue-400' },
];

export function getMealLabel(value: string | null): string {
  return MEAL_OPTIONS.find((o) => o.value === value)?.label ?? '';
}
export function getNapLabel(value: string | null): string {
  return NAP_OPTIONS.find((o) => o.value === value)?.label ?? '';
}
export function getMoodLabel(value: string | null): string {
  return MOOD_OPTIONS.find((o) => o.value === value)?.label ?? '';
}
export function getMealEmoji(value: string | null): string {
  return MEAL_OPTIONS.find((o) => o.value === value)?.emoji ?? '';
}
export function getNapEmoji(value: string | null): string {
  return NAP_OPTIONS.find((o) => o.value === value)?.emoji ?? '';
}
export function getMoodEmoji(value: string | null): string {
  return MOOD_OPTIONS.find((o) => o.value === value)?.emoji ?? '';
}
