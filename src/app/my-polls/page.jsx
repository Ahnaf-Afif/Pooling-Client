import MyPollsPage from "@/features/MyPollsPage";

export const metadata = {
  title: "My Polls",
  description: "View and manage polls created with your account.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MyPollsPage />;
}
