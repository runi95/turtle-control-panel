"use client";

import { useQuery } from "@tanstack/react-query";
import { HTTP_SERVER_URL } from "../env";
import { Location } from "../types/location";

export enum Direction {
  West = 1,
  North = 2,
  East = 3,
  South = 4,
}

export interface Inventory {
  [key: number]: ItemDetail | undefined;
}

export interface Peripheral {
  data: unknown;
  types: string[];
}

export interface Peripherals {
  [key: string]: Peripheral;
}

export interface BaseState {
  id: number;
  warning?: string;
  name: string;
  [key: string]: unknown;
}

export interface Enchantment {
  level: number;
  name: string;
  displayName: string;
}

export interface ItemDetail {
  enchantments?: Enchantment[];
  durability: number;
  maxDamage: number;
  damage: number;
  nbt: string;
  name: string;
  tags: {
    [key: string]: string;
  };
  count: number;
  maxCount: string;
  displayName: string;
}

export interface Turtle {
  serverId: number;
  id: number;
  name: string;
  isOnline: boolean;
  fuelLevel: number;
  fuelLimit: number;
  selectedSlot: number;
  inventory: Inventory;
  stepsSinceLastRefuel: number;
  state?: BaseState;
  location: Location;
  direction: Direction;
  peripherals: Peripherals | null;
  home: Location | null;
  error: string | null;
}

export const useTurtle = (serverId: string, id: string) => {
  return useQuery<Turtle>({
    queryKey: ["turtles", serverId, id],
    queryFn: () =>
      fetch(`${HTTP_SERVER_URL}/servers/${serverId}/turtles/${id}`).then(
        (res) => res.json(),
      ),
  });
};

export const useTurtles = (serverId: string) => {
  return useQuery<Turtle[]>({
    queryKey: ["turtles", serverId],
    queryFn: () =>
      fetch(`${HTTP_SERVER_URL}/servers/${serverId}/turtles`).then((res) =>
        res.json(),
      ),
  });
};
