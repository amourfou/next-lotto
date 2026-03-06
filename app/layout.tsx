import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "로또 번호 뽑기",
  description: "행운의 로또 번호를 뽑아보세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={notoSans.variable}>
      <body className="font-sans antialiased text-slate-100">
        {children}
      </body>
    </html>
  );
}
