
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, UserRole } from '../types';
import { toast } from 'sonner';
import { Loader2, AppLogo } from './Icons';
import { auth, db, isMockMode } from '../services/firebase';

// Komponen Inti
import Login from './Login';
import Dashboard from './Dashboard';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

// Lazy Loaded Components
const Presensi = lazy(() => import('./Presensi'));
const ClassList = lazy(() => import('./ClassList'));
const Schedule = lazy(() => import('./Schedule'));
const Profile = lazy(() => import('./Profile'));
const Reports = lazy(() => import('./Reports'));
const Advisor = lazy(() => import('./Advisor'));
const Settings = lazy(() => import('./Settings'));
const AllFeatures = lazy(() => import('./AllFeatures'));
const AttendanceHistory = lazy(() => import('./AttendanceHistory'));
const QRScanner = lazy(() => import('./QRScanner'));
const TeachingJournal = lazy(() => import('./TeachingJournal'));
const Assignments = lazy(() => import('./Assignments'));
const Grades = lazy(() => import('./Grades'));
const StudentData = lazy(() => import('./StudentData'));
const AlumniData = lazy(() => import('./AlumniData'));
const MutationData = lazy(() => import('./MutationData'));
const TeacherData = lazy(() => import('./TeacherData'));
const IDCard = lazy(() => import('./IDCard'));
const Letters = lazy(() => import('./Letters'));
const CreateAccount = lazy(() => import('./CreateAccount'));
const DeveloperConsole = lazy(() => import('./DeveloperConsole'));
const LoginHistory = lazy(() => import('./LoginHistory'));
const About = lazy(() => import('./About'));
const History = lazy(() => import('./History'));
const MadrasahInfo = lazy(() => import('./MadrasahInfo'));
const KemenagHub = lazy(() => import('./KemenagHub'));
const PointsView = lazy(() => import('./PointsView'));
const AcademicYear = lazy(() => import('./AcademicYear'));
const ClassPromotion = lazy(() => import('./ClassPromotion'));
const News = lazy(() => import('./News'));
const Premium = lazy(() => import('./Premium'));
const GenericView = lazy(() => import('./GenericView'));

