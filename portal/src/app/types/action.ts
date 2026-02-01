import { ActionMessage } from "./action-message";

export type Action = (msg: ActionMessage) => void;
