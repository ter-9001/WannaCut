import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Music, Play, Image as ImageIcon } from 'lucide-react';

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
  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
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
  );
};