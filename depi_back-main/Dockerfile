FROM python:3.11-slim

# إعداد البيئة وتثبيت المكتبات الأساسية للنظام (مهم جداً لعمل OpenCV)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces تتطلب أن يعمل التطبيق بمستخدم غير الـ Root للـ Security
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    YOLO_CONFIG_DIR=/tmp/Ultralytics

# ضبط مجلد العمل
WORKDIR $HOME/app

# نسخ ملفات المشروع للمجلد مع إعطاء الصلاحيات للمستخدم
COPY --chown=user . $HOME/app

# تحديث pip وتثبيت أداة uv
RUN pip install --upgrade pip --no-cache-dir && pip install --no-cache-dir uv

# تثبيت الحزم باستخدام uv للسرعة وتوافق عالي
RUN uv pip install --system -e .

# منصة Hugging Face تتوقع من السيرفر أن يعمل على البورت 7860
EXPOSE 7860

# أمر تشغيل السيرفر
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
