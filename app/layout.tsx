import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swipe2Order",
  description:
    "Reorder food you already know and love with one swipe and one secure device authentication.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full overflow-hidden antialiased">
      <body className="h-full overflow-hidden flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
