
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
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
import Settings from './Settings';
import MobileContainer from './MobileContainer';
import { ViewState, UserRole } from '../types';
import { toast } from 'sonner';
import { Loader2, AppLogo, SparklesIcon } from './Icons';
import { auth, db, isMockMode } from '../services/firebase';

// Feature Views
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
  // Fix: Default ke LOGIN untuk mencegah query database sebelum login
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GURU);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewKey, setViewKey] = useState(0); 

  useEffect(() => {
      // Check if onboarding is needed
      const onboardingDone = localStorage.getItem('imam_onboarding_done');
      if (!onboardingDone) {
          setCurrentView(ViewState.ONBOARDING);
      }

      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      
      setIsDarkTheme(shouldBeDark);
      if (shouldBeDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      
      const handleOnline = () => { setIsOnline(true); toast.success("Koneksi online."); };
      const handleOffline = () => { setIsOnline(false); toast.warning("Mode Offline Aktif."); };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (isMockMode) {
          setTimeout(() => setAuthLoading(false), 1000); 
      } else if (auth) {
          const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
              if (user && db) {
                  try {
                      // Cek apakah user sudah ada di koleksi 'users'
                      const userRef = db.collection('users').doc(user.uid);
                      const userDoc = await userRef.get();
                      
                      if (userDoc.exists) {
                          const data = userDoc.data();
                          setUserRole(data?.role as UserRole || UserRole.GURU);
                          setCurrentView(ViewState.DASHBOARD);
                      } else {
                          // Jika user baru login via Auth tapi belum ada di Firestore (Auto-provisioning)
                          const newUserData = {
                              uid: user.uid,
                              displayName: user.displayName || 'Pengguna Baru',
                              email: user.email,
                              role: UserRole.GURU, // Default role
                              createdAt: new Date().toISOString()
                          };
                          await userRef.set(newUserData);
                          setUserRole(UserRole.GURU);
                          setCurrentView(ViewState.DASHBOARD);
                      }
                  } catch (e: any) { 
                      console.warn("Peringatan sinkronisasi profil:", e.message);
                  }
              }
              setAuthLoading(false);
          });
          return () => unsubscribeAuth();
      } else {
          setAuthLoading(false);
      }

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const handleNavigate = (view: ViewState) => {
    setViewKey(prev => prev + 1);
    setCurrentView(view);
  };

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
        const next = !prev;
        localStorage.setItem('theme', next ? 'dark' : 'light');
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return next;
    });
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    handleNavigate(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    if (!isMockMode && auth) await auth.signOut();
    setUserRole(UserRole.GURU);
    handleNavigate(ViewState.LOGIN);
  };

  const backToDashboard = () => handleNavigate(ViewState.DASHBOARD);

  // Loading state yang lebih bersih
  if (authLoading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
                  <div className="w-20 h-20 mb-6"><AppLogo className="w-full h-full" /></div>
                  <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Menghubungkan Core Engine...</p>
                  </div>
              </div>
          </div>
      );
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.ONBOARDING: return <Onboarding onStart={() => handleNavigate(ViewState.LOGIN)} />;
      case ViewState.LOGIN: return <Login onLogin={handleLoginSuccess} />;
      case ViewState.DASHBOARD: return <Dashboard onNavigate={handleNavigate} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} onLogout={handleLogout} />;
      case ViewState.PROFILE: return <Profile onBack={backToDashboard} onLogout={handleLogout} />;
      case ViewState.SCHEDULE: return <Schedule onBack={backToDashboard} />;
      case ViewState.ALL_FEATURES: return <AllFeatures onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} />;
      case ViewState.NEWS: return <News onBack={backToDashboard} />;
      case ViewState.ABOUT: return <About onBack={backToDashboard} />;
      case ViewState.LOGIN_HISTORY: return <LoginHistory onBack={backToDashboard} />;
      case ViewState.ID_CARD: return <IDCard onBack={backToDashboard} />;
      case ViewState.HISTORY: return <History onBack={backToDashboard} userRole={userRole} />;
      case ViewState.PREMIUM: return <Premium onBack={backToDashboard} />;
      case ViewState.ADVISOR: return <Advisor onBack={backToDashboard} />;
      case ViewState.MADRASAH_INFO: return <MadrasahInfo onBack={backToDashboard} />;
      case ViewState.CLASSES: return <ClassList onBack={backToDashboard} userRole={userRole} />;
      case ViewState.SCANNER: return <QRScanner onBack={backToDashboard} />;
      case ViewState.ATTENDANCE_HISTORY: return <AttendanceHistory onBack={backToDashboard} onNavigate={handleNavigate} />;
      case ViewState.PRESENSI: return <Presensi onBack={backToDashboard} onNavigate={handleNavigate} />;
      case ViewState.CONTENT_GENERATION: return <ContentGeneration onBack={backToDashboard} />;
      case ViewState.REPORTS: return <Reports onBack={backToDashboard} />;
      case ViewState.JOURNAL: return <TeachingJournal onBack={backToDashboard} userRole={userRole} />;
      case ViewState.ASSIGNMENTS: return <Assignments onBack={backToDashboard} userRole={userRole} />;
      case ViewState.GRADES:
      case ViewState.REPORT_CARDS: return <Grades onBack={backToDashboard} userRole={userRole} />;
      case ViewState.STUDENTS: return <StudentData onBack={backToDashboard} userRole={userRole} />;
      case ViewState.TEACHERS: return <TeacherData onBack={backToDashboard} userRole={userRole} />;
      case ViewState.LETTERS: return <Letters onBack={backToDashboard} userRole={userRole} />;
      case ViewState.CREATE_ACCOUNT: return <CreateAccount onBack={backToDashboard} userRole={userRole} />;
      case ViewState.DEVELOPER: return <DeveloperConsole onBack={backToDashboard} />;
      case ViewState.SETTINGS: return <Settings onBack={backToDashboard} onNavigate={handleNavigate} onLogout={handleLogout} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} />;
      default: return <GenericView title="Fitur" onBack={backToDashboard} />;
    }
  };

  const isFullPageHeader = currentView === ViewState.LOGIN || currentView === ViewState.ONBOARDING;

  return (
    <MobileContainer isDarkTheme={isDarkTheme}>
        <div className="h-full w-full relative flex font-sans overflow-hidden transition-all duration-700 z-10">
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-600 text-white text-[9px] font-black uppercase tracking-[0.2em] text-center py-1">
                    Mode Offline Aktif
                </div>
            )}
            {!isFullPageHeader && (
                <div className="hidden md:block w-72 lg:w-80 shrink-0 h-full border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl z-40">
                    <Sidebar currentView={currentView} onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />
                </div>
            )}
            <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden z-10">
                <div key={viewKey} className={`flex-1 overflow-hidden relative ${!isOnline ? 'mt-4' : ''} animate-in fade-in duration-300`}>
                    {renderView()}
                </div>
                {!isFullPageHeader && (
                    <div className="md:hidden"><BottomNav currentView={currentView} onNavigate={handleNavigate} userRole={userRole} /></div>
                )}
            </div>
        </div>
    </MobileContainer>
  );
};

export default App;
