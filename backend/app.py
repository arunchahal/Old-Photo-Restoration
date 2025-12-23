import os
from io import BytesIO

import cv2
import numpy as np
from flask import Flask, send_from_directory, send_file, request, abort

from restore_pipeline import restore_old_photo

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

ROOT_DIR = os.path.dirname(BACKEND_DIR)

FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
UPLOAD_DIR = os.path.join(ROOT_DIR, "uploads")
RESULT_DIR = os.path.join(ROOT_DIR, "results")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

app = Flask(__name__)



@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/style.css")
def style():
    return send_from_directory(FRONTEND_DIR, "style.css")


@app.route("/main.js")
def script():
    return send_from_directory(FRONTEND_DIR, "main.js")



@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/results/<path:filename>")
def results(filename):
    return send_from_directory(RESULT_DIR, filename)



@app.route("/api/restore", methods=["POST"])
def api_restore():
    if "file" not in request.files:
        abort(400, "No file field named 'file'")

    file = request.files["file"]
    if file.filename == "":
        abort(400, "No file selected")

    upload_path = os.path.join(UPLOAD_DIR, file.filename)
    file.seek(0)
    file.save(upload_path)

    file.seek(0)
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        abort(400, "Invalid image file")

    h = request.form.get("h", None)
    clahe = request.form.get("clahe", None)
    sharp = request.form.get("sharp", None)

    restored = restore_old_photo(img)

    name, _ = os.path.splitext(file.filename)
    result_filename = f"{name}_restored.png"
    result_path = os.path.join(RESULT_DIR, result_filename)
    cv2.imwrite(result_path, restored)

    success, buf = cv2.imencode(".png", restored)
    if not success:
        abort(500, "Failed to encode restored image")

    bio = BytesIO(buf.tobytes())
    bio.seek(0)

    return send_file(
        bio,
        mimetype="image/png",
        as_attachment=False,
        download_name=result_filename,
    )



if __name__ == "__main__":
    print("BACKEND_DIR:", BACKEND_DIR)
    print("ROOT_DIR:", ROOT_DIR)
    print("FRONTEND_DIR:", FRONTEND_DIR)
    print("UPLOAD_DIR:", UPLOAD_DIR)
    print("RESULT_DIR:", RESULT_DIR)
    app.run(debug=True)
