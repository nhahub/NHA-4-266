---
title: CV Inference API
emoji: 👁️
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# CV Inference API (FastAPI + YOLO + WebSockets)

A high-performance Computer Vision inference API built with **FastAPI** and **Ultralytics YOLO**, designed for real-time video processing. It features both a real-time live camera feed via **WebSockets** and a video file processing endpoint.

The application is structured using **Clean Architecture** principles and includes a complete **Docker** setup optimized for seamless deployment to **Hugging Face Spaces**.

## Features

- **Live Webcam Feed**: Send frames from your browser via WebSockets and receive YOLO-annotated frames back in real-time.
- **Video Upload**: Upload an MP4 video, process it frame-by-frame with YOLO, and download the annotated video.
- **Clean Architecture**: Separation of concerns (API routers, Core configs, Singleton CV service).
- **Hugging Face Ready**: Fully configured `Dockerfile` that meets Hugging Face Spaces' security (non-root `user` with ID 1000) and port (7860) requirements.
- **`uv` Support**: Extremely fast dependency resolution and environment setup using `uv`.

## Architecture & Directory Structure

```text
/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI Instance & Template setups
│   ├── api/
│   │   ├── main.py                 # API Router combining all routes
│   │   └── routes/
│   │       ├── camera.py           # WebSocket endpoint for real-time inference
│   │       └── video.py            # UploadFile endpoint for video processing
│   ├── core/
│   │   └── config.py               # Pydantic Settings (paths, confidence, image size)
│   └── services/
│       └── cv_service.py           # Singleton CV model wrapper (YOLO)
├── templates/
│   └── index.html                  # Frontend UI for WebSocket streaming & Video upload
├── pyproject.toml                  # Python project metadata and dependencies
├── Dockerfile                      # Hugging Face optimized Dockerfile
└── .dockerignore                   # Files to ignore in Docker build
```

## Running Locally

### Prerequisites
- Python >= 3.10
- `uv` (Astral's lightning-fast Python package installer)

### 1. Install Dependencies
Initialize the virtual environment and install dependencies:
```bash
uv sync
```

### 2. Model Placement
Make sure to place your YOLO model weights file (e.g., `yolov8n.pt` or `best.pt`) in the root directory. If you are using a custom model name, you can update it in `app/core/config.py`.

### 3. Run the Server
Start the FastAPI application using `uvicorn`:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### 4. Open in Browser
Open `http://localhost:8002` in your browser to access the frontend interface.

## Deploying to Hugging Face Spaces (Docker Space)

This repository is already perfectly configured for Hugging Face Docker Spaces.

1. Go to your [Hugging Face Spaces](https://huggingface.co/spaces) and create a **New Space**.
2. Select **Docker** as the Space SDK and choose **Blank**.
3. Upload the files of this repository to your Space.
4. Hugging Face will automatically read the `Dockerfile`, build the image, and serve the application on port `7860` as a non-root `user` (UID 1000).

## Tech Stack
- **FastAPI**: Backend framework
- **Ultralytics**: YOLO computer vision models
- **OpenCV**: Image, video, and frame processing
- **Jinja2**: HTML Template rendering
- **Pydantic**: Configuration and environment management
- **Docker**: Containerization
