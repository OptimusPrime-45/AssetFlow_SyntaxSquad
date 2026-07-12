import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/lib/context/AuthContext";
import "@/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400"],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif4.variable} h-full antialiased font-body-md bg-background text-on-background`}
    >
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </main>
  );
}
