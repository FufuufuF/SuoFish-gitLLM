export type MessageRole = 1 | 2 | 3; // 1=user 2=assistant 3=system

export type MessageStatus = "sending" | "success" | "error" | "streaming";

export interface Message {
  id: number | string;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  tempId?: string;
  timestamp?: Date;
  threadId?: number;
}

export interface ContextMessage {
  id: number;
  role: MessageRole;
  type: MessageType;
  content: string;
  threadId: number;
  createAt: Date;
}

// 消息类型
export enum MessageType {
  CHAT = 1,
  BRIEF = 2,
}
