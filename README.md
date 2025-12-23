# Old Photo Restoration Project

An intelligent image restoration system that enhances and restores old, damaged, or degraded photographs using **classical image processing techniques**. The project aims to improve photo clarity by removing noise, scratches, blur, and restoring missing details.

---

## 📌 Project Overview

Old photographs often suffer from:
- Noise and grain
- Scratches and cracks
- Fading and low contrast
- Blur and missing details

This project provides a **digital solution** to restore such images using:
- Traditional (classical) image processing methods

The system can be used for **personal photo preservation, archives, museums, and digital history projects**.

---
## 📸 Before and After Comparison
| Original | Restored |
|---------|----------|
| <img src="assets/comparison/oldphoto.jpg" width="300"/> | <img src="assets/comparison/restored.png" width="300"/> |
---
## ✨ Features

- Upload and restore old or damaged photos
- Noise removal and smoothing
- Scratch and defect reduction
- Contrast and sharpness enhancement
- Simple and clean user interface
- Download restored image

---

## 🛠️ Technologies Used

### Frontend
- HTML
- CSS
- JavaScript

### Backend / Processing
- Python
- OpenCV
- Flask

### Tools & Libraries
- Flask (for backend API)
- Image Processing Filters

---

## ⚙️ Methodology

### Classical Image Processing
- Grayscale conversion
- Noise reduction (Median / Gaussian filters)
- Edge enhancement
- Contrast adjustment (Histogram Equalization)
- Image sharpening

---

## 🚀 How to Run the Project

### Prerequisites
- Python 3.x
- pip installed

### Installation
``` bash
git clone https://github.com/arunchahal/Old-Photo-Restoration.git cd Old-Photo-Restoration pip install -r requirements.txt

```

### Run the Application
``` bash
python app.py

```

Open your browser and go to:

http://localhost:5000

---

## 📂 Project Structure
```
Old-Photo-Restoration/
│
├── frontend/
│   ├── style.css
│   ├── script.js
│   └── index.html
│
├── backend/
│   ├── restore_pipline.py
│   ├── requirements.txt
│   └── app.py
│
├── uploads/
│   
└── results
```
---

## 🎯 Future Improvements

- Colorization of black & white photos
- Face restoration and enhancement
- Batch image processing
- Cloud deployment

---

## 📜 License

This project is developed for academic and learning purposes.
Free to use and modify.

---

## ⭐ Acknowledgements

- OpenCV Documentation
- Research papers on image restoration

---

## 📬 Contact

For queries or suggestions:
- GitHub: https://github.com/arunchahal
- Email: arunchahal.work@gmail.com