const PageLoader = () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white/50 dark:bg-[#020617]/50 backdrop-blur-sm animate-in fade-in duration-300">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-40 mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Memuat Modul...</p>
    </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GURU);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewKey, setViewKey] = useState(0); 

  useEffect(() => {
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
          setAuthLoading(false); 
      } else if (auth) {
          const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
              if (user && db) {
                  try {
                      const userRef = db.collection('users').doc(user.uid);
                      const userDoc = await userRef.get();
                      
                      if (userDoc.exists) {
                          const data = userDoc.data();
                          const role = data?.role as UserRole || UserRole.GURU;
                          setUserRole(role);
                          setCurrentView(prev => prev === ViewState.LOGIN ? ViewState.DASHBOARD : prev);
                      }
                  } catch (e: any) { 
                      console.warn("Auth sync failure:", e.message);
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

  const staffAbove = [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH];
  const adminDevOnly = [UserRole.ADMIN, UserRole.DEVELOPER];
  const allAuthenticated = [...staffAbove, UserRole.SISWA, UserRole.ORANG_TUA, UserRole.KETUA_KELAS];

  const renderViewContent = () => {
    switch (currentView) {
      case ViewState.LOGIN: return <Login onLogin={handleLoginSuccess} />;
      case ViewState.DASHBOARD: return <Dashboard onNavigate={handleNavigate} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} onLogout={handleLogout} />;
      case ViewState.PROFILE: return <Profile onBack={backToDashboard} onLogout={handleLogout} />;
      case ViewState.SCHEDULE: return <Schedule onBack={backToDashboard} />;
      case ViewState.ALL_FEATURES: return <AllFeatures onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} />;
      case ViewState.NEWS: return <News onBack={backToDashboard} />;
      case ViewState.ABOUT: return <About onBack={backToDashboard} />;
      case ViewState.LOGIN_HISTORY: return <LoginHistory onBack={backToDashboard} />;
      case ViewState.ID_CARD: return <IDCard onBack={backToDashboard} />;
      case ViewState.HISTORY: return <History onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} />;
      case ViewState.PREMIUM: return <Premium onBack={backToDashboard} />;
      case ViewState.ADVISOR: return <Advisor onBack={backToDashboard} />;
      case ViewState.MADRASAH_INFO: return <MadrasahInfo onBack={backToDashboard} />;
      case ViewState.KEMENAG_HUB: return <KemenagHub onBack={backToDashboard} />;
      case ViewState.CLASSES: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><ClassList onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} /></ProtectedRoute>;
      case ViewState.PRESENSI: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><Presensi onBack={backToDashboard} onNavigate={handleNavigate} /></ProtectedRoute>;
      case ViewState.SCANNER: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><QRScanner onBack={backToDashboard} /></ProtectedRoute>;
      case ViewState.REPORTS: return <ProtectedRoute allowedRoles={allAuthenticated} userRole={userRole} onBack={backToDashboard}><Reports onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} /></ProtectedRoute>;
      case ViewState.JOURNAL: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><TeachingJournal onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
      case ViewState.ASSIGNMENTS: return <Assignments onBack={backToDashboard} userRole={userRole} />;
      case ViewState.GRADES:
      case ViewState.REPORT_CARDS: return <Grades onBack={backToDashboard} userRole={userRole} />;
      case ViewState.STUDENTS: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><StudentData onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
      case ViewState.ALUMNI: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><AlumniData onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
      case ViewState.MUTATION: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><MutationData onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
      case ViewState.TEACHERS: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><TeacherData onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
      case ViewState.LETTERS: return <Letters onBack={backToDashboard} userRole={userRole} />;
      case ViewState.POINTS: return <PointsView onBack={backToDashboard} />;
      case ViewState.ACADEMIC_YEAR: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><AcademicYear onBack={backToDashboard} /></ProtectedRoute>;
      case ViewState.PROMOTION: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><ClassPromotion onBack={backToDashboard} /></ProtectedRoute>;
      case ViewState.PUSAKA: return <GenericView title="Pusaka Kemenag" onBack={backToDashboard} description="Integrasi resmi dengan Pusaka Super Apps RI." />;
      case ViewState.CREATE_ACCOUNT: 
        return (
            <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}>
                <CreateAccount onBack={backToDashboard} userRole={userRole} />
            </ProtectedRoute>
        );
      case ViewState.DEVELOPER: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><DeveloperConsole onBack={backToDashboard} /></ProtectedRoute>;
      case ViewState.SETTINGS: return <Settings onBack={backToDashboard} onNavigate={handleNavigate} onLogout={handleLogout} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} />;
      default: return <GenericView title="Fitur" onBack={backToDashboard} />;
    }
  };

  if (authLoading) {
      return (
          <div className="fixed inset-0 h-screen w-full flex flex-col items-center justify-center bg-[#020617] z-[100]">
              <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-500">
                  <div className="w-24 h-24 mb-6"><AppLogo className="w-full h-full" /></div>
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin opacity-30" />
              </div>
          </div>
      );
  }

  const isLoginPage = currentView === ViewState.LOGIN;

  return (
    <div className={`h-screen w-full flex flex-col relative overflow-hidden ${isDarkTheme ? 'bg-[#020617]' : 'bg-[#f8fafc]'} transition-colors duration-500`}>
        
        {/* --- BACKGROUND AMBIENCE (Global) --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className={`absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-10 transition-colors duration-1000 ${isDarkTheme ? 'bg-indigo-500/20' : 'bg-indigo-400/10'}`}></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        </div>

        <div className="relative z-10 flex-1 flex h-full w-full overflow-hidden">
            {isLoginPage ? (
                <Suspense fallback={<PageLoader />}>
                    {renderViewContent()}
                </Suspense>
            ) : (
                <div className="h-full w-full relative flex overflow-hidden">
                    {/* Desktop Sidebar - Always visible on large screens */}
                    <div className="hidden lg:block w-72 lg:w-80 shrink-0 h-full border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-[#0B1121]/50 backdrop-blur-xl z-40">
                        <Sidebar currentView={currentView} onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />
                    </div>
                    
                    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
                        <div className="flex-1 overflow-hidden relative z-10">
                            <Suspense fallback={<PageLoader />}>
                                <div key={viewKey} className="h-full w-full relative">
                                    {renderViewContent()}
                                </div>
                            </Suspense>
                        </div>
                        
                        {/* Bottom Nav: Only show on mobile, fixed at the bottom */}
                        <div className="shrink-0 z-50 lg:hidden">
                            <BottomNav currentView={currentView} onNavigate={handleNavigate} userRole={userRole} />
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {!isOnline && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-orange-600/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-lg">
                Mode Offline Aktif
            </div>
        )}
    </div>
  );
};

export default App;
