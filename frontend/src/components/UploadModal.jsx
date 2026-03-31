import { useState } from 'react';
import { uploadVideo } from '../api';
import './UploadModal.css';

function UploadModal({ onClose, onUploadSuccess }) {
  const [step, setStep] = useState('select'); // select | form
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploader, setUploader] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;

    const allowedExtensions = ['.mp4', '.flv', '.mov'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      alert('不支持的文件格式，仅支持MP4、FLV、MOV');
      return;
    }

    if (file.size > 4 * 1024 * 1024 * 1024) {
      alert('文件大小不能超过4GB');
      return;
    }

    setSelectedFile(file);
    const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
    setTitle(defaultTitle);
    setStep('form');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('请先选择视频文件');
      return;
    }

    if (!title.trim()) {
      alert('请输入视频标题');
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('title', title.trim());
    if (uploader.trim()) {
      formData.append('uploader', uploader.trim());
    }

    try {
      const result = await uploadVideo(formData, (percent) => {
        setProgress(percent);
      });

      if (result.code === 200) {
        onUploadSuccess();
        window.location.reload();
      } else {
        alert(result.message || '上传失败');
      }
    } catch (error) {
      alert(error.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>上传视频</h2>

        {step === 'select' && (
          <div
            className="upload-area"
            onClick={() => document.getElementById('fileInput').click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📁</div>
            <p>点击或拖拽视频文件到此处上传</p>
            <p className="upload-hint">
              支持格式：MP4、FLV、MOV<br />
              文件大小：≤4GB<br />
              时长：15秒-10分钟
            </p>
            <input
              id="fileInput"
              type="file"
              accept=".mp4,.flv,.mov"
              hidden
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
          </div>
        )}

        {step === 'form' && (
          <div className="upload-form">
            <div className="form-group">
              <label>视频标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入视频标题"
              />
            </div>
            <div className="form-group">
              <label>上传者</label>
              <input
                type="text"
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                placeholder="默认为匿名用户"
              />
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
              <span className="progress-text">{progress}%</span>
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={onClose} disabled={uploading}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleUpload} disabled={uploading}>
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadModal;
