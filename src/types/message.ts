import { MessageType as MessageTypeApi, MessageStatus as MessageStatusApi } from "../api/common/message";

export enum MessageStatusEnum {
  SENDING = 0,
  SUCCESS = MessageStatusApi.NORMAL,
  ERROR = MessageStatusApi.ERROR,
  STOP_STREAMING = MessageStatusApi.STOP_GENERATION, // 用户点击停止生成
  STREAMING = 4,
  THINKING = 5, // 等待首个 token（AI 占位态）
}

export const mapBackendMessageStatusToUiStatus = (
  status?: number,
): MessageStatusEnum => {
  switch (status) {
    case MessageStatusApi.ERROR:
      return MessageStatusEnum.ERROR;
    case MessageStatusApi.STOP_GENERATION:
      return MessageStatusEnum.STOP_STREAMING;
    case MessageStatusApi.NORMAL:
    default:
      return MessageStatusEnum.SUCCESS;
  }
};

export enum MessageRoleEnum {
  USER = 1,
  ASSISTANT = 2,
  SYSTEM = 3,
}

export enum MessageType {
  CHAT = MessageTypeApi.CHAT,
  BRIEF = MessageTypeApi.BRIEF,
}

export const mapBackendMessageTypeToUiType = (type?: number): MessageType => {
  switch (type) {
    case MessageTypeApi.BRIEF:
      return MessageType.BRIEF;
    case MessageTypeApi.CHAT:
    default:
      return MessageType.CHAT;
  }
};

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

