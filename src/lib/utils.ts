import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  let formatted = '';
  if (digits.length > 0) {
    formatted = '+7 ';
    if (digits.length > 1) {
      formatted += `(${digits.slice(1, 4)}`;
      if (digits.length > 4) {
        formatted += `) ${digits.slice(4, 7)}`;
        if (digits.length > 7) {
          formatted += `-${digits.slice(7, 9)}`;
          if (digits.length > 9) {
            formatted += `-${digits.slice(9, 11)}`;
          }
        }
      }
    }
  }
  return formatted;
}

export function transliterate(str: string): string {
  if (!str) return "";
  const ruMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
  };
  
  return str
    .toLowerCase()
    .split('')
    .map((char) => ruMap[char] !== undefined ? ruMap[char] : (/[a-z0-9]/.test(char) ? char : ''))
    .join('')
    .replace(/[^a-z0-9-]/g, '');
}
