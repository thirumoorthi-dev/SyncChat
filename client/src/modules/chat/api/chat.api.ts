import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../app/services/baseQuery';
import { Group, Message } from '../../../types/chat';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getGroups: builder.query<Group[], void>({
      query: () => '/groups',
    }),
    getGroup: builder.query<Group, string | number>({
      query: (id) => `/groups/${id}`,
    }),
    createGroup: builder.mutation<Group, { name: string; memberIds: number[] }>({
      query: (body) => ({
        url: '/groups',
        method: 'POST',
        body,
      }),
    }),
    getArchived: builder.query<any[], void>({
      query: () => '/management/archived',
    }),
    getBlocks: builder.query<any[], void>({
      query: () => '/management/blocks',
    }),
  }),
});

export const { 
  useGetGroupsQuery, 
  useGetGroupQuery, 
  useCreateGroupMutation,
  useGetArchivedQuery,
  useGetBlocksQuery
} = chatApi;
