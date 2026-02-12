
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, UserRole } from '../types';
import { toast } from 'sonner';
import { Loader2, AppLogo } from './Icons';
import { auth, db, isMockMode } from '../services/firebase';
import MobileContainer from './MobileContainer';

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
const NotificationCenter = lazy(() => import('./NotificationCenter'));

const PageLoader = () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-[#020617] animate-in fade-in duration-300">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-40 mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Memuat Modul...</p>
    </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  const [navigationHistory, setNavigationHistory] = useState<ViewState[]>([]);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GURU);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewKey, setViewKey] = useState(0); 
  const [viewMode, setViewMode] = useState<'phone' | 'full'>('full');

  useEffect(() => {
    const savedViewMode = localStorage.getItem('imam_view_mode') as 'phone' | 'full';
    if (savedViewMode) setViewMode(savedViewMode);

    if (isMockMode || !db || currentView === ViewState.LOGIN || authLoading || !auth?.currentUser) return;

    try {
        const unsub = db.collection('announcements')
            .where('date', '>', new Date(Date.now() - 60000).toISOString())
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        toast.success(data.title || "Pemberitahuan Baru", {
                            description: data.message,
                            action: { label: "LIHAT", onClick: () => handleNavigate(ViewState.NOTIFICATIONS) },
                            duration: 10000
                        });
                    }
                });
            }, err => {
                console.warn("Announcement stream temporarily unavailable.");
            });

        return () => unsub();
    } catch (e) {
        console.error("Critical notification listener failure.");
    }
  }, [currentView, authLoading]); 

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
                          if (currentView === ViewState.LOGIN) {
                              setCurrentView(ViewState.DASHBOARD);
                          }
                      }
                  } catch (e: any) { 
                      console.warn("Auth database sync delay.");
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
    if (view === currentView) return;
    if (currentView !== ViewState.LOGIN) {
        setNavigationHistory(prev => [...prev, currentView]);
    }
    setViewKey(prev => prev + 1);
    setCurrentView(view);
  };

  const handleBack = () => {
      if (navigationHistory.length > 0) {
          const historyCopy = [...navigationHistory];
          const previousView = historyCopy.pop()!;
          setNavigationHistory(historyCopy);
          setViewKey(prev => prev + 1);
          setCurrentView(previousView);
      } else {
          if (currentView !== ViewState.DASHBOARD) {
              setCurrentView(ViewState.DASHBOARD);
              setNavigationHistory([]);
              setViewKey(prev => prev + 1);
          }
      }
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
    setNavigationHistory([]); 
    handleNavigate(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    if (!isMockMode && auth) await auth.signOut();
    setUserRole(UserRole.GURU);
    setNavigationHistory([]);
    setCurrentView(ViewState.LOGIN);
  };

  const changeViewMode = (mode: 'phone' | 'full') => {
    setViewMode(mode);
    localStorage.setItem('imam_view_mode', mode);
  };

  const staffAbove = [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH];
  const adminDevOnly = [UserRole.ADMIN, UserRole.DEVELOPER];
  const allAuthenticated = [...staffAbove, UserRole.SISWA, UserRole.ORANG_TUA, UserRole.KETUA_KELAS];

  const renderViewContent = () => {
    switch (currentView) {
      case ViewState.LOGIN: return <Login onLogin={handleLoginSuccess} />;
      case ViewState.DASHBOARD: return <Dashboard onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />;
      case ViewState.PROFILE: return <Profile onBack={handleBack} onLogout={handleLogout} />;
      case ViewState.SCHEDULE: return <Schedule onBack={handleBack} />;
      case ViewState.ALL_FEATURES: return <AllFeatures onBack={handleBack} onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />;
      case ViewState.NEWS: return <News onBack={handleBack} />;
      case ViewState.ABOUT: return <About onBack={handleBack} />;
      case ViewState.LOGIN_HISTORY: return <LoginHistory onBack={handleBack} />;
      case ViewState.ID_CARD: return <IDCard onBack={handleBack} />;
      case ViewState.HISTORY: return <History onBack={handleBack} onNavigate={handleNavigate} userRole={userRole} />;
      case ViewState.PREMIUM: return <Premium onBack={handleBack} />;
      case ViewState.ADVISOR: return <Advisor onBack={handleBack} />;
      case ViewState.MADRASAH_INFO: return <MadrasahInfo onBack={handleBack} />;
      case ViewState.KEMENAG_HUB: return <KemenagHub onBack={handleBack} />;
      case ViewState.NOTIFICATIONS: return <NotificationCenter onBack={handleBack} />;
      case ViewState.CLASSES: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><ClassList onBack={handleBack} onNavigate={handleNavigate} userRole={userRole} /></ProtectedRoute>;
      case ViewState.PRESENSI: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><Presensi onBack={handleBack} onNavigate={handleNavigate} /></ProtectedRoute>;
      case ViewState.SCANNER: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><QRScanner onBack={handleBack} /></ProtectedRoute>;
      case ViewState.REPORTS: return <ProtectedRoute allowedRoles={allAuthenticated} userRole={userRole} onBack={handleBack}><Reports onBack={handleBack} onNavigate={handleNavigate} userRole={userRole} /></ProtectedRoute>;
      case ViewState.JOURNAL: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><TeachingJournal onBack={handleBack} /></ProtectedRoute>;
      case ViewState.ASSIGNMENTS: return <Assignments onBack={handleBack} userRole={userRole} />;
      case ViewState.GRADES:
      case ViewState.REPORT_CARDS: return <Grades onBack={handleBack} userRole={userRole} />;
      case ViewState.STUDENTS: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><StudentData onBack={handleBack} userRole={userRole} /></ProtectedRoute>;
      case ViewState.ALUMNI: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><AlumniData onBack={handleBack} userRole={userRole} /></ProtectedRoute>;
      case ViewState.MUTATION: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><MutationData onBack={handleBack} userRole={userRole} /></ProtectedRoute>;
      case ViewState.TEACHERS: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={handleBack}><TeacherData onBack={handleBack} userRole={userRole} /></ProtectedRoute>;
      case ViewState.LETTERS: return <Letters onBack={handleBack} userRole={userRole} />;
      case ViewState.POINTS: return <PointsView onBack={handleBack} />;
      case ViewState.ACADEMIC_YEAR: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={handleBack}><AcademicYear onBack={handleBack} /></ProtectedRoute>;
      case ViewState.PROMOTION: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={handleBack}><ClassPromotion onBack={handleBack} /></ProtectedRoute>;
      case ViewState.CREATE_ACCOUNT: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={handleBack}><CreateAccount onBack={handleBack} userRole={userRole} /></ProtectedRoute>;
      case ViewState.DEVELOPER: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={handleBack}><DeveloperConsole onBack={handleBack} /></ProtectedRoute>;
      case ViewState.SETTINGS: return <Settings onBack={handleBack} onNavigate={handleNavigate} onLogout={handleLogout} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} />;
      default: return <GenericView title="Fitur" onBack={handleBack} />;
    }
  };

  if (authLoading) {
      return (
          <div className="fixed inset-0 h-screen w-full flex flex-col items-center justify-center bg-[#020617] z-[1000]">
              <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-500">
                  <div className="w-24 h-24 mb-6"><AppLogo className="w-full h-full" /></div>
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin opacity-30" />
              </div>
          </div>
      );
  }

  if (currentView === ViewState.LOGIN) return <Login onLogin={handleLoginSuccess} />;

  return (
    <MobileContainer isDarkTheme={isDarkTheme} viewMode={viewMode} onViewModeChange={changeViewMode}>
        <div className="h-full w-full relative flex overflow-hidden">
            {/* Desktop Sidebar */}
            {viewMode === 'full' && (
                <div className="hidden lg:block w-72 shrink-0 h-full border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1121] z-40">
                    <Sidebar currentView={currentView} onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />
                </div>
            )}
            
            <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#020617]">
                <div className="flex-1 overflow-hidden relative z-10 h-full w-full">
                    <Suspense fallback={<PageLoader />}>
                        <div key={viewKey} className="h-full w-full relative">
                            {renderViewContent()}
                        </div>
                    </Suspense>
                </div>
                
                {/* Mobile Dock */}
                <div className={`shrink-0 z-40 relative ${viewMode === 'full' ? 'lg:hidden' : ''}`}>
                    <BottomNav currentView={currentView} onNavigate={handleNavigate} />
                </div>
            </div>
        </div>

        {!isOnline && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[1000] bg-orange-600/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-lg">
                Offline Mode
            </div>
        )}
    </MobileContainer>
  );
};

export default App;
