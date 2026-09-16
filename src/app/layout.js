import "./globals.css";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "What Do You Think? — Bangladesh Polls",
    template: "%s | What Do You Think?",
  },
  description: "Create, share, and vote on community polls across Bangladesh.",
  openGraph: {
    title: "What Do You Think?",
    description: "The pulse of Bangladesh, one poll at a time.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="flex min-h-full flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
