"use client";

import { useQuery } from "@tanstack/react-query";

export const useAtlas = () => {
  return useQuery<ArrayBuffer>({
    queryKey: ["atlas"],
    queryFn: () => fetch("/atlas").then((res) => res.arrayBuffer()),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};
