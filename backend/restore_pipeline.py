import cv2
import numpy as np


def grayworld_whitebalance(bgr):
    """Gray-world white balance on BGR uint8 image."""
    img = bgr.astype(np.float32) / 255.0
    if img.ndim != 3 or img.shape[2] != 3:
        return bgr

    b, g, r = cv2.split(img)
    mean_b, mean_g, mean_r = [c.mean() for c in (b, g, r)]
    mean_gray = (mean_b + mean_g + mean_r) / 3.0

    kb = mean_gray / (mean_b + 1e-6)
    kg = mean_gray / (mean_g + 1e-6)
    kr = mean_gray / (mean_r + 1e-6)

    b *= kb
    g *= kg
    r *= kr

    balanced = cv2.merge([b, g, r])
    balanced = np.clip(balanced, 0.0, 1.0)
    return (balanced * 255).astype(np.uint8)


def classical_pipeline(bgr_input, h=10.0, clahe_clip=2.0, sharp_amount=1.0):
    """
    Full classical restoration:
      - Gray-world WB
      - Lab + CLAHE on L
      - Median + NLMeans denoising
      - Unsharp mask for sharpening
    """
    img = bgr_input.copy()


    img = grayworld_whitebalance(img)

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    L, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=float(clahe_clip), tileGridSize=(8, 8))
    L_clahe = clahe.apply(L)


    L_med = cv2.medianBlur(L_clahe, 3)
    L_denoised = cv2.fastNlMeansDenoising(L_med, None,
                                          h=float(h),
                                          templateWindowSize=7,
                                          searchWindowSize=21)


    L_f = L_denoised.astype(np.float32) / 255.0
    blur = cv2.GaussianBlur(L_f, (5, 5), 1.2)
    sharp = L_f + float(sharp_amount) * (L_f - blur)
    sharp = np.clip(sharp, 0.0, 1.0)
    L_final = (sharp * 255).astype(np.uint8)

    lab_restored = cv2.merge([L_final, a, b])
    bgr_restored = cv2.cvtColor(lab_restored, cv2.COLOR_LAB2BGR)
    bgr_restored = np.clip(bgr_restored, 0, 255).astype(np.uint8)
    return bgr_restored



def op_denoise(bgr, h=10.0):
    """Stronger NLMeans denoising on full color image."""
    h = float(h)
    return cv2.fastNlMeansDenoisingColored(bgr, None, h, h, 7, 21)


def op_bilateral(bgr, sigma_color=75.0, sigma_space=25.0):
    """Bilateral smoothing (edge-preserving blur)."""
    sigma_color = float(sigma_color)
    sigma_space = float(sigma_space)
    # use diameter based on sigma_space
    d = int(max(5, sigma_space * 2 // 5) // 2 * 2 + 1)  # odd
    return cv2.bilateralFilter(bgr, d, sigma_color, sigma_space)


def op_clahe(bgr, clip_limit=2.0):
    """Re-apply CLAHE with new clip limit."""
    clip_limit = float(clip_limit)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    L, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    L2 = clahe.apply(L)

    lab2 = cv2.merge([L2, a, b])
    out = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)
    return out


def op_unsharp(bgr, amount=1.5, radius=1.5):
    """Unsharp mask on full color image."""
    amount = float(amount)
    radius = float(radius)
    if radius < 0.5:
        radius = 0.5
    ksize = int(radius * 4 + 1)
    if ksize % 2 == 0:
        ksize += 1

    img_f = bgr.astype(np.float32) / 255.0
    blur = cv2.GaussianBlur(img_f, (ksize, ksize), radius)
    sharp = img_f + amount * (img_f - blur)
    sharp = np.clip(sharp, 0.0, 1.0)
    return (sharp * 255).astype(np.uint8)


def op_sharpen(bgr, strength=1.0):
    """Simple kernel-based sharpening."""
    strength = float(strength)
    # Base sharpening kernel
    kernel = np.array([[0, -1, 0],
                       [-1, 4 + strength * 2, -1],
                       [0, -1, 0]], dtype=np.float32)
    kernel /= (kernel.sum() if kernel.sum() != 0 else 1.0)

    out = cv2.filter2D(bgr, -1, kernel)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return out


def op_brightness_contrast(bgr, brightness=0.0, contrast=1.0):
    """
    brightness in approx [-50, 50]
    contrast is a multiplier around 1.0
    """
    brightness = float(brightness)
    contrast = float(contrast)

    img = bgr.astype(np.float32)

    alpha = contrast
    beta = brightness 

    out = img * alpha + beta
    out = np.clip(out, 0, 255).astype(np.uint8)
    return out


def restore_old_photo(bgr_input, op=None, h=10.0,
                      clahe_clip=2.0, sharp_amount=1.0,
                      params=None):
    """
    bgr_input: BGR uint8
    op:
      - None or "" → full classical pipeline (Upload & Restore)
      - "denoise"   → NLMeans
      - "bilateral" → bilateral filter
      - "clahe"     → contrast boost
      - "unsharp"   → unsharp mask
      - "sharpen"   → kernel sharpen
      - "brightness"→ brightness/contrast

    params: dict with extra keys depending on op
    """
    if params is None:
        params = {}

    if op is None or op == "" or op == "pipeline":
        return classical_pipeline(bgr_input,
                                  h=h,
                                  clahe_clip=clahe_clip,
                                  sharp_amount=sharp_amount)

    img = bgr_input.copy()

    if op == "denoise":
        h_local = params.get("h", h)
        return op_denoise(img, h=h_local)

    if op == "bilateral":
        sigma_color = params.get("sigmaColor", 75.0)
        sigma_space = params.get("sigmaSpace", 25.0)
        return op_bilateral(img,
                            sigma_color=sigma_color,
                            sigma_space=sigma_space)

    if op == "clahe":
        clip = params.get("clahe", clahe_clip)
        return op_clahe(img, clip_limit=clip)

    if op == "unsharp":
        amount = params.get("sharp", sharp_amount)
        radius = params.get("radius", 1.5)
        return op_unsharp(img,
                          amount=amount,
                          radius=radius)

    if op == "sharpen":
        strength = params.get("sharp", sharp_amount)
        return op_sharpen(img, strength=strength)

    if op == "brightness":
        brightness = params.get("brightness", 0.0)
        contrast = params.get("contrast", 1.0)
        return op_brightness_contrast(img,
                                      brightness=brightness,
                                      contrast=contrast)
    return classical_pipeline(bgr_input,
                              h=h,
                              clahe_clip=clahe_clip,
                              sharp_amount=sharp_amount)
