import cv2
from ultralytics import YOLO
import time

# مؤقتاً بنستخدم yolov8n.pt لحد ما يوصل best.pt من فريق التدريب
model = YOLO('yolov8n.pt')

cap = cv2.VideoCapture(0)  # أو path فيديو الداشكام

prev_time = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.4, imgsz=320, verbose=False)
    annotated = results[0].plot()

    curr_time = time.time()
    fps = 1 / (curr_time - prev_time)
    prev_time = curr_time
    cv2.putText(annotated, f"FPS: {fps:.1f}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv2.imshow("Inference", annotated)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()