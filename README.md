# 🚦 Traffic Vehicle Detection — Data Pipeline

A YOLO-based traffic vehicle detection project covering **21 vehicle classes** commonly found in real-world driving conditions. This repository handles the complete data preprocessing pipeline: verification, augmentation, and structured splitting.

---

## 📂 Project Structure

```
data-pipeline/
├── data preprocessing/
│   ├── data_prep.py        # Main preprocessing & augmentation script
│   └── data.yaml           # YOLO class mapping (21 classes)
├── dataset/                # Output: ready-to-train YOLO dataset
│   ├── train/
│   │   ├── images/
│   │   └── labels/
│   ├── val/
│   │   ├── images/
│   │   └── labels/
│   └── test/
│       ├── images/
│       └── labels/
├── trafic_data/            # Raw source data (not tracked by git)
├── .gitignore
├── pyproject.toml
└── README.md
```

---

## 🎯 Supported Classes (21)

| # | Class | # | Class | # | Class |
|---|-------|---|-------|---|-------|
| 0 | ambulance | 7 | human hauler | 14 | scooter |
| 1 | army vehicle | 8 | minibus | 15 | suv |
| 2 | auto rickshaw | 9 | minivan | 16 | taxi |
| 3 | bicycle | 10 | motorbike | 17 | three wheelers (CNG) |
| 4 | bus | 11 | pickup | 18 | truck |
| 5 | car | 12 | policecar | 19 | van |
| 6 | garbagevan | 13 | rickshaw | 20 | wheelbarrow |

---

## ⚙️ Data Preprocessing Pipeline

The `data_prep.py` script performs the following steps:

### Step 1 — Verification & Cleanup
- Scans all `.jpg` images and `.txt` label files
- Removes any unmatched files (images without labels or labels without images)

### Step 2 — Data Splitting
- Shuffles all valid image-label pairs (seed = 42 for reproducibility)
- Splits into **70% train / 15% val / 15% test**

### Step 3 — Data Augmentation (Training Set Only)
Each training image receives **2 augmented copies** using randomly selected transforms:

| Augmentation | Description |
|--------------|-------------|
| **Glare** | Simulates sun glare / headlight reflections |
| **Gaussian Noise** | Adds sensor noise (σ = 10–30) |
| **Random Crop** | Crops 70–90% of original with label coordinate adjustment |
| **Gaussian Blur** | Simulates motion blur / camera defocus |
| **Brightness** | Random brightness shift (0.5x–1.5x) |
| **Glare + Noise** | Combined sun glare with sensor noise |

### Pipeline Output

| Split | Original | Augmented | Total |
|-------|----------|-----------|-------|
| Train | 2,102 | 4,203 | **6,305** |
| Val | 450 | — | **450** |
| Test | 452 | — | **452** |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) package manager

### Installation & Run

```bash
# Clone the repository
git clone <repo-url>
cd depi_project

# Create virtual environment
uv venv
source .venv/bin/activate

# Install dependencies
uv add numpy Pillow

# Run the preprocessing pipeline
python "data preprocessing/data_prep.py"
```

The processed dataset will be generated at `./dataset/`.

---

## 📦 Dataset Access

The preprocessed dataset is hosted on Google Drive:

🔗 [Download Dataset](https://drive.google.com/drive/folders/1-ypRxNOTqVApmMqW2u9EzwZwSXbTQzc4?usp=drive_link)

---

## 🔀 Branch Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Stable production code |
| `data-pipeline` | Data preprocessing scripts & configurations |

---

## 🛠️ Tech Stack

- **Language**: Python 3.14
- **Image Processing**: Pillow, NumPy
- **Model Format**: YOLOv8 (Ultralytics)
- **Package Manager**: uv

---

## 👥 Team

DEPI Project — Traffic Vehicle Detection Team

---

## 📄 License

This project is developed for educational purposes as part of the DEPI program.
