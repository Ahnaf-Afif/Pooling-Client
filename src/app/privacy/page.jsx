const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

export const metadata = { title: "Privacy Policy", description: "How What Do You Think? handles account, poll, and voting data." };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Last updated September 25, 2026</p>
      <h1 className="font-display mt-2 text-4xl font-semibold">Privacy Policy</h1>
      <div className="mt-8 space-y-7 text-sm leading-7 text-[#4B5563]">
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Information we collect</h2><p className="mt-2">When you sign in, we store your account identifier, email address, verification status, display name, the Google-hosted URL of an optional profile photo, and active sessions. We never upload or store the profile image file itself. We store polls you create, votes, reports, basic security logs, and rate-limit records. Anonymous voters receive a random signed cookie so the same browser cannot vote repeatedly in one poll.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">How we use it</h2><p className="mt-2">We use this information to authenticate you, establish poll ownership, prevent abuse and duplicate votes, display aggregate results, operate moderation, and keep the service reliable. We do not display your email address on polls or sell personal information.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Public information</h2><p className="mt-2">Poll questions, choices, aggregate results, categories, and share links are public. Individual votes and report identities are not publicly displayed.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Service providers and retention</h2><p className="mt-2">The service uses hosting, database, identity, and email-delivery providers to process data on our behalf. Security and voting records may be retained to preserve poll integrity. Deleted polls are soft-deleted so abuse investigations and aggregate integrity can be maintained.</p></section>
        <section><h2 className="font-display text-xl font-semibold text-[#111827]">Your choices</h2><p className="mt-2">You can sign out at any time and can delete polls from your owner workspace. To request access, correction, or deletion of account data, email <a className="font-semibold text-[#1B4332] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p></section>
      </div>
    </main>
  );
}
