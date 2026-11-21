import { CheckCircle2, Edit3, Eye, Printer, Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatAxis, formatDiopter } from '../lib/api';
import type { ClinicSettings, Doctor, EyeCheckup, Patient, Product, User } from '../types';

interface Props {
  currentUser: User;
  clinicSettings: ClinicSettings | null;
  preselectedPatient: Patient | null;
  refreshSignal: number;
  onExamSaved: () => void;
}

export function EyeExaminationModule({
  currentUser,
  clinicSettings,
  preselectedPatient,
  refreshSignal,
  onExamSaved,
}: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Product[]>([]);
  const [checkups, setCheckups] = useState<EyeCheckup[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [patientId, setPatientId] = useState<string>(preselectedPatient ? String(preselectedPatient.id) : '');
  const [doctorId, setDoctorId] = useState<string>(currentUser.doctor_id ? String(currentUser.doctor_id) : '');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));

  // OD (Right Eye)
  const [odSph, setOdSph] = useState('0.00');
  const [odCyl, setOdCyl] = useState('0.00');
  const [odAxis, setOdAxis] = useState('000');
  const [odAdd, setOdAdd] = useState('0.00');
  const [odPrism, setOdPrism] = useState('');

  // OS (Left Eye)
  const [osSph, setOsSph] = useState('0.00');
  const [osCyl, setOsCyl] = useState('0.00');
  const [osAxis, setOsAxis] = useState('000');
  const [osAdd, setOsAdd] = useState('0.00');
  const [osPrism, setOsPrism] = useState('');

  // Clinical measurements
  const [vaOd, setVaOd] = useState('6/6');
  const [vaOs, setVaOs] = useState('6/6');
  const [distanceVision, setDistanceVision] = useState('6/6');
  const [nearVision, setNearVision] = useState('N6');
  const [pdMm, setPdMm] = useState('63');
  const [iopOd, setIopOd] = useState('');
  const [iopOs, setIopOs] = useState('');
  const [observations, setObservations] = useState('');
  const [remarks, setRemarks] = useState('');

  // Prescription
  const [lensType, setLensType] = useState('Single Vision');
  const [coating, setCoating] = useState('Blue-Cut Anti-Reflective');
  const [frameRecommendation, setFrameRecommendation] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [selectedMedicines, setSelectedMedicines] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [printableExam, setPrintableExam] = useState<EyeCheckup | null>(null);

  const loadData = async () => {
    try {
      const [patRes, docRes, medRes, chkRes] = await Promise.all([
        apiRequest<{ patients: Patient[] }>('/api/patients?limit=50'),
        apiRequest<{ doctors: Doctor[] }>('/api/admin/doctors'),
        apiRequest<{ products: Product[] }>('/api/products?category=Eye%20Medicines'),
        apiRequest<{ checkups: EyeCheckup[] }>('/api/exams'),
      ]);
      setPatients(patRes.patients);
      setDoctors(docRes.doctors);
      setMedicines(medRes.products);
      setCheckups(chkRes.checkups);

      if (!doctorId && docRes.doctors.length > 0) {
        setDoctorId(String(currentUser.doctor_id || docRes.doctors[0].doctor_id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load eye examination workbench.');
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshSignal]);

  useEffect(() => {
    if (preselectedPatient) {
      setPatientId(String(preselectedPatient.id));
    }
  }, [preselectedPatient]);

  const selectedPatientObj = patients.find((p) => String(p.id) === patientId) || null;

  const toggleMedicine = (medName: string) => {
    setSelectedMedicines((prev) =>
      prev.includes(medName) ? prev.filter((m) => m !== medName) : [...prev, medName]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setOdSph('0.00');
    setOdCyl('0.00');
    setOdAxis('000');
    setOdAdd('0.00');
    setOdPrism('');
    setOsSph('0.00');
    setOsCyl('0.00');
    setOsAxis('000');
    setOsAdd('0.00');
    setOsPrism('');
    setVaOd('6/6');
    setVaOs('6/6');
    setDistanceVision('6/6');
    setNearVision('N6');
    setPdMm('63');
    setIopOd('');
    setIopOs('');
    setObservations('');
    setRemarks('');
    setFrameRecommendation('');
    setFollowUpDate('');
    setSelectedMedicines([]);
  };

  const handleLoadEdit = (chk: EyeCheckup) => {
    setEditingId(chk.id);
    setPatientId(String(chk.patient_id));
    setDoctorId(String(chk.doctor_id));
    setExamDate(chk.exam_date);
    setOdSph(chk.od_sph);
    setOdCyl(chk.od_cyl);
    setOdAxis(chk.od_axis);
    setOdAdd(chk.od_add);
    setOdPrism(chk.od_prism || '');
    setOsSph(chk.os_sph);
    setOsCyl(chk.os_cyl);
    setOsAxis(chk.os_axis);
    setOsAdd(chk.os_add);
    setOsPrism(chk.os_prism || '');
    setVaOd(chk.visual_acuity_od);
    setVaOs(chk.visual_acuity_os);
    setDistanceVision(chk.distance_vision);
    setNearVision(chk.near_vision);
    setPdMm(chk.pd_mm);
    setIopOd(chk.iop_od || '');
    setIopOs(chk.iop_os || '');
    setObservations(chk.observations || '');
    setRemarks(chk.remarks || '');
    setLensType(chk.lens_type || 'Single Vision');
    setCoating(chk.coating || 'Blue-Cut Anti-Reflective');
    setFrameRecommendation(chk.frame_recommendation || '');
    setFollowUpDate(chk.follow_up_date || '');
    try {
      setSelectedMedicines(chk.medicines_json ? JSON.parse(chk.medicines_json) : []);
    } catch {
      setSelectedMedicines([]);
    }
    setSuccessMsg('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSaving(true);

    const payload = {
      patient_id: Number(patientId),
      doctor_id: Number(doctorId),
      exam_date: examDate,
      od_sph: formatDiopter(odSph),
      od_cyl: formatDiopter(odCyl),
      od_axis: formatAxis(odAxis),
      od_add: formatDiopter(odAdd),
      od_prism: odPrism,
      os_sph: formatDiopter(osSph),
      os_cyl: formatDiopter(osCyl),
      os_axis: formatAxis(osAxis),
      os_add: formatDiopter(osAdd),
      os_prism: osPrism,
      visual_acuity_od: vaOd,
      visual_acuity_os: vaOs,
      distance_vision: distanceVision,
      near_vision: nearVision,
      pd_mm: pdMm,
      iop_od: iopOd,
      iop_os: iopOs,
      observations,
      remarks,
      lens_type: lensType,
      coating,
      frame_recommendation: frameRecommendation,
      follow_up_date: followUpDate,
      medicines: selectedMedicines,
    };

    try {
      if (editingId) {
        await apiRequest(`/api/exams/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMsg('Eye examination and prescription updated cleanly.');
      } else {
        const res = await apiRequest<{ checkup_code: string; prescription_code: string }>('/api/exams', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Saved Checkup ${res.checkup_code} & Prescription ${res.prescription_code}.`);
      }
      await loadData();
      onExamSaved();
      if (!editingId) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save eye examination.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Eye Examination & Prescription
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Confidential OD/OS refraction grid · Auto-formats diopter signs and axis degrees
          </p>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Switch to New Exam
          </button>
        )}
      </div>

      {/* Printable Exam Report Preview Modal/Panel */}
      {printableExam && (
        <div className="rounded-xl border border-[#BFDBFE] bg-white p-6 space-y-4 print-sheet">
          <div className="no-print flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-semibold text-[#1E40AF]">Printable Eye Examination Report</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Report
              </button>
              <button
                type="button"
                onClick={() => setPrintableExam(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>

          <div className="flex justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#1E40AF]">
                {clinicSettings?.clinic_name || 'Divya Drusti Opticals'}
              </h2>
              <p className="text-xs text-slate-600">{clinicSettings?.clinic_address}</p>
              <p className="text-xs text-slate-600">Optometric Refraction & Prescription Report</p>
            </div>
            <div className="text-right font-mono text-xs">
              <p className="font-bold text-slate-900">{printableExam.checkup_code}</p>
              <p className="text-slate-600">Rx: {printableExam.prescription_code}</p>
              <p className="text-slate-600">Date: {printableExam.exam_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Patient:</span>{' '}
              <strong className="text-slate-900">{printableExam.patient_name}</strong>
            </div>
            <div>
              <span className="text-slate-500">Patient ID:</span>{' '}
              <strong className="font-mono text-slate-900">{printableExam.patient_code}</strong>
            </div>
            <div>
              <span className="text-slate-500">Age / Gender:</span>{' '}
              <strong className="text-slate-900">{printableExam.patient_age} yrs / {printableExam.patient_gender}</strong>
            </div>
            <div>
              <span className="text-slate-500">Optometrist:</span>{' '}
              <strong className="text-slate-900">{printableExam.doctor_name}</strong>
            </div>
          </div>

          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2 text-left">Eye</th>
                <th className="border border-slate-300 p-2 text-center">SPH</th>
                <th className="border border-slate-300 p-2 text-center">CYL</th>
                <th className="border border-slate-300 p-2 text-center">AXIS</th>
                <th className="border border-slate-300 p-2 text-center">ADD</th>
                <th className="border border-slate-300 p-2 text-center">PRISM</th>
                <th className="border border-slate-300 p-2 text-center">VA</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <tr>
                <td className="border border-slate-300 p-2 font-sans font-bold text-[#1E40AF]">OD (Right Eye)</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.od_sph}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.od_cyl}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.od_axis}°</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.od_add}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.od_prism || '—'}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.visual_acuity_od}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-sans font-bold text-[#059669]">OS (Left Eye)</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.os_sph}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.os_cyl}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.os_axis}°</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.os_add}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.os_prism || '—'}</td>
                <td className="border border-slate-300 p-2 text-center">{printableExam.visual_acuity_os}</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
            <div><span className="text-slate-500">PD:</span> <strong className="font-mono">{printableExam.pd_mm} mm</strong></div>
            <div><span className="text-slate-500">Distance:</span> <strong className="font-mono">{printableExam.distance_vision}</strong></div>
            <div><span className="text-slate-500">Near:</span> <strong className="font-mono">{printableExam.near_vision}</strong></div>
            <div><span className="text-slate-500">IOP (OD/OS):</span> <strong className="font-mono">{printableExam.iop_od || '—'} / {printableExam.iop_os || '—'} mmHg</strong></div>
          </div>

          <div className="text-xs space-y-1">
            <p><strong>Recommended Lens:</strong> {printableExam.lens_type} · {printableExam.coating}</p>
            {printableExam.frame_recommendation && <p><strong>Frame Advice:</strong> {printableExam.frame_recommendation}</p>}
            {printableExam.observations && <p><strong>Clinical Observations:</strong> {printableExam.observations}</p>}
            {printableExam.remarks && <p><strong>Remarks:</strong> {printableExam.remarks}</p>}
          </div>
        </div>
      )}

      {/* Main Clinical Entry Form */}
      <form onSubmit={handleSubmit} className="no-print rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm font-medium text-[#047857]">
            <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            {successMsg}
          </div>
        )}

        {/* Patient & Doctor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient <span className="text-red-600">*</span>
            </label>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
            >
              <option value="">Choose registered patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_code} — {p.full_name} ({p.age}y, {p.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Examining Optometrist / Doctor <span className="text-red-600">*</span>
            </label>
            <select
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
            >
              <option value="">Select doctor...</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.full_name} ({d.qualification})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Date</label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
            />
          </div>

          {selectedPatientObj && (
            <div className="md:col-span-12 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3 text-xs text-slate-600">
              <span>Patient ID: <strong className="font-mono text-[#1E40AF]">{selectedPatientObj.patient_code}</strong></span>
              <span>Name: <strong className="text-slate-900">{selectedPatientObj.full_name}</strong></span>
              <span>Age/Gender: <strong className="tabular-nums">{selectedPatientObj.age} yrs · {selectedPatientObj.gender}</strong></span>
            </div>
          )}
        </div>

        {/* Stitch OD / OS Refraction Data Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Refraction Matrix (OD / OS)
            </h3>
            <span className="text-xs text-slate-500">Values auto-format in 0.25D steps & 000°–180° axis</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 text-left">Quadrant</th>
                  <th className="px-3 py-2.5 text-center">SPH</th>
                  <th className="px-3 py-2.5 text-center">CYL</th>
                  <th className="px-3 py-2.5 text-center">AXIS</th>
                  <th className="px-3 py-2.5 text-center">ADD</th>
                  <th className="px-3 py-2.5 text-center">PRISM</th>
                  <th className="px-3 py-2.5 text-center">Visual Acuity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* OD Row */}
                <tr>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#1E40AF]">
                      OD · Right Eye
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={odSph}
                      onChange={(e) => setOdSph(e.target.value)}
                      onBlur={() => setOdSph(formatDiopter(odSph))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={odCyl}
                      onChange={(e) => setOdCyl(e.target.value)}
                      onBlur={() => setOdCyl(formatDiopter(odCyl))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={odAxis}
                      onChange={(e) => setOdAxis(e.target.value)}
                      onBlur={() => setOdAxis(formatAxis(odAxis))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={odAdd}
                      onChange={(e) => setOdAdd(e.target.value)}
                      onBlur={() => setOdAdd(formatDiopter(odAdd))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={odPrism}
                      onChange={(e) => setOdPrism(e.target.value)}
                      placeholder="—"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-sm font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={vaOd}
                      onChange={(e) => setVaOd(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-sm font-semibold text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                </tr>

                {/* OS Row */}
                <tr>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-bold text-[#059669]">
                      OS · Left Eye
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={osSph}
                      onChange={(e) => setOsSph(e.target.value)}
                      onBlur={() => setOsSph(formatDiopter(osSph))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={osCyl}
                      onChange={(e) => setOsCyl(e.target.value)}
                      onBlur={() => setOsCyl(formatDiopter(osCyl))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={osAxis}
                      onChange={(e) => setOsAxis(e.target.value)}
                      onBlur={() => setOsAxis(formatAxis(osAxis))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={osAdd}
                      onChange={(e) => setOsAdd(e.target.value)}
                      onBlur={() => setOsAdd(formatDiopter(osAdd))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={osPrism}
                      onChange={(e) => setOsPrism(e.target.value)}
                      placeholder="—"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-sm font-semibold text-slate-900 tabular-nums focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      value={vaOs}
                      onChange={(e) => setVaOs(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-sm font-semibold text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Diagnostic Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Distance Vision</label>
            <input
              type="text"
              value={distanceVision}
              onChange={(e) => setDistanceVision(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Near Vision</label>
            <input
              type="text"
              value={nearVision}
              onChange={(e) => setNearVision(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pupillary Distance (PD mm)</label>
            <input
              type="text"
              value={pdMm}
              onChange={(e) => setPdMm(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">IOP OD (mmHg)</label>
            <input
              type="text"
              value={iopOd}
              onChange={(e) => setIopOd(e.target.value)}
              placeholder="e.g. 14"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">IOP OS (mmHg)</label>
            <input
              type="text"
              value={iopOs}
              onChange={(e) => setIopOs(e.target.value)}
              placeholder="e.g. 15"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
        </div>

        {/* Doctor Observations & Prescription Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Observations</label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Slit lamp findings, retinal check, tear film assessment..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Remarks / Advice</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Constant wear, computer protection, 20-20-20 rule..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prescribed Lens Type</label>
            <select
              value={lensType}
              onChange={(e) => setLensType(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option>Single Vision</option>
              <option>Bifocal (Kryptok / D-Seg)</option>
              <option>Digital Progressive</option>
              <option>Photochromic Transition</option>
              <option>No Spectacles Needed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recommended Coating</label>
            <input
              type="text"
              value={coating}
              onChange={(e) => setCoating(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Frame Recommendation</label>
            <input
              type="text"
              value={frameRecommendation}
              onChange={(e) => setFrameRecommendation(e.target.value)}
              placeholder="Full Rim / Titanium"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-Up Date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
        </div>

        {medicines.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Prescribe Eye Medicines</label>
            <div className="flex flex-wrap gap-2">
              {medicines.map((m) => {
                const active = selectedMedicines.includes(m.name);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMedicine(m.name)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E40AF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173bab] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving Prescription...' : editingId ? 'Update Eye Examination' : 'Save Prescription & Exam'}
          </button>
        </div>
      </form>

      {/* Recorded Eye Examinations History */}
      <div className="no-print rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-slate-900">
            Recent Eye Examinations ({checkups.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Checkup / Rx</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">OD (SPH / CYL / AXIS)</th>
                <th className="px-4 py-3">OS (SPH / CYL / AXIS)</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {checkups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No eye examinations recorded yet.
                  </td>
                </tr>
              ) : (
                checkups.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <div className="font-bold text-[#1E40AF]">{c.checkup_code}</div>
                      <div className="text-slate-500">{c.exam_date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.patient_name}</div>
                      <div className="font-mono text-xs text-slate-500">{c.patient_code}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 tabular-nums">
                      {c.od_sph} / {c.od_cyl} / {c.od_axis}°
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 tabular-nums">
                      {c.os_sph} / {c.os_cyl} / {c.os_axis}°
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.doctor_name}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleLoadEdit(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintableExam(c)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1E40AF] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#173bab]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Print Rx
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
