import React, { useState } from 'react';
import { Clip } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  X, 
  Music, 
  Play, 
  Image as ImageIcon, 
  Film, 
  Type, 
  Sparkles, 
  Layers 
} from 'lucide-react';




interface ItensAsideProps {
  sidebarWidth: number;
  typeofclip: string | null;
  isResizingSidebar: React.MutableRefObject<boolean>;
  handleImportFile: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredAssets: any[];
  selectedAssets: any[];
  toggleAssetSelection: (asset: any, isMulti: boolean) => void;
  setSourceAsset: (asset: any) => void;
  setInPoint: (val: number) => void;
  setOutPoint: (val: number) => void;
  setCurrentTime2: (val: number) => void;
  handleDragStartEffect: (e: React.DragEvent, effectId: string, category: 'video' | 'audio') => void;
  handleDragStartTransition: (e: React.DragEvent, transitionId: string) => void;
  handleDragStart: (e: any, ...args: any[]) => void;
  handleRenameAsset: (oldName: string, newName: string) => void;
  formatTime: (seconds: number) => string;
  availableFonts: string [];
  loadSystemFonts: () => void;
  handleDragStartText: (
  e: React.DragEvent, 
  fontName: string, 
  fontPath: string
  ) => void;



}





const VIDEO_EFFECTS = [
  { id: 'camera_shake', label: 'Camera Shake' },
  { id: 'chromatic_aberration', label: 'Chromatic Aberration' },
  { id: 'film_grain', label: 'Film Grain & Dust' },
  { id: 'blur', label: 'Blur' },
  { id: 'glitch', label: 'Glitch' },
];

const AUDIO_EFFECTS = [
  { id: 'microphone', label: 'Microfone' },
  { id: 'alien', label: 'Alien' },
  { id: 'pitch', label: 'Pitch' },
];

const TRANSITIONS_LIST = [
  { id: 'smooth_push', label: 'Smooth Push' },
  { id: 'rgb_split_glitch', label: 'RGB Split Glitch' },
  { id: 'cube_flip', label: 'Cube Flip' },
  { id: 'dissolve', label: 'Dissolve' },
  { id: 'fade_out_in', label: 'Fade-out in' },
];



