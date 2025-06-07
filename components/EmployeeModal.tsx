
import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { XMarkIcon, UserCircleIcon, BriefcaseIcon, KeyIcon } from '@heroicons/react/24/outline';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: { name: string, role: string, id?: string, password?: string }) => void;
  employeeToEdit?: Employee | null;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeToEdit,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (employeeToEdit) {
        setName(employeeToEdit.name);
        setRole(employeeToEdit.role);
        setPassword(''); // Editing mode: clear password field, only update if new one is entered
      } else {
        setName('');
        setRole('');
        setPassword(''); // New employee mode
      }
      setError(null);
    }
  }, [isOpen, employeeToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) {
      setError('氏名と役職の両方を入力してください。');
      return;
    }
    if (!employeeToEdit && !password.trim()) { // New employee requires password
        setError('新しい従業員のパスワードを入力してください。');
        return;
    }
    setError(null);
    
    const employeeData: { name: string, role: string, id?: string, password?: string } = {
        id: employeeToEdit?.id,
        name: name.trim(),
        role: role.trim(),
    };

    if (password.trim()) { // Only include password if it's entered
        employeeData.password = password.trim();
    } else if (!employeeToEdit) { // New employee must have a password
         setError('新しい従業員のパスワードを入力してください。');
        return;
    }
    // If editing and password field is empty, old password remains (handled in App.tsx)

    onSave(employeeData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border border-gray-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {employeeToEdit ? '従業員情報を編集' : '新しい従業員を追加'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2 text-gray-500" />
              氏名
            </label>
            <input
              type="text"
              id="employeeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
              placeholder="例: 山田 太郎"
              required
            />
          </div>
          <div>
            <label htmlFor="employeeRole" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <BriefcaseIcon className="h-5 w-5 mr-2 text-gray-500" />
              役職
            </label>
            <input
              type="text"
              id="employeeRole"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
              placeholder="例: スタッフ, リーダー"
              required
            />
          </div>
          <div>
            <label htmlFor="employeePassword" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-gray-500" />
              パスワード
            </label>
            <input
              type="password"
              id="employeePassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
              placeholder={employeeToEdit ? "変更する場合のみ入力" : "パスワードを設定"}
              required={!employeeToEdit} 
            />
             {!employeeToEdit && <p className="text-xs text-gray-500 mt-1">新しい従業員にはパスワードが必要です。</p>}
             {employeeToEdit && <p className="text-xs text-gray-500 mt-1">パスワードを変更する場合のみ入力してください。</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors border border-gray-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
            >
              {employeeToEdit ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;