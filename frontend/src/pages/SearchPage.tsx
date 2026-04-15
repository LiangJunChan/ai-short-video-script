import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useSearchVideosQuery,
  useGetSearchHistoryQuery,
  useClearSearchHistoryMutation,
  useGetCollectionsQuery,
  useGetTagsQuery,
} from '../store/videoApi'
import VideoCard from '../components/VideoCard'
import { Collection, Tag } from '../types'

function SearchPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>()
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | undefined>()
  const [sortBy, setSortBy] = useState('time_desc')
  const [page, setPage] = useState(1)
  const [showHistory, setShowHistory] = useState(false)

  const { data: searchResult, isLoading: searching } = useSearchVideosQuery({
    keyword: keyword || undefined,
    tagId: selectedTagId,
    collectionId: selectedCollectionId,
    sort: sortBy,
    page,
    pageSize: 20,
  }, {
    skip: !keyword && !selectedTagId && !selectedCollectionId,
  })

  const { data: historyData } = useGetSearchHistoryQuery(undefined, {
    skip: !showHistory,
  })
  const [clearHistory] = useClearSearchHistoryMutation()

  const { data: collectionsData } = useGetCollectionsQuery({ page: 1, pageSize: 100 })
  const { data: tagsData } = useGetTagsQuery({ page: 1, pageSize: 100 })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleHistoryClick = (historyKeyword: string) => {
    setKeyword(historyKeyword)
    setShowHistory(false)
    setPage(1)
  }

  const handleClearHistory = async () => {
    if (!confirm('确定要清空搜索历史吗？')) return
    try {
      await clearHistory().unwrap()
    } catch (err) {
      alert('清空失败')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-12 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/library')}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          ← 返回素材库
        </button>
        <h1 className="text-3xl font-bold text-gray-900">搜索素材库</h1>
      </div>

      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="搜索标题、文案内容..."
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            搜索
          </button>
        </div>

        {/* 搜索历史下拉 */}
        {showHistory && historyData?.data && historyData.data.length > 0 && (
          <div className="absolute mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">搜索历史</span>
              <button
                onClick={handleClearHistory}
                className="text-sm text-red-600 hover:text-red-700"
              >
                清空
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {historyData.data.map((h: any) => (
                <button
                  key={h.id}
                  onClick={() => handleHistoryClick(h.keyword)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                >
                  {h.keyword}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* 筛选条件 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 收藏夹筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            收藏夹
          </label>
          <select
            value={selectedCollectionId || ''}
            onChange={(e) => {
              setSelectedCollectionId(e.target.value ? parseInt(e.target.value) : undefined)
              setPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部收藏夹</option>
            {collectionsData?.data?.collections?.map((c: Collection) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 标签筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签
          </label>
          <select
            value={selectedTagId || ''}
            onChange={(e) => {
              setSelectedTagId(e.target.value ? parseInt(e.target.value) : undefined)
              setPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部标签</option>
            {tagsData?.data?.tags?.map((t: Tag) => (
              <option key={t.id} value={t.id}>#{t.name}</option>
            ))}
          </select>
        </div>

        {/* 排序 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            排序
          </label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="time_desc">最新创建</option>
            <option value="time_asc">最早创建</option>
            <option value="name">按名称排序</option>
          </select>
        </div>
      </div>

      {/* 搜索结果 */}
      {searching ? (
        <div className="text-center py-12">搜索中...</div>
      ) : searchResult?.data?.videos ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            找到 {searchResult.data.pagination.total} 个结果
          </p>
          {searchResult.data.videos.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <p className="text-gray-600">没有找到匹配的视频</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResult.data.videos.map((video: any) => (
                  <VideoCard 
                    key={video.id} 
                    video={video}
                    onClick={() => navigate(`/detail/${video.id}`)}
                    onDelete={() => {}}
                  />
                ))}
              </div>

              {/* 分页 */}
              {searchResult.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded border disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-gray-600">
                    {page} / {searchResult.data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(searchResult.data.pagination.totalPages, p + 1))}
                    disabled={page === searchResult.data.pagination.totalPages}
                    className="px-4 py-2 rounded border disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600">输入关键词或选择筛选条件开始搜索</p>
        </div>
      )}
    </div>
  )
}

export default SearchPage
