import sys
import os
import json
import numpy as np
from moviepy import VideoFileClip, ImageClip, CompositeVideoClip, vfx, afx
from proglog import ProgressBarLogger

class RawPercentageLogger(ProgressBarLogger):
    def __init__(self):
        super().__init__()
        self.last_percentage = -1
        self.rendering_video_finished = False
        self.startzero = False

    def callback(self, **changes):
        bars = self.state.get('bars', {})
        if not bars: return
        current_bar = list(bars.values())[-1]
        total = current_bar.get('total', 0)
        index = current_bar.get('index', 0)
        if total > 0:
            percent = int((index / total) * 100)
            if percent >= 100: percent = 99
            if percent != self.last_percentage:
                if not self.rendering_video_finished:
                    if percent == 99: self.rendering_video_finished = True
                    return 
                if not self.startzero:
                    if percent == 0: self.startzero = True
                    return
                sys.stderr.write(f"PERCENT:{percent}\n")
                sys.stderr.flush()
                self.last_percentage = percent

def get_speed_interpolator(speed_kfs):
    if not speed_kfs: return lambda t: t
    kfs = sorted(speed_kfs, key=lambda x: x['time'])
    times = [kf['time'] for kf in kfs]
    values = [kf['value'] for kf in kfs]

    def timeline_to_asset_time(t):
        is_array = isinstance(t, np.ndarray)
        t_func = t if is_array else np.array([t])
        results = []
        for val in t_func:
            if val <= times[0]:
                results.append(val * values[0])
                continue
            acc = times[0] * values[0]
            found = False
            for i in range(len(times) - 1):
                t_s, t_e = times[i], times[i+1]
                v_s, v_e = values[i], values[i+1]
                if val > t_e:
                    acc += (t_e - t_s) * (v_s + v_e) / 2
                else:
                    dt = val - t_s
                    v_curr = np.interp(val, [t_s, t_e], [v_s, v_e])
                    acc += dt * (v_s + v_curr) / 2
                    results.append(acc)
                    found = True
                    break
            if not found:
                results.append(acc + (val - times[-1]) * values[-1])
        return np.array(results) if is_array else results[0]
    return timeline_to_asset_time

def apply_blending(bg, fg, mode):
    """ Implementação matemática de blend modes via NumPy """
    if mode == 'normal' or mode is None: return fg
    b = bg.astype(float) / 255.0
    f = fg.astype(float) / 255.0
    
    if mode == 'screen':
        res = 1 - (1 - b) * (1 - f)
    elif mode == 'multiply':
        res = b * f
    elif mode == 'overlay':
        res = np.where(b < 0.5, 2 * b * f, 1 - 2 * (1 - b) * (1 - f))
    elif mode == 'lineardodge':
        res = np.clip(b + f, 0, 1)
    else:
        return fg
    return (res * 255).astype('uint8')

def export_video():
    try:
        if len(sys.argv) < 2: sys.exit(1)
        config_path = sys.argv[1]
        with open(config_path, 'r', encoding='utf-8') as f:
            payload = json.load(f)
            
        export_path = payload['export_path']
        clips_data = payload['clips']
        target_size = (1920, 1080) 

        processed_clips = []
        # Index 0 é o topo no seu JSON. MoviePy precisa do fundo primeiro.
        reversed_clips = list(reversed(clips_data))

        for c in reversed_clips:
            path = c['path']
            is_image = c.get('type') == 'image'
            
            if is_image:
                clip = ImageClip(path).with_duration(c['duration'])
            else:
                full_clip = VideoFileClip(path)
                speed_kfs = c.get('keyframes', {}).get('speed', [])
                if speed_kfs:
                    mapper = get_speed_interpolator(speed_kfs)
                    clip = full_clip.time_transform(mapper)
                    if full_clip.audio: clip = clip.with_audio(full_clip.audio.time_transform(mapper))
                    clip = clip.with_duration(c['duration']).subclipped(c['beginmoment'], c['beginmoment'] + c['duration'])
                else:
                    clip = full_clip.subclipped(c['beginmoment'], c['beginmoment'] + c['duration'])

            # Opacidade e Fades
            op_kfs = sorted(c.get('keyframes', {}).get('opacity', []), key=lambda x: x['time'])
            f_in, f_out = float(c.get("fadein", 0)), float(c.get("fadeout", 0))

            def opacity_tr(get_f, t):
                frame = get_f(t)
                opacity = np.interp(t, [k['time'] for k in op_kfs], [k['value'] for k in op_kfs]) if op_kfs else 1.0
                if f_in > 0 and t < f_in: opacity *= (t / f_in)
                if f_out > 0 and t > (clip.duration - f_out): opacity *= (clip.duration - t) / f_out
                return (frame * opacity).astype('uint8')

            clip = clip.transform(opacity_tr)

            # Audio Volume
            vol_kfs = sorted(c.get('keyframes', {}).get('volume', []), key=lambda x: x['time'])
            if not is_image and clip.audio:
                vol_kfs = sorted(c.get('keyframes', {}).get('volume', []), key=lambda x: x['time'])
                
                def vol_tr(get_f, t):
                    chunk = get_f(t)
                    
                    if vol_kfs:
                        db_val = np.interp(t, [k['time'] for k in vol_kfs], [k['value'] for k in vol_kfs])
                    else:
                        db_val = 0.0
                    
                    gain = 10 ** (db_val / 20.0)
                    
                    if isinstance(gain, np.ndarray):
                        return chunk * gain[:, np.newaxis]
                    return chunk * gain

                clip.audio = clip.audio.transform(vol_tr)

            clip = clip.resized(height=target_size[1])
            if clip.w > target_size[0]: clip = clip.resized(width=target_size[0])
            clip = clip.with_start(c['start']).with_position("center")
            
            # Guardamos o blendmode e informações de tempo para a composição manual
            clip.my_blend_mode = c.get('blendmode', 'normal')
            processed_clips.append(clip)

        # COMPOSIÇÃO MANUAL VIA CUSTOM FRAME GENERATOR
        duration = max(c['start'] + c['duration'] for c in clips_data)

        def custom_composer(t):
            # Frame base (fundo preto)
            final_f = np.zeros((target_size[1], target_size[0], 3), dtype='uint8')
            
            for clip in processed_clips:
                if clip.start <= t < (clip.start + clip.duration):
                    rel_t = t - clip.start
                    fg_f = clip.get_frame(rel_t)
                    
                    # Garantir que o frame cabe ou está centralizado
                    h, w, _ = fg_f.shape
                    y_off = (target_size[1] - h) // 2
                    x_off = (target_size[0] - w) // 2
                    
                    # ROI do Background
                    bg_roi = final_f[y_off:y_off+h, x_off:x_off+w]
                    
                    # Aplica o Blend
                    final_f[y_off:y_off+h, x_off:x_off+w] = apply_blending(bg_roi, fg_f, clip.my_blend_mode)
            
            return final_f

        # Criamos um clipe vazio com a duração correta e injetamos nossa função de frames
        # Usamos um VideoFileClip qualquer como "dummy" ou criamos um Composite apenas para extrair o áudio
        comp_with_audio = CompositeVideoClip(processed_clips, size=target_size)
        
        # A forma correta de substituir o gerador de frames no MoviePy 2.x
        final_video = comp_with_audio.transform(lambda get_f, t: custom_composer(t))

        final_video.write_videofile(
            export_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            threads=4,
            logger=RawPercentageLogger()
        )
        sys.stderr.write("PERCENT:100\n")
        sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"ERRO: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    export_video()