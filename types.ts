import { Timestamp } from 'firebase/firestore'; // Timestampをインポート

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export enum AvailabilityStatus {
  PREFFERED = '希望',
  AVAILABLE = '可能',
  UNAVAILABLE = '不可',
}

export interface TimeSlotPreference {
  id: string;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
}

export interface EmployeePreference {
  employeeId: string;
  employeeName: string;
  detailedAvailability: {
    [date: string]: TimeSlotPreference[];
  };
  generalNotes: string;
}

export interface RequirementSlot {
  id:string;
  timeRange: string;
  staffCount: number;
  role: string;
}

export interface ShiftRequirements {
  dailyRequirements: {
    [date: string]: RequirementSlot[];
  };
  notes: string;
}

export type GeneratedSchedule = {
  [dayOrDate: string]: string[];
} & {
  unassigned_shifts?: string[];
};

// --- 新しく追加 ---
export interface PublishedSchedule {
  id: string; // ドキュメントID (例: '2025-07')
  schedule: GeneratedSchedule;
  publishedAt: Timestamp; // 公開日時
  month: string; // 対象月 (例: '2025年7月')
}
// --- ここまで ---

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}