import React, { useState, useMemo } from 'react';
import { EmployeePreference, ShiftRequirements, GeneratedSchedule, RequirementSlot, Employee, AvailabilityStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import RequirementSlotModal from './RequirementSlotModal';
import EmployeeModal from './EmployeeModal'; 
import { ArrowPathIcon, DocumentTextIcon, UserGroupIcon, LightBulbIcon, ExclamationTriangleIcon, CalendarIcon, PencilIcon, TrashIcon, UserPlusIcon, UsersIcon as SolidUsersIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid'; 

interface ManagerViewProps {
  employees: Employee[];
  onAddEmployee: (name: string, role: string, email: string, password?: string) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  employeePreferences: EmployeePreference[];
  shiftRequirements: ShiftRequirements;
  onUpdateShiftRequirements: (dailyRequirements: { [date: string]: RequirementSlot[] }, notes?: string) => void;
  onUpdateShiftNotes: (notes: string) => void;
  onGenerateSchedule: () => void;
  onPublishSchedule: () => void;
  generatedSchedule: GeneratedSchedule | null;
  isLoading: boolean;
  error: string | null;
}

const getNextMonthDatesForManager = (): Date[] => {
  const today = new Date();
  const year = today.getFullYear();
  const currentActualMonth = today.getMonth(); 
  const nextMonthForDateObject = currentActualMonth + 1; 
  
  const targetYear = nextMonthForDateObject > 11 ? year + 1 : year;
  const targetMonthInYear = nextMonthForDateObject % 12; 

  const dates: Date[] = [];
  const daysInNextMonth = new Date(targetYear, targetMonthInYear + 1, 0).getDate();
  for (let i = 1; i <= daysInNextMonth; i++) {
    dates.push(new Date(targetYear, targetMonthInYear, i));
  }
  return dates;
};

const formatDateToYMDForManager = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const ManagerView: React.FC<ManagerViewProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  employeePreferences,
  shiftRequirements,
  onUpdateShiftRequirements,
  onUpdateShiftNotes,
  onGenerateSchedule,
  onPublishSchedule,
  generatedSchedule,
  isLoading,
  error,
}) => {
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [selectedDateForReqModal, setSelectedDateForReqModal] = useState<string | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const nextMonthDates = useMemo(() => getNextMonthDatesForManager(), []);
  const nextMonthName = useMemo(() => {
    if (nextMonthDates.length > 0) {
      return nextMonthDates[0].toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
    }
    return '';
  }, [nextMonthDates]);

  const handleDayClickForReq = (date: Date) => {
    setSelectedDateForReqModal(formatDateToYMDForManager(date));
    setIsRequirementModalOpen(true);
  };

  const handleReqModalClose = () => {
    setIsRequirementModalOpen(false);
    setSelectedDateForReqModal(null);
  };

  const handleReqModalSave = (date: string, requirementSlots: RequirementSlot[]) => {
    const updatedDailyReqs = {
      ...shiftRequirements.dailyRequirements,
      [date]: requirementSlots,
    };
    onUpdateShiftRequirements(updatedDailyReqs);
    handleReqModalClose();
  };
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateShiftNotes(e.target.value);
  };

  const getEmployeeRole = (employeeId: string): string => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.role : '役職不明';
  };

  const getStatusStyles = (status: AvailabilityStatus): { text: string, weight: string, decoration?: string } => {
    switch (status) {
      case AvailabilityStatus.PREFFERED: return { text: 'text-black', weight: 'font-semibold' };
      case AvailabilityStatus.AVAILABLE: return { text: 'text-gray-700', weight: 'font-normal' };
      case AvailabilityStatus.UNAVAILABLE: return { text: 'text-gray-400', weight: 'font-normal', decoration: 'line-through' };
      default: return { text: 'text-gray-500', weight: 'font-normal' };
    }
  };
  
  const getDayRequirementSummary = (dateStr: string): string => {
    const slots = shiftRequirements.dailyRequirements[dateStr];
    if (!slots || slots.length === 0) return "未設定";
    const totalStaff = slots.reduce((sum, slot) => sum + slot.staffCount, 0);
    return `${slots.length}件設定, 計${totalStaff}名`;
  };

  const handleOpenNewEmployeeModal = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployeeModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEmployeeModalOpen(true);
  };

  const handleEmployeeModalClose = () => {
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleEmployeeModalSave = (employeeData: { name: string, role: string, email: string, id?: string, password?: string }) => {
    if (employeeData.id) {
      const existingEmployee = employees.find(emp => emp.id === employeeData.id);
      if (existingEmployee) {
        onUpdateEmployee({ 
            ...existingEmployee,
            name: employeeData.name, 
            role: employeeData.role,
            email: employeeData.email,
        });
      }
    } else {
      onAddEmployee(employeeData.name, employeeData.role, employeeData.email, employeeData.password);
    }
    handleEmployeeModalClose();
  };

  const handleDeleteEmployeeClick = (employeeId: string, employeeName: string) => {
    if (window.confirm(`従業員「${employeeName}」を削除してもよろしいですか？関連する希望シフトも削除されます。`)) {
      onDeleteEmployee(employeeId);
    }
  };

  return (
    <div className="space-y-8">
      <section className="p-6 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
          <SolidUsersIcon className="h-7 w-7 mr-3 text-gray-700" />
          従業員管理
        </h2>
        <div className="mb-4">
          <button
            onClick={handleOpenNewEmployeeModal}
            className="inline-flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg text-sm"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            新しい従業員を追加
          </button>
        </div>
        {employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">氏名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">メールアドレス</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">役職</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenEditEmployeeModal(employee)}
                        className="text-gray-600 hover:text-black transition-colors"
                        title="編集"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployeeClick(employee.id, employee.name)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="削除"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">登録されている従業員はいません。</p>
        )}
      </section>

      <section className="p-6 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <CalendarIcon className="h-7 w-7 mr-3 text-gray-700" />
            シフト要件 ({nextMonthName})
        </h2>
        <p className="text-sm text-gray-600 mb-4">カレンダーの日付をクリックして、その日のシフト要件（必要な時間帯、スタッフ数、役割）を定義します。</p>
        <div className="grid grid-cols-7 gap-1 p-2 bg-gray-100 border border-gray-200 rounded-lg mb-6">
            {["日", "月", "火", "水", "木", "金", "土"].map(day => (
              <div key={day} className="text-center font-medium text-xs text-gray-700 py-1">{day}</div>
            ))}
            {nextMonthDates.length > 0 && Array(nextMonthDates[0].getDay()).fill(null).map((_, i) => <div key={`empty-req-${i}`}></div>)}
            {nextMonthDates.map(date => {
              const dateStr = formatDateToYMDForManager(date);
              const summary = getDayRequirementSummary(dateStr);
              let summaryColor = 'text-gray-500';
              if (summary !== "未設定") {
                summaryColor = 'text-black font-medium';
              }

              return (
                <button
                  type="button"
                  key={`req-${dateStr}`}
                  onClick={() => handleDayClickForReq(date)}
                  className={`p-2 h-24 flex flex-col items-center justify-start rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-black
                              ${shiftRequirements.dailyRequirements[dateStr]?.length > 0 ? 'bg-gray-200 hover:bg-gray-300' : 'bg-white hover:bg-gray-50 border border-gray-200'}
                              ${new Date().toDateString() === date.toDateString() ? 'ring-2 ring-yellow-500' : ''}
                            `}
                >
                  <span className="font-bold text-gray-900">{date.getDate()}</span>
                  <span className={`mt-1 text-xs ${summaryColor}`}>{summary}</span>
                </button>
              );
            })}
        </div>
        <div>
            <label htmlFor="shiftNotes" className="block text-sm font-medium text-gray-700 mb-1">
                AIへの一般メモ（シフト要件全体に関して）
            </label>
            <textarea
                id="shiftNotes"
                rows={3}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
                placeholder="例：週末は経験豊富なスタッフを優先。トレーニング中のスタッフは必ず先輩スタッフと組ませる。"
                value={shiftRequirements.notes}
                onChange={handleNotesChange}
            />
        </div>
      </section>

      <section className="p-6 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <UserGroupIcon className="h-7 w-7 mr-3 text-gray-700" />
            従業員の希望 ({nextMonthName})
        </h2>
        {employeePreferences.length > 0 ? (
          <ul className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {employeePreferences.map(pref => (
              <li key={pref.employeeId} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-800">{pref.employeeName} <span className="text-xs text-gray-600">({getEmployeeRole(pref.employeeId)})</span></h3>
                {Object.keys(pref.detailedAvailability).length > 0 ? (
                  <div className="mt-2 space-y-1 text-sm">
                    {Object.entries(pref.detailedAvailability).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).map(([date, slots]) => (
                      <div key={date}>
                        <strong className="text-gray-700">{new Date(date + "T00:00:00").toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {slots.map(slot => {
                            const statusStyle = getStatusStyles(slot.status);
                            return (
                              <li key={slot.id} className={`${statusStyle.text} ${statusStyle.weight} ${statusStyle.decoration || ''}`}>
                                {slot.startTime === "00:00" && slot.endTime === "23:59" && slot.status === AvailabilityStatus.UNAVAILABLE 
                                  ? `終日 (${slot.status})` 
                                  : `${slot.startTime} - ${slot.endTime} (${slot.status})`}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">具体的な日時希望はありません。</p>
                )}
                {pref.generalNotes && <p className="text-sm text-gray-600 mt-2"><strong>メモ:</strong> {pref.generalNotes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">従業員からの希望シフトはまだありません。</p>
        )}
      </section>

      <section className="p-6 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <LightBulbIcon className="h-7 w-7 mr-3 text-yellow-500" />
            AIでスケジュールを生成
        </h2>
        <button
          onClick={onGenerateSchedule}
          disabled={isLoading}
          className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:bg-gray-400"
        >
          {isLoading ? <LoadingSpinner small /> : <ArrowPathIcon className="h-5 w-5" />}
          <span>{isLoading ? '生成中...' : `スケジュールを生成する (${nextMonthName})`}</span>
        </button>
        {error && <Alert message={error} type="error" />}
      </section>

      {generatedSchedule && (
        <section className="mt-8 p-6 bg-white rounded-xl shadow-xl border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <DocumentTextIcon className="h-7 w-7 mr-3 text-gray-700" />
            生成されたスケジュール案 ({nextMonthName})
          </h2>
          <div className="space-y-4">
            {Object.entries(generatedSchedule).filter(([key]) => key !== 'unassigned_shifts').sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).map(([date, shifts]) => (
              <div key={date} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-2">
                  {new Date(date + "T00:00:00").toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </h3>
                {shifts.length > 0 ? (
                  <ul className="list-disc list-inside ml-4 space-y-1 text-sm text-gray-800">
                    {shifts.map((shift, index) => <li key={index}>{shift}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">この日の割り当てシフトはありません。</p>
                )}
              </div>
            ))}
            {generatedSchedule.unassigned_shifts && generatedSchedule.unassigned_shifts.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-700 mb-2 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
                  割り当てられなかったシフト
                </h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm text-red-600">
                  {generatedSchedule.unassigned_shifts.map((unassigned, index) => (
                    <li key={index}>{unassigned}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
             <button
              onClick={onPublishSchedule}
              className="w-full bg-gray-600 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <CloudArrowUpIcon className="h-6 w-6" />
              <span>このスケジュールを従業員に公開する</span>
            </button>
          </div>
        </section>
      )}
      
      {isRequirementModalOpen && selectedDateForReqModal && (
        <RequirementSlotModal
            isOpen={isRequirementModalOpen}
            onClose={handleReqModalClose}
            onSave={handleReqModalSave}
            date={selectedDateForReqModal}
            initialRequirementSlots={shiftRequirements.dailyRequirements[selectedDateForReqModal] || []}
        />
      )}

      {isEmployeeModalOpen && (
        <EmployeeModal
            isOpen={isEmployeeModalOpen}
            onClose={handleEmployeeModalClose}
            onSave={handleEmployeeModalSave}
            employeeToEdit={editingEmployee}
        />
      )}
    </div>
  );
};

export default ManagerView;