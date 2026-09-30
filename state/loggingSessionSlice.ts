import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Message } from "@/components/Log/Message";

export interface LoggingSessionState {
  messages: Message[];
}

const initialState: LoggingSessionState = {
  messages: [],
};

const loggingSessionSlice = createSlice({
  name: "loggingSession",
  initialState,
  reducers: {
    appendLoggingMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages.push(...action.payload);
    },
    clearLoggingSession: (state) => {
      state.messages = [];
    },
  },
});

export const { appendLoggingMessages, clearLoggingSession } =
  loggingSessionSlice.actions;

export default loggingSessionSlice.reducer;
