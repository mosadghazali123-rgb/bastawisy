
export type Language = 'en' | 'ar';
export type AttendanceStatus = 'present' | 'absent';
export type PeriodType = '1w' | '2w' | '3w' | '1m';

export interface AttendanceEntry {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  manualHours?: number;
  isManual?: boolean;
  bonus: number;
  deduction: number;
  calculatedPay: number;
  netHours: number;
}

export interface AttendanceSummary {
  employeeName: string;
  dailySalary: number;
  totalPresent: number;
  totalAbsent: number;
  totalSalary: number;
  entries: AttendanceEntry[];
}

export type Translations = Record<string, { en: string; ar: string }>;
