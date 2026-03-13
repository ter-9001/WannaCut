import sys
import os
import json
import tempfile
from moviepy import VideoFileClip, ImageClip, CompositeVideoClip, vfx, afx
from proglog import ProgressBarLogger
import numpy as np



class RawPercentageLogger(ProgressBarLogger):
    def __init__(self):
        super().__init__()
        self.last_percentage = -1
        # Substituímos a global por um atributo da classe
        self.rendering_video_finished = False
        self.startzero = False

    def callback(self, **changes):
        bars = self.state.get('bars', {})
        if not bars:
            return
            
        # Pega a barra ativa
        current_bar = list(bars.values())[-1]
        total = current_bar.get('total', 0)
        index = current_bar.get('index', 0)
        
        if total > 0:
            percent = int((index / total) * 100)
            
            if percent >= 100:
                percent = 99

            if percent != self.last_percentage:
                # LÓGICA DE FILTRO:
                # O MoviePy geralmente dispara uma barra rápida de 'logger' antes da renderização real.
                # A renderização real de vídeo é a que costuma demorar.
                
                if not self.rendering_video_finished:
                    if percent == 99:
                        # Quando a primeira barra rápida chega em 99, 
                        # liberamos para a próxima barra ser exibida
                        self.rendering_video_finished = True
                    return # Ignora a primeira contagem rápida
                if not self.startzero:
                    if percent == 0:
                        self.startzero = True
                    return
                # Se já passou da primeira barra, começa a enviar para o Rust
                sys.stderr.write(f"PERCENT:{percent}\n")
                sys.stderr.flush()
                self.last_percentage = percent



def export_video():
    try:
        if len(sys.argv) < 2:
            sys.exit(1)

        config_path = sys.argv[1]
        with open(config_path, 'r', encoding='utf-8') as f:
            payload = json.load(f)
            
        export_path = payload['export_path']
        clips_data = payload['clips']
        target_dir = os.path.dirname(os.path.abspath(export_path))
        tempfile.tempdir = target_dir

        # 1. Definimos a resolução padrão do projeto (ex: Full HD)
        # Você também pode pegar isso do JSON se quiser resoluções dinâmicas
        target_size = (1920, 1080) 

        video_clips = []
        for c in clips_data:
            if c.get('type') == 'image':
                clip = ImageClip(c['path']).with_duration(c['duration'])
            else:
                clip = VideoFileClip(c['path']).subclipped(c['beginmoment'], c['beginmoment'] + c['duration'])
            
            # 2. Redimensiona o clip para caber na tela mantendo o aspecto
            # e centraliza (o MoviePy centraliza por padrão no CompositeVideoClip se definido o size)
            fadein = 0
            fadeout = 0
            fadeinAudio = 0
            fadeoutAudio = 0
            
            if(c.get("fadein")):
                fadein = int(c.get("fadein"))

            if(c.get("fadeout")):
                fadeout = int(c.get("fadeout"))

            if(c.get("fadeoutAudio")):
                fadeinAudio = int(c.get("fadeoutAudio"))

            if(c.get("fadeoutAudio")):
                fadeoutAudio = int(c.get("fadeoutAudio"))






            # put all fadein and out on video and audio
            clip = clip.with_effects([vfx.FadeIn(fadein), vfx.FadeOut(fadeout), 
            afx.AudioFadeIn(fadeinAudio), afx.AudioFadeOut(fadeoutAudio)])


            op_kfs = c.get('keyframes', {}).get('opacity', [])

            if op_kfs:
                op_kfs = sorted(op_kfs, key=lambda x: x['time'])
                
                times = [kf['time'] for kf in op_kfs]
                values = [kf['value'] for kf in op_kfs]

                def opacity_keyframes_factory(get_frame, t):
                    frame = get_frame(t)
                    current_opacity = np.interp(t, times, values)
                    return (frame * current_opacity).astype('uint8')
                clip = clip.transform(opacity_keyframes_factory)
            
            op_vol = c.get('keyframes', {}).get('volume', [])

            if (c.get('type') != 'image') and op_vol and clip.audio is not None:
                op_vol = sorted(op_vol, key=lambda x: x['time'])
                vol_times = [kf['time'] for kf in op_vol]
                vol_values = [kf['value'] for kf in op_vol] # Valores de 0 a 1

                def volume_db_keyframes(get_frame, t):
                    chunk = get_frame(t)  # Formato: (amostras, 2) para Stereo
                    
                    # 1. Interpola o valor (0 a 1)
                    val_0_to_1 = np.interp(t, vol_times, vol_values)
                    
                    # 2. Mapeia para a escala de dB e converte para Ganho Linear
                    db_target = -30 + (val_0_to_1 * 60)
                    gain = 10 ** (db_target / 20)
                    
                    # CORREÇÃO DO ERRO DE BROADCAST:
                    # Multiplicamos o chunk pelo escalar. O NumPy deve lidar com isso, 
                    # mas para ser explícito e evitar o erro de shape:
                    gain_array = gain[:, np.newaxis] 
                    return chunk * gain_array
                # Aplicamos especificamente no objeto de áudio
                clip.audio = clip.audio.transform(volume_db_keyframes)
            
                

            clip = clip.resized(height=target_size[1]) # Ajusta pela altura
            if clip.w > target_size[0]:
                clip = clip.resized(width=target_size[0]) # Ajusta pela largura se estourar
            
            clip = clip.with_start(c['start']).with_position("center")
            video_clips.append(clip)

        # 3. Forçamos o CompositeVideoClip a ter o tamanho alvo
        final_video = CompositeVideoClip(video_clips, size=target_size)
        
        temp_audio = os.path.join(target_dir, "temp-audio-render.m4a")
        
        final_video.write_videofile(
            export_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=temp_audio,
            remove_temp=True,
            logger=RawPercentageLogger()
        )
        
        sys.stderr.write("PERCENT:100\n")
        sys.stderr.flush()
        sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"ERRO: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    export_video()