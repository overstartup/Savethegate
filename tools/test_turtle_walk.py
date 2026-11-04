import os
import numpy as np
from PIL import Image

def generate_turtle_walk():
    src_path = 'graphics/sprites/sea/turtle.png'
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    
    pad = 24
    arr = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.float32)
    arr[pad:-pad, pad:-pad] = np.asarray(im, np.float32)
    H, W = arr.shape[:2]
    
    # Grid in padded coordinates
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # Original sprite coordinates (unpadded)
    sx = xx - pad
    sy = yy - pad

    # Helper: smooth Gaussian or bell influence field
    def limb_weight(cx, cy, rx, ry):
        d2 = ((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2
        return np.clip(np.exp(-d2 * 1.8), 0.0, 1.0)

    # 1. Rear-Left Leg (Leg 1): x ~ 55, y ~ 220
    w_leg1 = limb_weight(55, 230, 45, 45)
    # 2. Front-Left Leg (Leg 2): x ~ 130, y ~ 240
    w_leg2 = limb_weight(130, 245, 45, 55)
    # 3. Rear-Right Leg (Leg 3): x ~ 215, y ~ 230
    w_leg3 = limb_weight(215, 235, 35, 40)
    # 4. Front-Right Leg (Leg 4): x ~ 335, y ~ 230
    w_leg4 = limb_weight(335, 235, 48, 55)
    # Head & Neck: x ~ 320, y ~ 160
    w_head = limb_weight(320, 165, 55, 45)
    # Body / Shell: x ~ 180, y ~ 120
    w_body = limb_weight(180, 120, 130, 90)

    # Normalize leg weights near the ground so legs move cleanly
    # And emphasize the foot tips (higher sy)
    foot_gradient = np.clip((sy - 180) / 90, 0, 1) ** 1.2
    w_leg1 *= foot_gradient
    w_leg2 *= foot_gradient
    w_leg3 *= foot_gradient
    w_leg4 *= foot_gradient

    # Bilinear sampler
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

    # Walking parameters
    step_stride_x = 14.0   # Horizontal stride
    step_lift_y = 15.0     # Leg lift height off ground
    body_bob_y = 4.5       # Heavy shell vertical bob
    body_sway_x = 3.0      # Heavy shell lateral shift
    head_nod_x = 4.0       # Head nod forward/back
    head_nod_y = 3.0       # Head nod vertical

    for f in range(num_frames):
        theta = 2.0 * np.pi * f / num_frames
        
        # Diagonal pairs:
        # Pair A: Front-Left (Leg 2) & Rear-Right (Leg 3) -> phase = theta
        # Pair B: Front-Right (Leg 4) & Rear-Left (Leg 1) -> phase = theta + pi
        phase_A = theta
        phase_B = theta + np.pi

        # Leg 2 (Front-Left) motion:
        # When sin(phase_A) > 0: foot in the air, lifts and moves forward
        # When sin(phase_A) < 0: foot on ground, pushes back
        lift_A = np.maximum(0.0, np.sin(phase_A)) ** 1.3
        dx_leg2 = np.cos(phase_A) * step_stride_x
        dy_leg2 = -lift_A * step_lift_y

        # Leg 3 (Rear-Right) motion:
        lift_A_rear = np.maximum(0.0, np.sin(phase_A - 0.2)) ** 1.3
        dx_leg3 = np.cos(phase_A - 0.2) * (step_stride_x * 0.75)
        dy_leg3 = -lift_A_rear * (step_lift_y * 0.7)

        # Leg 4 (Front-Right) motion:
        lift_B = np.maximum(0.0, np.sin(phase_B)) ** 1.3
        dx_leg4 = np.cos(phase_B) * step_stride_x
        dy_leg4 = -lift_B * step_lift_y

        # Leg 1 (Rear-Left) motion:
        lift_B_rear = np.maximum(0.0, np.sin(phase_B - 0.2)) ** 1.3
        dx_leg1 = np.cos(phase_B - 0.2) * (step_stride_x * 0.75)
        dy_leg1 = -lift_B_rear * (step_lift_y * 0.7)

        # Body heavy bob: bobs down twice per cycle (each time a foot pair touches down)
        dy_body = -np.abs(np.cos(theta)) * body_bob_y
        dx_body = np.sin(theta) * body_sway_x

        # Head nod
        dx_head = dx_body + np.cos(theta * 2.0) * head_nod_x
        dy_head = dy_body + np.sin(theta * 2.0) * head_nod_y

        # Total displacement field (accumulated with smooth blending)
        total_dx = (
            w_leg1 * dx_leg1 +
            w_leg2 * dx_leg2 +
            w_leg3 * dx_leg3 +
            w_leg4 * dx_leg4 +
            w_head * dx_head +
            w_body * dx_body
        )
        total_dy = (
            w_leg1 * dy_leg1 +
            w_leg2 * dy_leg2 +
            w_leg3 * dy_leg3 +
            w_leg4 * dy_leg4 +
            w_head * dy_head +
            w_body * dy_body
        )

        # Apply displacement to sample grid
        # We sample at (xx - total_dx, yy - total_dy)
        sampled = sample_bilinear(arr, xx - total_dx, yy - total_dy)
        
        # Crop back to original dimensions
        cropped = sampled[pad:-pad, pad:-pad]
        frame_img = Image.fromarray(np.clip(cropped, 0, 255).astype(np.uint8), 'RGBA')
        frames.append(frame_img)

    return frames

if __name__ == '__main__':
    frames = generate_turtle_walk()
    out_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"
    # Save frames and gif
    for i, f in enumerate(frames):
        f.save(os.path.join(out_dir, f'turtle_walk_test_{i}.png'))
    frames[0].save(
        os.path.join(out_dir, 'turtle_walk_test.gif'),
        save_all=True,
        append_images=frames[1:],
        duration=125,
        loop=0
    )
    print('Generated turtle_walk_test.gif successfully!')

