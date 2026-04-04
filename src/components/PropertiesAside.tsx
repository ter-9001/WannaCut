import React from 'react';
import { 
  Diamond, DiamondPlus, Video, Volume2, Type, Settings2, 
  Wind, Layers, ChevronDown 
} from 'lucide-react';

// Subcomponent for inputs with Keyframe icon
const PropertyRow = ({ label, children, keyframable = true, activeColor = "#4f46e5", keyframeNow = false }) => (
  <div className="flex flex-col gap-2 mb-4">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{label}</label>
      {keyframable && (
        <button 
          className="transition-colors"
          style={{ color: `${activeColor}80` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = activeColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = `${activeColor}80`)}
        >
          {keyframeNow ? <DiamondPlus color="red" size={10} /> : <Diamond size={10} />}
        </button>
      )}
    </div>
    {children}
  </div>
);

// Defina a interface das Props para o Typescript (se estiver usando)
interface PropertiesAsideProps {
  selectedClipIds: string[];
  clips: any[];
  assets: any[];
  currentTime: number;
  currentTimeRef: React.MutableRefObject<number>;
  setClips: React.Dispatch<React.SetStateAction<any[]>>;
  updateKeyframes: (clip: any, property: string, value: any) => void;
  getInterpolatedValueWithFades: (
  timeFull: number, 
  clip: any, 
  type: 'opacity' | 'volume' | 'speed' | 'zoom' | 'position' | 'rotation3d'
  ) => any 
  knowTypeByAssetName: (name: string) => string;
  COLOR_MAP: Record<string, string>;
}

