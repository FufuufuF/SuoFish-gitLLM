export type MessageRole = 0 | 1;

export interface Message {
  id: string | number;
  role: MessageRole;
  content: string;
  timestamp?: Date;
}
