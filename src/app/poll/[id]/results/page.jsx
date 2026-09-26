import ResultsPage from "@/features/ResultsPage";
import { notFound } from "next/navigation";
import { getPollForPreview } from "@/lib/poll-metadata";

export const metadata = { title: "Poll Results" };

export default async function Page({ params }) {
  const { id } = await params;
  const poll = await getPollForPreview(id);
  if (!poll) notFound();
  return <ResultsPage key={id} initialPoll={poll} />;
}
