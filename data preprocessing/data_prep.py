import os
import sys
import shutil
import random
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

RAW_DATA_DIR = Path(__file__).resolve().parent.parent / "trafic_data"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "dataset"

TRAIN_RATIO = 0.7
VAL_RATIO = 0.15
TEST_RATIO = 0.15

AUGMENTATIONS_PER_IMAGE = 2


def collect_all_samples(raw_dir: Path) -> list[tuple[Path, Path]]:
    pairs = []
    for split_name in ["train", "valid", "test"]:
        img_dir = raw_dir / split_name / "images"
        lbl_dir = raw_dir / split_name / "labels"
        if not img_dir.exists():
            continue
        for img_path in sorted(img_dir.glob("*.jpg")):
            lbl_path = lbl_dir / (img_path.stem + ".txt")
            if lbl_path.exists():
                pairs.append((img_path, lbl_path))
            else:
                print(f"[REMOVED] No label for: {img_path.name}")
                img_path.unlink()
    return pairs


def verify_and_clean(raw_dir: Path):
    removed = 0
    for split_name in ["train", "valid", "test"]:
        img_dir = raw_dir / split_name / "images"
        lbl_dir = raw_dir / split_name / "labels"
        if not img_dir.exists():
            continue

        for img_path in list(img_dir.glob("*.jpg")):
            lbl_path = lbl_dir / (img_path.stem + ".txt")
            if not lbl_path.exists():
                print(f"[CLEAN] Removing unmatched image: {img_path.name}")
                img_path.unlink()
                removed += 1

        if lbl_dir.exists():
            for lbl_path in list(lbl_dir.glob("*.txt")):
                img_path = img_dir / (lbl_path.stem + ".jpg")
                if not img_path.exists():
                    print(f"[CLEAN] Removing unmatched label: {lbl_path.name}")
                    lbl_path.unlink()
                    removed += 1

    print(f"[INFO] Verification complete. Removed {removed} unmatched files.")


