export enum MessageStatusEnum {
  SENDING = 1,
  SUCCESS = 2,
  ERROR = 3,
  STREAMING = 4,
}

export enum MessageRoleEnum {
  USER = 1,
  ASSISTANT = 2,
  SYSTEM = 3,
}

// 消息类型
export enum MessageType {
  CHAT = 1,
  BRIEF = 2,
}

export interface Message {
  id: number | string;
  role: MessageRoleEnum;
  type?: MessageType; // 1=CHAT, 2=BRIEF
  content: string;
  status?: MessageStatusEnum;
  tempId?: string;
  timestamp?: Date;
  threadId?: number;
}

