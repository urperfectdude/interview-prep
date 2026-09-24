import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { OpenAIKeyGate } from "@/components/OpenAIKeyGate";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InterviewPrep",
  description: "Desktop mock interviews for macOS and Windows, tailored to your resume and target role.",
};

// Applies the saved theme (or the OS preference) to <html> before first paint, so there is no flash.
// See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AppHeader />
        <OpenAIKeyGate />
        {children}
      </body>
    </html>
  );
}
