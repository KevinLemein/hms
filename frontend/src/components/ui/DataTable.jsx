/**
 * Table on medium+ screens; a stacked list of cards on narrow screens, so
 * clinical lists stay readable on a phone or tablet without sideways scrolling.
 *
 * columns: [{ key, header, render(row) => node, className?, hideOnMobile? }]
 * The first column is used as each card's heading on mobile.
 */
export default function DataTable({ columns, rows, rowKey = (r) => r.id, caption }) {
    const [first, ...rest] = columns;
    return (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                            {columns.map((c) => (
                                <th key={c.key} scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => (
                            <tr key={rowKey(row)} className="align-top hover:bg-slate-50">
                                {columns.map((c) => (
                                    <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.className || ""}`}>{c.render(row)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden" aria-label={caption}>
                {rows.map((row) => (
                    <li key={rowKey(row)} className="space-y-2 px-4 py-3">
                        <div className="text-sm">{first.render(row)}</div>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                            {rest.filter((c) => !c.hideOnMobile).map((c) => (
                                <div key={c.key} className="contents">
                                    <dt className="text-slate-600">{c.header}</dt>
                                    <dd className="text-slate-800">{c.render(row)}</dd>
                                </div>
                            ))}
                        </dl>
                    </li>
                ))}
            </ul>
        </>
    );
}
