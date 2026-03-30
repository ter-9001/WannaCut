import React, { useState } from 'react';
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
  handleDragStart: (e: any, ...args: any[]) => void;
  handleRenameAsset: (oldName: string, newName: string) => void;
  formatTime: (seconds: number) => string;
}

export const ItensAside = ({
  sidebarWidth,
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
  formatTime
}: ItensAsideProps) => {
  const [activeTab, setActiveTab] = useState('Media');

  const menuOptions = [
    { id: 'Media', icon: <Film size={20} />, label: 'Media', color: 'fuchsia' },
    { id: 'Text', icon: <Type size={20} />, label: 'Text', color: 'cyan' },
    { id: 'Effects', icon: <Sparkles size={20} />, label: 'Effects', color: 'purple' },
    { id: 'Transitions', icon: <Layers size={20} />, label: 'Transitions', color: 'blue' },
  ];

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
                ? `bg-${item.color}-600/20 text-${item.color}-400`
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
        {activeTab === 'Media' ? (
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
                      className={`group relative aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden border border-white/5 hover:border-red-600/50 transition-colors cursor-pointer
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

            {/* Assets Grid */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <motion.div
                      key={asset.id}
                      layout
                      draggable
                      onDragStart={(e) => handleDragStart(e, asset)}
                      onClick={(e) => toggleAssetSelection(asset, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => setSourceAsset(asset)}
                      className={`group relative aspect-video rounded-lg overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
                        selectedAssets.some(a => a.id === asset.id)
                          ? 'border-cyan-500 ring-1 ring-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Thumbnail logic (simplificada para o exemplo) */}
                      <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                        {asset.type === 'video' ? <Play size={20} className="text-white/20" /> : <ImageIcon size={20} className="text-white/20" />}
                      </div>

                      {/* Badge Type */}
                      <div className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
                        {asset.type === 'video' ? <Film size={12} className="text-cyan-400" /> : <Music size={12} className="text-purple-400" />}
                      </div>

                      {/* Info Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-white truncate font-bold uppercase tracking-wider">
                          {asset.name}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center opacity-40">
                    <Search size={32} className="mx-auto mb-3" />
                    <p className="text-[10px] uppercase tracking-widest font-bold">No assets found</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Placeholder para as outras abas */
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-700">
               {menuOptions.find(o => o.id === activeTab)?.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-tighter">{activeTab} Section</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Under construction in the engine</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};