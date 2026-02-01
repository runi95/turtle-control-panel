export interface ActionMessage {
  type: "HANDSHAKE" | "ACTION" | "AREA" | "SERVER" | "TURTLE";
  action: string;
  data: {
    [key: string]: unknown;
  };
}
