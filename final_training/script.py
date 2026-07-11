!pip install ultralytics
from google.colab import drive
drive.mount('/content/drive', force_remount=True)

import os
base_path = "/content/drive/MyDrive/Real-Time object detection , Depi "
zip_path = os.path.join(base_path, "dataset.zip")
dataset_target = os.path.join(base_path, "dataset")
!unzip "{zip_path}" -d "{base_path}"

if not os.path.exists(dataset_target):
    os.makedirs(dataset_target)
    for folder in ['train', 'val', 'test']:
        source = os.path.join(base_path, folder)
        dest = os.path.join(dataset_target, folder)
        if os.path.exists(source):
            os.rename(source, dest)
            print(f"تم نقل {folder} إلى داخل dataset")
yaml_url = "https://raw.githubusercontent.com/amerelfalwo/depi_project/refs/heads/main/data%20preprocessing/data.yaml"
target_yaml = os.path.join(base_path, 'data.yaml')
!wget -O "{target_yaml}" "{yaml_url}"

import yaml
import os
base_path = "/content/drive/MyDrive/Real-Time object detection , Depi /"
yaml_path = os.path.join(base_path, "data.yaml")
with open(yaml_path, 'r') as f:
    data = yaml.safe_load(f)

data['path'] = base_path + "dataset"
data['train'] = "train/images"
data['val'] = "val/images"
data['test'] = "test/images"

with open(yaml_path, 'w') as f:
    yaml.dump(data, f)




#Model Training
from ultralytics import YOLO

model = YOLO('yolov8n.pt')

model.train(
    data='/content/drive/MyDrive/Real-Time object detection , Depi /data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    project='/content/drive/MyDrive/Real-Time object detection , Depi /',
    name='final_training',
    exist_ok=True
)