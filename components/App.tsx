/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, UserRole } from '../types';
import { toast } from 'sonner';
import { Loader2, AppLogo, ShieldCheckIcon } from './Icons';
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
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin opacity-40 mb-4" />
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

  // --- ROLE DEFINITIONS ---
  const ROLE_GROUPS = {
    STAFF_ABOVE: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH],
    ADMIN_DEV: [UserRole.ADMIN, UserRole.DEVELOPER],
    AUTHENTICATED: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH, UserRole.SISWA, UserRole.ORANG_TUA, UserRole.KETUA_KELAS]
  };

  useEffect(() => {
    if (isMockMode) {
        console.warn("%c⚠️ MOCK MODE ACTIVE: Database is simulated. Disable in firebase.ts for production.", "color: orange; font-weight: bold; font-size: 14px;");
    }

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
            }, err => console.warn("Announcement stream delay:", err.message));

        return () => unsub();
    } catch (e) {
        console.error("Notification listener failed:", e);
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

      // Unified Auth Strategy
      const initAuth = async () => {
          if (isMockMode) {
              setAuthLoading(false);
          } else if (auth) {
              const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
                  if (user && db) {
                      try {
                          const userDoc = await db.collection('users').doc(user.uid).get();
                          if (userDoc.exists) {
                              const role = userDoc.data()?.role as UserRole || UserRole.GURU;
                              setUserRole(role);
                              if (currentView === ViewState.LOGIN) setCurrentView(ViewState.DASHBOARD);
                          }
                      } catch (e: any) { console.warn("Sync delay:", e.message); }
                  }
                  setAuthLoading(false);
              });
              return unsubscribeAuth;
          } else {
              setAuthLoading(false);
          }
      };
      
      const authUnsubPromise = initAuth();

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          authUnsubPromise.then(unsub => unsub && unsub());
      };
  }, []);

  const handleNavigate = (view: ViewState) => {
    if (view === currentView) return;
    if (currentView !== ViewState.LOGIN) setNavigationHistory(prev => [...prev, currentView]);
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
      } else if (currentView !== ViewState.DASHBOARD) {
          setCurrentView(ViewState.DASHBOARD);
          setNavigationHistory([]);
          setViewKey(prev => prev + 1);
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

  /**
   * OPTIMIZED VIEW RENDERER
   * Using a mapping strategy to keep App.tsx clean and maintainable.
   */
  const renderViewContent = () => {
    const commonProps = { onBack: handleBack, onNavigate: handleNavigate, userRole, onLogout: handleLogout };
    
    // Mapping for simple views
    const viewMap: Partial<Record<ViewState, React.ReactNode>> = {
        [ViewState.LOGIN]: <Login onLogin={handleLoginSuccess} />,
        [ViewState.DASHBOARD]: <Dashboard {...commonProps} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} />,
        [ViewState.PROFILE]: <Profile onBack={handleBack} onLogout={handleLogout} />,
        [ViewState.SCHEDULE]: <Schedule onBack={handleBack} />,
        [ViewState.ALL_FEATURES]: <AllFeatures {...commonProps} />,
        [ViewState.NEWS]: <News onBack={handleBack} />,
        [ViewState.ABOUT]: <About onBack={handleBack} />,
        [ViewState.LOGIN_HISTORY]: <LoginHistory onBack={handleBack} />,
        [ViewState.ID_CARD]: <IDCard onBack={handleBack} />,
        [ViewState.HISTORY]: <History {...commonProps} />,
        [ViewState.PREMIUM]: <Premium onBack={handleBack} />,
        [ViewState.ADVISOR]: <Advisor onBack={handleBack} />,
        [ViewState.MADRASAH_INFO]: <MadrasahInfo onBack={handleBack} />,
        [ViewState.KEMENAG_HUB]: <KemenagHub onBack={handleBack} />,
        [ViewState.NOTIFICATIONS]: <NotificationCenter onBack={handleBack} />,
        [ViewState.ASSIGNMENTS]: <Assignments onBack={handleBack} userRole={userRole} />,
        [ViewState.GRADES]: <Grades onBack={handleBack} userRole={userRole} />,
        [ViewState.REPORT_CARDS]: <Grades onBack={handleBack} userRole={userRole} />,
        [ViewState.LETTERS]: <Letters onBack={handleBack} userRole={userRole} />,
        [ViewState.POINTS]: <PointsView onBack={handleBack} />,
        [ViewState.PUSAKA]: <GenericView title="Pusaka Kemenag" onBack={handleBack} description="Integrasi resmi dengan Pusaka Super Apps RI." />,
        [ViewState.SETTINGS]: <Settings {...commonProps} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} />,
    };

    // Protected view logic
    const protectedViews: Partial<Record<ViewState, { roles: UserRole[], component: React.ReactNode }>> = {
        [ViewState.CLASSES]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <ClassList {...commonProps} /> },
        [ViewState.PRESENSI]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <Presensi {...commonProps} /> },
        [ViewState.SCANNER]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <QRScanner onBack={handleBack} /> },
        [ViewState.REPORTS]: { roles: ROLE_GROUPS.AUTHENTICATED, component: <Reports {...commonProps} /> },
        [ViewState.JOURNAL]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <TeachingJournal onBack={handleBack} /> },
        [ViewState.STUDENTS]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <StudentData onBack={handleBack} userRole={userRole} /> },
        [ViewState.ALUMNI]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <AlumniData onBack={handleBack} userRole={userRole} /> },
        [ViewState.MUTATION]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <MutationData onBack={handleBack} userRole={userRole} /> },
        [ViewState.TEACHERS]: { roles: ROLE_GROUPS.STAFF_ABOVE, component: <TeacherData onBack={handleBack} userRole={userRole} /> },
        [ViewState.ACADEMIC_YEAR]: { roles: ROLE_GROUPS.ADMIN_DEV, component: <AcademicYear onBack={handleBack} /> },
        [ViewState.PROMOTION]: { roles: ROLE_GROUPS.ADMIN_DEV, component: <ClassPromotion onBack={handleBack} /> },
        [ViewState.CREATE_ACCOUNT]: { roles: ROLE_GROUPS.ADMIN_DEV, component: <CreateAccount onBack={handleBack} userRole={userRole} /> },
        [ViewState.DEVELOPER]: { roles: ROLE_GROUPS.ADMIN_DEV, component: <DeveloperConsole onBack={handleBack} /> },
    };

    if (viewMap[currentView]) return viewMap[currentView];
    
    const protectedConfig = protectedViews[currentView];
    if (protectedConfig) {
        return (
            <ProtectedRoute allowedRoles={protectedConfig.roles} userRole={userRole} onBack={handleBack}>
                {protectedConfig.component}
            </ProtectedRoute>
        );
    }

    return <GenericView title="Fitur" onBack={handleBack} />;
  };

  if (authLoading) {
      return (
          <div className="fixed inset-0 h-screen w-full flex flex-col items-center justify-center bg-[#020617] z-[1000]">
              <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-500">
                  <div className="w-24 h-24 mb-6"><AppLogo className="w-full h-full" /></div>
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin opacity-30" />
              </div>
          </div>
      );
  }

  const isLoginPage = currentView === ViewState.LOGIN;
  const showBottomNav = !isLoginPage && currentView !== ViewState.SCANNER;

  return (
    <div className={`min-h-screen w-full flex flex-col relative transition-colors duration-500 ${isDarkTheme ? 'bg-[#020617]' : 'bg-[#f8fafc]'}`}>
        {/* MOCK MODE UI WARNING */}
        {isMockMode && (
            <div className="fixed top-0 left-0 right-0 z-[1100] bg-orange-500 text-white text-[8px] font-black uppercase text-center py-1 tracking-[0.3em] flex items-center justify-center gap-2">
                <ShieldCheckIcon className="w-3 h-3" /> Simulasi Aktif - Data Tidak Disimpan ke Cloud
            </div>
        )}

        {isLoginPage ? (
            <Suspense fallback={<PageLoader />}>
                <div className="flex-1 flex flex-col">{renderViewContent()}</div>
            </Suspense>
        ) : (
            <div className="flex-1 flex overflow-hidden">
                <div className="hidden lg:block w-72 shrink-0 h-full border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1121] z-40">
                    <Sidebar currentView={currentView} onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />
                </div>
                
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="flex-1 overflow-hidden relative z-10">
                        <Suspense fallback={<PageLoader />}>
                            <div key={viewKey} className="h-full w-full relative">
                                {renderViewContent()}
                            </div>
                        </Suspense>
                    </div>
                    
                    {showBottomNav && (
                        <div className="shrink-0 z-40 lg:hidden">
                            <BottomNav currentView={currentView} onNavigate={handleNavigate} userRole={userRole} />
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {!isOnline && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[1000] bg-orange-600/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-lg">
                Offline
            </div>
        )}
    </div>
  );
};

export default App;