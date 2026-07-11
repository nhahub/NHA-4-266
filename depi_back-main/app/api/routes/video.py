from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from app.services.cv_service import cv_service
import cv2
import tempfile
import shutil
import os

router = APIRouter()

def process_video_generator(temp_input_name: str):
    cap = cv2.VideoCapture(temp_input_name)
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # معالجة الفريم
            annotated = cv_service.process_frame(frame)
            
            # تحويل الصورة إلى JPEG bytes
            ret, buffer = cv2.imencode('.jpg', annotated)
            frame_bytes = buffer.tobytes()
            
            # إرسال الفريم كجزء من Multipart stream (MJPEG)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()
        # حذف الفيديو المؤقت بعد الانتهاء
        if os.path.exists(temp_input_name):
            os.remove(temp_input_name)

@router.post("/process-video")
async def process_video_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(('.mp4', '.avi', '.mov')):
        return JSONResponse(status_code=400, content={"message": "Invalid file format. Please upload a video."})
        
    # حفظ الملف المرفوع مؤقتًا
    temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    with open(temp_input.name, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # إرجاع استجابة تدفق (Streaming) لكي تصل الفريمات مباشرة للفرونت إند
    return StreamingResponse(
        process_video_generator(temp_input.name), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
