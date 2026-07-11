import uvicorn
from app.main import app

if __name__ == "__main__":
    # Hugging Face Spaces Gradio environment will run `python app.py`
    # and expects the server to listen on port 7860.
    uvicorn.run(app, host="0.0.0.0", port=7860)
