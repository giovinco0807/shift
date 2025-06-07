
import React, { useState, useEffect } from 'react';
import { RequirementSlot } from '../types';
import { PlusIcon, TrashIcon, XMarkIcon, ClockIcon, UsersIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

interface RequirementSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, requirementSlots: RequirementSlot[]) => void;
  date: string; // YYYY-MM-DD 形式
  initialRequirementSlots: RequirementSlot[];
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

const RequirementSlotModal: React.FC<RequirementSlotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  date,
  initialRequirementSlots,
}) => {
  const [requirementSlots, setRequirementSlots] = useState<RequirementSlot[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRequirementSlots(initialRequirementSlots.map(rs => ({...rs, id: rs.id || `reqslot-${Date.now()}-${Math.random().toString(36).substring(2)}` })));
    }
  }, [isOpen, initialRequirementSlots]);

  const handleAddRequirementSlot = () => {
    setRequirementSlots([
      ...requirementSlots,
      {
        id: `reqslot-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timeRange: '09:00 - 17:00',
        staffCount: 1,
        role: 'スタッフ',
      },
    ]);
  };

  const handleSlotChange = (index: number, field: keyof RequirementSlot, value: string | number) => {
    const updatedSlots = [...requirementSlots];
    if (field === 'staffCount') {
      const count = parseInt(value as string, 10);
      updatedSlots[index] = { ...updatedSlots[index], [field]: isNaN(count) ? 0 : count };
    } else {
      updatedSlots[index] = { ...updatedSlots[index], [field]: value as string };
    }
    setRequirementSlots(updatedSlots);
  };

  const handleSplitTimeRange = (timeRange: string): [string, string] => {
    const parts = timeRange.split(' - ');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return ['09:00', '17:00'];
  };

  const handleTimeChange = (index: number, part: 'start' | 'end', time: string) => {
    const updatedSlots = [...requirementSlots];
    let [currentStart, currentEnd] = handleSplitTimeRange(updatedSlots[index].timeRange);
    if (part === 'start') {
      currentStart = time;
      if (new Date(`1970/01/01 ${currentStart}`) > new Date(`1970/01/01 ${currentEnd}`)) {
         currentEnd = currentStart;
      }
    } else {
      currentEnd = time;
      if (new Date(`1970/01/01 ${currentStart}`) > new Date(`1970/01/01 ${currentEnd}`)) {
        currentStart = currentEnd;
      }
    }
    updatedSlots[index].timeRange = `${currentStart} - ${currentEnd}`;
    setRequirementSlots(updatedSlots);
  };


  const handleRemoveSlot = (id: string) => {
    setRequirementSlots(requirementSlots.filter(slot => slot.id !== id));
  };

  const handleSaveChanges = () => {
    const validSlots = requirementSlots.filter(slot => {
        const [start, end] = handleSplitTimeRange(slot.timeRange);
        return slot.staffCount > 0 && start <= end;
    });
    onSave(date, validSlots);
  };

  if (!isOpen) return null;

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {displayDate} のシフト要件
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto flex-grow pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {requirementSlots.map((slot, index) => {
            const [startTime, endTime] = handleSplitTimeRange(slot.timeRange);
            return (
              <div key={slot.id} className="p-3 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor={`req-startTime-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">開始</label>
                        <select
                            id={`req-startTime-${slot.id}`}
                            value={startTime}
                            onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                            className="w-full bg-white border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-black focus:border-black"
                        >
                            {timeOptions.map(time => <option key={`req-start-${time}`} value={time}>{time}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`req-endTime-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">終了</label>
                        <select
                            id={`req-endTime-${slot.id}`}
                            value={endTime}
                            onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                            className="w-full bg-white border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-black focus:border-black"
                        >
                            {timeOptions.map(time => <option key={`req-end-${time}`} value={time}>{time}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                    <label htmlFor={`req-staffCount-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5 flex items-center">
                        <UsersIcon className="h-4 w-4 mr-1 text-gray-500"/>必要人数
                    </label>
                    <input
                        type="number"
                        id={`req-staffCount-${slot.id}`}
                        min="0"
                        value={slot.staffCount}
                        onChange={(e) => handleSlotChange(index, 'staffCount', e.target.value)}
                        className="w-full bg-white border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-black focus:border-black"
                    />
                    </div>
                    <div>
                    <label htmlFor={`req-role-${slot.id}`} className="block text-xs font-medium text-gray-600 mb-0.5 flex items-center">
                        <BriefcaseIcon className="h-4 w-4 mr-1 text-gray-500"/>役割 (任意)
                    </label>
                    <input
                        type="text"
                        id={`req-role-${slot.id}`}
                        placeholder="例: レジ係"
                        value={slot.role}
                        onChange={(e) => handleSlotChange(index, 'role', e.target.value)}
                        className="w-full bg-white border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-black focus:border-black placeholder-gray-400"
                    />
                    </div>
                </div>
                <button
                  onClick={() => handleRemoveSlot(slot.id)}
                  className="mt-1 text-red-600 hover:text-red-500 transition-colors text-xs flex items-center"
                  aria-label="この要件スロットを削除"
                >
                  <TrashIcon className="h-4 w-4 mr-1" /> 削除
                </button>
              </div>
            );
        })}
        </div>

        <button
            onClick={handleAddRequirementSlot}
            className="my-4 w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-300"
        >
            <ClockIcon className="h-5 w-5" />
            <span>要件時間帯を追加</span>
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

export default RequirementSlotModal;