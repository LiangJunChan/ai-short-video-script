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
  PublicVideosResponse,
  CollectSquareVideoResponse,
  ModelConfigsResponse,
  ChangePasswordRequest,
  UpdateModelConfigRequest,
  StoryboardListResponse,
  StoryboardDetailResponse,
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
    // 邮箱验证码
    sendCode: builder.mutation<{ code: number; message: string }, { email: string; purpose: string }>({
      query: (body) => ({
        url: '/auth/send-code',
        method: 'POST',
        body,
      }),
    }),
    // 邮箱注册
    registerByEmail: builder.mutation<LoginResponse, { email: string; code: string; password: string; confirm_password: string }>({
      query: (body) => ({
        url: '/auth/register-by-email',
        method: 'POST',
        body,
      }),
    }),
    // 邮箱登录
    loginByEmail: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({
        url: '/auth/login-by-email',
        method: 'POST',
        body,
      }),
    }),
    // 重置密码
    resetPassword: builder.mutation<{ code: number; message: string }, { email: string; code: string; password: string; confirm_password: string }>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
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

    // User Profile
    changePassword: builder.mutation<{ code: number; message: string }, ChangePasswordRequest>({
      query: (body) => ({
        url: '/user/password',
        method: 'PUT',
        body,
      }),
    }),
    getModelConfigs: builder.query<ModelConfigsResponse, void>({
      query: () => '/user/model-configs',
      providesTags: ['User'],
    }),
    updateModelConfig: builder.mutation<
      { code: number; message: string },
      { type: string } & UpdateModelConfigRequest
    >({
      query: ({ type, ...body }) => ({
        url: `/user/model-configs/${type}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    deleteModelConfig: builder.mutation<{ code: number; message: string }, string>({
      query: (type) => ({
        url: `/user/model-configs/${type}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
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

    // V1.7 Square endpoints
    getPublicVideos: builder.query<PublicVideosResponse, { page?: number; pageSize?: number; sortBy?: 'newest' | 'popular' }>({
      query: (params) => ({
        url: '/square/videos',
        method: 'GET',
        params,
      }),
      providesTags: ['VideoList'],
    }),

    collectSquareVideo: builder.mutation<CollectSquareVideoResponse, { id: number; collectionId?: number }>({
      query: ({ id, collectionId }) => ({
        url: `/square/collect/${id}`,
        method: 'POST',
        body: collectionId !== undefined ? { collectionId } : {},
      }),
      invalidatesTags: ['Collection'],
    }),

    // Storyboard
    getStoryboardList: builder.query<StoryboardListResponse, { page: number; pageSize: number }>({
      query: ({ page, pageSize }) => `/storyboards?page=${page}&pageSize=${pageSize}`,
      providesTags: ['Video'],
    }),
    getStoryboard: builder.query<StoryboardDetailResponse, number>({
      query: (id) => `/storyboards/${id}`,
      providesTags: ['Video'],
    }),
    createStoryboard: builder.mutation<{ code: number; data: { id: number } }, { name: string; videoId?: number }>({
      query: (body) => ({ url: '/storyboards', method: 'POST', body }),
      invalidatesTags: ['Video'],
    }),
    updateStoryboard: builder.mutation<{ code: number }, { id: number; name?: string; viewportJson?: string }>({
      query: ({ id, ...body }) => ({ url: `/storyboards/${id}`, method: 'PUT', body }),
    }),
    deleteStoryboard: builder.mutation<{ code: number }, number>({
      query: (id) => ({ url: `/storyboards/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Video'],
    }),
    batchUpdateStoryboard: builder.mutation<{ code: number }, { id: number; viewportJson?: string; nodes: any[]; edges: any[] }>({
      query: ({ id, ...body }) => ({ url: `/storyboards/${id}/batch`, method: 'PUT', body }),
    }),
    autoSplitStoryboard: builder.mutation<{ code: number; data: { scenes: any[] } }, { id: number; text: string }>({
      query: ({ id, ...body }) => ({ url: `/storyboards/${id}/auto-split`, method: 'POST', body }),
    }),
    getTemplates: builder.query<{ code: number; data: { templates: any[] } }, void>({
      query: () => '/storyboard-templates',
    }),
    getTemplate: builder.query<{ code: number; data: any }, number>({
      query: (id) => `/storyboard-templates/${id}`,
    }),
    applyTemplate: builder.mutation<{ code: number }, { storyboardId: number; templateId: number }>({
      query: ({ storyboardId, templateId }) => ({
        url: `/storyboards/${storyboardId}/apply-template/${templateId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Video'],
    }),
    saveAsTemplate: builder.mutation<{ code: number }, { storyboardId: number; name: string; category?: string }>({
      query: ({ storyboardId, ...body }) => ({
        url: `/storyboards/${storyboardId}/save-as-template`,
        method: 'POST',
        body,
      }),
    }),

    // Workflow execution — 异步：秒回 { runId, status }
    executeStoryboard: builder.mutation<{ code: number; data: { runId: number; status: string } }, { id: number; force?: boolean }>({
      query: ({ id, force }) => ({
        url: force ? `/storyboards/${id}/execute?force=true` : `/storyboards/${id}/execute`,
        method: 'POST',
      }),
    }),
    executeNode: builder.mutation<{ code: number; data: any }, { storyboardId: number; nodeId: number }>({
      query: ({ storyboardId, nodeId }) => ({
        url: `/storyboards/${storyboardId}/nodes/${nodeId}/execute`,
        method: 'POST',
      }),
      invalidatesTags: ['Video'],
    }),
    // 轮询：run 进度快照（run 状态 + 各节点 state）
    getRunProgress: builder.query<
      { code: number; data: { run: { id: number; status: string; startedAt: any; finishedAt: any; totalCredits: number }; nodes: { id: number; nodeType: string; state: string }[] } },
      { storyboardId: number; runId: number }
    >({
      query: ({ storyboardId, runId }) => `/storyboards/${storyboardId}/runs/${runId}`,
    }),
    getExecutionHistory: builder.query<{ code: number; data: { runs: any[] } }, number>({
      query: (id) => `/storyboards/${id}/runs`,
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useSendCodeMutation,
  useRegisterByEmailMutation,
  useLoginByEmailMutation,
  useResetPasswordMutation,
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
  // V1.7 Square
  useGetPublicVideosQuery,
  useCollectSquareVideoMutation,
  // User Profile
  useChangePasswordMutation,
  useGetModelConfigsQuery,
  useUpdateModelConfigMutation,
  useDeleteModelConfigMutation,
  // Storyboard
  useGetStoryboardListQuery,
  useGetStoryboardQuery,
  useCreateStoryboardMutation,
  useUpdateStoryboardMutation,
  useDeleteStoryboardMutation,
  useBatchUpdateStoryboardMutation,
  useAutoSplitStoryboardMutation,
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useApplyTemplateMutation,
  useSaveAsTemplateMutation,
  // Workflow execution
  useExecuteStoryboardMutation,
  useExecuteNodeMutation,
  useGetRunProgressQuery,
  useGetExecutionHistoryQuery,
} = videoApi
