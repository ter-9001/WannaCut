import React, { useState, useEffect } from 'react';
import { 
  Diamond, DiamondPlus, Video, Volume2, Type, Settings2, 
  Wind, Layers, ChevronDown 
} from 'lucide-react';
import { number } from 'framer-motion';




const useEditableValue = (interpolatedValue: number, onUpdate: (val: number) => void) => {
  const [localValue, setLocalValue] = useState(interpolatedValue);

  // Sincroniza o estado local quando a timeline se move
  useEffect(() => {
    setLocalValue(interpolatedValue);
  }, [interpolatedValue]);

  const handleBlurOrEnter = (e: any) => {
    const val = parseFloat(e.currentTarget.value);
    if (!isNaN(val)) onUpdate(val);
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  

  return { localValue, setLocalValue, handleBlurOrEnter };
};

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
  availableFonts: string []
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
  COLOR_MAP,
  availableFonts
}: PropertiesAsideProps) => {

const COLOR_PALETTE: Record<string, string> = {
  transparent: "transparent",
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  cyan: "#00ffff",
  blue: "#0000ff",
  green: "#00ff00",
  yellow: "#ffff00",
  magenta: "#ff00ff"
};

/**
 * Helper to resolve color input to hex
 */
const resolveColor = (input: string): string => {
  if (!input || input.toLowerCase() === 'transparent') return 'transparent';
  const lowerInput = input.toLowerCase();
  return COLOR_PALETTE[lowerInput] || (input.startsWith('#') ? input : '#ffffff');
};


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

  const isZoomKNow = checkKeyframeNow('zoom');
  const isVolumeKNow = checkKeyframeNow('volume');
  const isOpacityKNow = checkKeyframeNow('opacity');

  // 2. Defina os valores interpolados
  const opacity = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'opacity');
  const zoom = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'zoom');
  const volume = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'volume');
  const position = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'position') || { x: 0, y: 0 };
  const rotation3d = getInterpolatedValueWithFades(currentTimeRef.current, selectedClip, 'rotation3d') || { rot: 0, rot3d: 0 };

  // 3. Crie os estados editáveis (Use estes nos Inputs)
  const opacState = useEditableValue(opacity, (v) => updateKeyframes(selectedClip, 'opacity', v));
  const zoomState = useEditableValue(zoom, (v) => updateKeyframes(selectedClip, 'zoom', v));
  const volumeState = useEditableValue(volume, (v) => updateKeyframes(selectedClip, 'volume', v));
  const posXState = useEditableValue(position.x, (v) => updateKeyframes(selectedClip, 'position', { ...position, x: v }));
  const posYState = useEditableValue(position.y, (v) => updateKeyframes(selectedClip, 'position', { ...position, y: v }));
  const rot2dState = useEditableValue(rotation3d.rot, (v) => updateKeyframes(selectedClip, 'rotation3d', { ...rotation3d, rot: v }));
  const rot3dState = useEditableValue(rotation3d.rot3d, (v) => updateKeyframes(selectedClip, 'rotation3d', { ...rotation3d, rot3d: v }));
 
  const fontSizeState = useEditableValue(selectedClip.font_size || 40, (v) => {
      setClips(prev => prev.map(c => 
        c.id === selectedClip.id ? { ...c, font_size: Math.round(v) } : c
      ));
    });

    const bgDim = selectedClip.bg_dimetions || { x: 100, y: 100 };
    const bgDimXState = useEditableValue(bgDim.x, (v) => 
      setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, bg_dimetions: { ...bgDim, x: v } } : c))
    );
    const bgDimYState = useEditableValue(bgDim.y, (v) => 
      setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, bg_dimetions: { ...bgDim, y: v } } : c))
    );
 
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
                  value={posXState.localValue}
                  onChange={(e) => posXState.setLocalValue(parseFloat(e.target.value))}
                  onBlur={posXState.handleBlurOrEnter}
                  onKeyDown={(e) => e.key === 'Enter' && posXState.handleBlurOrEnter(e)}
                  className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/20 transition-all" 
                />
              </PropertyRow>

              <PropertyRow label="Position Y" activeColor={activeHex}>
                <input 
                  type="number" 
                  min="-4000"
                  max="4000"
                  value={posYState.localValue}
                  onChange={(e) => posYState.setLocalValue(parseFloat(e.target.value))}
                  onBlur={posYState.handleBlurOrEnter}
                  onKeyDown={(e) => e.key === 'Enter' && posXState.handleBlurOrEnter(e)}
                  
                  className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/20 transition-all" 
                />
              </PropertyRow>
            </div>
             
             {/*ZOOM */}
             <PropertyRow 
              label={
                <div className="flex justify-between items-center w-full pr-2">
                  <span className="text-zinc-500">Scale / Zoom</span>
                  
                  {/* Container com largura fixa para não dançar na tela */}
                  <div className="flex items-center bg-white/5 border border-white/10 rounded px-1 w-16">
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full bg-transparent text-[9px] font-mono text-white outline-none pr-1 py-0.5"
                      style={{ color: activeHex }}
                      value={zoomState.localValue.toFixed(2)}
                      onChange={(e) => zoomState.setLocalValue(parseFloat(e.target.value))}
                      onBlur={zoomState.handleBlurOrEnter}
                      onKeyDown={(e) => e.key === 'Enter' && zoomState.handleBlurOrEnter(e)}
                    />
                    <span className="text-[8px] text-zinc-500 pr-1">x</span>
                  </div>
                </div>
              } 
              activeColor={activeHex}
              keyframeNow={isZoomKNow}
            >
              <input 
                type="range" min="0.1" max="5" step="0.01" className="w-full cursor-pointer"
                value={zoomState.localValue}
               style={{ accentColor: activeHex }} 
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  zoomState.setLocalValue(v);
                  updateKeyframes(selectedClip, 'zoom', v);
                }}
              />
            </PropertyRow>
            </>
          )}

          {isText && (
            <section className="mb-6 p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                <Type size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Typography</span>
              </div>

              <PropertyRow label="Font Family" keyframable={false}>
                <div className="relative w-full group">

                  <select 
                    className="w-full appearance-none border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                    value={selectedClip.font}
                    onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? {...c, font: e.target.value} : c))}
                  >
                    {availableFonts.map( a =>
                  
                      <option value={a.split(/[\\/]/).pop()?.split('.')[0] || "Font" } className="bg-[#090909] text-white" > {a.split(/[\\/]/).pop()?.split('.')[0] || "Font" } </option>
                    )}
                  </select>

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    <ChevronDown size={10} strokeWidth={3} />
                  </div>
                </div>
              </PropertyRow>



              <PropertyRow 
                label={
                  <div className="flex justify-between items-center w-full pr-2">
                    <span>Font Size</span>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                      <input 
                        type="number" 
                        className="w-10 bg-transparent text-[9px] font-mono text-white outline-none"
                        value={Math.round(fontSizeState.localValue)}
                        onChange={(e) => fontSizeState.setLocalValue(parseFloat(e.target.value))}
                        onBlur={fontSizeState.handleBlurOrEnter}
                        onKeyDown={(e) => e.key === 'Enter' && fontSizeState.handleBlurOrEnter(e)}
                      />
                      <span className="text-[8px] ml-0.5 text-zinc-500">px</span>
                    </div>
                  </div>
                } 
                keyframable={false} // Ajuste conforme sua lógica de keyframes para texto
              >
                <input 
                  type="range" 
                  min="1" 
                  max="200" 
                  className="w-full accent-amber-500 cursor-pointer"
                  value={fontSizeState.localValue}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    fontSizeState.setLocalValue(v);
                    // Atualização imediata para o Range
                    setClips(prev => prev.map(c => 
                      c.id === selectedClip.id ? { ...c, font_size: v } : c
                    ));
                  }}
                />
              </PropertyRow>

                {/* FONT COLOR (Standard) */}
                <PropertyRow label="Font Color" keyframable={false}>
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded border border-white/10 overflow-hidden cursor-pointer">
                      <div className="w-full h-full" style={{ backgroundColor: resolveColor(selectedClip.font_color) }} />
                      <input 
                        type="color"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={resolveColor(selectedClip.font_color).startsWith('#') ? resolveColor(selectedClip.font_color) : '#ffffff'}
                        onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, font_color: e.target.value } : c))}
                      />
                    </div>
                    <input 
                      list="color-options"
                      type="text"
                      className="flex-1 bg-[#090909] border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none font-mono"
                      value={selectedClip.font_color || ''}
                      onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, font_color: e.target.value } : c))}
                    />
                  </div>
                </PropertyRow>

                {/* BACKGROUND COLOR (With Transparent Support) */}
                <PropertyRow label="Text BG Color" keyframable={false}>
                  <div className="flex items-center gap-2">
                    {/* Checkerboard preview for transparency */}
                    <div className="relative w-6 h-6 rounded border border-white/10 overflow-hidden cursor-pointer checkerboard-bg group">
                      <div 
                        className="w-full h-full transition-colors" 
                        style={{ backgroundColor: resolveColor(selectedClip.font_bgcolor) }} 
                      />
                      <input 
                        type="color"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={selectedClip.font_bgcolor === 'transparent'}
                        value={resolveColor(selectedClip.font_bgcolor).startsWith('#') ? resolveColor(selectedClip.font_bgcolor) : '#000000'}
                        onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, font_bgcolor: e.target.value } : c))}
                      />
                      {/* Quick toggle to transparency if user clicks a small corner or similar logic */}
                    </div>

                    <div className="flex-1 relative flex items-center gap-1">
                      <input 
                        list="color-options"
                        type="text"
                        className="flex-1 bg-[#090909] border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none font-mono"
                        placeholder="transparent, #hex, name..."
                        value={selectedClip.font_bgcolor || 'transparent'}
                        onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, font_bgcolor: e.target.value } : c))}
                      />
                      {/* Transparent Reset Button */}
                      <button 
                        onClick={() => setClips(prev => prev.map(c => c.id === selectedClip.id ? { ...c, font_bgcolor: 'transparent' } : c))}
                        className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-white transition-colors"
                        title="Set to transparent"
                      >
                        <Wind size={12} /> {/* Using Wind as a "clear/air" metaphor or use a 'X' icon */}
                      </button>
                    </div>
                  </div>
                </PropertyRow>

                {/* Shared Datalist */}
                <datalist id="color-options">
                  {Object.keys(COLOR_PALETTE).map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                {/* BG DIMENSIONS */}
                <div className="mt-4 border-t border-white/5 pt-4">
                  <PropertyRow label="BG Size (W / H)" keyframable={false}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center bg-white/5 border border-white/10 rounded px-2">
                          <span className="text-[8px] text-zinc-600 font-bold mr-2 uppercase">W</span>
                          <input type="number" className="bg-transparent w-full py-1 text-[10px] text-white outline-none font-mono text-right"
                            value={Math.round(bgDimXState.localValue)}
                            onChange={(e) => bgDimXState.setLocalValue(parseFloat(e.target.value))}
                            onBlur={bgDimXState.handleBlurOrEnter}
                            min="0"
                            max="4000"
                            
                          />
                        </div>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded px-2">
                          <span className="text-[8px] text-zinc-600 font-bold mr-2 uppercase">H</span>
                          <input type="number" className="bg-transparent w-full py-1 text-[10px] text-white outline-none font-mono text-right"
                            value={Math.round(bgDimYState.localValue)}
                            min="0"
                            max="4000"
                            onChange={(e) => bgDimYState.setLocalValue(parseFloat(e.target.value))}
                            onBlur={bgDimYState.handleBlurOrEnter}
                          />
                        </div>
                      </div>
                  </PropertyRow>
                </div>
  
  
            </section>
          )}


      {/* VOLUME */}
      {(!isImage && !isText  ) && (


            <PropertyRow 
              label={
                <div className="flex justify-between items-center w-full pr-2">
                  <span>Volume</span>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded px-1 w-16">
                    <input 
                      type="number" 
                      className="w-full bg-transparent text-[9px] font-mono text-white text-center outline-none pr-1"
                      style={{ color: activeHex }}
                      value={Math.round(volumeState.localValue * 100)}
                      onChange={(e) => volumeState.setLocalValue(parseFloat(e.target.value) / 100)}
                      onBlur={volumeState.handleBlurOrEnter}
                      onKeyDown={(e) => e.key === 'Enter' && volumeState.handleBlurOrEnter(e)}
                    />
                    <span className="text-[8px] ml-0.5 text-zinc-500">%</span>
                  </div>
                </div>
              }
              activeColor={activeHex}
              keyframeNow={isVolumeKNow} // Usando o booleano correto aqui
            >
              <input 
                type="range" min="0" max="1" step="0.01" className="w-full cursor-pointer"
                value={volumeState.localValue}
                style={{ accentColor: activeHex }} 
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  volumeState.setLocalValue(v);
                  updateKeyframes(selectedClip, 'volume', v);
                }}
              />
            </PropertyRow>


      )}

      {/* OPACITY */}
      {(isVideo || isText || isImage) && (
      <PropertyRow 
          label={
        <div className="flex justify-between items-center w-full pr-2">
          <span>Opacity</span>
          {/* O Input numérico agora vive aqui, substituindo o Span estático */}
          <div className="relative flex items-center">
            <input 
              type="number" 
              className="w-10 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] font-mono text-right outline-none focus:border-white/20 transition-colors"
              style={{ color: activeHex }}
              value={Math.round(opacState.localValue * 100)} // Exibe 0-100
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                opacState.setLocalValue(v / 100); // Converte de volta para 0-1
              }}
              onBlur={(e) => {
                const v = parseFloat(e.currentTarget.value) / 100;
                updateKeyframes(selectedClip, 'opacity', v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = parseFloat(e.currentTarget.value) / 100;
                  updateKeyframes(selectedClip, 'opacity', v);
                  e.currentTarget.blur();
                }
              }}
            />
            <span className="text-[8px] ml-0.5 opacity-50">%</span>
          </div>
        </div>
      } 
      activeColor={activeHex} 
      keyframeNow={isOpacityKNow}
      >
      <div className="flex items-center gap-3">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          className="flex-1 accent-indigo-600"
          value={opacState.localValue}
          style={{ accentColor: activeHex }} 
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            opacState.setLocalValue(v);
            updateKeyframes(selectedClip, 'opacity', v);
          }}
        />
      </div>
      </PropertyRow>
      )}
      
      {/* SPEED */}
      {
        ( !isText && !isImage ) && ( <PropertyRow label="Playback Speed" keyframable={false}>
        <div className="flex items-center gap-3">
          <Wind size={12} className="text-sky-400" />
          <select 
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
            value={selectedClip.speed || 1}
            onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? {...c, speed: parseFloat(e.target.value)} : c))}
          >
            <option value="0.5">0.5x (Slow)</option>
            <option value="1">1.0x (Normal)</option>
            <option value="1.5">1.5x (Fast)</option>
            <option value="2">2.0x (Double)</option>
          </select>
        </div>
      </PropertyRow>)
      }

          {/* ROTATION */}
          {(isVideo || isText || isImage) && 
          
          (<div className="grid grid-cols-2 gap-2 mt-2">
            <PropertyRow label="Rotation" activeColor={activeHex}>
              <input type="number" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none"
                value={Math.round(rot2dState.localValue)}
                onChange={(e) => rot2dState.setLocalValue(parseFloat(e.target.value))}
                onBlur={rot2dState.handleBlurOrEnter}
                onKeyDown={(e) => e.key === 'Enter' && rot2dState.handleBlurOrEnter(e)}
              />
            </PropertyRow>
            <PropertyRow label="3D Rot" activeColor={activeHex}>
              <input type="number" className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none"
                value={Math.round(rot3dState.localValue)}
                onChange={(e) => rot3dState.setLocalValue(parseFloat(e.target.value))}
                onBlur={rot3dState.handleBlurOrEnter}
                onKeyDown={(e) => e.key === 'Enter' && rot3dState.handleBlurOrEnter(e)}
              />
            </PropertyRow>
          </div>)
          
          
          }



        </section>

        {/* SECTION: FADES */}
        {
          (!isAudio) && (<section className="mb-8 p-3 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-zinc-400">
              <Wind size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Video Transitions</span>
            </div>


            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-2 bg-white/5 rounded border border-white/5">
                <label className="text-[8px] text-zinc-500 uppercase block mb-1">Video Fade In</label>
                <div className="flex items-center bg-[#090909] border border-white/10 rounded px-2 py-1 focus-within:border-emerald-500/50 transition-colors">
                  <input 
                    type="number" step="0.1" className="w-full bg-transparent text-[10px] text-white outline-none"
                    value={selectedClip.fadeIn || 0}
                    onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? {...c, fadeIn: parseFloat(e.target.value)} : c))}
                  />
                </div>
              </div>
              <div className="p-2 bg-white/5 rounded border border-white/5 ">
                <label className="text-[8px] text-zinc-500 uppercase block mb-1">Video Fade Out</label>
                <div className="flex items-center bg-[#090909] border border-white/10 rounded px-2 py-1 focus-within:border-emerald-500/50 transition-colors">
                  <input 
                    type="number" step="0.1" className="w-full bg-transparent text-[10px]  text-white outline-none"
                    value={selectedClip.fadeOut || 0}
                    onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? {...c, fadeOut: parseFloat(e.target.value)} : c))}
                  />
                </div>
              </div>
            </div>


            </section>
          )


        }



        {


          (!isText ) && ( <section className="mb-8 p-3 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-zinc-400">
              <Wind size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Audio Transitions</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Fade In Audio */}
              <div className="space-y-1.5">
                <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">Fade In (s)</label>
                <div className="flex items-center bg-[#090909] border border-white/10 rounded px-2 py-1 focus-within:border-emerald-500/50 transition-colors">
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0"
                    className="w-full bg-transparent text-[10px] text-white outline-none" 
                    value={selectedClip.audioFadeIn || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setClips(prev => prev.map(c => 
                        c.id === selectedClip.id ? { ...c, audioFadeIn: val } : c
                      ));
                    }}
                  />
                </div>
              </div>

              {/* Fade Out Audio */}
              <div className="space-y-1.5">
                <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">Fade Out (s)</label>
                <div className="flex items-center bg-[#090909] border border-white/10 rounded px-2 py-1 focus-within:border-emerald-500/50 transition-colors">
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0"
                    className="w-full bg-transparent text-[10px] text-white outline-none"
                    value={selectedClip.audioFadeOut || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setClips(prev => prev.map(c => 
                        c.id === selectedClip.id ? { ...c, audioFadeOut: val } : c
                      ));
                    }}
                  />
                </div>
              </div>
            </div>
          </section>)

        }

        {/* SECTION: BLEND & MASK */}
        {(isVideo || isText || isImage) && (
          

          <section className="mt-4 pt-4 border-t border-white/5 ">
            <PropertyRow label="Blending Mode" keyframable={false}>
              <div className="relative w-full group">
                <select 
                  className="appearance-none w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all cursor-pointer pr-8"
                  value={selectedClip.blendmode || 'normal'}
                  onChange={(e) => setClips(prev => prev.map(c => c.id === selectedClip.id ? {...c, blendmode: e.target.value} : c))}
                >
                  {/* Importante: A classe bg-[#090909] nas options resolve o fundo branco em muitos navegadores */}
                  <option value="normal" className="bg-[#090909] text-white">Normal</option>
                  <option value="screen" className="bg-[#090909] text-white">Screen</option>
                  <option value="add" className="bg-[#090909] text-white">Add</option>
                  <option value="multiply" className="bg-[#090909] text-white">Multiply</option>
                  <option value="overlay" className="bg-[#090909] text-white">Overlay</option>
                </select>

                {/* Ícone de Seta Customizado */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <ChevronDown size={10} strokeWidth={3} />
                </div>
              </div>
            </PropertyRow>

            {/* Mask Placeholder - Parte Gráfica */}
            <div className="opacity-40 pointer-events-none">
              <PropertyRow label="Mask (Beta)" keyframable={false}>
                <div className="h-20 border-2 border-dashed border-white/10 rounded flex flex-col items-center justify-center gap-1">
                    <Layers size={16} />
                    <span className="text-[8px] uppercase font-bold">Drop mask here</span>
                </div>
              </PropertyRow>
            </div>
          </section>


        )}
      </div>
    </aside>
  );
};