import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata } from "next";
import Providers from "./providers";
import MessageHandler from "./messageHandler";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Turtle Control Panel",
  description:
    "A control panel that lets you monitor and control your ComputerCraft and/or ComputerCraft: Tweaked turtles through a WebSocket connection.",
};

export type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" data-bs-theme="dark">
      <body id="root">
        <Providers>
          <MessageHandler>{children}</MessageHandler>
        </Providers>
      </body>
    </html>
  );
}
