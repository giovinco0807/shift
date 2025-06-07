import React, { useState } from 'react';
import { UserCircleIcon, ShieldCheckIcon, ArrowRightEndOnRectangleIcon, KeyIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Alert from './Alert';

interface LoginViewProps {
  onLogin: (email: string, password?: string) => void;
  loginError: string | null;
  isLoading: boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, loginError, isLoading }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isManagerLogin, setIsManagerLogin] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">ログイン</h2>
        <p className="text-gray-600">あなたのメールアドレスとパスワードでログインしてください。</p>
      </div>

      {loginError && <Alert message={loginError} type="error" />}

      <form onSubmit={handleLoginSubmit} className="w-full max-w-sm p-8 bg-gray-50 rounded-xl shadow-lg border border-gray-200 space-y-6">
        <h3 className="text-xl font-semibold text-gray-800 text-center mb-1 flex items-center justify-center">
          <UserCircleIcon className="h-7 w-7 mr-2 text-gray-700" />
          ログイン
        </h3>
        <div>
          <label htmlFor="emailLogin" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-500" /> メールアドレス
          </label>
          <input
            type="email"
            id="emailLogin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
            placeholder="email@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="passwordLogin" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <KeyIcon className="h-4 w-4 mr-1 text-gray-500" /> パスワード
          </label>
          <input
            type="password"
            id="passwordLogin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-black focus:border-black transition-colors placeholder-gray-400"
            placeholder="パスワードを入力"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:bg-gray-400"
        >
          <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
          <span>{isLoading ? 'ログイン中...' : 'ログイン'}</span>
        </button>
      </form>
    </div>
  );
};

export default LoginView;