export const ItensAside = ({
  sidebarWidth,
  typeofclip,
  isResizingSidebar,
  handleImportFile,
  searchQuery,
  setSearchQuery,
  filteredAssets,
  selectedAssets,
  toggleAssetSelection,
  setSourceAsset,
  setInPoint,
  setOutPoint,
  setCurrentTime2,
  handleDragStart,
  handleRenameAsset,
  formatTime,
  availableFonts,
  loadSystemFonts,
  handleDragStartText,
  handleDragStartEffect,
  handleDragStartTransition
  
}: ItensAsideProps) => {
  const [activeTab, setActiveTab] = useState('Media');

  

  const menuOptions = [
    { id: 'Media', icon: <Film size={20} />, label: 'Media', color: 'fuchsia' },
    { id: 'Text', icon: <Type size={20} />, label: 'Text', color: 'cyan' },
    { id: 'Effects', icon: <Sparkles size={20} />, label: 'Effects', color: 'purple' },
    { id: 'Transitions', icon: <Layers size={20} />, label: 'Transitions', color: 'blue' },
  ];


  const colorMap: Record<string, string> = {
    fuchsia: "bg-fuchsia-600/20 text-fuchsia-400",
    cyan: "bg-cyan-600/20 text-cyan-400",
    purple: "bg-purple-600/20 text-purple-400",
    blue: "bg-blue-600/20 text-blue-400",
  };
  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="relative flex h-full border-r border-white/5 bg-[#09090b] overflow-hidden select-none"
    >
      {/* --- SIDEBAR NAV (ICON MENU) --- */}
      <nav className="w-[60px] flex flex-col items-center py-4 gap-4 border-r border-white/5 bg-black/20">
        {menuOptions.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`group relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all ${
              activeTab === item.id 
                ? colorMap[item.color]
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
            {item.icon}
            
            {/* Hover Label (Tooltip Style) */}
            <div className="absolute left-14 px-3 py-1.5 rounded-md bg-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase opacity-0 pointer-events-none group-hover:opacity-100 group-hover:left-12 transition-all z-50 shadow-xl whitespace-nowrap">
              {item.label}
              {/* Tooltip Arrow */}
              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-800 rotate-45" />
            </div>

            {/* Active Indicator */}
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeNav"
                className="absolute left-[-15px] w-1 h-6 bg-cyan-500 rounded-r-full"
              />
            )}
          </div>
        ))}
      </nav>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'Media' && (
          <>
            {/* Header: Import & Search */}
            <aside
              className="relative border-r border-zinc-800 bg-[#0c0c0c] flex flex-col hidden lg:flex"
            >
              <div className="p-4 border-b border-zinc-900">
                <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Media Library
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {/* Import Button */}
                <div
                  onClick={handleImportFile}
                  className="aspect-video border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center group cursor-pointer hover:bg-zinc-900/50 mb-4 transition-colors"
                >
                  <Plus size={20} className="text-zinc-700 group-hover:text-fuchsia-400 transition-colors" />
                  <h2 className="text-[9px] font-black text-zinc-500 uppercase mt-2">Import Media</h2>
                </div>

                {/* RIGHT RESIZER HANDLE */}
                <div
                  onMouseDown={() => {
                    isResizingSidebar.current = true;
                    document.body.style.cursor = 'col-resize';
                  }}
                  className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-[60] hover:bg-blue-500/40 transition-colors"
                />

                {/* Search Bar Container */}
                <div className="relative mb-6 group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search
                      size={16}
                      className={`transition-colors duration-300 ${
                        searchQuery ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-red-400'
                      }`}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full bg-[#161616]/50 backdrop-blur-xl border border-white/5 rounded-2xl py-3 pl-12 pr-12 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-600/30 focus:bg-[#1a1a1a] transition-all duration-300"
                  />

                  <AnimatePresence>
                    {searchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset, index) => (
                    <motion.div
                      key={asset.path}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => {
                        toggleAssetSelection(asset, e.shiftKey || e.ctrlKey);
                        setSourceAsset(asset);
                        setInPoint(0);
                        setOutPoint(0);
                        setCurrentTime2(0);
                      }}
                      className={`group relative aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden border border-white/5 hover:border-cyan-500 transition-colors cursor-pointer
                      ${selectedAssets.includes(asset) ? 'bg-red-500/10 border-red-500' : 'bg-[#151515] border-zinc-800 hover:border-zinc-600'}`}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, null, null, null, asset.name, false, null)}
                    >
                      {asset.type !== 'audio' && asset.thumbnailUrl && (
                        <img
                          src={asset.thumbnailUrl}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          alt={asset.name}
                        />
                      )}

                      {asset.type === 'audio' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#121212]">
                          <Music size={48} className="text-gray-600 transition-colors duration-300 group-hover:text-red-600" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-100" />

                      {asset.type !== 'image' && asset.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                          {formatTime(asset.duration)}
                        </div>
                      )}

                      <div className="absolute top-2 left-2 p-1 bg-black/50 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {asset.type === 'video' && <Play size={12} className="text-white" />}
                        {asset.type === 'audio' && <Music size={12} className="text-white" />}
                        {asset.type === 'image' && <ImageIcon size={12} className="text-white" />}
                      </div>

                      <div className="absolute bottom-2 left-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p
                          className="text-[10px] text-white truncate font-medium drop-shadow-lg outline-none"
                          contentEditable
                          suppressContentEditableWarning={true}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); }
                            if (e.key === 'Escape') { e.currentTarget.innerText = asset.name; e.currentTarget.blur(); }
                          }}
                          onBlur={(e) => {
                            const newName = e.currentTarget.innerText.trim();
                            if (newName && newName !== asset.name) handleRenameAsset(asset.name, newName);
                          }}
                        >
                          {asset.name}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <Search size={48} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-500 text-sm italic">No assets match your search...</p>
                  </div>
                )}
              </div>
            </aside>

          </>
        )}
        
             
        {
        
        (activeTab === 'Text' && availableFonts.length > 0) && (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Typography Library
              </h3>
              <button 
                onClick={() => {/* Abrir pasta de fontes no SO */}}
                className="p-1 hover:bg-white/5 rounded text-zinc-500 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {availableFonts.map((fontPath) => {
                const fontName = fontPath.split(/[\\/]/).pop()?.split('.')[0] || "Font";
                return (
                  <motion.div
                    key={fontPath}
                    draggable
                    onDragStart={(e) => handleDragStartText(e,fontName, fontPath)}
                    className="group relative bg-white/2 border border-white/5 p-3 rounded-lg hover:border-cyan-500/30 hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all"
                  >
                    {/* O SEGREDO: Aplicar a fonte dinamicamente aqui */}
                    <p 
                      style={{ fontFamily: fontName }} 
                      className="text-lg text-white truncate"
                    >
                      {fontName}
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter">
                          {fontPath.endsWith('ttf') ? 'TrueType' : 'OpenType'}
                      </span>
                      <Type size={10} className="text-zinc-700 group-hover:text-cyan-500 transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
        
        
        {
        
        
        (activeTab ==='Text' && availableFonts.length == 0) &&
        (

          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-700">
               {menuOptions.find(o => o.id === activeTab)?.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-tighter">{activeTab} No Fonts </h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium"> Download and put in subfolder fonts in freecut_settings (check  the configurations) </p>
            </div>
          </div>

        )
        
        }
        
        {activeTab === 'Effects' && (
            <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto custom-scrollbar">
              
              
              {/* Video Effects */}

              { (typeofclip == 'video' || typeofclip == 'image') && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-4">
                  Video Effects
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {VIDEO_EFFECTS.map((eff) => (
                    <motion.div
                      key={eff.id}
                      draggable
                      onDragStart={(e) => handleDragStartEffect(e, eff.id, 'video')}
                      className="group relative bg-purple-600/5 border border-purple-500/10 p-3 rounded-lg hover:border-purple-500/40 hover:bg-purple-600/10 cursor-grab active:cursor-grabbing transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles size={16} className="text-purple-400" />
                        <p className="text-xs text-zinc-200 font-medium">{eff.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>)
              
            
            }

              {/* Audio Effects */}
              { (typeofclip == 'video' || typeofclip == 'audio') && ( <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-4">
                  Audio Effects
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {AUDIO_EFFECTS.map((eff) => (
                    <motion.div
                      key={eff.id}
                      draggable
                      onDragStart={(e) => handleDragStartEffect(e, eff.id, 'audio')}
                      className="group relative bg-fuchsia-600/5 border border-fuchsia-500/10 p-3 rounded-lg hover:border-fuchsia-500/40 hover:bg-fuchsia-600/10 cursor-grab active:cursor-grabbing transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Music size={16} className="text-fuchsia-400" />
                        <p className="text-xs text-zinc-200 font-medium">{eff.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div> 
            )}
            </div>
          )}

          {activeTab === 'Transitions' && (
            <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">
                Transitions Library
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {TRANSITIONS_LIST.map((trans) => (
                  <motion.div
                    key={trans.id}
                    draggable
                    onDragStart={(e) => handleDragStartTransition(e, trans.id)}
                    className="group relative bg-blue-600/5 border border-blue-500/10 p-4 rounded-xl hover:border-blue-500/40 hover:bg-blue-600/10 cursor-grab active:cursor-grabbing transition-all border-dashed"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-tighter">
                        {trans.label}
                      </p>
                    </div>
                    
                    {/* Visual Indicator of Overlap */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500/20 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-blue-500 mx-auto" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        
        
        
        
      </div>
    </aside>
  );
};