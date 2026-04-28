import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from '../modules/auth/api/auth.api';
import { contactsApi } from '../modules/contacts/api/contacts.api';
import { chatApi } from '../modules/chat/api/chat.api';
import authReducer from '../modules/auth/store/auth.slice';
import chatReducer from '../modules/chat/store/chat.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    [authApi.reducerPath]: authApi.reducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware, 
      contactsApi.middleware, 
      chatApi.middleware
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
