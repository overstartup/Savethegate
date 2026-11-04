with open('tools/test_perfect_turtle.py', 'r', encoding='utf-8') as f:
    perfect_code = f.read()

# Extract generate_perfect_turtle_walk body
with open('tools/make_enemy_frames.py', 'r', encoding='utf-8') as f:
    orig = f.read()

# Replace displacement_turtle_walk with the new anatomical implementation
new_displacement = '''def displacement_turtle_walk(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = xx - PAD
    sy = yy - PAD

    def make_mask(cx, cy, rx, ry, y_min=0):
        d = np.sqrt(((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2)
        mask = np.clip((1.2 - d) / 0.45, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(mask * np.pi)
        if y_min > 0:
            top_fade = np.clip((sy - y_min) / 20.0, 0.0, 1.0)
            mask *= top_fade
        return mask

    m_leg1 = make_mask(55, 220, 48, 52, y_min=165)
    m_leg2 = make_mask(125, 240, 52, 68, y_min=170)
    m_leg3 = make_mask(215, 225, 42, 52, y_min=170)
    m_leg4 = make_mask(335, 235, 55, 62, y_min=160)
    m_head = make_mask(320, 160, 55, 42, y_min=110)
    m_body = make_mask(180, 110, 130, 85)

    j_y1, f_y1 = 175.0, 255.0
    j_y2, f_y2 = 185.0, 294.0
    j_y3, f_y3 = 180.0, 265.0
    j_y4, f_y4 = 175.0, 280.0

    grad1 = np.clip((sy - j_y1) / (f_y1 - j_y1), 0.0, 1.0) ** 1.3
    grad2 = np.clip((sy - j_y2) / (f_y2 - j_y2), 0.0, 1.0) ** 1.3
    grad3 = np.clip((sy - j_y3) / (f_y3 - j_y3), 0.0, 1.0) ** 1.3
    grad4 = np.clip((sy - j_y4) / (f_y4 - j_y4), 0.0, 1.0) ** 1.3

    reach_front = 18.0
    reach_rear = 14.0
    lift_front = 18.0
    lift_rear = 13.0
    body_bob = 3.5

    phase_A = theta % (2.0 * np.pi)
    phase_B = (theta + np.pi) % (2.0 * np.pi)

    def foot_disp(phase, reach, lift):
        dx = -reach * np.cos(phase)
        if phase < np.pi:
            dy = -lift * np.sin(phase)
        else:
            dy = 0.0
        return dx, dy

    dx2_f, dy2_f = foot_disp(phase_A, reach_front, lift_front)
    dx3_f, dy3_f = foot_disp(phase_A, reach_rear, lift_rear)
    dx4_f, dy4_f = foot_disp(phase_B, reach_front, lift_front)
    dx1_f, dy1_f = foot_disp(phase_B, reach_rear, lift_rear)

    dx1 = grad1 * dx1_f; dy1 = grad1 * dy1_f
    dx2 = grad2 * dx2_f; dy2 = grad2 * dy2_f
    dx3 = grad3 * dx3_f; dy3 = grad3 * dy3_f
    dx4 = grad4 * dx4_f; dy4 = grad4 * dy4_f

    body_dy = -np.abs(np.sin(theta * 2.0)) * body_bob
    body_dx = np.sin(theta) * 2.5
    head_dx = body_dx + np.cos(theta * 2.0) * 3.5
    head_dy = body_dy + np.sin(theta * 2.0) * 2.0

    w1 = m_leg1; w2 = m_leg2; w3 = m_leg3; w4 = m_leg4
    wh = m_head; wb = m_body
    total_w = w1 + w2 + w3 + w4 + wh + wb + 1e-5

    tdx = (w1 * dx1 + w2 * dx2 + w3 * dx3 + w4 * dx4 + wh * head_dx + wb * body_dx) / np.maximum(1.0, total_w)
    tdy = (w1 * dy1 + w2 * dy2 + w3 * dy3 + w4 * dy4 + wh * head_dy + wb * body_dy) / np.maximum(1.0, total_w)

    return tdx, tdy'''

# Find def displacement_turtle_walk in make_enemy_frames.py and replace it
import re
pattern = r"def displacement_turtle_walk\(w, h, theta\):.*?(?=def displacement\(style)"
patched = re.sub(pattern, new_displacement + "\n\n\n", orig, flags=re.DOTALL)

with open('tools/make_enemy_frames.py', 'w', encoding='utf-8') as f:
    f.write(patched)

print("Updated displacement_turtle_walk in tools/make_enemy_frames.py successfully!")

