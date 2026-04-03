import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  VideoListResponse,
  VideoDetailResponse,
  UploadResponse,
  LoginResponse,
  MeResponse,
  CreditsResponse,
  CheckinStatusResponse,
  CheckinResponse,
} from '../types'

const API_BASE_URL = '/api'

// 基础查询函数，自动附加 Token
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  },
})

export const videoApi = createApi({
  reducerPath: 'videoApi',
  baseQuery,
  tagTypes: ['Video', 'VideoList', 'User', 'Checkin'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation<LoginResponse, { username: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<{ code: number; message: string }, { username: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    getCredits: builder.query<CreditsResponse, void>({
      query: () => '/user/credits',
      providesTags: ['User'],
    }),

    // Checkin
    getCheckinStatus: builder.query<CheckinStatusResponse, void>({
      query: () => '/user/checkin',
      providesTags: ['Checkin'],
    }),
    doCheckin: builder.mutation<CheckinResponse, void>({
      query: () => ({
        url: '/user/checkin',
        method: 'POST',
      }),
      invalidatesTags: ['Checkin', 'User'],
    }),

    // Videos
    getVideoList: builder.query<VideoListResponse, { page: number; pageSize: number }>({
      query: ({ page, pageSize }) => `/videos?page=${page}&pageSize=${pageSize}`,
      providesTags: ['VideoList'],
    }),
    getVideoDetail: builder.query<VideoDetailResponse, number>({
      query: (id) => `/videos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Video', id }],
    }),
    uploadVideo: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['VideoList'],
    }),
    deleteVideo: builder.mutation<{ code: number; message?: string }, number>({
      query: (id) => ({
        url: `/videos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['VideoList'],
    }),
    reextractVideo: builder.mutation<{ code: number; message?: string }, number>({
      query: (id) => ({
        url: `/videos/${id}/reextract`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Video', id }],
    }),
    rewriteVideoText: builder.mutation<{ code: number; data?: { text: string }; message?: string }, { id: number; prompt: string }>({
      query: ({ id, prompt }) => ({
        url: `/videos/${id}/rewrite`,
        method: 'POST',
        body: { prompt },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Video', id }],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useGetCreditsQuery,
  useGetCheckinStatusQuery,
  useDoCheckinMutation,
  useGetVideoListQuery,
  useGetVideoDetailQuery,
  useUploadVideoMutation,
  useDeleteVideoMutation,
  useReextractVideoMutation,
  useRewriteVideoTextMutation,
} = videoApi
