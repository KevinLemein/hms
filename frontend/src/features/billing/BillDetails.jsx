import StatusBadge from "../../components/ui/StatusBadge";
import { formatDate, formatDateTime, formatMoney, fullName } from "../../lib/format";

const SOURCE_LABELS = {
    CONSULTATION: "Consultation",
    DRUG_DISPENSE: "Medication",
    LAB: "Lab",
    MANUAL: "Other",
};

const METHOD_LABELS = { CASH: "Cash", MPESA: "M-Pesa", CARD: "Card", INSURANCE: "Insurance" };

/**
 * One bill, as returned by the API (BillResponse): line items, totals,
 * balance and payment history. Read-only; actions are passed in.
 */
export default function BillDetails({ bill, showPatient = false, actions }) {
    const items = bill.lineItems || [];
    const payments = bill.payments || [];

    return (
        <article className="rounded-card border border-slate-200 bg-white shadow-card" aria-labelledby={`bill-${bill.id}-title`}>
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                    <h3 id={`bill-${bill.id}-title`} className="text-base font-semibold text-slate-900">
                        {showPatient ? fullName(bill.patientFirstName, bill.patientLastName) : `Bill #${bill.id}`}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                        {showPatient && <>Bill #{bill.id} · {bill.patientPhone} · </>}
                        {formatDate(bill.createdAt)}
                        {bill.appointmentId && <> · Appointment #{bill.appointmentId}</>}
                    </p>
                </div>
                <StatusBadge kind="bill" value={bill.status} />
            </header>

            <div className="px-5 py-4">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-600">No charges on this bill yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <caption className="sr-only">Charges on bill {bill.id}</caption>
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                                <th scope="col" className="pb-2 font-semibold">Item</th>
                                <th scope="col" className="pb-2 text-right font-semibold">Qty</th>
                                <th scope="col" className="hidden pb-2 text-right font-semibold sm:table-cell">Unit price</th>
                                <th scope="col" className="pb-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="py-2 pr-2 text-slate-800">
                                        {item.description}
                                        <span className="block text-xs text-slate-600">{SOURCE_LABELS[item.source] || item.source}</span>
                                    </td>
                                    <td className="py-2 text-right tabular-nums text-slate-700">{item.quantity}</td>
                                    <td className="hidden py-2 text-right tabular-nums text-slate-700 sm:table-cell">{formatMoney(item.unitPrice)}</td>
                                    <td className="py-2 text-right font-medium tabular-nums text-slate-900">{formatMoney(item.totalPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <dl className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
                    <div className="flex justify-between">
                        <dt className="font-semibold text-slate-800">Total</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">{formatMoney(bill.totalAmount)}</dd>
                    </div>
                    <div className="flex justify-between text-slate-700">
                        <dt>Paid</dt>
                        <dd className="tabular-nums">{formatMoney(bill.amountPaid)}</dd>
                    </div>
                    <div className="flex justify-between text-slate-700">
                        <dt>Balance due</dt>
                        <dd className={`tabular-nums ${Number(bill.balance) > 0 && bill.status !== "CANCELLED" ? "font-semibold text-amber-900" : ""}`}>
                            {formatMoney(bill.balance)}
                        </dd>
                    </div>
                </dl>

                {payments.length > 0 && (
                    <div className="mt-4">
                        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Payments</h4>
                        <ul className="space-y-1 text-sm text-slate-700">
                            {payments.map((p) => (
                                <li key={p.id} className="flex flex-wrap justify-between gap-2">
                                    <span>
                                        {METHOD_LABELS[p.method] || p.method}
                                        {p.reference && <span className="text-slate-600"> · Ref {p.reference}</span>}
                                        <span className="text-slate-600"> · {formatDateTime(p.paidAt)}</span>
                                    </span>
                                    <span className="tabular-nums">{formatMoney(p.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {actions && <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3">{actions}</footer>}
        </article>
    );
}
