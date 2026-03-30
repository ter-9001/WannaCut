import json
import sys
import os
import numpy as np
import cv2
import shutil
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy import VideoFileClip, CompositeAudioClip
from moviepy.video.VideoClip import VideoClip
from proglog import ProgressBarLogger

# --- LOGGER ---
class RawPercentageLogger(ProgressBarLogger):
    def __init__(self):
        super().__init__()
        self.last_percentage = -1

    def callback(self, **changes):
        bars = self.state.get('bars', {})
        if not bars: return
        bar_list = list(bars.values())
        if not bar_list: return
        current_bar = bar_list[-1]
        if current_bar.get('total', 0) > 0 and current_bar.get('title') != 'chunk':
            percent = int((current_bar.get('index', 0) / current_bar.get('total')) * 100)
            if percent != self.last_percentage:
                sys.stderr.write(f"PERCENT:{min(100, percent)}\n")
                sys.stderr.flush()
                self.last_percentage = percent

class FreeCutVideoClip(VideoClip):
    def __init__(self, make_frame, duration, size):
        super().__init__()
        self.make_frame = make_frame
        self.frame_function = make_frame
        self.duration = duration
        self.end = duration
        self.size = size

# --- INTERPOLAÇÃO ---
def get_interpolated_value(keyframes, t, default_value):
    if not keyframes: return default_value
    try:
        kf_times = np.array([float(kf['time']) for kf in keyframes])
        if len(kf_times) == 0: return default_value
        indices = np.argsort(kf_times)
        kf_times = kf_times[indices]
        if isinstance(keyframes[0]['value'], dict):
            val = keyframes[0]['value']
            if 'x' in val:
                kx = np.array([float(kf['value']['x']) for kf in keyframes])[indices]
                ky = np.array([float(kf['value']['y']) for kf in keyframes])[indices]
                return {"x": np.interp(t, kf_times, kx), "y": np.interp(t, kf_times, ky)}
            if 'rot' in val:
                kr = np.array([float(kf['value']['rot']) for kf in keyframes])[indices]
                kr3 = np.array([float(kf['value']['rot3d']) for kf in keyframes])[indices]
                return {"rot": np.interp(t, kf_times, kr), "rot3d": np.interp(t, kf_times, kr3)}
        kv = np.array([kf['value'] for kf in keyframes], dtype=float)[indices]
        return float(np.interp(t, kf_times, kv, left=kv[0], right=kv[-1]))
    except Exception: return default_value

# --- ROTAÇÃO 3D REAL (Efeito Trapézio) ---
def apply_3d_rotation(img, rot_deg, rot3d_deg):
    h, w = img.shape[:2]
    img_rgba = cv2.cvtColor(img, cv2.COLOR_RGB2RGBA)
    center = (w / 2, h / 2)
    
    # 1. Rotação 2D
    matrix_2d = cv2.getRotationMatrix2D(center, -rot_deg, 1.0)
    img_rgba = cv2.warpAffine(img_rgba, matrix_2d, (w, h), flags=cv2.INTER_LINEAR, 
                              borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))

    if abs(rot3d_deg) < 0.1:
        return img_rgba

    # 2. Perspetiva 3D (Simulação de profundidade sem alteração de escala central)
    rad = np.radians(rot3d_deg)
    
    # Definimos a intensidade da perspetiva (quanto maior, mais "longo" o efeito)
    fov_factor = 0.3 
    offset = (w / 2) * np.sin(rad) * fov_factor
    
    # Pontos de origem
    src_pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    
    # Pontos de destino calculados para criar o trapézio mantendo a largura central
    # O lado que "entra" na tela encolhe verticalmente, o que "sai" aumenta.
    dist_w = (w / 2) * np.cos(rad)
    
    dst_pts = np.float32([
        [center[0] - dist_w, 0 + offset], # Topo Esquerdo
        [center[0] + dist_w, 0 - offset], # Topo Direito
        [center[0] + dist_w, h + offset], # Base Direita
        [center[0] - dist_w, h - offset]  # Base Esquerda
    ])

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    return cv2.warpPerspective(img_rgba, M, (w, h), flags=cv2.INTER_LINEAR, 
                               borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))



