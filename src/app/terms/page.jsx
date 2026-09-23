const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

export const metadata = { title: "Terms of Use", description: "Rules for using What Do You Think?." };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Last updated September 23, 2026</p>
      <h1 className="font-display mt-2 text-4xl font-semibold">Terms of Use</h1>
      <div className="mt-8 space-y-7 text-sm leading-7 text-[#4B5563]">
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Casual community polling</h2><p className="mt-2">What Do You Think? is designed for informal community opinion polls. Results are not scientific samples, verified elections, legal votes, or a substitute for professional research.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Your responsibilities</h2><p className="mt-2">Do not create spam, scams, unlawful material, targeted harassment, hateful content, impersonation, privacy violations, or intentionally harmful misinformation. Do not attempt to manipulate results, bypass voting protections, access another account, or disrupt the service.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Poll ownership</h2><p className="mt-2">A verified account is required to publish a poll. Owners can edit only before voting begins, then may close, archive, or delete their poll. You are responsible for the content you publish and must have the right to share it.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Moderation</h2><p className="mt-2">We may remove polls, restrict features, or suspend accounts when content or behavior violates these terms or threatens the service and its users. Reports may be reviewed by authorized moderators.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Availability and changes</h2><p className="mt-2">The service is provided as available and may change over time. For questions about these terms, email <a className="font-semibold text-[#1B4332] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p></section>
      </div>
    </main>
  );
}
