import os
import numpy as np
from PIL import Image

def generate_kraken_motion():
    src_path = 'graphics/sprites/sea/kraken.png'
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    
    pad = 24
    arr = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.float32)
    arr[pad:-pad, pad:-pad] = np.asarray(im, np.float32)
    H, W = arr.shape[:2]
    
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = xx - pad
    sy = yy - pad

    # Helper: smooth region mask
    def make_mask(cx, cy, rx, ry):
        d = np.sqrt(((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2)
        mask = np.clip((1.2 - d) / 0.5, 0.0, 1.0)
        return 0.5 - 0.5 * np.cos(mask * np.pi)

    # Anatomical masks:
    # 1. Left Upper Raised Tentacle (curves up high on the left)
    m_up_left = make_mask(75, 110, 65, 80)
    # 2. Right Upper Raised Tentacle (curves up high on the right)
    m_up_right = make_mask(390, 110, 65, 80)
    
    # 3. Left Lower Outer Tentacle (sweeping arm on lower left)
    m_low_left_outer = make_mask(60, 220, 65, 70)
    # 4. Left Lower Inner Tentacle
    m_low_left_inner = make_mask(160, 240, 55, 60)
    
    # 5. Right Lower Outer Tentacle (sweeping arm on lower right)
    m_low_right_outer = make_mask(405, 220, 65, 70)
    # 6. Right Lower Inner Tentacle
    m_low_right_inner = make_mask(305, 240, 55, 60)
    
    # 7. Center Lower Tentacles
    m_center_low = make_mask(232, 245, 50, 55)
    
    # 8. Crowned Mantle / Head (stays menacingly stable with breathing pulse)
    m_head = make_mask(232, 95, 75, 80)

    def sample_bilinear(src, px, py):
        h_s, w_s = src.shape[:2]
        px = np.clip(px, 0, w_s - 1.001)
        py = np.clip(py, 0, h_s - 1.001)
        x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int)
        fx = (px - x0)[..., None]; fy = (py - y0)[..., None]
        a = src[y0, x0]; b = src[y0, x0 + 1]
        c = src[y0 + 1, x0]; d = src[y0 + 1, x0 + 1]
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

    num_frames = 8
    frames = []

    # Movement parameters:
    # Upper tentacles: dramatic curling / flexing inward and uncurling
    # Lower tentacles: slithering crawling ripple (sinusoidal undulation out of phase)
    # Head: breathing hover bob
    
    for f in range(num_frames):
        theta = 2.0 * np.pi * f / num_frames
        
        # 1. Left Upper Tentacle:
        # Reaches up, curves inward to clutch, then opens
        curl_L = np.sin(theta)
        dx_up_left = np.sin(theta) * 14.0       # Reaches toward center & back
        dy_up_left = -np.cos(theta) * 10.0      # Rises and dips
        
        # 2. Right Upper Tentacle (counter-phase for organic asymmetry):
        curl_R = np.sin(theta + 2.5)
        dx_up_right = -np.sin(theta + 2.5) * 14.0 # Reaches toward center & back
        dy_up_right = -np.cos(theta + 2.5) * 10.0
        
        # 3 & 4. Left Lower Tentacles:
        # Travelling muscular wave: outer sweeps outward and lifts, inner pushes down
        wave_L1 = theta + 1.2
        dx_low_left_outer = np.sin(wave_L1) * 12.0
        dy_low_left_outer = -np.cos(wave_L1) * 12.0  # Lifts and pushes
        
        wave_L2 = theta + 2.4
        dx_low_left_inner = np.sin(wave_L2) * 9.0
        dy_low_left_inner = -np.cos(wave_L2) * 10.0
        
        # 5 & 6. Right Lower Tentacles:
        wave_R1 = theta + 3.8
        dx_low_right_outer = np.sin(wave_R1) * 12.0
        dy_low_right_outer = -np.cos(wave_R1) * 12.0
        
        wave_R2 = theta + 5.0
        dx_low_right_inner = np.sin(wave_R2) * 9.0
        dy_low_right_inner = -np.cos(wave_R2) * 10.0
        
        # 7. Center Lower:
        dx_center = np.sin(theta * 2.0) * 4.0
        dy_center = np.cos(theta * 2.0) * 6.0
        
        # 8. Head: majestic breathing hover
        dy_head = -np.sin(theta) * 4.0
        dx_head = np.cos(theta * 0.5) * 2.0

        # Accumulate blended field:
        total_w = (
            m_up_left + m_up_right +
            m_low_left_outer + m_low_left_inner +
            m_low_right_outer + m_low_right_inner +
            m_center_low + m_head + 1e-5
        )
        
        tdx = (
            m_up_left * dx_up_left +
            m_up_right * dx_up_right +
            m_low_left_outer * dx_low_left_outer +
            m_low_left_inner * dx_low_left_inner +
            m_low_right_outer * dx_low_right_outer +
            m_low_right_inner * dx_low_right_inner +
            m_center_low * dx_center +
            m_head * dx_head
        ) / np.maximum(1.0, total_w)
        
        tdy = (
            m_up_left * dy_up_left +
            m_up_right * dy_up_right +
            m_low_left_outer * dy_low_left_outer +
            m_low_left_inner * dy_low_left_inner +
            m_low_right_outer * dy_low_right_outer +
            m_low_right_inner * dy_low_right_inner +
            m_center_low * dy_center +
            m_head * dy_head
        ) / np.maximum(1.0, total_w)

        # Sample grid
        sampled = sample_bilinear(arr, xx - tdx, yy - tdy)
        cropped = sampled[pad:-pad, pad:-pad]
        frame = Image.fromarray(np.clip(cropped, 0, 255).astype(np.uint8), 'RGBA')
        frames.append(frame)

    return frames

if __name__ == '__main__':
    frames = generate_kraken_motion()
    out_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"
    for i, f in enumerate(frames):
        f.save(os.path.join(out_dir, f'kraken_test_{i}.png'))
    frames[0].save(
        os.path.join(out_dir, 'kraken_animated_test.gif'),
        save_all=True,
        append_images=frames[1:],
        duration=125,
        loop=0
    )
    print('Generated kraken_animated_test.gif successfully!')

