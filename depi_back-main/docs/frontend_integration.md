# دليل ربط الفرونت إند (Frontend Integration Guide)

يشرح هذا الدليل كيفية ربط واجهة المستخدم (الفرونت إند) بالخدمات الخلفية (الباك إند) الخاصة بمعالجة الفيديو والبث المباشر للكاميرا في هذا المشروع.

الباك إند يعمل افتراضياً على العنوان التالي: `http://localhost:8002`

---

## 1. رفع ومعالجة الفيديو كبث مباشر (Video Processing Stream)
هذه نقطة النهاية (Endpoint) تستقبل ملف فيديو وترد ببث مباشر (Live Stream) من الإطارات المعالجة (MJPEG Stream)، مما يسمح بعرض النتيجة فوراً أثناء المعالجة بدون انتظار.

- **الرابط:** `http://localhost:8002/api/video/process-video`
- **نوع الطلب:** `POST`
- **نوع البيانات المرسلة:** `multipart/form-data` (ملف مرفوع بمتغير باسم `file`)

### مثال للربط باستخدام JavaScript (Fetch API)

بما أننا نستقبل بث بصيغة `multipart/x-mixed-replace` عبر `POST`، يجب قراءة الـ Stream كالتالي:

```javascript
async function uploadAndStreamVideo(fileElementId, imageElementId) {
    const fileInput = document.getElementById(fileElementId);
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const imgElement = document.getElementById(imageElementId);

    try {
        const response = await fetch("http://localhost:8002/api/video/process-video", {
            method: "POST",
            body: formData,
        });

        // قراءة الـ Stream القادم من السيرفر
        const reader = response.body.getReader();
        let buffer = new Uint8Array();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // دمج الحزم الجديدة (Chunks)
            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;

            // استخراج فريم الـ JPEG عن طريق البحث عن بداية ونهاية الصورة 
            // البداية: 0xFF 0xD8 والنهاية: 0xFF 0xD9
            let start = -1;
            let end = -1;

            for (let i = 0; i < buffer.length - 1; i++) {
                if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) start = i;
                if (buffer[i] === 0xFF && buffer[i+1] === 0xD9) end = i + 2;
                
                if (start !== -1 && end !== -1 && end > start) {
                    const jpegData = buffer.slice(start, end);
                    const blob = new Blob([jpegData], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    
                    // عرض الإطار (الصورة)
                    imgElement.src = url;
                    
                    // تنظيف البافر
                    buffer = buffer.slice(end);
                    start = -1;
                    end = -1;
                }
            }
        }
    } catch (error) {
        console.error("Error streaming video:", error);
    }
}
```

---

## 2. البث المباشر من كاميرا الويب (Live WebCam)
هذه نقطة النهاية تعتمد على تقنية **WebSocket**. تسمح بإرسال إطارات الكاميرا مباشرة من المتصفح إلى السيرفر ليقوم بمعالجتها وإعادتها فوراً لكي يتم عرضها.

- **الرابط:** `ws://localhost:8002/api/ws/live-camera`
- **نوع الاتصال:** `WebSocket`
- **نوع البيانات المرسلة والمستقبلة:** نصوص `Base64`

### مثال للربط باستخدام JavaScript (WebSockets)

```javascript
// عنصر عرض فيديو الكاميرا الأصلية المخفي
const videoElement = document.getElementById("my-webcam"); 
// عنصر عرض الفيديو المعالج القادم من الباك إند
const processedImageElement = document.getElementById("processed-frame"); 

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
let ws;

// دالة لتشغيل الكاميرا والاتصال
async function startLiveCamera() {
    // 1. طلب صلاحيات الكاميرا
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        videoElement.play();
    } catch (err) {
        console.error("Error accessing camera:", err);
        return;
    }

    // 2. فتح اتصال الـ WebSocket
    ws = new WebSocket("ws://localhost:8002/api/ws/live-camera");

    ws.onopen = () => {
        console.log("WebSocket connected!");
        
        // 3. إرسال الإطارات للسيرفر بانتظام
        setInterval(() => {
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                // ضبط أبعاد اللوحة على حسب الكاميرا
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                
                // رسم الفريم الحالي للكاميرا على الـ Canvas
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                // تحويل الفريم إلى Base64 وإرساله
                const frameData = canvas.toDataURL("image/jpeg");
                ws.send(frameData); 
            }
        }, 100); // 10 إطارات في الثانية (يمكنك تقليل الرقم لزيادة السلاسة 50 مثلاً)
    };

    // 4. استقبال الإطارات المعالجة من السيرفر وعرضها
    ws.onmessage = (event) => {
        // السيرفر يرد بنص يبدأ بـ data:image/jpeg;base64,...
        processedImageElement.src = event.data; 
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected!");
    };
}

// دالة لإيقاف البث
function stopLiveCamera() {
    if (ws) {
        ws.close();
    }
    const stream = videoElement.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}
```

---

## 💡 نصائح هامة
1. **أداء الكاميرا المباشرة**: معدل الإرسال `setInterval(..., 100)` يحدد عدد الفريمات المرسلة للسيرفر في الثانية (حوالي 10 فريمات). إذا كنت تريد حركة أسلس، يمكنك تقليله لـ `50` أو `30`، ولكن تأكد من أن جهاز الخادم (Server) قادر على معالجتها بتلك السرعة.
2. **الـ CORS**: إذا كان الفرونت إند يعمل على منفذ أو دومين مختلف عن `localhost:8002`، فتأكد من تفعيل إعدادات الـ CORS في ملف الـ `FastAPI` الأساسي (`main.py`).
