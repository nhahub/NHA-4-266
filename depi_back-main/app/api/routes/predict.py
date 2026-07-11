import base64
import time

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.services.cv_service import cv_service

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/predict")
async def predict(frame: UploadFile = File(...), confidence: float = Form(0.4)):
    """
    Matches the AV dashboard's expected contract:
      POST /predict  (multipart/form-data: frame, confidence)
      -> { image: base64 JPEG, detections: [...], inference_time_ms: int }
    """
    started_at = time.perf_counter()

    raw_bytes = await frame.read()
    np_array = np.frombuffer(raw_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if image is None:
        return JSONResponse(status_code=400, content={"error": "Could not decode uploaded frame"})

    annotated, detections = cv_service.process_frame_with_detections(image, conf=confidence)

    success, buffer = cv2.imencode(".jpg", annotated)
    annotated_base64 = base64.b64encode(buffer.tobytes()).decode("utf-8")

    inference_time_ms = round((time.perf_counter() - started_at) * 1000)

    return {
        "image": annotated_base64,
        "detections": detections,
        "inference_time_ms": inference_time_ms,
    }
