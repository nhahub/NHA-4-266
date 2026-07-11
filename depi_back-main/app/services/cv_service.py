import cv2
import numpy as np
from ultralytics import YOLO
from app.core.config import settings

class CVService:
    def __init__(self):
        # يتم تحميل الموديل مرة واحدة باستخدام الإعدادات
        self.model = YOLO(settings.MODEL_PATH)
        self.conf = settings.CONFIDENCE_THRESHOLD
        self.imgsz = settings.IMAGE_SIZE

    def process_frame(self, frame: np.ndarray) -> np.ndarray:
        # تنفيذ Inference على الصورة
        results = self.model(frame, conf=self.conf, imgsz=self.imgsz, verbose=False)
        annotated_frame = results[0].plot()
        return annotated_frame

    def process_frame_with_detections(self, frame: np.ndarray, conf: float | None = None):
        """
        Same inference as process_frame(), but also returns a structured
        detections list (label, confidence, bbox as % of frame) instead of
        only burning boxes into the pixels. Used by the REST /predict route
        so the frontend can render its own overlay and detection list.
        """
        confidence = self.conf if conf is None else conf
        results = self.model(frame, conf=confidence, imgsz=self.imgsz, verbose=False)
        result = results[0]
        annotated_frame = result.plot()

        height, width = frame.shape[:2]
        detections = []
        for i, box in enumerate(result.boxes):
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            class_id = int(box.cls[0])
            label = self.model.names[class_id]
            box_conf = float(box.conf[0])
            detections.append({
                "id": str(i),
                "label": label,
                "confidence": round(box_conf, 4),
                "bbox": [
                    round((x1 / width) * 100, 2),
                    round((y1 / height) * 100, 2),
                    round(((x2 - x1) / width) * 100, 2),
                    round(((y2 - y1) / height) * 100, 2),
                ],
            })

        return annotated_frame, detections

# يتم إنشاء نسخة واحدة (Singleton) لتستخدم في كامل التطبيق
cv_service = CVService()
