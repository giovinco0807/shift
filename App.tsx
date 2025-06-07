import React, { useState, useCallback, useEffect } from 'react';
import {
  Employee, EmployeePreference, ShiftRequirements, GeneratedSchedule,
  RequirementSlot, AuthUser, UserRole, PublishedSchedule
} from './types';
import EmployeeView from './components/EmployeeView';
import ManagerView from './components/ManagerView';
import LoginView from './components/LoginView';
import { generateScheduleWithAI } from './services/geminiService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where, getDocs, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { CalendarDaysIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Alert from './components/Alert';
import LoadingSpinner from './components/LoadingSpinner';

const REQUIREMENTS_DOC_ID = "nextMonthRequirements";

const getNextMonthYYYYMM = () => {
  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const year = nextMonthDate.getFullYear();
  const month = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeePreferences, setEmployeePreferences] = useState<EmployeePreference[]>([]);
  const [shiftRequirements, setShiftRequirements] = useState<ShiftRequirements | null>(null);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [publishedSchedule, setPublishedSchedule] = useState<PublishedSchedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const employeeDocRef = doc(db, 'employees', user.uid);
        const unsubscribeDoc = onSnapshot(employeeDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const employeeData = docSnap.data();
            setLoggedInUser({
              id: user.uid,
              name: employeeData.name,
              email: user.email!,
              role: employeeData.role === '管理者' ? UserRole.MANAGER : UserRole.EMPLOYEE,
            });
          } else {
            signOut(auth);
          }
          setIsLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        setLoggedInUser(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password?: string) => {
    setLoginError(null);
    setIsLoading(true);
    if (!password) {
        setLoginError("パスワードを入力してください。");
        setIsLoading(false);
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("メールアドレスまたはパスワードが正しくありません。");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch(error => setAppError("ログアウトに失敗しました: " + error.message));
  };

  useEffect(() => {
    if (loggedInUser?.role === UserRole.MANAGER) {
      const q = collection(db, 'employees');
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const employeesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(employeesData);
      }, (error) => {
        console.error("Error fetching employees:", error);
        setAppError("従業員データの読み込みに失敗しました。");
      });
      return () => unsubscribe();
    }
  }, [loggedInUser]);

  useEffect(() => {
     if (loggedInUser?.role === UserRole.MANAGER) {
        const q = collection(db, 'preferences');
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const preferencesData = querySnapshot.docs.map(doc => doc.data() as EmployeePreference);
            setEmployeePreferences(preferencesData);
        }, (error) => {
            console.error("Error fetching preferences:", error);
            setAppError("希望シフトの読み込みに失敗しました。");
        });
        return () => unsubscribe();
     }
  }, [loggedInUser]);

  useEffect(() => {
     if (loggedInUser?.role === UserRole.EMPLOYEE) {
        const prefDocRef = doc(db, 'preferences', loggedInUser.id);
        const unsubscribe = onSnapshot(prefDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setEmployeePreferences([docSnap.data() as EmployeePreference]);
            } else {
                setEmployeePreferences([]);
            }
        }, (error) => {
            console.error("Error fetching single preference:", error);
            setAppError("あなたの希望シフトの読み込みに失敗しました。");
        });
        return () => unsubscribe();
     }
  }, [loggedInUser]);

  useEffect(() => {
    if (loggedInUser?.role === UserRole.MANAGER) {
      const reqDocRef = doc(db, 'requirements', REQUIREMENTS_DOC_ID);
      const unsubscribe = onSnapshot(reqDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setShiftRequirements(docSnap.data() as ShiftRequirements);
        } else {
          setShiftRequirements({
            dailyRequirements: {},
            notes: '週末は経験者を優先してください。公平な時間配分を心がけてください。',
          });
        }
      }, (error) => {
        console.error("Error fetching requirements:", error);
        setAppError("シフト要件の読み込みに失敗しました。");
      });
      return () => unsubscribe();
    }
  }, [loggedInUser]);

  useEffect(() => {
    if (loggedInUser?.role === UserRole.EMPLOYEE) {
      const nextMonthId = getNextMonthYYYYMM();
      const scheduleDocRef = doc(db, 'publishedSchedules', nextMonthId);
      const unsubscribe = onSnapshot(scheduleDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setPublishedSchedule({ id: docSnap.id, ...docSnap.data() } as PublishedSchedule);
        } else {
          setPublishedSchedule(null);
        }
      }, (error) => {
        console.error("Error fetching published schedule:", error);
        setAppError("確定シフトの読み込みに失敗しました。");
      });
      return () => unsubscribe();
    }
  }, [loggedInUser]);

  const handleAddEmployee = async (name: string, role: string, email: string, password?: string) => {
      setAppError(null);
      if (!password) {
          setAppError("新しい従業員のパスワードは必須です。");
          return;
      }
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUserId = userCredential.user.uid;
          const newEmployee: Omit<Employee, 'id'> = { name, email, role };
          await setDoc(doc(db, 'employees', newUserId), newEmployee);

      } catch (error: any) {
          console.error("Failed to add employee:", error);
          if (error.code === 'auth/email-already-in-use') {
              setAppError("このメールアドレスは既に使用されています。");
          } else {
              setAppError("従業員の追加に失敗しました。");
          }
      }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
      setAppError(null);
      const { id, ...dataToUpdate } = updatedEmployee;
      try {
          await updateDoc(doc(db, 'employees', id), dataToUpdate);
      } catch (error) {
          console.error("Failed to update employee:", error);
          setAppError("従業員情報の更新に失敗しました。");
      }
  };

  const handleDeleteEmployee = async (employeeIdToDelete: string) => {
      setAppError(null);
      try {
          await deleteDoc(doc(db, 'employees', employeeIdToDelete));
          await deleteDoc(doc(db, 'preferences', employeeIdToDelete));
      } catch (error) {
          console.error("Failed to delete employee:", error);
          setAppError("従業員の削除に失敗しました。");
      }
  };

  const handleAddOrUpdatePreference = async (preference: EmployeePreference) => {
      setAppError(null);
      try {
        await setDoc(doc(db, 'preferences', preference.employeeId), preference);
      } catch (error) {
        console.error("Failed to save preference:", error);
        setAppError("希望シフトの保存に失敗しました。");
      }
  };

  const handleUpdateShiftRequirements = async (updatedDailyRequirements: { [date: string]: RequirementSlot[] }, notes?: string) => {
      setAppError(null);
      try {
          const newRequirements = {
              dailyRequirements: updatedDailyRequirements,
              notes: notes !== undefined ? shiftRequirements?.notes || '' : '',
          };
          await setDoc(doc(db, 'requirements', REQUIREMENTS_DOC_ID), newRequirements);
      } catch (error) {
          console.error("Failed to update requirements:", error);
          setAppError("シフト要件の更新に失敗しました。");
      }
  };
  
  const handleUpdateShiftNotes = async (notes: string) => {
      setAppError(null);
      if (!shiftRequirements) return;
      try {
          await updateDoc(doc(db, 'requirements', REQUIREMENTS_DOC_ID), { notes });
      } catch (error) {
          console.error("Failed to update notes:", error);
          setAppError("メモの更新に失敗しました。");
      }
  };

  const handleGenerateSchedule = useCallback(async () => {
    setIsGenerating(true);
    setAppError(null);
    setGeneratedSchedule(null);
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setAppError("APIキーが設定されていません。");
        setIsGenerating(false);
        return;
      }
      if (!shiftRequirements) {
         setAppError("シフト要件がロードされていません。");
         setIsGenerating(false);
         return;
      }

      const hasDailyRequirements = Object.values(shiftRequirements.dailyRequirements).some(slots => slots.length > 0);
      if (!hasDailyRequirements && !shiftRequirements.notes) {
         setAppError("有効なシフト要件を少なくとも1つ定義するか、AIへのメモを提供してください。");
         setIsGenerating(false);
         return;
      }

      const schedule = await generateScheduleWithAI(employeePreferences, shiftRequirements, employees);
      setGeneratedSchedule(schedule);
    } catch (err) {
      console.error("Error generating schedule:", err);
      setAppError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsGenerating(false);
    }
  }, [employeePreferences, shiftRequirements, employees]);

  const handlePublishSchedule = async () => {
    setAppError(null);
    if (!generatedSchedule) {
      setAppError("公開するスケジュールがありません。先にAIで生成してください。");
      return;
    }

    const nextMonthId = getNextMonthYYYYMM();
    const scheduleToPublish: Omit<PublishedSchedule, 'id' | 'publishedAt'> & { publishedAt: any } = {
      schedule: generatedSchedule,
      publishedAt: serverTimestamp(),
      month: `${new Date(nextMonthId + '-01T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}`,
    };

    try {
      await setDoc(doc(db, "publishedSchedules", nextMonthId), scheduleToPublish);
      alert("スケジュールが公開されました！");
    } catch (error) {
      console.error("Failed to publish schedule:", error);
      setAppError("スケジュールの公開に失敗しました。");
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center p-10"><LoadingSpinner /></div>;
    }
    
    if (!loggedInUser) {
      return <LoginView onLogin={handleLogin} loginError={loginError} isLoading={isLoading} />;
    }

    if (loggedInUser.role === UserRole.EMPLOYEE) {
      const currentEmployeeDetails: Employee = {
          id: loggedInUser.id,
          name: loggedInUser.name,
          email: loggedInUser.email,
          role: '従業員'
      };
      const currentPreference = employeePreferences.find(p => p.employeeId === loggedInUser.id);
      return (
        <EmployeeView
          loggedInUser={loggedInUser}
          loggedInEmployeeDetails={currentEmployeeDetails}
          currentPreference={currentPreference}
          onSubmitPreference={handleAddOrUpdatePreference}
          publishedSchedule={publishedSchedule}
        />
      );
    }

    if (loggedInUser.role === UserRole.MANAGER) {
      if (!shiftRequirements) {
        return <div className="flex justify-center items-center p-10"><LoadingSpinner /> <p className="ml-4">シフト要件を読み込み中...</p></div>;
      }
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
          onPublishSchedule={handlePublishSchedule}
          generatedSchedule={generatedSchedule}
          isLoading={isGenerating}
          error={appError}
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
              {/* --- ここから変更 --- */}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                広島ポーカー倶楽部　シフト管理
              </h1>
              {/* --- ここまで変更 --- */}
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
        {appError && !loggedInUser && <Alert message={appError} type="error" />}
        {renderContent()}
      </main>
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} 広島ポーカー倶楽部　シフト管理</p>
      </footer>
    </div>
  );
};

export default App;