def add_glare(image: Image.Image) -> Image.Image:
    arr = np.array(image, dtype=np.float32)
    h, w = arr.shape[:2]
    cx, cy = random.randint(w // 4, 3 * w // 4), random.randint(0, h // 3)
    Y, X = np.ogrid[:h, :w]
    radius = random.randint(min(h, w) // 6, min(h, w) // 3)
    dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
    mask = np.clip(1.0 - dist / radius, 0, 1)
    intensity = random.uniform(60, 120)
    for c in range(3):
        arr[:, :, c] = np.clip(arr[:, :, c] + mask * intensity, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


def add_noise(image: Image.Image) -> Image.Image:
    arr = np.array(image, dtype=np.float32)
    sigma = random.uniform(10, 30)
    noise = np.random.normal(0, sigma, arr.shape)
    arr = np.clip(arr + noise, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


def random_crop(image: Image.Image) -> tuple[Image.Image, tuple[float, float, float, float]]:
    w, h = image.size
    crop_ratio = random.uniform(0.7, 0.9)
    new_w = int(w * crop_ratio)
    new_h = int(h * crop_ratio)
    left = random.randint(0, w - new_w)
    top = random.randint(0, h - new_h)
    cropped = image.crop((left, top, left + new_w, top + new_h))
    return cropped, (left / w, top / h, new_w / w, new_h / h)


def adjust_labels_for_crop(label_lines: list[str], crop_params: tuple[float, float, float, float]) -> list[str]:
    left_frac, top_frac, w_frac, h_frac = crop_params
    adjusted = []
    for line in label_lines:
        parts = line.strip().split()
        if len(parts) < 5:
            continue
        cls_id = parts[0]
        cx, cy, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

        cx = (cx - left_frac) / w_frac
        cy = (cy - top_frac) / h_frac
        bw = bw / w_frac
        bh = bh / h_frac

        x_min = cx - bw / 2
        y_min = cy - bh / 2
        x_max = cx + bw / 2
        y_max = cy + bh / 2

        x_min = max(0, x_min)
        y_min = max(0, y_min)
        x_max = min(1, x_max)
        y_max = min(1, y_max)

        if x_max <= x_min or y_max <= y_min:
            continue

        new_cx = (x_min + x_max) / 2
        new_cy = (y_min + y_max) / 2
        new_bw = x_max - x_min
        new_bh = y_max - y_min

        if new_bw < 0.01 or new_bh < 0.01:
            continue

        adjusted.append(f"{cls_id} {new_cx:.6f} {new_cy:.6f} {new_bw:.6f} {new_bh:.6f}")
    return adjusted


def augment_image(img_path: Path, lbl_path: Path, out_img_dir: Path, out_lbl_dir: Path, idx: int):
    image = Image.open(img_path).convert("RGB")
    label_lines = lbl_path.read_text().strip().split("\n")

    for aug_i in range(AUGMENTATIONS_PER_IMAGE):
        aug_img = image.copy()
        aug_labels = list(label_lines)
        crop_params = None

        aug_type = random.choice(["glare", "noise", "crop", "blur", "brightness", "glare_noise"])

        if aug_type == "glare":
            aug_img = add_glare(aug_img)
        elif aug_type == "noise":
            aug_img = add_noise(aug_img)
        elif aug_type == "crop":
            aug_img, crop_params = random_crop(aug_img)
            aug_labels = adjust_labels_for_crop(aug_labels, crop_params)
            if not aug_labels:
                continue
        elif aug_type == "blur":
            radius = random.uniform(0.5, 2.0)
            aug_img = aug_img.filter(ImageFilter.GaussianBlur(radius=radius))
        elif aug_type == "brightness":
            factor = random.uniform(0.5, 1.5)
            aug_img = ImageEnhance.Brightness(aug_img).enhance(factor)
        elif aug_type == "glare_noise":
            aug_img = add_glare(aug_img)
            aug_img = add_noise(aug_img)

        aug_name = f"{img_path.stem}_aug{idx}_{aug_i}"
        aug_img.save(out_img_dir / f"{aug_name}.jpg", quality=95)
        (out_lbl_dir / f"{aug_name}.txt").write_text("\n".join(aug_labels))


def split_and_structure(pairs: list[tuple[Path, Path]], output_dir: Path):
    random.shuffle(pairs)

    n = len(pairs)
    n_train = int(n * TRAIN_RATIO)
    n_val = int(n * VAL_RATIO)

    splits = {
        "train": pairs[:n_train],
        "val": pairs[n_train:n_train + n_val],
        "test": pairs[n_train + n_val:],
    }

    for split_name, split_pairs in splits.items():
        img_dir = output_dir / split_name / "images"
        lbl_dir = output_dir / split_name / "labels"
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

        for i, (img_path, lbl_path) in enumerate(split_pairs):
            shutil.copy2(img_path, img_dir / img_path.name)
            shutil.copy2(lbl_path, lbl_dir / lbl_path.name)

            if split_name == "train":
                augment_image(img_path, lbl_path, img_dir, lbl_dir, i)

        print(f"[INFO] {split_name}: {len(split_pairs)} original samples", end="")
        if split_name == "train":
            total_imgs = len(list(img_dir.glob("*.jpg")))
            print(f" + {total_imgs - len(split_pairs)} augmented = {total_imgs} total")
        else:
            print()


def main():
    print("=" * 60)
    print("  Traffic Data Preprocessing Pipeline")
    print("=" * 60)

    if not RAW_DATA_DIR.exists():
        print(f"[ERROR] Raw data directory not found: {RAW_DATA_DIR}")
        sys.exit(1)

    if OUTPUT_DIR.exists():
        print(f"[INFO] Cleaning existing output directory: {OUTPUT_DIR}")
        shutil.rmtree(OUTPUT_DIR)

    print("\n[STEP 1] Verifying image-label pairs...")
    verify_and_clean(RAW_DATA_DIR)

    print("\n[STEP 2] Collecting all valid samples...")
    pairs = collect_all_samples(RAW_DATA_DIR)
    print(f"[INFO] Total valid pairs: {len(pairs)}")

    if len(pairs) == 0:
        print("[ERROR] No valid image-label pairs found!")
        sys.exit(1)

    print(f"\n[STEP 3] Splitting data (train={TRAIN_RATIO}, val={VAL_RATIO}, test={TEST_RATIO})...")
    print("[STEP 4] Applying augmentations to training set...")
    split_and_structure(pairs, OUTPUT_DIR)

    print("\n[DONE] Dataset ready at:", OUTPUT_DIR)
    print("=" * 60)


if __name__ == "__main__":
    main()
