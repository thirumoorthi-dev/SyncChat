import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatItem } from '../../../types/chat';

interface ChatState {
  activeChat: ChatItem | null;
}

const initialState: ChatState = {
  activeChat: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<ChatItem | null>) => {
      state.activeChat = action.payload;
    },
  },
});

export const { setActiveChat } = chatSlice.actions;

export default chatSlice.reducer;
