export type MessageRole = 1 | 2;

export interface Message {
  id: string | number;
  role: MessageRole;
  content: string;
  timestamp?: Date;
}
