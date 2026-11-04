import os
import numpy as np
from PIL import Image

def generate_perfect_turtle_walk():
    src_path = 'graphics/sprites/sea/turtle.png'
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    
    pad = 24
    arr = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.float32)
    arr[pad:-pad, pad:-pad] = np.asarray(im, np.float32)
    H, W = arr.shape[:2]
    
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = xx - pad
    sy = yy - pad

    # Helper: smooth limb mask with solid core
    def make_mask(cx, cy, rx, ry, y_min=0):
        d = np.sqrt(((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2)
        mask = np.clip((1.2 - d) / 0.45, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(mask * np.pi)
        if y_min > 0:
            top_fade = np.clip((sy - y_min) / 20.0, 0.0, 1.0)
            mask *= top_fade
        return mask

    # 4 legs:
    # Leg 1: Rear-Left leg (cx=55, cy=220, rx=45, ry=50, y_min=165)
    m_leg1 = make_mask(55, 220, 48, 52, y_min=165)
    # Leg 2: Front-Left leg (cx=125, cy=240, rx=50, ry=65, y_min=170)
    m_leg2 = make_mask(125, 240, 52, 68, y_min=170)
    # Leg 3: Rear-Right leg (cx=215, cy=225, rx=40, ry=50, y_min=170)
    m_leg3 = make_mask(215, 225, 42, 52, y_min=170)
    # Leg 4: Front-Right leg (cx=335, cy=235, rx=52, ry=60, y_min=160)
    m_leg4 = make_mask(335, 235, 55, 62, y_min=160)
    # Head & Neck
    m_head = make_mask(320, 160, 55, 42, y_min=110)
    # Shell Body
    m_body = make_mask(180, 110, 130, 85)

    # Joint Y (top of limb where it joins the body)
    # and Foot Y (where claws touch ground)
    j_y1, f_y1 = 175.0, 255.0
    j_y2, f_y2 = 185.0, 294.0
    j_y3, f_y3 = 180.0, 265.0
    j_y4, f_y4 = 175.0, 280.0

    # Gradient along limb (0 at joint, 1 at claw tip)
    grad1 = np.clip((sy - j_y1) / (f_y1 - j_y1), 0.0, 1.0) ** 1.3
    grad2 = np.clip((sy - j_y2) / (f_y2 - j_y2), 0.0, 1.0) ** 1.3
    grad3 = np.clip((sy - j_y3) / (f_y3 - j_y3), 0.0, 1.0) ** 1.3
    grad4 = np.clip((sy - j_y4) / (f_y4 - j_y4), 0.0, 1.0) ** 1.3

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

    # Walk parameters:
    reach_front = 18.0    # 36px total stride for front legs!
    reach_rear = 14.0     # 28px total stride for rear legs
    lift_front = 18.0     # 18px lift in air!
    lift_rear = 13.0      # 13px lift in air
    body_bob = 3.5        # heavy shell bob

    for f in range(num_frames):
        theta = 2.0 * np.pi * f / num_frames
        
        # Diagonal pair phases:
        phase_A = theta % (2.0 * np.pi)
        phase_B = (theta + np.pi) % (2.0 * np.pi)

        # Foot trajectory calculation:
        def foot_disp(phase, reach, lift):
            dx = -reach * np.cos(phase)
            if phase < np.pi:
                dy = -lift * np.sin(phase) # SWING in air
            else:
                dy = 0.0                    # STANCE on ground
            return dx, dy

        # Pair A: Front-Left (Leg 2) & Rear-Right (Leg 3)
        dx2_f, dy2_f = foot_disp(phase_A, reach_front, lift_front)
        dx3_f, dy3_f = foot_disp(phase_A, reach_rear, lift_rear)

        # Pair B: Front-Right (Leg 4) & Rear-Left (Leg 1)
        dx4_f, dy4_f = foot_disp(phase_B, reach_front, lift_front)
        dx1_f, dy1_f = foot_disp(phase_B, reach_rear, lift_rear)

        # Apply limb gradient from joint to claws
        dx1 = grad1 * dx1_f; dy1 = grad1 * dy1_f
        dx2 = grad2 * dx2_f; dy2 = grad2 * dy2_f
        dx3 = grad3 * dx3_f; dy3 = grad3 * dy3_f
        dx4 = grad4 * dx4_f; dy4 = grad4 * dy4_f

        # Body bob: heavy shell bobs slightly as weight shifts
        body_dy = -np.abs(np.sin(theta * 2.0)) * body_bob
        body_dx = np.sin(theta) * 2.5

        # Head nods forward/back
        head_dx = body_dx + np.cos(theta * 2.0) * 3.5
        head_dy = body_dy + np.sin(theta * 2.0) * 2.0

        # Weighted blend
        w1 = m_leg1; w2 = m_leg2; w3 = m_leg3; w4 = m_leg4
        wh = m_head; wb = m_body
        total_w = w1 + w2 + w3 + w4 + wh + wb + 1e-5

        tdx = (w1 * dx1 + w2 * dx2 + w3 * dx3 + w4 * dx4 + wh * head_dx + wb * body_dx) / np.maximum(1.0, total_w)
        tdy = (w1 * dy1 + w2 * dy2 + w3 * dy3 + w4 * dy4 + wh * head_dy + wb * body_dy) / np.maximum(1.0, total_w)

        # Sample grid
        sampled = sample_bilinear(arr, xx - tdx, yy - tdy)
        cropped = sampled[pad:-pad, pad:-pad]
        frame = Image.fromarray(np.clip(cropped, 0, 255).astype(np.uint8), 'RGBA')
        frames.append(frame)

    return frames

if __name__ == '__main__':
    frames = generate_perfect_turtle_walk()
    out_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"
    for i, f in enumerate(frames):
        f.save(os.path.join(out_dir, f'turtle_perfect_{i}.png'))
    frames[0].save(
        os.path.join(out_dir, 'turtle_perfect_walk.gif'),
        save_all=True,
        append_images=frames[1:],
        duration=125,
        loop=0
    )
    print('Generated turtle_perfect_walk.gif successfully!')

