import { useState, useEffect } from 'react';
import './App.css';
import VideoList from './components/VideoList';
import UploadModal from './components/UploadModal';
import Toast from './components/Toast';

function App() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">AI短视频脚本平台</h1>
        <button className="upload-btn" onClick={() => setShowUploadModal(true)}>
          上传视频
        </button>
      </header>

      <main className="main">
        <VideoList onUploadSuccess={() => {
          showToast('上传成功，正在提取文案...');
        }} />
      </main>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            showToast('上传成功，正在提取文案...');
            // 刷新列表会在VideoList组件处理
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

export default App;
