import {
  Calendar,
  Cookie,
  Eye,
  Glasses,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AccountSecurityModal } from './components/AccountSecurityModal';
import { AdminManagementModule } from './components/AdminManagementModule';
import { AppointmentsModule } from './components/AppointmentsModule';
import { AuthScreen } from './components/AuthScreen';
import { BillingModule } from './components/BillingModule';
import {
  CookieBanner,
  CookiePolicyModal,
  getSavedCookiePreferences,
  type CookiePreferences,
} from './components/CookieConsentModal';
import { DashboardHome } from './components/DashboardHome';
import { EyeExaminationModule } from './components/EyeExaminationModule';
import { FreeRegistrationModule } from './components/FreeRegistrationModal';
import { PatientDetailModal } from './components/PatientDetailModal';
import { ProductsModule } from './components/ProductsModule';
import { apiRequest, setNativeToken } from './lib/api';
import type { ClinicSettings, Patient, User } from './types';

type NavSection =
  | 'dashboard'
  | 'register'
  | 'appointments'
  | 'exams'
  | 'products'
  | 'billing'
  | 'admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [preselectedPatient, setPreselectedPatient] = useState<Patient | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [cookieConsent, setCookieConsent] = useState<CookiePreferences | null>(() =>
    getSavedCookiePreferences()
  );
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<'preferences' | 'privacy' | 'cookie-policy'>('preferences');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshSignal((s) => s + 1);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await apiRequest<{ user: User; clinicSettings: ClinicSettings }>('/api/auth/me');
      setUser(res.user);
      setClinicSettings(res.clinicSettings);
    } catch {
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Real-time automatic updates via Server-Sent Events + 15s polling fallback
  useEffect(() => {
    if (!user) return;

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events/stream', { withCredentials: true });
      const handleEvent = () => triggerRefresh();
      es.addEventListener('patient_registered', handleEvent);
      es.addEventListener('appointment_updated', handleEvent);
      es.addEventListener('exam_completed', handleEvent);
      es.addEventListener('inventory_updated', handleEvent);
      es.addEventListener('bill_created', handleEvent);
      es.addEventListener('staff_updated', handleEvent);
    } catch {
      // Fallback to polling if EventSource is unavailable
    }

    const pollInterval = setInterval(() => {
      triggerRefresh();
    }, 15000);

    return () => {
      es?.close();
      clearInterval(pollInterval);
    };
  }, [user, triggerRefresh]);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // proceed with local state reset
    } finally {
      setNativeToken(null);
      setUser(null);
      setActiveSection('dashboard');
    }
  };

  const openPolicy = (tab: 'preferences' | 'privacy' | 'cookie-policy') => {
    setPolicyTab(tab);
    setPolicyModalOpen(true);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-slate-600">
        Loading Divya Drusti Opticals...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            setActiveSection('dashboard');
            loadSession();
          }}
          onOpenPolicy={openPolicy}
        />
        {!cookieConsent && (
          <CookieBanner
            onOpenSettings={() => openPolicy('preferences')}
            onConsentSaved={setCookieConsent}
          />
        )}
        <CookiePolicyModal
          isOpen={policyModalOpen}
          initialTab={policyTab}
          onClose={() => setPolicyModalOpen(false)}
          onSave={setCookieConsent}
        />
      </>
    );
  }

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
    roles: User['role'][];
  }> = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'register', label: 'Free Registration (₹0)', icon: UserPlus, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'appointments', label: 'Appointments', icon: Calendar, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'exams', label: 'Eye Examinations', icon: Stethoscope, roles: ['ADMIN', 'DOCTOR'] },
    { id: 'products', label: 'Optical & Medicines', icon: Glasses, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'billing', label: 'Billing & Invoices', icon: Receipt, roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'admin', label: 'Staff, Reports & Admin', icon: Users, roles: ['ADMIN'] },
  ];

  const visibleNav = navItems.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Desktop 280px Clinical Navigation Rail */}
      <aside className="no-print hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E40AF] text-white shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-slate-900 truncate">
                {clinicSettings?.clinic_name || 'Divya Drusti Opticals'}
              </p>
              <p className="text-[11px] font-medium text-[#059669]">
                Free Patient Reg · ₹0.00
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#EFF6FF] text-[#1E40AF] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#1E40AF]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="rounded-lg bg-[#F8FAFC] border border-slate-200 p-3">
            <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
            <p className="text-[11px] font-semibold text-[#1E40AF]">{user.role}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <button type="button" onClick={() => openPolicy('preferences')} className="hover:text-slate-900 inline-flex items-center gap-1">
              <Cookie className="h-3 w-3" /> Cookies
            </button>
            <button type="button" onClick={() => openPolicy('privacy')} className="hover:text-slate-900 inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Privacy Policy
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header & Drawer */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-display text-sm sm:text-base font-bold text-slate-900 truncate">
              {visibleNav.find((n) => n.id === activeSection)?.label || 'Divya Drusti Opticals'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('register')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#047857] whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Free Reg (₹0)
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="no-print lg:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? 'bg-[#EFF6FF] text-[#1E40AF] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>{user.full_name} ({user.role})</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setPasswordModalOpen(true); setMobileMenuOpen(false); }} className="text-[#1E40AF] font-medium">
                  Password
                </button>
                <button type="button" onClick={() => { openPolicy('preferences'); setMobileMenuOpen(false); }} className="text-[#1E40AF] font-medium">
                  Cookies
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardHome
              currentUser={user}
              refreshSignal={refreshSignal}
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onNavigateRegister={() => setActiveSection('register')}
            />
          )}

          {activeSection === 'register' && (
            <FreeRegistrationModule
              currentUser={user}
              clinicSettings={clinicSettings}
              onRegistered={() => triggerRefresh()}
            />
          )}

          {activeSection === 'appointments' && (
            <AppointmentsModule
              preselectedPatient={preselectedPatient}
              refreshSignal={refreshSignal}
              onUpdated={() => triggerRefresh()}
            />
          )}

          {activeSection === 'exams' && (user.role === 'ADMIN' || user.role === 'DOCTOR') && (
            <EyeExaminationModule
              currentUser={user}
              clinicSettings={clinicSettings}
              preselectedPatient={preselectedPatient}
              refreshSignal={refreshSignal}
              onExamSaved={() => triggerRefresh()}
            />
          )}

          {activeSection === 'products' && (
            <ProductsModule userRole={user.role} refreshSignal={refreshSignal} />
          )}

          {activeSection === 'billing' && (
            <BillingModule
              preselectedPatient={preselectedPatient}
              clinicSettings={clinicSettings}
              refreshSignal={refreshSignal}
              onBilled={() => triggerRefresh()}
            />
          )}

          {activeSection === 'admin' && user.role === 'ADMIN' && (
            <AdminManagementModule
              clinicSettings={clinicSettings}
              onSettingsUpdated={() => loadSession()}
            />
          )}
        </main>
      </div>

      {/* Patient Detail Modal */}
      <PatientDetailModal
        patientId={selectedPatientId}
        userRole={user.role}
        clinicSettings={clinicSettings}
        onClose={() => setSelectedPatientId(null)}
        onBookAppointment={(pat) => {
          setPreselectedPatient(pat);
          setSelectedPatientId(null);
          setActiveSection('appointments');
        }}
        onStartExam={(pat) => {
          setPreselectedPatient(pat);
          setSelectedPatientId(null);
          setActiveSection('exams');
        }}
        onCreateBill={(pat) => {
          setPreselectedPatient(pat);
          setSelectedPatientId(null);
          setActiveSection('billing');
        }}
      />

      {/* Account Security / Password Modal */}
      <AccountSecurityModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* Cookie Consent & Policy */}
      {!cookieConsent && (
        <CookieBanner
          onOpenSettings={() => openPolicy('preferences')}
          onConsentSaved={setCookieConsent}
        />
      )}
      <CookiePolicyModal
        isOpen={policyModalOpen}
        initialTab={policyTab}
        onClose={() => setPolicyModalOpen(false)}
        onSave={setCookieConsent}
      />
    </div>
  );
}
