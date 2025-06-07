
import React, { useState, useCallback, useEffect } from 'react';
import { Employee, EmployeePreference, ShiftRequirements, GeneratedSchedule, RequirementSlot, AuthUser, UserRole } from './types';
import EmployeeView from './components/EmployeeView';
import ManagerView from './components/ManagerView';
import LoginView from './components/LoginView';
import { generateScheduleWithAI } from './services/geminiService';
import { CalendarDaysIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Alert from './components/Alert'; // Import Alert

// Mock initial data
// 注意: 本番環境ではパスワードをこのようにハードコードしないでください。
const initialEmployeesData: Employee[] = [
  { id: '1', name: 'アリス・スミス', role: 'シニアスタッフ', password: 'password123' },
  { id: '2', name: 'ボブ・ジョンソン', role: 'スタッフ', password: 'password456' },
  { id: '3', name: 'チャーリー・ブラウン', role: 'スタッフ', password: 'password789' },
  { id: '4', name: 'ダイアナ・プリンス', role: 'シフトリーダー', password: 'password000' },
];

const MANAGER_PASSWORD = 'adminpassword'; // 注意: 本番環境ではパスワードをこのようにハードコードしないでください。

const weeklyPatternRequirements: Array<Omit<RequirementSlot, 'id'> & { dayOfWeek: number }> = [
  { dayOfWeek: 1, timeRange: '09:00 - 17:00', staffCount: 2, role: 'スタッフ' },
  { dayOfWeek: 2, timeRange: '09:00 - 17:00', staffCount: 2, role: 'スタッフ' },
  { dayOfWeek: 3, timeRange: '10:00 - 18:00', staffCount: 1, role: 'スタッフ' },
  { dayOfWeek: 4, timeRange: '10:00 - 18:00', staffCount: 1, role: 'スタッフ' },
  { dayOfWeek: 5, timeRange: '09:00 - 17:00', staffCount: 3, role: 'スタッフ' },
];

const initializeDailyRequirements = (): { [date: string]: RequirementSlot[] } => {
  const dailyReqs: { [date: string]: RequirementSlot[] } = {};
  const today = new Date();
  const year = today.getFullYear();
  const currentActualMonth = today.getMonth(); 
  const nextMonthForDateObject = currentActualMonth + 1; 
  
  const targetYear = nextMonthForDateObject > 11 ? year + 1 : year;
  const targetMonthInYear = nextMonthForDateObject % 12; 

  const daysInNextMonth = new Date(targetYear, targetMonthInYear + 1, 0).getDate();

  for (let i = 1; i <= daysInNextMonth; i++) {
    const currentDate = new Date(targetYear, targetMonthInYear, i);
    const dayOfWeek = currentDate.getDay();
    const dateStr = `${targetYear}-${String(targetMonthInYear + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

    weeklyPatternRequirements.forEach(pattern => {
      if (pattern.dayOfWeek === dayOfWeek) {
        if (!dailyReqs[dateStr]) {
          dailyReqs[dateStr] = [];
        }
        dailyReqs[dateStr].push({
          id: `req-${dateStr}-${dailyReqs[dateStr].length}-${Math.random().toString(36).substr(2, 9)}`,
          timeRange: pattern.timeRange,
          staffCount: pattern.staffCount,
          role: pattern.role,
        });
      }
    });
  }
  return dailyReqs;
};


const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployeesData);
  const [employeePreferences, setEmployeePreferences] = useState<EmployeePreference[]>([]);
  const [shiftRequirements, setShiftRequirements] = useState<ShiftRequirements>({
    dailyRequirements: initializeDailyRequirements(),
    notes: '週末は経験者を優先してください。公平な時間配分を心がけてください。',
  });
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null); // Renamed 'error' to 'appError'
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleEmployeeLogin = (employeeId: string, providedPassword?: string): boolean => {
    setLoginError(null);
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && employee.password === providedPassword) {
      setLoggedInUser({ id: employee.id, name: employee.name, role: UserRole.EMPLOYEE });
      return true;
    }
    setLoginError("従業員IDまたはパスワードが正しくありません。");
    return false;
  };

  const handleManagerLogin = (providedPassword?: string): boolean => {
    setLoginError(null);
    if (providedPassword === MANAGER_PASSWORD) {
      setLoggedInUser({ id: 'manager001', name: '管理者', role: UserRole.MANAGER });
      return true;
    }
    setLoginError("管理者パスワードが正しくありません。");
    return false;
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setLoginError(null);
  };

  const handleAddEmployee = (name: string, role: string, password?: string) => {
    if (!password) {
        setAppError("新しい従業員のパスワードは必須です。"); // Or handle this in EmployeeModal
        return;
    }
    const newEmployee: Employee = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      name,
      role,
      password,
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    setEmployeePreferences(prevPrefs => prevPrefs.map(pref => {
        if (pref.employeeId === updatedEmployee.id && pref.employeeName !== updatedEmployee.name) {
            return { ...pref, employeeName: updatedEmployee.name };
        }
        return pref;
    }));
  };

  const handleDeleteEmployee = (employeeIdToDelete: string) => {
    const remainingEmployees = employees.filter(emp => emp.id !== employeeIdToDelete);
    setEmployees(remainingEmployees);
    setEmployeePreferences(prev => prev.filter(pref => pref.employeeId !== employeeIdToDelete));
    
    if (loggedInUser && loggedInUser.id === employeeIdToDelete && loggedInUser.role === UserRole.EMPLOYEE) {
      handleLogout();
    }
  };

  const handleAddOrUpdatePreference = (preference: EmployeePreference) => {
    setEmployeePreferences(prev => {
      const existingIndex = prev.findIndex(p => p.employeeId === preference.employeeId);
      if (existingIndex > -1) {
        const updatedPreferences = [...prev];
        updatedPreferences[existingIndex] = preference;
        return updatedPreferences;
      }
      return [...prev, preference];
    });
  };

  const handleUpdateShiftRequirements = (updatedDailyRequirements: { [date: string]: RequirementSlot[] }, notes?: string) => {
    setShiftRequirements(prev => ({
      dailyRequirements: updatedDailyRequirements,
      notes: notes !== undefined ? notes : prev.notes,
    }));
  };
  
  const handleUpdateShiftNotes = (notes: string) => {
    setShiftRequirements(prev => ({
        ...prev,
        notes: notes,
    }));
  };

  const handleGenerateSchedule = useCallback(async () => {
    setIsLoading(true);
    setAppError(null);
    setGeneratedSchedule(null);
    try {
      if (!process.env.API_KEY) {
        setAppError("APIキーが設定されていません。API_KEY環境変数を設定してください。");
        setIsLoading(false);
        return;
      }
      
      const hasDailyRequirements = Object.values(shiftRequirements.dailyRequirements).some(slots => slots.length > 0);
      if (!hasDailyRequirements && !shiftRequirements.notes) {
         setAppError("有効なシフト要件（日付ごとの時間帯、スタッフ数 > 0）を少なくとも1つ定義するか、AIへのメモを提供してください。");
         setIsLoading(false);
         return;
      }

      const schedule = await generateScheduleWithAI(employeePreferences, shiftRequirements, employees);
      setGeneratedSchedule(schedule);
    } catch (err) {
      console.error("Error generating schedule:", err);
      setAppError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [employeePreferences, shiftRequirements, employees]);

  const renderContent = () => {
    if (!loggedInUser) {
      return <LoginView 
                employees={employees} 
                onEmployeeLogin={handleEmployeeLogin} 
                onManagerLogin={handleManagerLogin} 
                loginError={loginError}
              />;
    }

    if (loggedInUser.role === UserRole.EMPLOYEE) {
      const currentEmployeeDetails = employees.find(emp => emp.id === loggedInUser.id);
      if (!currentEmployeeDetails) {
        handleLogout(); 
        return <p>エラー: 従業員情報が見つかりません。再度ログインしてください。</p>;
      }
      const currentPreference = employeePreferences.find(p => p.employeeId === loggedInUser.id);
      return (
        <EmployeeView
          loggedInUser={loggedInUser}
          loggedInEmployeeDetails={currentEmployeeDetails}
          currentPreference={currentPreference}
          onSubmitPreference={handleAddOrUpdatePreference}
        />
      );
    }

    if (loggedInUser.role === UserRole.MANAGER) {
      return (
        <ManagerView
          employees={employees}
          onAddEmployee={handleAddEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          employeePreferences={employeePreferences}
          shiftRequirements={shiftRequirements}
          onUpdateShiftRequirements={handleUpdateShiftRequirements}
          onUpdateShiftNotes={handleUpdateShiftNotes}
          onGenerateSchedule={handleGenerateSchedule}
          generatedSchedule={generatedSchedule}
          isLoading={isLoading}
          error={appError} // Pass appError here
        />
      );
    }
    return null; 
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-5xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                AIシフトスケジューラ
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">AIアシスタントでシフト計画を効率化</p>
            </div>
          </div>
          {loggedInUser && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800 flex items-center">
                  <UserCircleIcon className="h-5 w-5 mr-1.5 text-gray-600"/>
                  {loggedInUser.name}
                </p>
                <p className="text-xs text-gray-500">
                  ({loggedInUser.role === UserRole.EMPLOYEE ? '従業員' : '管理者'})
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center space-x-1.5"
                title="ログアウト"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl bg-white shadow-xl rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200">
        {appError && !loggedInUser && <Alert message={appError} type="error" />} {/* Display general app errors on login screen if not logged in */}
        {renderContent()}
      </main>
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} AIシフトスケジューラ. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;