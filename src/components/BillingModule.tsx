import { CheckCircle2, Plus, Printer, Receipt, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import type { Bill, BillItem, ClinicSettings, Patient, Product } from '../types';

interface Props {
  preselectedPatient: Patient | null;
  clinicSettings: ClinicSettings | null;
  refreshSignal: number;
  onBilled: () => void;
}

export function BillingModule({ preselectedPatient, clinicSettings, refreshSignal, onBilled }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const [patientId, setPatientId] = useState(preselectedPatient ? String(preselectedPatient.id) : '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [examCharge, setExamCharge] = useState('0');
  const [items, setItems] = useState<BillItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [gstPercent, setGstPercent] = useState(clinicSettings?.default_gst_percent || '12');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'NetBanking' | 'Pending'>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Paid');
  const [notes, setNotes] = useState('');

  const [printableBill, setPrintableBill] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadBilling = async () => {
    try {
      const [patRes, prodRes, billRes] = await Promise.all([
        apiRequest<{ patients: Patient[] }>('/api/patients?limit=50'),
        apiRequest<{ products: Product[] }>('/api/products'),
        apiRequest<{ bills: Bill[] }>('/api/bills'),
      ]);
      setPatients(patRes.patients);
      setProducts(prodRes.products);
      setBills(billRes.bills);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load billing module.');
    }
  };

  useEffect(() => {
    loadBilling();
  }, [refreshSignal]);

  useEffect(() => {
    if (preselectedPatient) {
      setPatientId(String(preselectedPatient.id));
    }
  }, [preselectedPatient]);

  const handleAddProductItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => String(p.id) === selectedProductId);
    if (!prod) return;

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product_id === prod.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const nextQty = updated[existingIdx].quantity + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: nextQty,
          line_total: Number((nextQty * prod.unit_price).toFixed(2)),
        };
        return updated;
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          description: prod.name,
          category: prod.category,
          quantity: 1,
          unit_price: prod.unit_price,
          line_total: prod.unit_price,
        },
      ];
    });
    setSelectedProductId('');
  };

  const handleAddExamFee = () => {
    const fee = Math.max(0, Number(examCharge || 0));
    if (fee <= 0) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        description: 'Optometrist Eye Examination Charge',
        category: 'Eye Examination',
        quantity: 1,
        unit_price: fee,
        line_total: fee,
      },
    ]);
    setExamCharge('0');
  };

  const updateItemQty = (idx: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, quantity: safeQty, line_total: Number((safeQty * item.unit_price).toFixed(2)) }
          : item
      )
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const discount = Math.max(0, Number(discountAmount || 0));
  const taxable = Math.max(0, subtotal - discount);
  const gstRate = Math.max(0, Number(gstPercent || 0));
  const gstAmount = Number(((taxable * gstRate) / 100).toFixed(2));
  const grandTotal = Number((taxable + gstAmount).toFixed(2));

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId || items.length === 0) {
      setError('Select a patient and add at least one optical item or examination charge.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ bill: Bill }>('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: Number(patientId),
          items,
          discount_amount: discount,
          gst_percent: gstRate,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          notes,
        }),
      });
      setPrintableBill(res.bill);
      setItems([]);
      setDiscountAmount('0');
      setNotes('');
      await loadBilling();
      onBilled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (billId: number) => {
    try {
      await apiRequest(`/api/bills/${billId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({ method: 'UPI' }),
      });
      await loadBilling();
      onBilled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record payment.');
    }
  };

  const parseItems = (json: string): BillItem[] => {
    try {
      return JSON.parse(json) as BillItem[];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Billing & GST Invoices</h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate optical frame, lens, medicine & exam bills. Patient registration always remains ₹0.00.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">
          Patient Registration Fee: ₹0.00
        </span>
      </div>

      {error && <div className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Printable Invoice Preview */}
      {printableBill && (
        <div className="rounded-xl border border-[#BFDBFE] bg-white p-6 space-y-4 print-sheet">
          <div className="no-print flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-semibold text-[#1E40AF]">Tax Invoice Preview</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-1.5 text-xs font-semibold text-white"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setPrintableBill(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#1E40AF]">
                {clinicSettings?.clinic_name || 'Divya Drusti Opticals'}
              </h2>
              <p className="text-xs text-slate-600">{clinicSettings?.clinic_address}</p>
              <p className="text-xs text-slate-600">
                Phone: {clinicSettings?.clinic_phone} · GSTIN: {clinicSettings?.clinic_gstin}
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <p className="text-sm font-bold text-slate-900">TAX INVOICE</p>
              <p className="font-bold text-[#1E40AF]">{printableBill.invoice_no}</p>
              <p className="text-slate-600">Date: {printableBill.created_at.slice(0, 10)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500">Billed To:</p>
              <p className="font-semibold text-slate-900 text-sm">{printableBill.patient_name}</p>
              <p className="font-mono text-slate-600">{printableBill.patient_code} · {printableBill.patient_mobile}</p>
              <p className="text-slate-600">{printableBill.patient_address}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Payment Mode & Status</p>
              <p className="font-semibold text-slate-900">{printableBill.payment_method} · {printableBill.payment_status}</p>
              <p className="text-[#059669] font-semibold mt-1">Registration Fee: ₹0.00 (Free)</p>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2 text-left">Item Description</th>
                <th className="border border-slate-300 p-2 text-left">Category</th>
                <th className="border border-slate-300 p-2 text-center">Qty</th>
                <th className="border border-slate-300 p-2 text-right">Rate</th>
                <th className="border border-slate-300 p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 text-[#059669] font-medium">Patient Registration</td>
                <td className="border border-slate-300 p-2">Clinic Onboarding</td>
                <td className="border border-slate-300 p-2 text-center font-mono">1</td>
                <td className="border border-slate-300 p-2 text-right font-mono">₹0.00</td>
                <td className="border border-slate-300 p-2 text-right font-mono text-[#059669]">₹0.00</td>
              </tr>
              {parseItems(printableBill.items_json).map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-slate-300 p-2 font-medium">{item.description}</td>
                  <td className="border border-slate-300 p-2">{item.category}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{item.quantity}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-xs font-mono tabular-nums">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(printableBill.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>-{formatCurrency(printableBill.discount_amount)}</span></div>
              <div className="flex justify-between"><span>GST ({printableBill.gst_percent}%):</span><span>{formatCurrency(printableBill.gst_amount)}</span></div>
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                <span>Grand Total:</span><span>{formatCurrency(printableBill.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Builder */}
      <form onSubmit={handleCreateInvoice} className="no-print rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
          <Receipt className="h-4 w-4 text-[#1E40AF]" />
          Create New Optical / Clinical Invoice
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Choose patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_code} — {p.full_name} ({p.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Add Optical Product / Eye Medicine</label>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Choose frame, lens, or medicine...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantity_in_stock <= 0}>
                    {p.name} — ₹{p.unit_price} (Stock: {p.quantity_in_stock})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProductItem}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1E40AF] px-3 text-xs font-semibold text-white hover:bg-[#173bab]"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Eye Exam Fee (₹, optional)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={examCharge}
                onChange={(e) => setExamCharge(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
              <button
                type="button"
                onClick={handleAddExamFee}
                className="rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Add Fee
              </button>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        {items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-center">Qty</th>
                  <th className="px-4 py-2.5 text-right">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Line Total</th>
                  <th className="px-4 py-2.5 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{item.description}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{item.category}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                        className="h-8 w-16 rounded border border-slate-300 text-center font-mono text-xs"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatCurrency(item.line_total)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-t border-slate-200 pt-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">GST %</label>
            <input
              type="number"
              min="0"
              max="28"
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="NetBanking">NetBanking</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          <div className="md:col-span-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500">Grand Total (incl. GST {gstRate}%)</p>
              <p className="font-mono text-lg font-bold text-[#1E40AF] tabular-nums">{formatCurrency(grandTotal)}</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-60"
            >
              {saving ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </form>

      {/* Invoices Ledger */}
      <div className="no-print rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h3 className="font-display text-base font-bold text-slate-900">Generated Invoices ({bills.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No invoices generated yet.</td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1E40AF]">{b.invoice_no}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{b.patient_name}</div>
                      <div className="font-mono text-xs text-slate-500">{b.patient_code}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{formatCurrency(b.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{formatCurrency(b.gst_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(b.total_amount)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 font-semibold ${
                          b.payment_status === 'Paid'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {b.payment_status} · {b.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {b.payment_status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(b.id)}
                          className="inline-flex items-center gap-1 rounded bg-[#059669] px-2.5 py-1 text-xs font-medium text-white"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Mark Paid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPrintableBill(b)}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Printer className="h-3 w-3" />
                        Print
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
