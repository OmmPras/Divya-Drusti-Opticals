import { Activity, BarChart3, CheckCircle2, KeyRound, Settings, ShieldAlert, UserPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import type { AuditLog, ClinicSettings, StaffMember } from '../types';

interface Props {
  clinicSettings: ClinicSettings | null;
  onSettingsUpdated: () => void;
}

export function AdminManagementModule({ clinicSettings, onSettingsUpdated }: Props) {
  const [tab, setTab] = useState<'staff' | 'reports' | 'audit' | 'settings'>('staff');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<{
    dailyRegistrations: Array<{ date: string; count: number }>;
    doctorPerformance: Array<{ doctor_name: string; specialization: string; total_checkups: number; total_appointments: number }>;
    billingSummary: Array<{ payment_method: string; payment_status: string; invoice_count: number; total_amount: number }>;
    categoryBreakdown: Array<{ category: string; product_count: number; total_stock: number }>;
  } | null>(null);

  // Create Staff Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DOCTOR' | 'RECEPTIONIST'>('DOCTOR');
  const [qualification, setQualification] = useState('B.Optom');
  const [specialization, setSpecialization] = useState('Optometry & Clinical Refraction');
  const [registrationNo, setRegistrationNo] = useState('');

  // Settings form
  const [clinicName, setClinicName] = useState(clinicSettings?.clinic_name || 'Divya Drusti Opticals');
  const [clinicTagline, setClinicTagline] = useState(clinicSettings?.clinic_tagline || '');
  const [clinicAddress, setClinicAddress] = useState(clinicSettings?.clinic_address || '');
  const [clinicPhone, setClinicPhone] = useState(clinicSettings?.clinic_phone || '');
  const [clinicGstin, setClinicGstin] = useState(clinicSettings?.clinic_gstin || '');
  const [defaultGst, setDefaultGst] = useState(clinicSettings?.default_gst_percent || '12');

  const [issuedCodeInfo, setIssuedCodeInfo] = useState<{ email: string; code: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const [staffRes, logRes, repRes] = await Promise.all([
        apiRequest<{ staff: StaffMember[] }>('/api/admin/staff'),
        apiRequest<{ logs: AuditLog[] }>('/api/admin/audit-logs?limit=100'),
        apiRequest<NonNullable<typeof reports>>('/api/admin/reports'),
      ]);
      setStaff(staffRes.staff);
      setLogs(logRes.logs);
      setReports(repRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console data.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
          role,
          qualification,
          specialization,
          registration_no: registrationNo,
        }),
      });
      setSuccess(`Created ${role} account for ${fullName}.`);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRegistrationNo('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create staff account.');
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await apiRequest(`/api/admin/staff/${member.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: member.is_active !== 1 }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update staff status.');
    }
  };

  const handleIssueResetCode = async (member: StaffMember) => {
    try {
      const res = await apiRequest<{ email: string; resetCode: string }>(`/api/admin/staff/${member.id}/issue-reset-code`, {
        method: 'POST',
      });
      setIssuedCodeInfo({ email: res.email, code: res.resetCode });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue reset code.');
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          clinic_name: clinicName,
          clinic_tagline: clinicTagline,
          clinic_address: clinicAddress,
          clinic_phone: clinicPhone,
          clinic_gstin: clinicGstin,
          default_gst_percent: defaultGst,
        }),
      });
      setSuccess('Clinic settings updated (Patient Registration Fee remains locked at ₹0).');
      onSettingsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update clinic settings.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Clinic Administration, Staff & Reports
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create & approve Doctor/Receptionist accounts, review clinic analytics, audit logs, and GST settings.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('staff')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
            tab === 'staff' ? 'bg-[#1E40AF] text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Doctors & Receptionists
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
            tab === 'reports' ? 'bg-[#1E40AF] text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Clinic Reports
        </button>
        <button
          type="button"
          onClick={() => setTab('audit')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
            tab === 'audit' ? 'bg-[#1E40AF] text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Audit Logs
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
            tab === 'settings' ? 'bg-[#1E40AF] text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Clinic Settings
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm text-[#047857]">
          <CheckCircle2 className="h-4 w-4 text-[#059669]" />
          {success}
        </div>
      )}

      {issuedCodeInfo && (
        <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-800">
            <strong>One-Time Password Reset Code for {issuedCodeInfo.email}:</strong>{' '}
            <span className="ml-2 rounded bg-white px-2.5 py-1 font-mono text-sm font-bold text-[#1E40AF] border border-[#BFDBFE]">
              {issuedCodeInfo.code}
            </span>
            <span className="ml-2 text-slate-600">(Valid for 2 hours. Share securely with staff member.)</span>
          </div>
          <button
            type="button"
            onClick={() => setIssuedCodeInfo(null)}
            className="text-xs font-semibold text-[#1E40AF] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateStaff} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Create Authorized Doctor or Receptionist Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'DOCTOR' | 'RECEPTIONIST')}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="DOCTOR">Doctor / Optometrist</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'DOCTOR' ? 'Dr. Ananya Dash' : 'Smita Sahoo'}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@divyadrusti.in"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              {role === 'DOCTOR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
              )}
            </div>
            {role === 'DOCTOR' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medical / Optometry Reg No.</label>
                  <input
                    type="text"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    placeholder="OPT-2026-104"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-[#1E40AF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173bab]"
              >
                Create & Approve Staff Account
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h3 className="font-display text-base font-bold text-slate-900">
                Clinic Staff Directory & Activity ({staff.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Name & Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-center">Patients Reg.</th>
                    <th className="px-4 py-3 text-center">Exams Done</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {staff.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{m.full_name}</div>
                        <div className="text-xs text-slate-500">{m.email} {m.phone ? `· ${m.phone}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#1E40AF]">{m.role}</td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums">{m.patients_registered}</td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums">{m.checkups_performed}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            m.is_active === 1 ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {m.is_active === 1 ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleIssueResetCode(m)}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset Code
                        </button>
                        {m.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(m)}
                            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium ${
                              m.is_active === 1
                                ? 'border border-red-200 text-red-700 hover:bg-red-50'
                                : 'bg-[#059669] text-white'
                            }`}
                          >
                            <ShieldAlert className="h-3 w-3" />
                            {m.is_active === 1 ? 'Deactivate' : 'Approve'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && reports && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-slate-900 mb-3">Doctor Activity Summary</h3>
            {reports.doctorPerformance.length === 0 ? (
              <p className="text-xs text-slate-500">No doctors registered yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-left">Doctor</th>
                    <th className="py-2 text-right">Appointments</th>
                    <th className="py-2 text-right">Eye Checkups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.doctorPerformance.map((d, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium text-slate-900">{d.doctor_name}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{d.total_appointments}</td>
                      <td className="py-2 text-right font-mono font-bold text-[#1E40AF] tabular-nums">{d.total_checkups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-slate-900 mb-3">Billing Collection Breakdown</h3>
            {reports.billingSummary.length === 0 ? (
              <p className="text-xs text-slate-500">No invoices generated yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-left">Method</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-right">Invoices</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.billingSummary.map((b, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{b.payment_method}</td>
                      <td className="py-2">{b.payment_status}</td>
                      <td className="py-2 text-right font-mono">{b.invoice_count}</td>
                      <td className="py-2 text-right font-mono font-bold">{formatCurrency(b.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-slate-900 mb-3">Daily Free Registrations</h3>
            {reports.dailyRegistrations.length === 0 ? (
              <p className="text-xs text-slate-500">No patient registrations yet.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {reports.dailyRegistrations.map((r) => (
                  <div key={r.date} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-mono text-slate-700">{r.date}</span>
                    <span className="font-mono font-bold text-[#059669] tabular-nums">{r.count} patients (₹0)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-slate-900 mb-3">Optical & Pharmacy Stock Summary</h3>
            <div className="space-y-2 text-xs">
              {reports.categoryBreakdown.map((c) => (
                <div key={c.category} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-medium text-slate-800">{c.category}</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    {c.product_count} SKUs · {c.total_stock} units
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="font-display text-base font-bold text-slate-900">Security & Clinical Audit Trail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">{l.created_at}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {l.user_name} <span className="text-slate-500">({l.user_role})</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-[#1E40AF]">{l.action}</td>
                    <td className="px-4 py-2.5 font-mono">{l.entity_type} #{l.entity_id}</td>
                    <td className="px-4 py-2.5 text-slate-700">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 max-w-2xl">
          <h3 className="font-display text-base font-bold text-slate-900">Clinic Profile & Tax Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Name</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={clinicTagline}
                onChange={(e) => setClinicTagline(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Address</label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Phone</label>
              <input
                type="text"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={clinicGstin}
                onChange={(e) => setClinicGstin(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default GST %</label>
              <input
                type="number"
                min="0"
                max="28"
                value={defaultGst}
                onChange={(e) => setDefaultGst(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Registration Fee</label>
              <input
                type="text"
                disabled
                value="₹0.00 (Locked Free)"
                className="h-10 w-full rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 font-mono text-sm font-bold text-[#047857]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-lg bg-[#1E40AF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173bab]"
            >
              Save Clinic Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
