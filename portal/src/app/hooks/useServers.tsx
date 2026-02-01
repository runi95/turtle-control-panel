"use client";

import { useQuery } from "@tanstack/react-query";
import { BaseState } from "./useTurtle";
import { HTTP_SERVER_URL } from "../env";

export interface OnlineStatuses {
  serverId: number;
  id: number;
  isOnline: boolean;
}

export interface DashboardTurtle {
  serverId: number;
  id: number;
  name: string;
  isOnline: boolean;
  fuelLevel: number;
  fuelLimit: number;
  state?: BaseState;
  error: string | null;
}

export interface DashboardTurtles {
  [key: string]: DashboardTurtle;
}

export interface Server {
  id: number;
  name?: string;
  remoteAddress: string;
  turtles: DashboardTurtles;
}

export interface Servers {
  [key: string]: Server;
}

export interface Dashboard {
  id: number;
  name?: string;
  remoteAddress: string;
  turtles: DashboardTurtle[];
}

export const useServers = () => {
  return useQuery<Servers>({
    queryKey: ["servers"],
    queryFn: () =>
      fetch(`${HTTP_SERVER_URL}/servers`)
        .then((res) => res.json())
        .then(
          (data: {
            dashboard: Dashboard[];
            onlineStatuses: OnlineStatuses[];
          }) =>
            (data.dashboard as Dashboard[]).reduce(
              (acc: { [key: string]: Server }, server) => (
                (acc[server.id.toString()] = {
                  ...server,
                  turtles: server.turtles.reduce(
                    (acc, curr) => (
                      (acc[curr.id] = {
                        ...curr,
                        isOnline: (
                          data.onlineStatuses as OnlineStatuses[]
                        ).some(
                          ({ serverId, id, isOnline }) =>
                            serverId === server.id &&
                            id === curr.id &&
                            isOnline,
                        ),
                      }),
                      acc
                    ),
                    {} as { [key: string]: DashboardTurtle },
                  ),
                }),
                acc
              ),
              {},
            ),
        ),
  });
};
