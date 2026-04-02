import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { VideoListResponse, VideoDetailResponse, UploadResponse } from '../types'

const API_BASE_URL = '/api'

export const videoApi = createApi({
  reducerPath: 'videoApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Video', 'VideoList'],
  endpoints: (builder) => ({
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
  useGetVideoListQuery,
  useGetVideoDetailQuery,
  useUploadVideoMutation,
  useDeleteVideoMutation,
  useReextractVideoMutation,
  useRewriteVideoTextMutation,
} = videoApi
