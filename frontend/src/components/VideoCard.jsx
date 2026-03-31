import './VideoCard.css';

function VideoCard({ video, onClick }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getThumbnailUrl = (thumbnailPath) => {
    if (!thumbnailPath) return null;
    return thumbnailPath;
  };

  return (
    <div className="video-card" onClick={onClick}>
      <div className="thumbnail-wrapper">
        {video.thumbnail ? (
          <img
            src={getThumbnailUrl(video.thumbnail)}
            className="thumbnail"
            alt={video.title}
          />
        ) : (
          <div className="thumbnail-placeholder">🎬</div>
        )}
        {video.status === 'processing' && (
          <div className="processing-badge">提取文案中...</div>
        )}
      </div>
      <div className="video-info">
        <div className="video-title" title={video.title}>
          {truncateText(video.title, 20)}
        </div>
        <div className="video-meta">
          <span>{formatDate(video.created_at)}</span>
          <span>{video.uploader}</span>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
