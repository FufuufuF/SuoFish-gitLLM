import type { Message, MessageStatus } from "@/types";
import { create } from "zustand";

export interface MessageStore {
  messageList: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (messages: Message[]) => void;
  updateMessageStatus: (id: number | string, status: MessageStatus) => void;
  updateMessageId: (tempId: string, realId: number) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messageList: [],
  addMessage: (message: Message) => {
    set((state) => ({ messageList: [...state.messageList, message] }));
  },
  updateMessage: (messages: Message[]) => {
    set(() => ({
      messageList: messages,
    }));
  },
  updateMessageStatus: (id: number | string, status: MessageStatus) => {
    set((state) => ({
      messageList: state.messageList.map((msg) =>
        msg.id === id || msg.tempId === id ? { ...msg, status } : msg,
      ),
    }));
  },
  updateMessageId: (tempId: string, realId: number) => {
    set((state) => ({
      messageList: state.messageList.map((msg) =>
        msg.tempId === tempId || msg.id === tempId
          ? { ...msg, id: realId, tempId: undefined } // Remove tempId after update? Or keep it? Keeping it safe. Actually documentation said remove or not strictly needed. Let's keep it consistent with request: assigning real id.
          : msg,
      ),
    }));
  },
}));
