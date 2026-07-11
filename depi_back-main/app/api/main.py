from fastapi import APIRouter
from app.api.routes import camera, video, predict

api_router = APIRouter()

api_router.include_router(camera.router, prefix="/ws", tags=["camera"])
api_router.include_router(video.router, prefix="/video", tags=["video"])
api_router.include_router(predict.router, tags=["prediction"])