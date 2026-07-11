import cv2
from ultralytics import YOLO

class CVEngine:
    def __init__(self, model_path='best.pt'):
        # سيتم تحميل الموديل مرة واحدة فقط عند بدء تشغيل السيرفر
        self.model = YOLO(model_path)

    def process_frame(self, frame):
        # عمل Inference على الفريم
        results = self.model(frame, conf=0.4, imgsz=320, verbose=False)
        annotated_frame = results[0].plot()
        return annotated_frame
