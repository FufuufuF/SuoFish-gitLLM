export type MessageRole = 0 | 1;

export type MessageStatus = "sending" | "success" | "error" | "streaming";

export interface Message {
  id: number | string;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  tempId?: string;
  timestamp?: Date;
}
