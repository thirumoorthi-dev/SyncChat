import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../app/services/baseQuery';
import { User } from '../../../types/chat';

export const contactsApi = createApi({
  reducerPath: 'contactsApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getContacts: builder.query<User[], void>({
      query: () => '/contacts',
    }),
    findByEmail: builder.mutation<User & { is_contact?: boolean }, string>({
      query: (email) => ({
        url: '/contacts/find-by-email',
        method: 'POST',
        body: { email },
      }),
    }),
    addContact: builder.mutation<void, string>({
      query: (contactId) => ({
        url: '/contacts',
        method: 'POST',
        body: { contactId },
      }),
    }),
  }),
});

export const { useGetContactsQuery, useFindByEmailMutation, useAddContactMutation } = contactsApi;
