import React, { useState, useEffect } from 'react';
import { X, Monitor, Film, Music, Layers } from 'lucide-react';


interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  sampleRate: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ProjectSettings;
  onSave: (settings: ProjectSettings) => void;
}

const ProjectSettingsModal: React.FC<Props> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [settings, setSettings] = useState<ProjectSettings>(currentSettings);

  if (!isOpen) return null;

  

  // Preset resolutions for quick setup
  const presets = [
    { label: '4K Ultra HD', w: 3840, h: 2160 },
    { label: '1080p Full HD', w: 1920, h: 1080 },
    { label: 'TikTok / Shorts', w: 1080, h: 1920 },
    { label: 'Instagram Square', w: 1080, h: 1080 },
  ];

  const handlePresetClick = (w: number, h: number) => {
    setSettings({ ...settings, width: w, height: h });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">Project Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar text-[12px]">
          
          {/* Section: Project Identity */}
          <div className="space-y-3">
            <label className="text-zinc-400 font-medium flex items-center gap-2">
               Project Name
            </label>
            <input 
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500/50 transition-all"
              value={settings.name}
              onChange={(e) => setSettings({...settings, name: e.target.value})}
            />
          </div>

          {/* Section: Video Resolution */}
          <div className="space-y-4">
            <label className="text-zinc-400 font-medium flex items-center gap-2">
              <Monitor size={14} /> Video Format
            </label>
            
            {/* Resolution Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePresetClick(p.w, p.h)}
                  className={`p-2 rounded border text-left transition-all ${
                    settings.width === p.w && settings.height === p.h 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-100' 
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium text-[11px]">{p.label}</div>
                  <div className="opacity-50 text-[10px]">{p.w} x {p.h}</div>
                </button>
              ))}
            </div>

            {/* Custom Inputs */}
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <span className="text-zinc-500 text-[10px]">Width (px)</span>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-white outline-none"
                  value={settings.width}
                  onChange={(e) => setSettings({...settings, width: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-zinc-500 text-[10px]">Height (px)</span>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-white outline-none"
                  value={settings.height}
                  onChange={(e) => setSettings({...settings, height: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            {/* Section: Frame Rate */}
            <div className="space-y-3">
              <label className="text-zinc-400 font-medium flex items-center gap-2">
                <Film size={14} /> Frame Rate
              </label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white outline-none appearance-none"
                value={settings.fps}
                onChange={(e) => setSettings({...settings, fps: parseFloat(e.target.value)})}
              >
                <option value={23.976} className="bg-[#0f0f0f]">23.976 fps (Cinematic)</option>
                <option value={24} className="bg-[#0f0f0f]">24 fps</option>
                <option value={30} className="bg-[#0f0f0f]">30 fps (NTSC)</option>
                <option value={60} className="bg-[#0f0f0f]">60 fps (High Motion)</option>
              </select>
            </div>

            {/* Section: Audio Sample Rate */}
            <div className="space-y-3">
              <label className="text-zinc-400 font-medium flex items-center gap-2">
                <Music size={14} /> Sample Rate
              </label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white outline-none appearance-none"
                value={settings.sampleRate}
                onChange={(e) => setSettings({...settings, sampleRate: parseInt(e.target.value)})}
              >
                <option value={44100} className="bg-[#0f0f0f]">44100 Hz</option>
                <option value={48000} className="bg-[#0f0f0f]">48000 Hz (Studio)</option>
                <option value={96000} className="bg-[#0f0f0f]">96000 Hz (High-Res)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white/5 flex justify-end gap-3 border-t border-white/5">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded text-zinc-400 hover:text-white transition-all text-[11px]"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(settings)}
            className="px-6 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all text-[11px] shadow-lg shadow-blue-900/20"
          >
            Apply Settings
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProjectSettingsModal;