import Button from "./Button";

/** For PagedResponse lists ({ page, totalPages, totalElements }); page is 0-based. */
export default function Pagination({ page, totalPages, totalElements, onChange, disabled }) {
    if (!totalPages || totalPages <= 1) return null;
    return (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <p>
                Page <span className="font-medium text-slate-800">{page + 1}</span> of{" "}
                <span className="font-medium text-slate-800">{totalPages}</span>
                {totalElements != null && <span className="hidden sm:inline"> · {totalElements} total</span>}
            </p>
            <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon="chevronLeft" disabled={disabled || page === 0} onClick={() => onChange(page - 1)}>
                    Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={disabled || page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
                    Next
                </Button>
            </div>
        </nav>
    );
}
