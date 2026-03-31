import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideoList } from '../api';
import VideoCard from './VideoCard';
import Loading from './Loading';
import Pagination from './Pagination';

function VideoList({ onUploadSuccess }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
  });
  
  const navigate = useNavigate();

  const loadVideos = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getVideoList(page, pagination.pageSize);
      if (result.code === 200) {
        setVideos(result.data.videos || []);
        setPagination({
          ...pagination,
          page,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages,
        });
      }
    } catch (error) {
      console.error('加载视频列表失败:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos(pagination.page);
  }, []);

  const handlePageChange = (newPage) => {
    loadVideos(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCardClick = (videoId) => {
    navigate(`/detail/${videoId}`);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📹</div>
          <p>暂无视频上传，点击右上角上传视频</p>
        </div>
      ) : (
        <>
          <div className="video-list">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => handleCardClick(video.id)}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </>
  );
}

export default VideoList;
