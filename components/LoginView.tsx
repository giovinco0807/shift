
import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { UserCircleIcon, ShieldCheckIcon, ArrowRightEndOnRectangleIcon, KeyIcon } from '@heroicons/react/24/outline';
import Alert from './Alert';

interface LoginViewProps {
  employees: Employee[];
  onEmployeeLogin: (employeeId: string, password?: string) => boolean; // Returns true on success
  onManagerLogin: (password?: string) => boolean; // Returns true on success
  loginError: string | null;
}

const LoginView: React.FC<LoginViewProps> = ({ employees, onEmployeeLogin, onManagerLogin, loginError }) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees.length > 0 ? employees[0].id : '');
  const [employeePassword, setEmployeePassword] = useState<string>('');
  const [managerPassword, setManagerPassword] = useState<string>('');
  const [currentLoginError, setCurrentLoginError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentLoginError(loginError);
  }, [loginError]);

  const handleEmployeeLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentLoginError(null);
    if (selectedEmployeeId) {
      if (!onEmployeeLogin(selectedEmployeeId, employeePassword)) {
        // Error will be set by App.tsx via loginError prop, or set it directly if handler doesn't update App state soon enough
        // setCurrentLoginError("従業員IDまたはパスワードが正しくありません。");
      }
    } else {
        setCurrentLoginError("従業員を選択してください。");
    }
  };

  const handleManagerLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentLoginError(null);
    if (!onManagerLogin(managerPassword)) {
      // setCurrentLoginError("管理者パスワードが正しくありません。");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">ログイン</h2>
        <p className="text-gray-600">あなたの役割を選択してログインしてください。</p>
      </div>

      {currentLoginError && <Alert message={currentLoginError} type="error" />}

      {/* Employee Login Form */}
      {employees.length > 0 && (
        <form onSubmit={handleEmployeeLoginSubmit} className="w-full max-w-sm p-8 bg-gray-50 rounded-xl shadow-lg border border-gray-200 space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 text-center mb-1 flex items-center justify-center">
            <UserCircleIcon className="h-7 w-7 mr-2 text-gray-700" />
            従業員としてログイン
          </h3>
          <div>
            <label htmlFor="employeeSelectLogin" className="block text-sm font-medium text-gray-700 mb-1">
              氏名を選択
            </label>
            <select
              id="employeeSelectLogin"
              value={selectedEmployeeId}
              onChange={(e) => {setSelectedEmployeeId(e.target.value); setCurrentLoginError(null);}}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors"
              aria-label="従業員を選択してログイン"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employeePasswordLogin" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <KeyIcon className="h-4 w-4 mr-1 text-gray-500"/> パスワード
            </label>
            <input
                type="password"
                id="employeePasswordLogin"
                value={employeePassword}
                onChange={(e) => {setEmployeePassword(e.target.value); setCurrentLoginError(null);}}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
                placeholder="パスワードを入力"
                required
            />
          </div>
          <button
            type="submit"
            disabled={!selectedEmployeeId}
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:bg-gray-400"
          >
            <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
            <span>従業員としてログイン</span>
          </button>
        </form>
      )}
      {employees.length === 0 && (
         <div className="w-full max-w-sm p-8 bg-gray-50 rounded-xl shadow-lg border border-gray-200 text-center">
            <UserCircleIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">従業員ログイン</h3>
            <p className="text-gray-500">登録されている従業員がいません。管理者に連絡してください。</p>
         </div>
      )}


      {/* Manager Login Button */}
      <form onSubmit={handleManagerLoginSubmit} className="w-full max-w-sm p-8 bg-gray-50 rounded-xl shadow-lg border border-gray-200 space-y-4 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-1 flex items-center justify-center">
            <ShieldCheckIcon className="h-7 w-7 mr-2 text-gray-700" />
            管理者としてログイン
        </h3>
         <div>
            <label htmlFor="managerPasswordLogin" className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-center">
                <KeyIcon className="h-4 w-4 mr-1 text-gray-500"/> 管理者パスワード
            </label>
            <input
                type="password"
                id="managerPasswordLogin"
                value={managerPassword}
                onChange={(e) => {setManagerPassword(e.target.value); setCurrentLoginError(null);}}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
                placeholder="管理者パスワードを入力"
                required
            />
          </div>
        <button
          type="submit"
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
          <span>管理者としてログイン</span>
        </button>
      </form>
    </div>
  );
};

export default LoginView;