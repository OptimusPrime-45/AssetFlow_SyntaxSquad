import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="h-full">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="min-h-full flex flex-col bg-background text-on-background">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
