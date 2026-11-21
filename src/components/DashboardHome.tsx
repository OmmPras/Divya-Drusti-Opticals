import { CalendarCheck2, ChevronLeft, ChevronRight, Eye, Search, Stethoscope, UserCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import type { DashboardStats, Patient, User } from '../types';

interface Props {
  currentUser: User;
  refreshSignal: number;
  onSelectPatient: (patientId: number) => void;
  onNavigateRegister: () => void;
}

export function DashboardHome({ currentUser, refreshSignal, onSelectPatient, onNavigateRegister }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);

  const loadDashboard = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        dateFilter,
      });
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (dateFilter === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const [statsRes, patientsRes] = await Promise.all([
        apiRequest<{ stats: DashboardStats }>('/api/admin/dashboard-stats'),
        apiRequest<{
          patients: Patient[];
          pagination: { page: number; totalPages: number; total: number };
        }>(`/api/patients?${params.toString()}`),
      ]);

      setStats(statsRes.stats);
      setPatients(patientsRes.patients);
      setTotalPages(patientsRes.pagination.totalPages);
      setTotalPatientsCount(patientsRes.pagination.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [page, dateFilter, startDate, endDate, searchQuery, refreshSignal]);

  const statusBadgeClass = (status: Patient['status']) => {
    switch (status) {
      case 'Exam Completed':
      case 'Dispatched':
        return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
      case 'Pending Exam':
      case 'In Lab':
        return 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {currentUser.role === 'ADMIN'
              ? 'Clinic Executive Dashboard'
              : currentUser.role === 'DOCTOR'
                ? 'Doctor Clinical Dashboard'
                : 'Reception Desk Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live optical clinic operations · Patient registration fee is permanently ₹0.00
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateRegister}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          New Free Patient Registration (₹0)
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Registered Patients</span>
            <Users className="h-4 w-4 text-[#1E40AF]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats ? stats.totalPatients : '—'}
          </p>
          <p className="mt-1 text-xs text-[#059669] font-medium">
            +{stats ? stats.todaysNewPatients : 0} registered today (₹0)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Doctors</span>
            <Stethoscope className="h-4 w-4 text-[#0284C7]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats ? stats.totalDoctors : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Approved optometrists</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Appointments</span>
            <CalendarCheck2 className="h-4 w-4 text-[#1E40AF]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats ? stats.totalAppointments : '—'}
          </p>
          <p className="mt-1 text-xs text-[#0284C7] font-medium">
            {stats ? stats.todaysAppointments : 0} scheduled today
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Eye Checkups</span>
            <UserCheck className="h-4 w-4 text-[#059669]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats ? stats.completedCheckups : '—'}
          </p>
          <p className="mt-1 text-xs text-amber-700 font-medium">
            {stats ? stats.pendingCheckups : 0} pending eye checkup
          </p>
        </div>
      </div>

      {/* Admin Financial & Inventory Strip */}
      {currentUser.role === 'ADMIN' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Optical & Rx Revenue (Paid)</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{stats.pendingBills} unpaid bills</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Patient Registration Fee</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#059669] tabular-nums">₹0.00</p>
            </div>
            <span className="rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">
              Always Free
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Low Stock Alerts</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {stats.lowStockCount} items
              </p>
            </div>
            <span className="text-xs text-slate-500">Frames, lenses & medicines</span>
          </div>
        </div>
      )}

      {/* Recent Patient Registrations Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Registered Patients ({totalPatientsCount})
              </h2>
              <p className="text-xs text-slate-500">
                Automatically synced whenever a Doctor, Receptionist, or Admin registers a patient.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, name, mobile, village..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {(['all', 'today', 'week', 'month', 'custom'] as const).map((df) => (
                <button
                  key={df}
                  type="button"
                  onClick={() => {
                    setDateFilter(df);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    dateFilter === df
                      ? 'bg-white text-[#1E40AF] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {df === 'all' ? 'All Dates' : df === 'week' ? '7 Days' : df === 'month' ? 'This Month' : df}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 rounded border border-slate-300 px-2"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 rounded border border-slate-300 px-2"
                />
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Age / Gender</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Reg Date</th>
                <th className="px-4 py-3">Registered By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Loading patient registry...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No registered patients match this search or date filter yet.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1E40AF] tabular-nums whitespace-nowrap">
                      {p.patient_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{p.full_name}</div>
                      {p.village && <div className="text-xs text-slate-500">{p.village}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums whitespace-nowrap">
                      {p.age} yrs · {p.gender}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {p.mobile}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {p.registration_date}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{p.registered_by_name}</span>
                      <span className="block text-[11px] text-slate-500">{p.registered_by_role}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectPatient(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#1E40AF]" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
