import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProfileProvider } from "@/lib/profile";
import { AppGate } from "@/lib/AppGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive Fitness (Next.js migratie)",
  description: "Next.js-migratie van de Adaptive Fitness Expo-app — nog in ontwikkeling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ProfileProvider>
            <AppGate>{children}</AppGate>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
