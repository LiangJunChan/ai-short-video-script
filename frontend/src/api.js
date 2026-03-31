const API_BASE_URL = 'http://localhost:3000/api';

export async function getVideoList(page = 1, pageSize = 12) {
  const response = await fetch(`${API_BASE_URL}/videos?page=${page}&pageSize=${pageSize}`);
  return await response.json();
}

export async function getVideoDetail(id) {
  const response = await fetch(`${API_BASE_URL}/videos/${id}`);
  return await response.json();
}

export async function uploadVideo(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload`, true);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (onProgress) {
          onProgress(percent);
        }
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText).message || '上传失败'));
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('网络错误'));
    };
    
    xhr.send(formData);
  });
}

export async function getVideoText(id) {
  const response = await fetch(`${API_BASE_URL}/videos/${id}/copy`);
  return await response.json();
}
