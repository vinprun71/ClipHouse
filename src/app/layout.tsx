import type { Metadata } from "next";
import { AccountControls } from "@/app/AccountControls";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipHouse",
  description: "Never lose a short video again.",
  icons: {
    icon: [
      { url: "/cliphouse-logo.svg", type: "image/svg+xml" },
      { url: "/cliphouse-logo.jpg", type: "image/jpeg", sizes: "1024x1024" },
    ],
    apple: [{ url: "/cliphouse-logo.jpg", type: "image/jpeg", sizes: "1024x1024" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AccountControls />
      </body>
    </html>
  );
}
