import PollPage from "@/features/PollPage";
import { getPollForPreview } from "@/lib/poll-metadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const poll = await getPollForPreview(id);
  if (!poll) return { title: "Vote on a poll" };

  const path = `/poll/${encodeURIComponent(id)}`;
  const choices = poll.options.slice(0, 3).map((option) => option.label).join(" · ");
  const description = `Vote on this ${poll.category.toLowerCase()} poll and see live results. Choices: ${choices}`.slice(0, 180);
  const image = `${path}/opengraph-image`;

  return {
    title: poll.question,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: poll.question,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `Poll card: ${poll.question}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: poll.question,
      description,
      images: [image],
    },
  };
}

export default function Page() {
  return <PollPage />;
}