export const PropertiesAside = ({
  selectedClipIds,
  clips,
  assets,
  currentTime,
  currentTimeRef,
  setClips,
  updateKeyframes,
  getInterpolatedValueWithFades,
  knowTypeByAssetName,
  COLOR_MAP
}: PropertiesAsideProps) => {


  
  if (!selectedClipIds || selectedClipIds.length !== 1) return null;

  const foundClip = clips.find(c => c.id === selectedClipIds[0]);
  if (!foundClip) return null;

  const assetnow = assets.find(a => a.name === foundClip.name);

  const selectedClip = {
    ...foundClip,
    path: assetnow?.path,
    type: foundClip.type ? foundClip.type : knowTypeByAssetName(foundClip.name)
  };

  if (!selectedClip.path && selectedClip.type != 'text') return null;

  const activeHex = COLOR_MAP[selectedClip.color] || '#4f46e5';

  const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v'];
  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

  // 2. Função auxiliar para verificar a extensão (ignora maiúsculas/minúsculas)
  const hasExtension = (path: string, extensions: string []) => 
    path ? extensions.some(ext => path.toLowerCase().endsWith(ext)) : false;

  // 3. Atribuição das constantes
  const isVideo = selectedClip.type === "video" || hasExtension(selectedClip.path, VIDEO_EXTENSIONS);
  const isAudio = selectedClip.type === "audio" || hasExtension(selectedClip.path, AUDIO_EXTENSIONS);
  const isImage = selectedClip.type === "image" || hasExtension(selectedClip.path, IMAGE_EXTENSIONS);
  const isText  = selectedClip.type === "text";


  // Lógica de KeyframeNow (Volume, Opacity, etc)
  const checkKeyframeNow = (prop: string) => {
    const times = selectedClip.keyframes?.[prop]?.map((kf: any) => kf.time) || null;
    return times?.some((kfTime: number) => 
      Math.abs(kfTime - (currentTimeRef.current - selectedClip.start)) <= 0.05
    ) || false;
  };

  const volumeKeyframeNow = checkKeyframeNow('volume');
  const opacityKeyframeNow = checkKeyframeNow('opacity');
  const speedKeyframeNow = checkKeyframeNow('speed');
  const zoomKeyframeNow = checkKeyframeNow('zoom');

  const currentPos = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'position');
  const rotation3d = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'rotation3d');


  return (
    
    <aside className="w-72 bg-[#090909] border-l border-white/5 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        {/* Background do ícone com 15% de opacidade via Hex */}
        <div 
          className="p-2 rounded-lg" 
          style={{ backgroundColor: `${activeHex}26` }}
        >
          {isVideo && <Video size={16} style={{ color: activeHex }} />}
          {isAudio && <Volume2 size={16} style={{ color: activeHex }} />}
          {isText && <Type size={16} style={{ color: activeHex }} />}
        </div>
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-white">Inspector</h2>
          <p className="text-[9px] text-zinc-500 truncate w-40">{selectedClip.name || "Selected Clip"}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* SECTION: BASIC */}
        <section>
          <div className="flex items-center gap-2 mb-4" style={{ color: activeHex }}>
            <Settings2 size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Basic</span>
          </div>

          {(isVideo || isText || isImage) && (
            <>

            {/*POSITION */}

              {/* Captura os valores atuais via interpolação para exibir no input */}

            <div className="grid grid-cols-2 gap-2">
              <PropertyRow label="Position X" activeColor={activeHex}>
                <input 
                  type="number" 
                  min="-4000"
                  max="4000"
                  defaultValue={Math.round(currentPos.x)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateKeyframes(selectedClip, 'position', { x: parseFloat(e.currentTarget.value) });
                    }
                  }}
                  onBlur={(e) => updateKeyframes(selectedClip, 'position', { x: parseFloat(e.currentTarget.value) })}
                  className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/20 transition-all" 
                />
              </PropertyRow>

              <PropertyRow label="Position Y" activeColor={activeHex}>
                <input 
                  type="number" 
                  min="-4000"
                  max="4000"
                  defaultValue={Math.round(currentPos.y)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateKeyframes(selectedClip, 'position', { y: parseFloat(e.currentTarget.value) });
                    }
                  }}
                  onBlur={(e) => updateKeyframes(selectedClip, 'position', { y: parseFloat(e.currentTarget.value) })}
                  
                  className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/20 transition-all" 
                />
              </PropertyRow>
            </div>
             
             {/*ZOOM */}
             
             <PropertyRow 
              label={
                <div className="flex justify-between items-center w-full pr-2">
                  <span> Zoom </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-10" style={{ color: activeHex }}>
                     {(getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'zoom') * 100).toFixed(0)}%
                  </span>
                </div>
              } 
              activeColor={activeHex} 
              keyframeNow={zoomKeyframeNow}
            >
                <input 
                  type="range" 
                  className="w-full cursor-pointer"                   
                  style={{ accentColor: activeHex }} 
                  onInput={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  updateKeyframes(selectedClip, 'zoom', (e.target as HTMLInputElement).value)
                }} 
                min={0.1} max={20}
                value={getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'zoom')}
                />
              </PropertyRow>
            </>
          )}

          {isText && (
            <>
              <PropertyRow label="Font" keyframable={false}>
                <select className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none w-full">
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Monospace</option>
                </select>
              </PropertyRow>
              <PropertyRow label="Color" activeColor={activeHex}>
                <input type="color" className="w-full h-8 bg-transparent border-none rounded cursor-pointer" />
              </PropertyRow>
            </>
          )}


      {/* VOLUME */}
      {(!isImage && !isText  ) && (
        <PropertyRow 
          label={
            <div className="flex justify-between items-center w-full pr-2">
              <span>Volume</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-10" style={{ color: activeHex }}>
                {(getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'volume')).toFixed(2)} db
              </span>
            </div>
          } 
          activeColor={activeHex} 
          keyframeNow={volumeKeyframeNow}
        >
          <input 
            type="range"
            step="0.001" 
            className="w-full cursor-pointer" 
            style={{ accentColor: activeHex }}
            onInput={(e) => {
              e.preventDefault(); e.stopPropagation();
              updateKeyframes(selectedClip, 'volume', (e.target as HTMLInputElement).value)
            }} 
            min={-30} max={30}
            value={getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'volume')}
          />
        </PropertyRow>
      )}

      {/* OPACITY */}
      {(isVideo || isText || isImage) && (
        <PropertyRow 
          label={
            <div className="flex justify-between items-center w-full pr-2">
              <span>Opacity</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-10" style={{ color: activeHex }}>
                {(getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'opacity') * 100).toFixed(0)}%
              </span>
            </div>
          } 
          activeColor={activeHex} 
          keyframeNow={opacityKeyframeNow}
        >
          <input 
            type="range" 
            step="0.001"
            className="w-full cursor-pointer" 
            style={{ accentColor: activeHex }} 
            onInput={(e) => {
              e.preventDefault(); e.stopPropagation();
              updateKeyframes(selectedClip, 'opacity', (e.target as HTMLInputElement).value)
            }} 
            min={0} max={1}
            value={getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'opacity')}
          />
        </PropertyRow>
      )}
      
      {/* SPEED */}
      {
        ( !isText && !isImage ) && (<PropertyRow 
        label={
          <div className="flex justify-between items-center w-full pr-2">
            <span>Speed</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-10" style={{ color: activeHex }}>
              {getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'speed').toFixed(2)}x
            </span>
          </div>
        } 
        activeColor={activeHex} 
        keyframeNow={speedKeyframeNow}
      >
        <input 
          type="range" 
          step="0.1" 
          min={0.2} 
          max={20}  
          className="w-full cursor-pointer"
          style={{ accentColor: activeHex }}
          onInput={(e) => {
            e.preventDefault(); e.stopPropagation();
            updateKeyframes(selectedClip, 'speed', (e.target as HTMLInputElement).value)
          }}
          value={getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'speed')}
        />
      </PropertyRow>)
      }

          {/* ROTATION */}
          {(isVideo || isText || isImage) && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <PropertyRow label="Rotation" activeColor={activeHex}>
                <input type="number" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none"
                min="0"
                max="360"
                value = {Math.round(rotation3d.rot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateKeyframes(selectedClip, 'rotation3d', { rot: parseFloat(e.currentTarget.value) });
                  }
                  }}
                onBlur={(e) => updateKeyframes(selectedClip, 'rotation3d', { rot: parseFloat(e.currentTarget.value) })}
                //defaultValue={getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'rotation3d').rot}
                />
              </PropertyRow>
              <PropertyRow label="3D Rot" activeColor={activeHex}>
                <input type="number" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none"
                min="0"
                max="360"
                value = {Math.round(rotation3d.rot3d)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateKeyframes(selectedClip, 'rotation3d', { rot3d: parseFloat(e.currentTarget.value) });
                  }
                  }}
                onBlur={(e) => updateKeyframes(selectedClip, 'rotation3d', { rot3d: parseFloat(e.currentTarget.value) })}


                />
              </PropertyRow>
            </div>
          )}
        </section>

        {/* SECTION: FADES */}
        <section className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-4 text-zinc-400">
            <Wind size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Transitions</span>
          </div>
          {
           (isVideo || isText || isImage) && (
            <div className="grid grid-cols-2 gap-2">
            <PropertyRow label="Fade In (s)" keyframable={false}>
              <input type="number" 
              value={selectedClip.fadein ? 
                selectedClip.fadein : 0
               }
               onInput={(e) => {
                e.stopPropagation()
                  const val = parseFloat(e.target.value) || 0;
                  if (val > selectedClip.duration) return
                  setClips(prev => prev.map((c) => 
                    c.id === selectedClip.id ? { ...c, fadein: val } : c
                  ));
                }}
               placeholder="0s" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none" />
            </PropertyRow>
            <PropertyRow label="Fade Out (s)" keyframable={false}>
              <input type="number" 
              value={selectedClip.fadeout ? 
                selectedClip.fadeout : 0
               }
               onInput={(e) => {
                e.stopPropagation()
                  const val = parseFloat(e.target.value) || 0;
                  if (val > selectedClip.duration) return

                  setClips(prev => prev.map((c) => 
                    c.id === selectedClip.id ? { ...c, fadeout: val } : c
                  ));
                }}


               placeholder="0s" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none" />
            </PropertyRow>
          </div>
          )
          }

          {/* Fade In and Out Audio*/}
          {
          (isVideo || isAudio) && (<div className="grid grid-cols-2 gap-2">
            <PropertyRow label="Fade In Audio (s)" keyframable={false}>
              <input type="number" 
              value={selectedClip.fadeinAudio ? 
                selectedClip.fadeinAudio : 0
               }
               onInput={(e) => {
                e.stopPropagation()
                  const val = parseFloat(e.target.value) || 0;
                  if (val > selectedClip.duration) return

                  setClips(prev => prev.map((c) => 
                    c.id === selectedClip.id ? { ...c, fadeinAudio: val } : c
                  ));
                }}
               placeholder="0s" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none" />
            </PropertyRow>
            <PropertyRow label="Fade Out Audio (s)" keyframable={false}>
              <input type="number" 
              value={selectedClip.fadeoutAudio ? 
                selectedClip.fadeoutAudio : 0
               }
               onInput={(e) => {
                e.stopPropagation()
                  const val = parseFloat(e.target.value) || 0;
                  if (val > selectedClip.duration) return

                  setClips(prev => prev.map((c) => 
                    c.id === selectedClip.id ? { ...c, fadeoutAudio: val } : c
                  ));
                }}


               placeholder="0s" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none" />
            </PropertyRow>
          </div>)
          }
        </section>

        {/* SECTION: BLEND & MASK */}
        {(isVideo || isText || isImage) && (
          <section className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4 text-zinc-400">
              <Layers size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Advanced</span>
            </div>
            <PropertyRow label="Blend Mode" keyframable={false}>
  <div className="relative w-full">
    <select 
      className="appearance-none w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/20 cursor-pointer pr-6"
      value={selectedClip.blendmode || 'normal'}
      onChange={(e) => {
        e.stopPropagation();
        const newBlendMode = e.target.value as any;
        setClips(prev => prev.map(c => 
          c.id === selectedClip.id ? { ...c, blendmode: newBlendMode } : c
        ));
      }}
    >
      <option value="normal" className="bg-[#090909]">Normal</option>
      <option value="screen" className="bg-[#090909]">Screen</option>
      <option value="lineardodge" className="bg-[#090909]">Add (Linear Dodge)</option>
      <option value="multiply" className="bg-[#090909]">Multiply</option>
      <option value="overlay" className="bg-[#090909]">Overlay</option>
    </select>
    
    {/* Setinha customizada para compensar o appearance-none */}
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
      <ChevronDown size={10} />
    </div>
  </div>
</PropertyRow>
            <PropertyRow label="Mask" keyframable={false}>
              <button className="w-full bg-white/5 border border-white/5 rounded py-2 text-[9px] font-bold hover:bg-white/10 transition-all uppercase">
                Edit Mask
              </button>
            </PropertyRow>
          </section>
        )}
      </div>
    </aside>
  );
};