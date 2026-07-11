from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.cv_service import cv_service
import cv2
import numpy as np
import base64

router = APIRouter()

@router.websocket("/live-camera")
async def live_camera_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # استقبال الفريم المشفر (base64) من الواجهة
            data = await websocket.receive_text()
            
            # فك التشفير
            encoded_data = data.split(',')[1]
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                # معالجة الفريم
                annotated_frame = cv_service.process_frame(frame)
                
                # إعادة التشفير والإرسال
                _, buffer = cv2.imencode('.jpg', annotated_frame)
                b64_str = base64.b64encode(buffer).decode('utf-8')
                
                await websocket.send_text(f"data:image/jpeg;base64,{b64_str}")
    except WebSocketDisconnect:
        print("Client disconnected from live camera feed")
    except Exception as e:
        print(f"Error in websocket connection: {e}")
