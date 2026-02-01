"use client";

import { WebSocketProvider } from "./contexts/webSocketContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </QueryClientProvider>
  );
}
