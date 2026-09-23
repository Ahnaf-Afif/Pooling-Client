import MyPollsPage from "@/features/MyPollsPage";

export const metadata = {
  title: "My Polls",
  description: "View polls created in this browser.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MyPollsPage />;
}
