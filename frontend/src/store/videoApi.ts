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
  Collection,
  CollectionListResponse,
  CollectionDetailResponse,
  Tag,
  TagListResponse,
  TagVideosResponse,
  SearchHistory,
  SearchVideosParams,
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
  tagTypes: ['Video', 'VideoList', 'User', 'Checkin', 'Collection', 'Tag', 'SearchHistory'],
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
    extractByUrl: builder.mutation<{
      code: number;
      message: string;
      data: { id: number; title: string };
    }, { url: string; title: string; uploader: string }>({
      query: (body) => ({
        url: '/video/extract-by-url',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VideoList', 'User'],
    }),
    analyzeVideo: builder.mutation<{
      code: number;
      message: string;
      data: {
        result: any;
        creditsDeducted: number;
        fromCache?: boolean;
      };
    }, { id: number; analysisType: 'structure' | 'viral_points' | 'tags' | 'rhythm' | 'report' }>({
      query: ({ id, analysisType }) => ({
        url: `/videos/${id}/analyze`,
        method: 'POST',
        body: { analysisType },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Video', id }, 'User'],
    }),
    getAnalysisResults: builder.query<{
      code: number;
      message: string;
      data: Record<string, string>;
    }, number>({
      query: (id) => `/videos/${id}/analysis-results`,
    }),

    // V1.6 收藏夹管理
    getCollections: builder.query<CollectionListResponse, { page?: number; pageSize?: number }>({
      query: ({ page = 1, pageSize = 20 }) => `/collections?page=${page}&pageSize=${pageSize}`,
      providesTags: ['Collection'],
    }),
    getCollectionDetail: builder.query<CollectionDetailResponse, number>({
      query: (id) => `/collections/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Collection', id }],
    }),
    createCollection: builder.mutation<{
      code: number;
      message: string;
      data: Collection;
    }, { name: string; icon?: string; color?: string; description?: string }>({
      query: (body) => ({
        url: '/collections',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Collection'],
    }),
    updateCollection: builder.mutation<{
      code: number;
      message: string;
      data: Collection;
    }, { id: number; name: string; icon?: string; color?: string; description?: string }>({
      query: ({ id, ...body }) => ({
        url: `/collections/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Collection'],
    }),
    deleteCollection: builder.mutation<{ code: number; message: string }, number>({
      query: (id) => ({
        url: `/collections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Collection'],
    }),
    addVideoToCollection: builder.mutation<{ code: number; message: string }, { collectionId: number; videoId: number }>({
      query: ({ collectionId, videoId }) => ({
        url: `/collections/${collectionId}/videos`,
        method: 'POST',
        body: { videoId },
      }),
      invalidatesTags: ['Collection', 'VideoList'],
    }),
    removeVideoFromCollection: builder.mutation<{ code: number; message: string }, { collectionId: number; videoId: number }>({
      query: ({ collectionId, videoId }) => ({
        url: `/collections/${collectionId}/videos/${videoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Collection'],
    }),
    getVideoCollections: builder.query<{
      code: number;
      message: string;
      data: Collection[];
    }, number>({
      query: (id) => `/videos/${id}/collections`,
      providesTags: ['Collection'],
    }),

    // V1.6 标签管理
    getVideoTags: builder.query<{
      code: number;
      message: string;
      data: Tag[];
    }, number>({
      query: (id) => `/videos/${id}/tags`,
      providesTags: (_result, _error, id) => [{ type: 'Tag', id }],
    }),
    addTagToVideo: builder.mutation<{
      code: number;
      message: string;
      data: Tag[];
    }, { videoId: number; tagName: string }>({
      query: ({ videoId, tagName }) => ({
        url: `/videos/${videoId}/tags`,
        method: 'POST',
        body: { tagName },
      }),
      invalidatesTags: ['Tag'],
    }),
    removeTagFromVideo: builder.mutation<{ code: number; message: string }, { videoId: number; tagId: number }>({
      query: ({ videoId, tagId }) => ({
        url: `/videos/${videoId}/tags/${tagId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tag'],
    }),
    getTags: builder.query<TagListResponse, { page?: number; pageSize?: number }>({
      query: ({ page = 1, pageSize = 50 }) => `/tags?page=${page}&pageSize=${pageSize}`,
      providesTags: ['Tag'],
    }),
    getTagVideos: builder.query<TagVideosResponse, { tagId: number; page?: number; pageSize?: number }>({
      query: ({ tagId, page = 1, pageSize = 20 }) => `/tags/${tagId}/videos?page=${page}&pageSize=${pageSize}`,
      providesTags: ['Tag'],
    }),
    deleteTag: builder.mutation<{ code: number; message: string }, number>({
      query: (id) => ({
        url: `/tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tag'],
    }),
    searchTags: builder.query<{
      code: number;
      message: string;
      data: Tag[];
    }, string>({
      query: (q) => `/tags/search?q=${encodeURIComponent(q)}`,
    }),

    // V1.6 搜索功能
    searchVideos: builder.query<{
      code: number;
      message: string;
      data: {
        videos: any[];
        pagination: any;
      };
    }, SearchVideosParams>({
      query: (params) => {
        const searchParams = new URLSearchParams()
        if (params.keyword) searchParams.set('keyword', params.keyword)
        if (params.tagId) searchParams.set('tagId', params.tagId.toString())
        if (params.collectionId) searchParams.set('collectionId', params.collectionId.toString())
        if (params.sort) searchParams.set('sort', params.sort)
        searchParams.set('page', (params.page || 1).toString())
        searchParams.set('pageSize', (params.pageSize || 20).toString())
        return `/videos/search?${searchParams.toString()}`
      },
      providesTags: ['SearchHistory'],
    }),
    getSearchHistory: builder.query<{
      code: number;
      message: string;
      data: SearchHistory[];
    }, void>({
      query: () => '/search/history',
      providesTags: ['SearchHistory'],
    }),
    clearSearchHistory: builder.mutation<{ code: number; message: string }, void>({
      query: () => ({
        url: '/search/history',
        method: 'POST',
      }),
      invalidatesTags: ['SearchHistory'],
    }),

    // V1.6 导出功能
    exportMarkdown: builder.mutation<Blob, { videoIds: number[] }>({
      query: ({ videoIds }) => ({
        url: '/export/markdown',
        method: 'POST',
        body: { videoIds },
        responseHandler: (response) => response.blob(),
      }),
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
  useExtractByUrlMutation,
  useAnalyzeVideoMutation,
  useGetAnalysisResultsQuery,
  // V1.6 收藏夹
  useGetCollectionsQuery,
  useGetCollectionDetailQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useAddVideoToCollectionMutation,
  useRemoveVideoFromCollectionMutation,
  useGetVideoCollectionsQuery,
  // V1.6 标签
  useGetVideoTagsQuery,
  useAddTagToVideoMutation,
  useRemoveTagFromVideoMutation,
  useGetTagsQuery,
  useGetTagVideosQuery,
  useDeleteTagMutation,
  useSearchTagsQuery,
  // V1.6 搜索
  useSearchVideosQuery,
  useGetSearchHistoryQuery,
  useClearSearchHistoryMutation,
  // V1.6 导出
  useExportMarkdownMutation,
} = videoApi
