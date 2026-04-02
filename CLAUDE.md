# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI短视频脚本平台 - A lightweight platform for uploading short videos and extracting AI-powered transcriptions (script text). Currently V1.0 core features are implemented.

## Tech Stack

- **Backend**: Go 1.21+ with Gin framework
- **Frontend**: React 19 + Vite
- **Database**: SQLite (file: `backend/videos.db`)
- **Media Processing**: FFmpeg for thumbnail capture and audio extraction
- **AI Speech Recognition**: Stub interface in `backend/service/processor.go` - requires implementation

## Commands

### Backend
```bash
cd backend
go mod tidy        # Install dependencies
go build -o server # Build binary
./server           # Run server on :3000
```

### Frontend
```bash
cd frontend
npm install        # Install dependencies
npm run dev        # Dev server on :5173
npm run build      # Production build
npm run lint       # Run ESLint
```

## Architecture

### Backend (`backend/`)
- `main.go` - Entry point, Gin router setup, CORS middleware, static file serving for `/uploads`, `/thumbnails`
- `database/db.go` - SQLite operations (CRUD for videos table), Video struct definition
- `handler/video.go` - HTTP handlers for all 4 API endpoints, unified `APIResponse` format
- `service/processor.go` - FFmpeg wrapper functions (thumbnail capture, audio extraction, duration), `RecognizeSpeech()` stub, async `ProcessVideoAI()` goroutine

**Key flow**: Upload → Validate format/size/duration → Save file → Extract thumbnail via FFmpeg → Create DB record → Spawn goroutine for async AI processing

### Frontend (`frontend/src/`)
- `App.jsx` - Root component, upload modal trigger
- `api.js` - All API calls (proxied through Vite to backend)
- `components/` - VideoCard, UploadModal, Loading, Pagination, Toast
- `pages/` - DetailPage with video player and AI text display

**API Proxy**: Frontend Vite dev server proxies `/api` requests to `http://localhost:3000`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/videos?page=N&pageSize=N` | Paginated video list |
| GET | `/api/videos/:id` | Video detail with `videoUrl`, `thumbnail`, `ai_text`, `status` |
| POST | `/api/upload` | Multipart upload (video file + title, uploader fields) |
| GET | `/api/videos/:id/copy` | Get AI text for clipboard copy |

Video `status` field: `processing` → `done` or `failed`

## Storage Directories

- `uploads/` - Original video files (named `video_{uuid}.{ext}`)
- `thumbnails/` - FFmpeg-captured JPG thumbnails (named `thumb_{uuid}.jpg`)
- `audio/` - Temporary WAV files extracted for speech recognition

## Speech Recognition Integration

To enable AI transcription, implement `RecognizeSpeech()` in `backend/service/processor.go:106`. Currently returns error. Options: Fun-ASR (local), 阿里云, 百度语音识别.

## File Upload Constraints

- Formats: MP4, FLV, MOV
- Max size: 4GB
- Duration: 15 seconds - 10 minutes
