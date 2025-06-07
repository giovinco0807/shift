
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeePreference, AvailabilityStatus, TimeSlotPreference, AuthUser } from '../types';
import { PencilSquareIcon, CheckCircleIcon, CalendarIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import TimeSlotModal from './TimeSlotModal';

interface EmployeeViewProps {
  loggedInUser: AuthUser; // Logged-in user's auth info
  loggedInEmployeeDetails: Employee; // Full details of the logged-in employee
  currentPreference?: EmployeePreference;
  onSubmitPreference: (preference: EmployeePreference) => void;
}

const getNextMonthDates = (): Date[] => {
  const today = new Date();
  const year = today.getFullYear();
  // Ensure month is 0-indexed for Date constructor, and 1-indexed for display/string logic
  const currentActualMonth = today.getMonth(); // 0-11
  const nextMonthForDateObject = currentActualMonth + 1; // Target month for Date object (0-11 based)
  
  const targetYear = nextMonthForDateObject > 11 ? year + 1 : year;
  const targetMonthInYear = nextMonthForDateObject % 12; 

  const dates: Date[] = [];
  const daysInTargetMonth = new Date(targetYear, targetMonthInYear + 1, 0).getDate();
  for (let i = 1; i <= daysInTargetMonth; i++) {
    dates.push(new Date(targetYear, targetMonthInYear, i));
  }
  return dates;
};

const formatDateToYMD = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const EmployeeView: React.FC<EmployeeViewProps> = ({
  loggedInUser,
  loggedInEmployeeDetails,
  currentPreference,
  onSubmitPreference,
}) => {
  const [detailedAvailability, setDetailedAvailability] = useState<{ [date: string]: TimeSlotPreference[] }>(
    currentPreference?.detailedAvailability || {}
  );
  const [generalNotes, setGeneralNotes] = useState(currentPreference?.generalNotes || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);

  const nextMonthDates = useMemo(() => getNextMonthDates(), []);
  const nextMonthName = useMemo(() => {
    if (nextMonthDates.length > 0) {
      return nextMonthDates[0].toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
    }
    return '';
  }, [nextMonthDates]);

  useEffect(() => {
    setDetailedAvailability(currentPreference?.detailedAvailability || {});
    setGeneralNotes(currentPreference?.generalNotes || '');
  }, [currentPreference, loggedInUser.id]);

  const handleDayClick = (date: Date) => {
    setSelectedDateForModal(formatDateToYMD(date));
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDateForModal(null);
  };

  const handleModalSave = (date: string, timeSlots: TimeSlotPreference[]) => {
    setDetailedAvailability(prev => ({
      ...prev,
      [date]: timeSlots,
    }));
    handleModalClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInEmployeeDetails) {
      onSubmitPreference({
        employeeId: loggedInEmployeeDetails.id,
        employeeName: loggedInEmployeeDetails.name,
        detailedAvailability,
        generalNotes,
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };
  
  const getDayAvailabilitySummary = (dateStr: string): string => {
    const slots = detailedAvailability[dateStr];
    if (!slots || slots.length === 0) return "未設定";
    if (slots.some(s => s.status === AvailabilityStatus.UNAVAILABLE && s.startTime === "00:00" && s.endTime === "23:59")) return "終日不可";
    
    const preferredCount = slots.filter(s => s.status === AvailabilityStatus.PREFFERED).length;
    const availableCount = slots.filter(s => s.status === AvailabilityStatus.AVAILABLE).length;
    const unavailableCount = slots.filter(s => s.status === AvailabilityStatus.UNAVAILABLE).length;

    if (preferredCount > 0) return `${preferredCount}件 希望`;
    if (availableCount > 0) return `${availableCount}件 可能`;
    if (unavailableCount > 0 && unavailableCount === slots.length) return `${unavailableCount}件 不可`;
    if (unavailableCount > 0) return `${unavailableCount}件 不可あり`;
    return "時間指定あり";
  };

  if (!loggedInEmployeeDetails) {
     // This should ideally be handled by App.tsx by not rendering EmployeeView
    return <p className="text-center text-gray-500">従業員情報が読み込めませんでした。</p>;
  }

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2 sm:mb-0">シフト希望を提出（詳細）</h2>
        <div className="p-3 bg-gray-100 rounded-md text-sm text-gray-700 flex items-center border border-gray-200 self-start sm:self-center">
            <UserCircleIcon className="h-5 w-5 mr-2 text-gray-600"/>
            <span><strong className="text-black">{loggedInEmployeeDetails.name}</strong> (役職: {loggedInEmployeeDetails.role})</span>
        </div>
      </div>
      

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-gray-700" />
            {nextMonthName} の勤務希望
          </h3>
          <p className="text-sm text-gray-600 mb-3">カレンダーの日付をクリックして、日ごとの詳細な勤務希望時間帯を入力してください。</p>
          <div className="grid grid-cols-7 gap-1 p-2 bg-gray-100 border border-gray-200 rounded-lg">
            {["日", "月", "火", "水", "木", "金", "土"].map(day => (
              <div key={day} className="text-center font-medium text-xs text-gray-700 py-1">{day}</div>
            ))}
            {nextMonthDates.length > 0 && Array(nextMonthDates[0].getDay()).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
            {nextMonthDates.map(date => {
              const dateStr = formatDateToYMD(date);
              const summary = getDayAvailabilitySummary(dateStr);
              let summaryColor = 'text-gray-500';
              let summaryFontWeight = 'font-normal';
              if (summary.includes('希望')) {
                summaryColor = 'text-black';
                summaryFontWeight = 'font-semibold';
              } else if (summary.includes('可能')) {
                summaryColor = 'text-gray-700';
              } else if (summary.includes('不可')) {
                summaryColor = 'text-gray-400 line-through';
              }

              return (
                <button
                  type="button"
                  key={dateStr}
                  onClick={() => handleDayClick(date)}
                  className={`p-2 h-24 flex flex-col items-center justify-start rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-black
                              ${detailedAvailability[dateStr]?.length > 0 ? 'bg-gray-200 hover:bg-gray-300' : 'bg-white hover:bg-gray-50 border border-gray-200'}
                              ${new Date().toDateString() === date.toDateString() ? 'ring-2 ring-yellow-500' : ''}
                            `}
                >
                  <span className="font-bold text-gray-900">{date.getDate()}</span>
                  <span className={`mt-1 text-xs ${summaryColor} ${summaryFontWeight}`}>{summary}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="generalNotes" className="block text-sm font-medium text-gray-700 mb-1">
            一般メモ（任意）
          </label>
          <textarea
            id="generalNotes"
            rows={3}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
            placeholder="例：週に最低20時間は勤務したい。この月の15日は15時以降は不可。"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            その他、特記事項があれば入力してください。
          </p>
        </div>
        <button
          type="submit"
          className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <PencilSquareIcon className="h-5 w-5" />
          <span>希望を提出</span>
        </button>
      </form>

      {showSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-300 text-green-700 rounded-lg flex items-center space-x-2">
          <CheckCircleIcon className="h-6 w-6" />
          <p>希望を正常に送信しました！</p>
        </div>
      )}

      {selectedDateForModal && (
        <TimeSlotModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
          date={selectedDateForModal}
          initialTimeSlots={detailedAvailability[selectedDateForModal] || []}
        />
      )}
    </div>
  );
};

export default EmployeeView;
