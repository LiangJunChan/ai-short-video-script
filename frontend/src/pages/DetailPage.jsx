import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoDetail } from '../api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import './DetailPage.css';

function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadVideoDetail();
  }, [id]);

  const loadVideoDetail = async () => {
    setLoading(true);
    try {
      const result = await getVideoDetail(id);
      if (result.code === 200) {
        setVideo(result.data);
      } else {
        showToast(result.message || '加载失败');
      }
    } catch (error) {
      console.error('加载视频详情失败:', error);
      showToast('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleCopy = async () => {
    if (!video.ai_text) {
      showToast('没有可复制的文案');
      return;
    }

    try {
      await navigator.clipboard.writeText(video.ai_text);
      showToast('文案已复制');
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = video.ai_text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('文案已复制');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const getVideoUrl = () => {
    return video.videoUrl;
  };

  const getStatusText = () => {
    switch (video.status) {
      case 'processing':
        return '正在提取文案，请稍候...';
      case 'failed':
        return '当前视频暂无法提取文案，请尝试上传清晰且包含中文语音的视频';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <Loading />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="container">
        <div className="error-container">
          <p>视频不存在或加载失败</p>
          <button className="back-btn" onClick={() => navigate('/')}>
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="back-bar">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
      </div>

      <div className="video-container">
        <video
          id="videoPlayer"
          src={getVideoUrl()}
          controls
          playsInline
        />
        <div className="video-info">
          <h1 className="video-title">{video.title}</h1>
          <div className="video-meta">
            <span>{formatDate(video.createdAt)}</span>
            <span className="separator">·</span>
            <span>{video.uploader}</span>
          </div>
        </div>
      </div>

      <div className="text-container">
        <div className="text-header">
          <h2 className="text-title">AI提取文案</h2>
          {video.status === 'done' && video.ai_text && (
            <button className="copy-btn" onClick={handleCopy}>
              复制文案
            </button>
          )}
        </div>
        <hr />
        {video.status === 'processing' && (
          <div className="status-message processing">{getStatusText()}</div>
        )}
        {video.status === 'failed' && (
          <div className="status-message failed">{getStatusText()}</div>
        )}
        {video.status === 'done' && video.ai_text && (
          <div className="ai-text">{video.ai_text}</div>
        )}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}

export default DetailPage;
