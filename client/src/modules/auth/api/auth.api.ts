import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../app/services/baseQuery';
import { LoginResponse } from '../types/auth.types';
import { User } from '../../../types/chat';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<LoginResponse, any>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
    }),
    updateProfile: builder.mutation<User, { displayName?: string; about?: string; phoneNumber?: string }>({
      query: (body) => ({
        url: '/users/me',
        method: 'PATCH',
        body,
      }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetMeQuery, useUpdateProfileMutation } = authApi;
