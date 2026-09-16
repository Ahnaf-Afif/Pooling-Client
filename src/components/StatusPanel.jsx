export default function StatusPanel({ title, message, action }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F7F4] text-xl text-[#1B4332]">
        ?
      </div>
      <h3 className="font-display text-xl font-semibold text-[#0F0F0F]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B7280]">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
