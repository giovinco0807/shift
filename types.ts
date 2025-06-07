
export interface Employee {
  id: string;
  name: string;
  role: string; // 従業員の役職やランク (例: 'Senior Staff', 'Junior Staff', 'Shift Lead')
  password?: string; // 注意: デモ用。本番環境ではハッシュ化されたパスワードを安全に扱う必要があります。
}

export enum AvailabilityStatus {
  PREFFERED = '希望', // 希望
  AVAILABLE = '可能', // 可能
  UNAVAILABLE = '不可', // 不可
}

export interface TimeSlotPreference {
  id: string; // Reactのキー用、または編集時の識別用
  startTime: string; // HH:MM 形式
  endTime: string; // HH:MM 形式
  status: AvailabilityStatus;
}

export interface EmployeePreference {
  employeeId: string;
  employeeName: string;
  detailedAvailability: { // 日付ごとの詳細な希望
    [date: string]: TimeSlotPreference[]; // 例: "2024-08-15": [{startTime: "09:00", endTime: "12:00", status: PREFFERED}, ...]
  };
  generalNotes: string; // その他の希望やメモ
}

export interface RequirementSlot {
  id: string; // Reactのキー用のユニークID
  timeRange: string; // 例: "09:00 - 17:00"
  staffCount: number; // 例: 2
  role: string; // 任意: 例: "Supervisor", "Cashier", "Staff"
}

export interface ShiftRequirements {
  dailyRequirements: { // 日付ごとの要件
    [date: string]: RequirementSlot[]; // 例: "2024-08-15": [{timeRange: "09:00-17:00", staffCount: 2, role: "Staff"}, ...]
  };
  notes: string; // 任意: 要件に関する一般的なメモ
}

export interface GeneratedSchedule {
  [dayOrDate: string]: string[]; // AIの出力に応じて曜日キーまたは日付キー
  unassigned_shifts?: string[];
}

// --- Authentication Types ---
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
}

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}