def process_video():
    if len(sys.argv) < 2: return
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)

    project_path = data['project_path']
    PROJ_W, PROJ_H = data['project_dimensions']['width'], data['project_dimensions']['height']
    
    temp_dir = os.path.join(project_path, "temp_render")
    if os.path.exists(temp_dir): shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    clips_data = data['clips'][::-1]
    loaded_clips = []
    for c in clips_data:
        path = os.path.join(project_path, "videos", c['name'])
        if c['type'] == 'video':
            v = VideoFileClip(path, audio=not c.get('mute'))
            v = v.subclipped(c.get('beginmoment', 0), c.get('beginmoment', 0) + c['duration'])
            loaded_clips.append({'data': c, 'video': v})
        else:
            a = AudioFileClip(path).subclipped(c.get('beginmoment', 0), c.get('beginmoment', 0) + c['duration'])
            loaded_clips.append({'data': c, 'audio': a})

    def make_final_frame(t):
        canvas_f = np.zeros((PROJ_H, PROJ_W, 3), dtype=float)
        for item in loaded_clips:
            if 'video' not in item: continue
            c, v_clip = item['data'], item['video']
            rel_t = t - c['start']
            if rel_t < 0 or rel_t >= c['duration']: continue

            op = get_interpolated_value(c.get('keyframes', {}).get('opacity', []), rel_t, 1.0)
            zoom = get_interpolated_value(c.get('keyframes', {}).get('zoom', []), rel_t, 1.0)
            rot = get_interpolated_value(c.get('keyframes', {}).get('rotation3d', []), rel_t, {"rot": 0, "rot3d": 0})
            
            bw, bh = c.get('dimensions', {}).get('x', v_clip.w), c.get('dimensions', {}).get('y', v_clip.h)
            pos = get_interpolated_value(c.get('keyframes', {}).get('position', []), rel_t, {"x": (PROJ_W-bw)/2, "y": (PROJ_H-bh)/2})

            raw = v_clip.get_frame(rel_t) 
            fw, fh = int(bw * zoom), int(bh * zoom)
            img = cv2.resize(raw, (fw, fh), interpolation=cv2.INTER_LINEAR)
            
            # Aplica a rotação 3D com efeito de profundidade
            img_rgba = apply_3d_rotation(img, rot['rot'], -rot['rot3d'])
            
            # Posicionamento centralizado na moldura original
            x1, y1 = int(pos['x']), int(pos['y'])
            x2, y2 = x1 + fw, y1 + fh
            
            ix1, ix2 = max(0, x1), min(PROJ_W, x2)
            iy1, iy2 = max(0, y1), min(PROJ_H, y2)
            if ix1 >= ix2 or iy1 >= iy2: continue

            fx1, fy1 = ix1 - x1, iy1 - y1
            src_crop = img_rgba[fy1:fy1+(iy2-iy1), fx1:fx1+(ix2-ix1)].astype(float) / 255.0
            alpha = src_crop[:, :, 3:4] * op
            
            tgt = canvas_f[iy1:iy2, ix1:ix2]
            canvas_f[iy1:iy2, ix1:ix2] = (src_crop[:,:,:3] * alpha) + (tgt * (1.0 - alpha))

        return (canvas_f * 255).astype('uint8')

    duration = max((c['start'] + c['duration']) for c in clips_data) if clips_data else 0
    final_video = FreeCutVideoClip(make_final_frame, duration, (PROJ_W, PROJ_H))

    tracks = []
    for item in loaded_clips:
        if 'audio' in item: tracks.append(item['audio'].with_start(item['data']['start']))
        elif 'video' in item and item['video'].audio and not item['data'].get('mute'):
            tracks.append(item['video'].audio.with_start(item['data']['start']))
    if tracks: final_video.audio = CompositeAudioClip(tracks)

    final_video.write_videofile(data['export_path'], fps=30, codec="libx264", audio_codec="aac", logger=RawPercentageLogger())
    if os.path.exists(temp_dir): shutil.rmtree(temp_dir)

if __name__ == "__main__":
    process_video()