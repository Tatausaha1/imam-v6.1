
import React, { useState, useEffect } from 'react';
import MobileContainer from './MobileContainer';
import Login from './Login';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard';
import Presensi from './Presensi';
import ContentGeneration from './ContentGeneration';
import ClassList from './ClassList';
import ClassPromotion from './ClassPromotion';
import Schedule from './Schedule';
import BottomNav from './BottomNav';
import GenericView from './GenericView';
import Sidebar from './Sidebar';
import Profile from './Profile';
import AcademicYear from './AcademicYear';
import Reports from './Reports';
import ProtectedRoute from './ProtectedRoute';
import Advisor from './Advisor';
import { ViewState, UserRole } from '../types';
import { toast } from 'sonner';
import { DevicePhoneIcon, DeviceTabletIcon, MonitorIcon } from './Icons';

// New Imports
import AllFeatures from './AllFeatures';
import AttendanceHistory from './AttendanceHistory';
import QRScanner from './QRScanner';
import TeachingJournal from './TeachingJournal';
import Assignments from './Assignments';
import Grades from './Grades';
import StudentData from './StudentData';
import TeacherData from './TeacherData';
import IDCard from './IDCard';
import Letters from './Letters';
import CreateAccount from './CreateAccount';
import DeveloperConsole from './DeveloperConsole';
import LoginHistory from './LoginHistory';
import About from './About';
import History from './History';
import Premium from './Premium';
import News from './News';
import MadrasahInfo from './MadrasahInfo';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.ONBOARDING);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GURU);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'full'>('full');

  useEffect(() => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') setIsDarkTheme(true);
      
      const handleOnline = () => {
          setIsOnline(true);
          toast.success("Koneksi kembali online. Data disinkronkan.");
      };
      const handleOffline = () => {
          setIsOnline(false);
          toast.warning("Mode Offline: Anda tetap bisa menggunakan aplikasi, data akan disimpan secara lokal.");
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    setCurrentView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    setUserRole(UserRole.GURU);
    setCurrentView(ViewState.LOGIN);
  };

  const backToDashboard = () => setCurrentView(ViewState.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case ViewState.ONBOARDING:
        return <Onboarding onStart={() => setCurrentView(ViewState.LOGIN)} />;
      case ViewState.LOGIN:
        return <Login onLogin={handleLoginSuccess} />;
      case ViewState.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} onLogout={handleLogout} />;
      case ViewState.PROFILE:
        return <Profile onBack={backToDashboard} onLogout={handleLogout} />;
      case ViewState.SCHEDULE:
        return <Schedule onBack={backToDashboard} />;
      case ViewState.ALL_FEATURES:
        return <AllFeatures onBack={backToDashboard} onNavigate={setCurrentView} userRole={userRole} />;
      case ViewState.NEWS:
        return <News onBack={backToDashboard} />;
      case ViewState.ABOUT:
        return <About onBack={backToDashboard} />;
      case ViewState.LOGIN_HISTORY:
        return <LoginHistory onBack={backToDashboard} />;
      case ViewState.ID_CARD:
        return <IDCard onBack={backToDashboard} />;
      case ViewState.HISTORY:
        return <History onBack={backToDashboard} userRole={userRole} />;
      case ViewState.PREMIUM:
        return <Premium onBack={backToDashboard} />;
      case ViewState.ADVISOR:
        return <Advisor onBack={backToDashboard} />;
      case ViewState.SCANNER:
        return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF, UserRole.KETUA_KELAS]} onBack={backToDashboard}>
                <QRScanner onBack={backToDashboard} />
            </ProtectedRoute>
        );
      case ViewState.ATTENDANCE_HISTORY:
        return <AttendanceHistory onBack={backToDashboard} onNavigate={setCurrentView} />;
      case ViewState.CLASSES:
        return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF, UserRole.KEPALA_MADRASAH]} onBack={backToDashboard}>
                <ClassList onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
        );
      case ViewState.PRESENSI:
        return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF, UserRole.KETUA_KELAS]} onBack={backToDashboard}>
                <Presensi onBack={backToDashboard} onNavigate={setCurrentView} />
            </ProtectedRoute>
        );
      case ViewState.CONTENT_GENERATION:
        return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF]} onBack={backToDashboard}>
                <ContentGeneration onBack={backToDashboard} />
            </ProtectedRoute>
        );
      case ViewState.REPORTS:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.KEPALA_MADRASAH, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF]} onBack={backToDashboard}>
                <Reports onBack={backToDashboard} />
            </ProtectedRoute>
         );
      case ViewState.JOURNAL:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH]} onBack={backToDashboard}>
                <TeachingJournal onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
         );
      case ViewState.ASSIGNMENTS:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.SISWA, UserRole.KETUA_KELAS]} onBack={backToDashboard}>
                <Assignments onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
         );
      case ViewState.GRADES:
      case ViewState.REPORT_CARDS:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.SISWA, UserRole.ORANG_TUA, UserRole.KEPALA_MADRASAH]} onBack={backToDashboard}>
                <Grades onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
         );
      case ViewState.STUDENTS:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.STAF, UserRole.WALI_KELAS, UserRole.GURU, UserRole.KEPALA_MADRASAH]} onBack={backToDashboard}>
                <StudentData onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
         );
      case ViewState.TEACHERS:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.STAF, UserRole.KEPALA_MADRASAH]} onBack={backToDashboard}>
                <TeacherData onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
         );
      case ViewState.LETTERS:
         return <Letters onBack={backToDashboard} userRole={userRole} />;
      case ViewState.CREATE_ACCOUNT:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER, UserRole.KEPALA_MADRASAH, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF]} onBack={backToDashboard}>
                <CreateAccount onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
         );
      case ViewState.DEVELOPER:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.DEVELOPER]} onBack={backToDashboard}>
                <DeveloperConsole onBack={backToDashboard} />
            </ProtectedRoute>
         );
      case ViewState.MADRASAH_INFO:
         return (
            <ProtectedRoute userRole={userRole} allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER]} onBack={backToDashboard}>
                <MadrasahInfo onBack={backToDashboard} />
            </ProtectedRoute>
         );
      default:
        return <GenericView title="Fitur Ini" onBack={backToDashboard} />;
    }
  };

  const isFullPageHeader = currentView === ViewState.LOGIN || currentView === ViewState.ONBOARDING;

  return (
    <MobileContainer isDarkTheme={isDarkTheme} deviceView={deviceView}>
      <div className="h-full w-full relative flex font-sans overflow-hidden">
        
        {/* Device Simulator Switcher (Floating - Only visible on wide screens) */}
        <div className="hidden xl:flex fixed top-4 right-4 z-[100] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl gap-1">
             <button 
                onClick={() => setDeviceView('mobile')}
                className={`p-2.5 rounded-xl transition-all ${deviceView === 'mobile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Phone View"
             >
                <DevicePhoneIcon className="w-5 h-5" />
             </button>
             <button 
                onClick={() => setDeviceView('tablet')}
                className={`p-2.5 rounded-xl transition-all ${deviceView === 'tablet' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Tablet View"
             >
                <DeviceTabletIcon className="w-5 h-5" />
             </button>
             <button 
                onClick={() => setDeviceView('full')}
                className={`p-2.5 rounded-xl transition-all ${deviceView === 'full' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Full Screen / Responsive"
             >
                <MonitorIcon className="w-5 h-5" />
             </button>
        </div>

        {/* Offline Status Indicator */}
        {!isOnline && (
            <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-600 text-white text-[9px] font-black uppercase tracking-[0.2em] text-center py-1 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                Mode Offline Aktif
            </div>
        )}

        {!isFullPageHeader && (
            <div className="hidden md:block w-72 lg:w-80 shrink-0 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121] z-40">
                <Sidebar 
                    currentView={currentView} 
                    onNavigate={setCurrentView} 
                    userRole={userRole}
                    onLogout={handleLogout}
                />
            </div>
        )}

        <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#020617]">
            <div className={`flex-1 overflow-hidden relative ${!isOnline ? 'mt-4' : ''}`}>
                {renderView()}
            </div>

            {!isFullPageHeader && (
              <div className="md:hidden">
                 <BottomNav 
                   currentView={currentView} 
                   onNavigate={setCurrentView}
                   userRole={userRole}
                 />
              </div>
            )}
        </div>
      </div>
    </MobileContainer>
  );
};

export default App;
