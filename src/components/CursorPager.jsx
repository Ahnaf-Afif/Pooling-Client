export default function CursorPager({ cursors, nextCursor, onChange, disabled = false, label = "Pages" }) {
  if (cursors.length === 1 && !nextCursor) return null;
  const button = "rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-semibold disabled:opacity-40";
  return <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-4">
    <button type="button" disabled={disabled || cursors.length === 1} className={button} onClick={() => onChange(cursors.slice(0, -1))}>Previous</button>
    <span className="text-sm text-[#6B7280]">Page {cursors.length}</span>
    <button type="button" disabled={disabled || !nextCursor} className={button} onClick={() => onChange([...cursors, nextCursor])}>Next</button>
  </nav>;
}
