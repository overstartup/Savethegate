import os
import numpy as np
from PIL import Image

def generate_articulated_turtle():
    src_path = 'graphics/sprites/sea/turtle.png'
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    
    pad = 32
    arr = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.float32)
    arr[pad:-pad, pad:-pad] = np.asarray(im, np.float32)
    H, W = arr.shape[:2]
    
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = xx - pad
    sy = yy - pad

    # Helper: smooth limb mask with solid core and soft boundary falloff
    def make_mask(cx, cy, rx, ry, y_min=0):
        d = np.sqrt(((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2)
        mask = np.clip((1.2 - d) / 0.45, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(mask * np.pi)
        if y_min > 0:
            top_fade = np.clip((sy - y_min) / 25.0, 0.0, 1.0)
            mask *= top_fade
        return mask

    # 4 distinct leg masks covering the full limb to the claw tips:
    # Leg 1: Rear-Left leg
    m_leg1 = make_mask(55, 220, 48, 55, y_min=160)
    # Leg 2: Front-Left leg
    m_leg2 = make_mask(130, 235, 52, 75, y_min=170)
    # Leg 3: Rear-Right leg
    m_leg3 = make_mask(215, 225, 42, 55, y_min=170)
    # Leg 4: Front-Right leg
    m_leg4 = make_mask(335, 235, 55, 65, y_min=160)
    # Head & Neck
    m_head = make_mask(320, 160, 55, 45, y_min=110)
    # Heavy Shell Body
    m_body = make_mask(180, 110, 130, 85)

    # Joint positions (pivot points):
    joint1 = (75.0, 185.0)   # rear-left hip
    joint2 = (150.0, 195.0)  # front-left shoulder
    joint3 = (210.0, 190.0)  # rear-right hip
    joint4 = (315.0, 185.0)  # front-right shoulder
    joint_head = (275.0, 170.0) # neck base

    def compute_joint_disp(joint, angle, lift_y, forward_x):
        jx, jy = joint
        rx = sx - jx
        ry = sy - jy
        cos_a = np.cos(angle)
        sin_a = np.sin(angle)
        dx = (rx * cos_a - ry * sin_a) - rx + forward_x
        dy = (rx * sin_a + ry * cos_a) - ry + lift_y
        return dx, dy

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

    # Articulation angles & strides:
    max_leg_angle = 0.20   # ~11.5 degrees forward/back swing
    step_lift = -16.0      # lifts up during air phase
    step_reach = 12.0      # steps forward

    for f in range(num_frames):
        theta = 2.0 * np.pi * f / num_frames
        
        # Stride phases for diagonal pairs:
        phase_A = theta             # Front-Left (2) & Rear-Right (3)
        phase_B = theta + np.pi     # Front-Right (4) & Rear-Left (1)

        # Pair A (Leg 2 & 3):
        swing_A = np.sin(phase_A)
        ang2 = np.cos(phase_A) * max_leg_angle
        lift2 = step_lift * np.maximum(0.0, swing_A) ** 1.3
        fwd2 = np.cos(phase_A) * step_reach

        ang3 = np.cos(phase_A - 0.25) * (max_leg_angle * 0.75)
        lift3 = (step_lift * 0.65) * np.maximum(0.0, np.sin(phase_A - 0.25)) ** 1.3
        fwd3 = np.cos(phase_A - 0.25) * (step_reach * 0.75)

        # Pair B (Leg 4 & 1):
        swing_B = np.sin(phase_B)
        ang4 = np.cos(phase_B) * max_leg_angle
        lift4 = step_lift * np.maximum(0.0, swing_B) ** 1.3
        fwd4 = np.cos(phase_B) * step_reach

        ang1 = np.cos(phase_B - 0.25) * (max_leg_angle * 0.75)
        lift1 = (step_lift * 0.65) * np.maximum(0.0, np.sin(phase_B - 0.25)) ** 1.3
        fwd1 = np.cos(phase_B - 0.25) * (step_reach * 0.75)

        # Body heavy bob: drops slightly when foot touches down, rises when pushing
        body_dy = -np.abs(np.sin(theta * 2.0)) * 4.0
        body_dx = np.sin(theta) * 3.0

        # Head nod: nods forward/back with walking cadence
        head_ang = -np.sin(theta * 2.0) * 0.06
        head_dx = body_dx + np.cos(theta * 2.0) * 4.0
        head_dy = body_dy + np.sin(theta * 2.0) * 3.0

        # Compute field per component
        dx1, dy1 = compute_joint_disp(joint1, ang1, lift1, fwd1)
        dx2, dy2 = compute_joint_disp(joint2, ang2, lift2, fwd2)
        dx3, dy3 = compute_joint_disp(joint3, ang3, lift3, fwd3)
        dx4, dy4 = compute_joint_disp(joint4, ang4, lift4, fwd4)
        dxh, dyh = compute_joint_disp(joint_head, head_ang, head_dy, head_dx)
        
        dxb = body_dx
        dyb = body_dy

        # Blend displacements based on masks:
        total_w = m_leg1 + m_leg2 + m_leg3 + m_leg4 + m_head + m_body + 1e-5
        
        tdx = (
            m_leg1 * dx1 +
            m_leg2 * dx2 +
            m_leg3 * dx3 +
            m_leg4 * dx4 +
            m_head * dxh +
            m_body * dxb
        ) / np.maximum(1.0, total_w)
        
        tdy = (
            m_leg1 * dy1 +
            m_leg2 * dy2 +
            m_leg3 * dy3 +
            m_leg4 * dy4 +
            m_head * dyh +
            m_body * dyb
        ) / np.maximum(1.0, total_w)

        # Sample grid
        sampled = sample_bilinear(arr, xx - tdx, yy - tdy)
        cropped = sampled[pad:-pad, pad:-pad]
        frame = Image.fromarray(np.clip(cropped, 0, 255).astype(np.uint8), 'RGBA')
        frames.append(frame)

    return frames

if __name__ == '__main__':
    frames = generate_articulated_turtle()
    out_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"
    for i, f in enumerate(frames):
        f.save(os.path.join(out_dir, f'turtle_articulated_{i}.png'))
    frames[0].save(
        os.path.join(out_dir, 'turtle_articulated.gif'),
        save_all=True,
        append_images=frames[1:],
        duration=125,
        loop=0
    )
    print('Generated upgraded turtle_articulated.gif successfully!')
