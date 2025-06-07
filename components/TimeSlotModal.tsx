
import React, { useState, useEffect } from 'react';
import { TimeSlotPreference, AvailabilityStatus } from '../types';
import { PlusIcon, TrashIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, timeSlots: TimeSlotPreference[]) => void;
  date: string; // YYYY-MM-DD 形式
  initialTimeSlots: TimeSlotPreference[];
}

const generateTimeOptions = (interval: number = 30): string[] => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += interval) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
};

const timeOptions = generateTimeOptions(30);

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  date,
  initialTimeSlots,
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlotPreference[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeSlots(initialTimeSlots.map(ts => ({...ts, id: ts.id || `slot-${Date.now()}-${Math.random().toString(36).substring(2)}` })));
    }
  }, [isOpen, initialTimeSlots]);


  const handleAddTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        startTime: '09:00',
        endTime: '17:00',
        status: AvailabilityStatus.AVAILABLE,
      },
    ]);
  };

  const handleTimeSlotChange = (index: number, field: keyof TimeSlotPreference, value: string) => {
    const updatedTimeSlots = [...timeSlots];
    if (field === 'status') {
        updatedTimeSlots[index] = { ...updatedTimeSlots[index], [field]: value as AvailabilityStatus };
    } else {
        updatedTimeSlots[index] = { ...updatedTimeSlots[index], [field]: value };
    }
    
    if (field === 'startTime' && updatedTimeSlots[index].startTime > updatedTimeSlots[index].endTime) {
        updatedTimeSlots[index].endTime = updatedTimeSlots[index].startTime;
    }
    if (field === 'endTime' && updatedTimeSlots[index].startTime > updatedTimeSlots[index].endTime) {
        updatedTimeSlots[index].startTime = updatedTimeSlots[index].endTime;
    }

    setTimeSlots(updatedTimeSlots);
  };

  const handleRemoveTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };
  
  const handleSetUnavailableAllDay = () => {
    setTimeSlots([{
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      startTime: "00:00",
      endTime: "23:59",
      status: AvailabilityStatus.UNAVAILABLE
    }]);
  };

  const handleClearAll = () => {
    setTimeSlots([]);
  }

  const handleSaveChanges = () => {
    const validTimeSlots = timeSlots.filter(slot => slot.startTime < slot.endTime || (slot.startTime === "00:00" && slot.endTime === "23:59" && slot.status === AvailabilityStatus.UNAVAILABLE) );
    onSave(date, validTimeSlots);
  };

  if (!isOpen) return null;

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  const getStatusButtonClass = (currentStatus: AvailabilityStatus, buttonStatus: AvailabilityStatus) => {
    if (currentStatus === buttonStatus) {
      switch (buttonStatus) {
        case AvailabilityStatus.PREFFERED:
          return 'bg-gray-800 text-white ring-2 ring-gray-500'; // 希望 (濃いグレー)
        case AvailabilityStatus.AVAILABLE:
          return 'bg-gray-600 text-white ring-2 ring-gray-400'; // 可能 (中間グレー)
        case AvailabilityStatus.UNAVAILABLE:
          return 'bg-gray-300 text-gray-700 ring-2 ring-gray-400 line-through'; // 不可 (薄いグレー、取り消し線)
      }
    }
    return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {displayDate} の希望時間帯
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <div className="space-x-2 mb-4">
            <button
                onClick={handleSetUnavailableAllDay}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-md transition-colors border border-gray-300"
            >
                終日不可にする
            </button>
             <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-md transition-colors border border-gray-300"
            >
                全てクリア
            </button>
        </div>


        <div className="space-y-4 overflow-y-auto flex-grow pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {timeSlots.map((slot, index) => (
            <div key={slot.id} className="p-3 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`startTime-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">開始</label>
                  <select
                    id={`startTime-${slot.id}`}
                    value={slot.startTime}
                    onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                    className="w-full bg-white border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-black focus:border-black"
                  >
                    {timeOptions.map(time => <option key={`start-${time}`} value={time}>{time}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`endTime-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">終了</label>
                  <select
                    id={`endTime-${slot.id}`}
                    value={slot.endTime}
                    onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                    className="w-full bg-white border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-black focus:border-black"
                  >
                     {timeOptions.map(time => <option key={`end-${time}`} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor={`status-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">ステータス</label>
                 <div className="flex space-x-2">
                    {(Object.values(AvailabilityStatus) as AvailabilityStatus[]).map(statusValue => (
                        <button
                        key={statusValue}
                        type="button"
                        onClick={() => handleTimeSlotChange(index, 'status', statusValue)}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
                            ${getStatusButtonClass(slot.status, statusValue)}`}
                        aria-pressed={slot.status === statusValue}
                        >
                        {statusValue}
                        </button>
                    ))}
                </div>
              </div>
              <button
                onClick={() => handleRemoveTimeSlot(slot.id)}
                className="mt-1 text-red-600 hover:text-red-500 transition-colors text-xs flex items-center"
                aria-label="この時間帯を削除"
              >
                <TrashIcon className="h-4 w-4 mr-1" /> 削除
              </button>
            </div>
          ))}
        </div>

        <button
            onClick={handleAddTimeSlot}
            className="my-4 w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-300"
        >
            <ClockIcon className="h-5 w-5" />
            <span>希望時間帯を追加</span>
        </button>
        
        <div className="mt-auto pt-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors border border-gray-300"
          >
            キャンセル
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotModal;