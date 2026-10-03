/*
 * Copyright (C) 2026  Gabriel Martins Nunes
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


import { useTranslation } from 'react-i18next';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, number } from 'framer-motion';
import * as THREE from 'three';

//Icons for the Render
import { 
  
  Play, 
  Pause, 
  Scissors, 
  SkipBack,    
  SkipForward, 
  LayoutGrid,
  Plus,
  Settings,
  Clock,
  FolderOpen,
  X,
  Youtube,
  Share2,
  Import,
  ZoomIn,      
  ZoomOut,
  Music,
  Sparkles,
  VideoOff,
  ImageIcon,
  Search,
  Settings2, 
  Type, 
  Video, 
  Volume2, 
  Layers, 
  Maximize, 
  Rotate3d, 
  Key, 
  Wind,
  Diamond,
  MicOffIcon,
  LockIcon,
  EyeOff,
  BrushCleaning,
  DiamondPlus,
  ChevronDown,
  Crosshair,
  ArrowBigUpDash,
  ArrowUp,
  Underline,
  Bell,
  Keyboard,
  ArrowDownToLine,
  ExternalLink,
  Copy,
  ClipboardPaste,
  VolumeOff,
  VolumeIcon
  
} from 'lucide-react';

import Waveform from "@/components/Waveform";
import Notifications, { NotificationsRef } from './components/Notification';
import { getDrawFrameFunction, exportVideo, RenderEngineContext } from './renderBridge';
import { SettingsModal } from './components/SettingsModal';
import { PropertiesAside } from '@/components/PropertiesAside';
import { ItensAside } from './components/ItensAside';
import { ShortcutsModal, DEFAULT_SHORTCUTS } from './components/ShortcutsModal';
import type { ShortcutEntry } from './components/ShortcutsModal';



import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { aside, form, track } from 'framer-motion/client';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ExportModal, ExportFormat } from './components/ExportModal';
import { ExportHUD } from './components/ExportHUD';
 
 



// --- INTERFACES ---


interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  sampleRate: number;
}

interface Project {
  name: string;
  path: string;
  thumbnail?:string;
}

interface Keyframe {
  id: string;
  time: number;  
  value: number | Position | Rotation;
  originalTime?: number
}

interface Position
{
  x: number;
  y: number;
}

interface Rotation
{
  rot: number;
  rot3d: number;
}

interface Font_Shine
{
  size?: number;
  intensity?: number;
  color?: string | null; //hexadecimal #ffffff
}

interface Font_Stroke
{
  width?: number; // 0 = sem contorno
  color?: string | null; //hexadecimal #000000
}

export interface Clip {
  id: string;
  name: string;
  start: number; // begin of the clip in relation the timeline
  duration: number;
  color: string;
  trackId: number;
  maxduration: number; // max size in the timeline at current position
  beginmoment: number; //begin of the clip in relation of all original clip (asset)
  originalduration: number;
  blendmode?: 'normal' | 'overlay' | 'screen' | 'multiply' | 'lineardodge' | null;
  mute?: boolean;
  fadein?: number;
  fadeout?: number;
  fadeinAudio?: number;
  fadeoutAudio?: number;
  dimensions?: Position | null;
  scale?: number;
  effects?: Object[];
  transitions?: Object[];
  keyframes?: {
  volume?: Keyframe[];
  opacity?: Keyframe[];
  speed?: Keyframe[];
  rotation3d?: Keyframe[];
  position?: Keyframe[];
  zoom?:Keyframe[];
};

  type?: string | null;
  font?: string | null;
  font_size?: number | null ; // px
  font_color?: string | null;
  font_bgcolor?: string | null;
  bg_dimetions?: Position |null; //for text background
  font_shine?: Font_Shine | null;
  font_stroke?: Font_Stroke | null;
  text_align?: 'left' | 'center' | 'right' | null;

  // Mask properties (static defaults; individual props overridden per-frame by mask.* keyframes)
  mask?: {
    type?: string;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    feather?: number;
    cornerRadius?: number;
    invert?: boolean;
  } | null;

activeKeyframeView?:
  | 'volume' | 'opacity' | 'speed' | 'rotation3d' | 'position' | 'zoom'
  | 'mask.x' | 'mask.y' | 'mask.scaleX' | 'mask.scaleY'
  | 'mask.rotation' | 'mask.feather' | 'mask.cornerRadius'
  | null;

}

interface ProjectFileData {
  projectName: string;
  assets: Asset[];
  clips: Clip[];
  tracks: Tracks[];
  timelineTransitions?: TimelineTransition[];
  lastModified: number;
  copyOf?: string; // Pointer to another main{timestamp}.project file
  
}

// Transição entre dois clips na timeline (diferente de clip.transitions que era por clip)
interface TimelineTransition {
  id: string;
  name: string;       // e.g. 'fade', 'wipe', etc.
  trackId: number;
  junctionTime: number;  // ponto exato da junção (em segundos)
  durationLeft: number;  // quanto a transição se estende para a ESQUERDA (sobre o clip anterior)
  durationRight: number; // quanto a transição se estende para a DIREITA (sobre o clip seguinte)
  clipLeftId: string;
  clipRightId: string;
}

interface Asset {
  name: string;
  path: string;       
  duration: number;   
  type: 'video' | 'audio' | 'image';
  thumbnailUrl?: string; // URL genarate by FFmpeg
  dimensions?: Position
}

interface Tracks
{
  id: number;
  type:  'audio' | 'video' | 'effects' | 'text';
  lock?: boolean;
  mute?: boolean;

}




// No seu tipo Clip, adicione:






export const convertZoom = (input: number): number => {
  // Garantir que o input esteja no limite 0 a 1
  const val = Math.max(0, Math.min(1, input));

  if (val <= 0.5) {
    return val * (1.0 - 0.01) / 0.5 + 0.01;
  } else {
    return (val - 0.5) * (20.0 - 1.0) / (1.0 - 0.5) + 1.0;
  }
};


export const reverterZoom = (zoom: number): number => {
  const z = Math.max(0.01, Math.min(20, zoom));

  if (z <= 1.0) {
    return (z - 0.01) * 0.5 / (1.0 - 0.01);
  } else {
    return (z - 1.0) * (1.0 - 0.5) / (20.0 - 1.0) + 0.5;
  }
};


export const convertDB = (kfValue: number) => {
    const db = (kfValue * 60) - 30;
    return db;
  };

export const reverterVolume = (db: number): number =>
{
   const value = (db + 30)/60;
   return value
}

//convert logic 0-1 to 0.1 - 10 (0.5 is speed 1)
export const converterSpeed = (value: number): number => {
  const v = Math.max(0, Math.min(1, value));
  if (v <= 0.5) {
    // 0 → 0.1x, 0.5 → 1.0x  (linear)
    return 0.1 + (v / 0.5) * (1.0 - 0.1);
  } else {
    // 0.5 → 1.0x, 1.0 → 10.0x  (linear)
    return 1.0 + ((v - 0.5) / 0.5) * (10.0 - 1.0);
  }
};

//undoing converterSpeed (0.1-10 range, 0.5 maps to 1x)
export const reverterSpeed = (realSpeed: number): number => {
  const s = Math.max(0.1, Math.min(10, realSpeed));
  if (s <= 1.0) {
    return ((s - 0.1) / (1.0 - 0.1)) * 0.5;
  } else {
    return 0.5 + ((s - 1.0) / (10.0 - 1.0)) * 0.5;
  }
};

export type PlanTier = 'free' | 'pro' | 'ultimate';
const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, ultimate: 2 };

let _licenseStateCache: { plan: PlanTier; checkedAt: number } | null = null;
const LICENSE_CACHE_TTL_MS = 15_000;

/** Sempre revalida no Rust (com um cache curtíssimo). Nunca confie em `plan` (state React) aqui. */
const getVerifiedPlan = async (folder: string | null, force = false): Promise<PlanTier> => {
  if (!folder) return 'free';
  const now = Date.now();
  if (!force && _licenseStateCache && now - _licenseStateCache.checkedAt < LICENSE_CACHE_TTL_MS) {
    return _licenseStateCache.plan;
  }
  try {
    const state = await invoke<{ plan: PlanTier }>('get_license_state', { settingsFolder: folder });
    const plan = state?.plan ?? 'free';
    _licenseStateCache = { plan, checkedAt: now };
    return plan;
  } catch (err) {
    // Qualquer erro (IPC, arquivo ausente, etc.) nunca libera por padrão.
    console.error('Erro ao verificar plano da licença:', err);
    _licenseStateCache = { plan: 'free', checkedAt: now };
    return 'free';
  }
};

/**
 * `minTier: 'pro'` → libera pra quem tem plano Pro OU Ultimate.
 * `minTier: 'ultimate'` → libera SOMENTE pra quem tem plano Ultimate.
 */
export const hasPlanAccess = async (
  folder: string | null,
  minTier: 'pro' | 'ultimate',
  force = false
): Promise<boolean> => {
  const plan = await getVerifiedPlan(folder, force);
  return PLAN_RANK[plan] >= PLAN_RANK[minTier];
};

/** Nível mínimo de plano exigido por cada efeito de texto pago. Hoje ambos são 'pro' (Pro ou Ultimate liberam); dá pra promover algum pra 'ultimate' aqui no futuro sem mexer em mais nada. */
export const TEXT_EFFECT_MIN_PLAN: Record<string, 'pro' | 'ultimate'> = {
  neon: 'pro',
  glow: 'pro',
};

// ─── Speed Ramp: Time Remapping Utilities ────────────────────────────────────
//
// All speed keyframes store `value` in real speed (e.g. 1.0, 2.0, 0.5).
// Interpolation between keyframes is LINEAR (the user draws curves with many KFs).
//
// Two directions:
//   compositionTime → mediaTime  (where in the original footage is this frame?)
//   mediaTime       → compositionTime  (where on the timeline does this frame land?)
//
// For a LINEAR segment from (t0, v0) to (t1, v1):
//   speed(t) = v0 + (v1 - v0) * (t - t0) / (t1 - t0)
//   ∫ speed dt = v0*(t-t0) + (v1-v0)*(t-t0)² / (2*(t1-t0))
// ─────────────────────────────────────────────────────────────────────────────

interface SpeedKf { time: number; value: number }


/**
 * Convert composition time → media time.
 * compositionTime is relative to the clip start (0 = first frame).
 *
 * Walks each speed segment and accumulates the area under speed(t)
 * via the trapezoid rule (exact for linear interpolation).
 */
export function compositionToMediaTime(compositionTime: number, speedKfs: SpeedKf[]): number {
  if (!speedKfs || speedKfs.length === 0) return compositionTime;

  const sorted = [...speedKfs].sort((a, b) => a.time - b.time);
  let mediaTime = 0;

  // Build segments: each segment has a composition-time start/end and speed start/end.
  // Before the first KF → constant at first KF value
  // After the last KF  → constant at last KF value

  // Segment list (composition time domain)
  const segments: { t0: number; t1: number; v0: number; v1: number }[] = [];

  if (sorted[0].time > 0) {
    segments.push({ t0: 0, t1: sorted[0].time, v0: sorted[0].value, v1: sorted[0].value });
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    segments.push({ t0: sorted[i].time, t1: sorted[i + 1].time, v0: sorted[i].value, v1: sorted[i + 1].value });
  }
  // Open-ended last segment
  segments.push({ t0: sorted[sorted.length - 1].time, t1: Infinity, v0: sorted[sorted.length - 1].value, v1: sorted[sorted.length - 1].value });

  for (const seg of segments) {
    if (compositionTime <= seg.t0) break;
    const to = Math.min(seg.t1, compositionTime);
    const from = seg.t0;
    const span = to - from;
    if (span <= 0) continue;
    const dt = seg.t1 === Infinity ? 1 : (seg.t1 - seg.t0);
    // linear interp of speed at `from` and `to`
    const va = seg.v0 + (seg.v1 - seg.v0) * (from - seg.t0) / (seg.t1 === Infinity ? 1 : dt);
    const vb = seg.v0 + (seg.v1 - seg.v0) * (to   - seg.t0) / (seg.t1 === Infinity ? 1 : dt);
    mediaTime += (va + vb) / 2 * span; // trapezoid (exact for linear)
  }

  return mediaTime;
}

/**
 * Convert media time → composition time (inverse of compositionToMediaTime).
 * Uses binary search since the function is monotonically increasing.
 */
export function mediaToCompositionTime(mediaTime: number, speedKfs: SpeedKf[]): number {
  if (!speedKfs || speedKfs.length === 0) return mediaTime;

  // Binary search: find compositionTime such that compositionToMediaTime(ct) ≈ mediaTime
  let lo = 0;
  let hi = mediaTime * 20; // generous upper bound
  for (let iter = 0; iter < 64; iter++) {
    const mid = (lo + hi) / 2;
    const mt = compositionToMediaTime(mid, speedKfs);
    if (Math.abs(mt - mediaTime) < 0.0001) return mid;
    if (mt < mediaTime) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Given the current speed keyframes of a clip, remap all OTHER keyframes
 * so that they stay anchored to their original media time (originalTime).
 *
 * Returns the full updated keyframes object.
 */
export function remapKeyframesToSpeed(
  keyframes: { opacity?: any[]; volume?: any[]; rotation3d?: any[]; position?: any[]; zoom?: any[]; speed?: any[] },
  speedKfs: SpeedKf[]
): typeof keyframes {
  const types = ['opacity', 'volume', 'rotation3d', 'position', 'zoom'] as const;
  const result = { ...keyframes };

  for (const type of types) {
    const arr = (keyframes as any)[type];
    if (!arr || arr.length === 0) continue;

    (result as any)[type] = arr.map((kf: any) => {
      const originalTime = kf.originalTime ?? kf.time;
      const newCompositionTime = mediaToCompositionTime(originalTime, speedKfs);
      return { ...kf, originalTime, time: newCompositionTime };
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────


const settingsFolder = localStorage.getItem("wannacut_settings_folder");

export default function App() {
  const { t } = useTranslation();
  // --- STATE MANAGEMENT ---
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("My Awesome Project");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [downloadMode, setDownloadMode] = useState<string>("video_best");
  const [playheadPos, setPlayheadPos] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [DownloadYTprogress, setDownloadYTprogress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [tracks, setTracks] = useState<Tracks[]>([]);
  // ─── Multi-project render state ──────────────────────────────────────────────
  interface RenderStatus {
    projectName: string;
    renderStatus: 'rendering' | 'success';
    renderPercent: number;
  }
  const [renderingProjects, setRenderingProjects] = useState<RenderStatus[]>([]);




  useEffect(() => {
    // 1. Filtra os projetos que estão com status 'success' neste ciclo
    const completedProjects = renderingProjects.filter(p => p.renderStatus === 'success');

    //completedProjects.map( (cp) =>   triggerRenderNotification(`Your project ${cp.projectName}  has been rendered`))

  }, [renderingProjects]); // Depende apenas da lista de projetos ativos


  //deleteClipId is used to store the id of a clip that is changed of track
  const [deleteClipId, setDeleteClipId] = useState<string | null>(null);

  //var currentProjectPath = localStorage.getItem("current_project_path");

  const [currentProjectPath, setCurrentProjectPath] = useState < String | null >(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const asidetrack = useRef<HTMLDivElement>(null);

  const asidetrackwidth = asidetrack.current?.offsetWidth || 192;

  
  const playheadRef = useRef<HTMLDivElement>(null);


  // const to move position grafically
  const [showContextMenu, setShowContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [frameSubmenuOpen, setFrameSubmenuOpen] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'none' | 'transform' | 'crop'>('none');

  // Refs para lógica de motor (Não disparam re-render, mantêm a fluidez)
  const selectedClipIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const canvasCursor = interactionMode === 'transform' ? 'move' : 'pointer';

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [plan, setPlan] = useState<'free' | 'pro' | 'ultimate'>('free');

  const [selectedUpgrade, setSelectedUpgrade] = useState<'pro' | 'ultimate' | null>(null);
  const [activationKey, setActivationKey] = useState('');
//PART OF PLANS

const activateLicense = async () => {

  console.log(`Ativando chave ${activationKey} para o plano ${selectedUpgrade}`)
  
  try {
    const result = await invoke("activate_license", {
      settingsFolder: settingsFolder,
      licenseKey: activationKey,
    });

    console.log(result);

    setIsPlanModalOpen(false);
    setPlan('pro')


    window.location.reload();
  } catch (err) {
    console.error(err);
  }
};


//PART TO COPY AND PASTE EFFECTS

const [copiedEffects, setcopiedEffects ] = useState<any>({});
const [timelineTransitions, setTimelineTransitions] = useState<TimelineTransition[]>([]);
const timelineTransitionsRef = useRef<TimelineTransition[]>([]);

const pasteEffects = (target_clip:Clip) => 
{

    // 1. Efeitos (array de objetos) — se o clipe alvo já tiver um efeito com
    // o mesmo `name` do que está sendo colado, apaga o antigo primeiro e
    // só então coloca o novo no lugar. Os demais efeitos atuais (que não
    // colidem) são preservados.
    if (copiedEffects.effects) {
      const existingEffects = target_clip.effects ? target_clip.effects : [];
      const copiedNames = new Set(copiedEffects.effects.map((e: any) => e.name));
      const keptEffects = existingEffects.filter((e: any) => !copiedNames.has(e.name));
      target_clip.effects = [...keptEffects, ...copiedEffects.effects];
    }

    // 2. Keyframes (propriedades) — cada propriedade colada (volume, opacity,
    // speed, rotation3d, position, zoom, mask.*) apaga a keyframe antiga da
    // mesma propriedade e coloca a nova no lugar. Propriedades não coladas
    // são preservadas.
    if (copiedEffects.keyframes) {
      const existingKeyframes = target_clip.keyframes ? { ...target_clip.keyframes } : {};
      for (const key of Object.keys(copiedEffects.keyframes)) {
        // apaga a antiga (se existir) antes de colocar a nova
        delete (existingKeyframes as any)[key];
        (existingKeyframes as any)[key] = copiedEffects.keyframes[key];
      }
      target_clip.keyframes = existingKeyframes;
    }

    // 3. Fade in/out (vídeo e imagem) — apaga o valor antigo e coloca o novo.
    if (copiedEffects.fadein !== undefined) {
      delete target_clip.fadein;
      target_clip.fadein = copiedEffects.fadein;
    }

    if (copiedEffects.fadeout !== undefined) {
      delete target_clip.fadeout;
      target_clip.fadeout = copiedEffects.fadeout;
    }

    // 4. Fade in/out de áudio — apaga o valor antigo e coloca o novo.
    if (copiedEffects.fadeinAudio !== undefined) {
      delete target_clip.fadeinAudio;
      target_clip.fadeinAudio = copiedEffects.fadeinAudio;
    }

    if (copiedEffects.fadeoutAudio !== undefined) {
      delete target_clip.fadeoutAudio;
      target_clip.fadeoutAudio = copiedEffects.fadeoutAudio;
    }



    setClips( prev => prev.map( c => c.id == target_clip.id ? target_clip : c ))




}


const pasteEffectsTrack = (target_track: number) => {
  setClips((prevClips) =>
    prevClips.map((clip) => {
      // Verifica se o clipe pertence à track alvo
      if (clip.trackId !== target_track) {
        return clip;
      }

      // Cria uma cópia do clipe para mutar com segurança
      const updatedClip = { ...clip };

      // 1. Efeitos (array de objetos) — se o clipe já tiver um efeito com o
      // mesmo `name` do que está sendo colado, apaga o antigo primeiro e só
      // então coloca o novo. Os demais efeitos atuais são preservados.
      if (copiedEffects.effects) {
        const existingEffects = updatedClip.effects || [];
        const copiedNames = new Set(copiedEffects.effects.map((e: any) => e.name));
        const keptEffects = existingEffects.filter((e: any) => !copiedNames.has(e.name));
        updatedClip.effects = [...keptEffects, ...copiedEffects.effects];
      }

      // 2. Keyframes (propriedades) — cada propriedade colada apaga a
      // keyframe antiga da mesma propriedade e coloca a nova no lugar.
      // Propriedades não coladas são preservadas.
      if (copiedEffects.keyframes) {
        const existingKeyframes = updatedClip.keyframes ? { ...updatedClip.keyframes } : {};
        for (const key of Object.keys(copiedEffects.keyframes)) {
          delete (existingKeyframes as any)[key];
          (existingKeyframes as any)[key] = copiedEffects.keyframes[key];
        }
        updatedClip.keyframes = existingKeyframes;
      }

      // 3. Fade in/out (vídeo e imagem) — apaga o valor antigo e coloca o novo.
      if (copiedEffects.fadein !== undefined) {
        delete updatedClip.fadein;
        updatedClip.fadein = copiedEffects.fadein;
      }

      if (copiedEffects.fadeout !== undefined) {
        delete updatedClip.fadeout;
        updatedClip.fadeout = copiedEffects.fadeout;
      }

      // 4. Fade in/out de áudio — apaga o valor antigo e coloca o novo.
      if (copiedEffects.fadeinAudio !== undefined) {
        delete updatedClip.fadeinAudio;
        updatedClip.fadeinAudio = copiedEffects.fadeinAudio;
      }

      if (copiedEffects.fadeoutAudio !== undefined) {
        delete updatedClip.fadeoutAudio;
        updatedClip.fadeoutAudio = copiedEffects.fadeoutAudio;
      }

      return updatedClip;
    })
  );
};

//PART TO COPY AND PASTE MAPS

const [copiedMask, setcopiedMask ] = useState<any>({});

const pasteMask = (target_clip:Clip) => 
{


    if(copiedMask.mask)  
      target_clip.mask = copiedMask.mask


    setClips( prev => prev.map( c => c.id == target_clip.id ? target_clip : c ))




}


const pasteMaskTrack = (target_track: number) => {
  setClips((prevClips) =>
    prevClips.map((clip) => {
      // Verifica se o clipe pertence à track alvo
      if (clip.trackId !== target_track) {
        return clip;
      }

      // Cria uma cópia do clipe para mutar com segurança
      const updatedClip = { ...clip };

      
      if (copiedMask.mask) updatedClip.mask = copiedMask.mask;
      

      return updatedClip;
    })
  );
};



// ... dentro do seu componente principal:

useEffect(() => {
  const validate_offline = async () => {
    try {
      // Invoca o comando seguro no backend em Rust
      const result = await invoke("get_license_state", {
        settingsFolder: settingsFolder,
      });

      console.log('Autenticação offline executada com sucesso:', result);
      
      // Atualiza o plano global baseado no token descriptografado pelo Rust
      if (result && result.plan) {
        setPlan(result.plan);
      }
    } catch (err) {
      // Se der erro (ex: arquivo não existe ou token inválido), mantém o plano como 'free'
      console.error("Erro na validação de licença offline (Usuário Free):", err);
      setPlan('free'); 
    }
  };

  // Executa a validação assim que o Tauri abrir a janela do frontend
  validate_offline();
}, []); // <-- Array vazia garante que só roda UMA vez ao abrir o app

useEffect(() => { console.log('Plan: ', plan)}, [plan])








//Variables for effects




const [hasNewMessages, setHasNewMessages] = useState(false);
const notifyRef = useRef<NotificationsRef>(null); // A Ref que você já tem


// variable for HUD father element
const [isHudListOpen, setIsHudListOpen] = useState(false);
const activeProjects = renderingProjects.filter(rp => rp.renderStatus === 'rendering');



const [isExportModalOpen, setIsExportModalOpen] = useState(false);
const [exportKind, setExportKind] = useState<'video' | 'audio' | null>(null);




// Fechar menu ao clicar fora
useEffect(() => {
  const closeMenu = () => {
  setContextMenu(null);
  setTrackContextMenu(null);
};
  window.addEventListener('click', closeMenu);
  return () => window.removeEventListener('click', closeMenu);
}, []);

const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if(!topClips.current) return

  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;

  // Coordenadas do mouse convertidas para a escala do Canvas do projeto
  const mouseX = (e.clientX - rect.left) * (projectConfig.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (projectConfig.height / rect.height);

  

  // Percorremos os clipes visíveis (do topo para baixo)
  for (const clip of topClips.current) {
    const pos = getInterpolatedValueWithFades(currentTime, clip, 'position') as Position;
    
    // Precisamos saber a largura/altura do asset (img) que o drawFrame usou
    // Aqui você pode precisar guardar essas dimensões no objeto Clip ou via Ref
    const clipWidth = clip.width || 1920; 
    const clipHeight = clip.height || 1080;

    if (
      mouseX >= pos.x && mouseX <= pos.x + clipWidth &&
      mouseY >= pos.y && mouseY <= pos.y + clipHeight
    ) {
      selectedClipIdRef.current = clip.id;
      // Aqui você dispara a abertura do Context Menu
      setShowContextMenu({ x: e.clientX, y: e.clientY });
      return;
    }


    
  }
  selectedClipIdRef.current = null; // Clicou no vazio
};

// SYTEM FOR READ MOTORS

const drawFrameEngine = useRef<any>(null);

useEffect(() => {
  const loadEngine = async () => {
    const engine = await getDrawFrameFunction();
    drawFrameEngine.current = engine;
  };
  loadEngine();
}, []);




//SYSTEM FOR LOAD FONTS


const [availableFonts, setAvailableFonts] = useState<string[]>([]);

const loadSystemFonts = async () => {
    const fontsDir = `${localStorage.getItem("wannacut_settings_folder")}/fonts`;

    


 
        const fontPaths = await invoke<string[]>('list_fonts', { fontsPath: fontsDir });
        setAvailableFonts(fontPaths);


fontPaths.forEach(path => {
    const fontName = path.split(/[\\/]/).pop()?.split('.')[0] || "Unknown";
    const fontUrl = convertFileSrc(path);
    console.log('fontName e url', fontName, fontUrl);

    // TESTE: tente carregar via fetch pra ver o erro real
    fetch(fontUrl)
        .then(res => console.log('fetch status', fontName, res.status, res.headers.get('content-type')))
        .catch(err => console.error('fetch falhou', fontName, err));

    const fontFace = new FontFace(fontName, `url("${fontUrl}")`); // note as aspas
    fontFace.load().then((loadedFace) => {
        document.fonts.add(loadedFace);
    }).catch(e => console.error("Erro ao carregar fonte:", fontName, e));
});

    
};


//END OF LOAD FONTS


const removeEffectFromClip = (clipId: string, effectId: number) => {
  setClips(prevClips => prevClips.map(clip => {
    if (clip.id !== clipId) return clip;
    
    // Filtra o array de efeitos removendo pelo índice
    const updatedEffects = clip.effects?.filter((ef) => ef.id !== effectId);
    
    return { ...clip, effects: updatedEffects };
  }));
};


const transferClipsToNewTrackZero = (targetTrackId: number) => {
  setTracks(prevTracks => {
    const shiftedTracks = prevTracks.map(track => ({
        ...track,
        id: track.id + 1
      }));
    

    const targetTrack = prevTracks.find(t => t.id === targetTrackId);
    
    const newTrackZero: Tracks = {
      id: 0,
      type: targetTrack?.type || 'video', // Padrão video se não achar
      lock: false,
      mute: false
    };

    return [newTrackZero, ...shiftedTracks];
  });

  setClips(prevClips => {
    return prevClips.map(clip => {
      let currentClipTrackId = clip.trackId;

      let newTrackId = currentClipTrackId + 1;

      if (currentClipTrackId === targetTrackId) {
        newTrackId = 0;
      }

      return {
        ...clip,
        trackId: newTrackId
      };
    });
  });
};


const moveTrackDownAndShiftOthers = (targetTrackId: number) => {
  // 1. Encontrar a track que tem o maior ID, mas que ainda é menor que o ID alvo
  const sortedTracks = [...tracks].sort((a, b) => a.id - b.id);
  
  // Encontra a track que está logo abaixo da alvo na lista ordenada
  const trackAbaixo = sortedTracks
    .filter(t => t.id < targetTrackId)
    .pop(); // Pega a última (maior) das menores

  if (!trackAbaixo) {
    console.warn("Não há track abaixo da alvo para realizar o deslocamento.");
    return;
  }

  const novoIdDaAlvo = trackAbaixo.id;

  // 2. Atualizar as Tracks
  setTracks(prevTracks => {
    return prevTracks.map(track => {
      // A track alvo assume o ID da que estava abaixo
      if (track.id === targetTrackId) {
        return { ...track, id: novoIdDaAlvo };
      }
      
      // As tracks que estão entre o novoId (inclusive) e o targetId (exclusive)
      // devem subir +1 para abrir espaço
      if (track.id >= novoIdDaAlvo && track.id < targetTrackId) {
        return { ...track, id: track.id + 1 };
      }

      return track;
    });
  });

  // 3. Atualizar os Clips para manterem a consistência com os novos IDs das tracks
  setClips(prevClips => {
    return prevClips.map(clip => {
      let currentTrackId = clip.trackId;

      // Se o clip era da track que "caiu" (a alvo)
      if (currentTrackId === targetTrackId) {
        return { ...clip, trackId: novoIdDaAlvo };
      }

      // Se o clip era de uma das tracks que "subiram"
      if (currentTrackId >= novoIdDaAlvo && currentTrackId < targetTrackId) {
        return { ...clip, trackId: currentTrackId + 1 };
      }

      return clip;
    });
  });
};


/* Part of settingsmodal */


const [wannacutSettings, setwannacutSettings] = useState({
  workspace: '',
  gpu: null,
  shortcuts: ''
});

// ─── Shortcuts system ────────────────────────────────────────────────────────
const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>(DEFAULT_SHORTCUTS);
const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

/** Returns the key combo for a given shortcut id */
const getShortcut = (id: string): ShortcutEntry['keys'] =>
  shortcuts.find(s => s.id === id)?.keys ?? [];

/** True if a KeyboardEvent matches the stored combo for an id */
const matchShortcut = (e: KeyboardEvent, id: string): boolean => {
  const keys = getShortcut(id);
  if (keys.length === 0) return false;
  const mods = keys.filter(k => ['Ctrl','Alt','Shift'].includes(k));
  const main = keys.find(k  => !['Ctrl','Alt','Shift'].includes(k)) ?? '';
  const ctrlOk  = mods.includes('Ctrl')  === (e.ctrlKey  || e.metaKey);
  const altOk   = mods.includes('Alt')   === e.altKey;
  const shiftOk = mods.includes('Shift') === e.shiftKey;
  const mainKey = e.key === ' ' ? 'Space' : e.key === 'Enter' ? 'Enter' : e.key.toUpperCase();
  return ctrlOk && altOk && shiftOk &&  mainKey === main;
};

// Load shortcuts from disk on startup
useEffect(() => {
  const folder = localStorage.getItem('wannacut_settings_folder');
  if (!folder) return;
  invoke<string>('read_settings_file', { path: `${folder}/shortcuts.json` })
    .then(raw => setShortcuts(JSON.parse(raw)))
    .catch(() => {}); // silently fall back to defaults
}, []);

// Efeito para validar a pasta de configurações ao abrir o app
const checkConfig = async () => {
  const folder = localStorage.getItem("wannacut_settings_folder");
  console.log('checkConfig — folder:', folder);

  if (!folder) {
    setIsSettingsOpen(true);
    return;
  }

  try {
    const content = await invoke('read_settings_file', {
      path: `${folder}/wannacut_settings.json`
    }) as string;

    const parsed = JSON.parse(content);


    console.log('settings parse', parsed)

    setwannacutSettings(parsed);
    setRootPath(parsed.workspace ?? null);

    if (!parsed.workspace) {
      console.warn("Workspace não definido.");
      setIsSettingsOpen(true);
    }
  } catch (e) {
    // Só abre o modal se o erro for de arquivo não encontrado,
    // não para qualquer erro (ex: campos extras do plans.rs)
    console.error("Falha ao ler wannacut_settings.json:", e);
    setIsSettingsOpen(true);
  }
};

// useEffect DEPOIS da declaração da função
useEffect(() => {
  checkConfig();
}, []);




 



  //part to Project Config

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 2. Estado para armazenar as configurações do projeto
  const [projectConfig, setProjectConfig] = useState<ProjectSettings>({
    name: "New Project",
    width: 1920,
    height: 1080,
    fps: 24,
    backgroundColor: "#000000",
    sampleRate: 48000
  });

  // Função para salvar vinda do Modal
const handleSaveSettings = async (newSettings: ProjectSettings) => {
  try {
    const newPath = await invoke<string>('save_project_config', { 
      path: currentProjectPath, 
      config: newSettings 
    });

    loadProjects()

    setCurrentProjectPath(newPath)

    setProjectConfig(newSettings);
    setProjectName(newSettings.name);
    
    setIsSettingsOpen(false);
    console.log("Project saved and renamed to:", newPath);

  } catch (err) {
    console.error("Save failed:", err);
    alert(err); 
  }
};


  const canvasRef = useRef<HTMLCanvasElement>(null)


  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const audioExtensions = ['mp3', 'wav', 'ogg'];
  const videoExtensions = ['mp4', 'mkv', 'avi', 'mov'];

  
    // Default zoom: 100 pixels represents 1 second
  const [pixelsPerSecond, setPixelsPerSecond] = useState(10);
  const pixelsPerSecondRef = useRef(10); // mirrors pixelsPerSecond for use inside closures/event listeners

  // Limits to prevent the timeline from disappearing or becoming infinite
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 200;

  //Resizible Aside Asetts 

  const [sidebarWidth, setSidebarWidth] = useState(256); // 256px is default (w-64)
  const isResizingSidebar = useRef(false);


   useEffect(() => {
      const handleMouseMove = (e) => {
        if (!isResizingSidebar.current) return;
        
        // Define limites mínimos e máximos para a largura
        const newWidth = Math.max(180, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizingSidebar.current = false;

        document.body.style.cursor = 'default';
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, []);


  const [isProjectLoaded, setIsProjectLoaded] = useState(false);
  
  //color for clips
  const CLIP_COLORS = [
    'bg-blue-600',   // Ocean
    'bg-emerald-600', // Forest
    'bg-violet-600',  // Royal
    'bg-amber-600',   // Gold
    'bg-rose-600',    // Wine
    'bg-cyan-600',    // Sky
    'bg-indigo-600'   // Galaxy
  ];

  //conversor for clip colors for hexadecimal

  const COLOR_MAP: Record<string, string> = {
  'bg-blue-600': '#2563eb',    // Ocean
  'bg-emerald-600': '#059669', // Forest
  'bg-violet-600': '#7c3aed',  // Royal
  'bg-amber-600': '#d97706',   // Gold
  'bg-rose-600': '#e11d48',    // Wine
  'bg-cyan-600': '#0891b2',    // Sky
  'bg-indigo-600': '#4f46e5'   // Galaxy
};

  

  // Helper to get a random color
  const getRandomColor = () => CLIP_COLORS[Math.floor(Math.random() * CLIP_COLORS.length)];

  // Change from null to empty arrays
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);



  //snap function
  const [isSnapEnabled, setIsSnapEnabled] = useState(false);

  //const to search assets
  const [searchQuery, setSearchQuery] = useState("");


  /**
   * History Manager with a 100-step limit.
   * Uses a simple array-based stack to track clips and assets.
   */
  const [history, setHistory] = useState<{ clips: Clip[], assets: Asset[], tracks: Tracks[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ clips: Clip[], assets: Asset[], tracks: Tracks[] }[]>([]);


  const [timelineHeight, setTimelineHeight] = useState(300); // Default height
  const isResizingTimeline = useRef(false);

  //States for Box Selection, make a box with mouse to select severals clips
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [isDraggingTransition, setIsDraggingTransition] = useState(false);
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 });
  const [boxEnd, setBoxEnd] = useState({ x: 0, y: 0 });


  const clipboardRef = useRef<Clip[]>([]);


  //const to source monitor

const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
const [inPoint, setInPoint] = useState<number>(0);
const [outPoint, setOutPoint] = useState<number>(0);
const sourceVideoRef = useRef<HTMLVideoElement>(null);

 

//const to put thumbnaisl in clip

const [timelineThumbs, setTimelineThumbs] = useState<Record<string, { start: string, end: string }>>({});


//const to make auxiliar preview resizible
const [sourceWidth, setSourceWidth] = useState(320); // Largura inicial (aprox. w-80)
const isResizingSource = useRef(false);

//const to preview videos



const [currentTime, setCurrentTime] = useState(0); // Playhead time
const [isPlaying, setIsPlaying] = useState(false); 
const requestRef = useRef <number>(); // for loop animation loop of high precision
const lastTimeRef = useRef<number | null>(null);

//const [topClips, setTopClips] = useState<Clip [] | null>(null);
const topClips = useRef<Clip[] | null >([]);
const [topAudios, setTopAudios] = useState<Clip [] | null>(null);


//State management for rendering feedback (per-project, see renderingProjects array)


//code source monitor only work when mouse is over it
const [isMouseOverSource, setIsMouseOverSource] = useState(false);
const [currentTime2, setCurrentTime2] = useState(0); // Playhead time
const [isPlaying2, setIsPlaying2] = useState(false); 
const sourceDuration2 = useRef<number>(0);   // duração real do asset (via invoke)
const hasAudio2 = useRef<boolean>(true);      // false quando o asset não tem áudio
const internalTime2 = useRef<number>(0);      // relógio manual de fallback sem áudio
const [totalDuration, setTotalDuration] = useState(0);



useEffect(()=> {
  
  const ends  = clips.map((c) => c.start + c.duration )

  setTotalDuration(Math.max( ... ends))



}, [clips])



// Listen for export progress from Tauri and update the correct project's renderPercent
useEffect(() => {
  const unlisten = listen<{ projectName: string; percent: number } | number>('export-progress', (event) => {
    const payload = event.payload;
    if (typeof payload === 'number') {
      // Legacy: update current open project
      setRenderingProjects(prev =>
        prev.map(r =>
          r.projectName === projectName
            ? { ...r, renderPercent: payload, renderStatus: payload >= 100 ? 'success' : 'rendering' }
            : r
        )
      );
    } else {
      setRenderingProjects(prev =>
        prev.map(r =>
          r.projectName === payload.projectName
            ? { ...r, renderPercent: payload.percent, renderStatus: payload.percent >= 100 ? 'success' : 'rendering' }
            : r
        )
      );
    }
    console.log("Progresso recebido:", payload);
  });

  return () => {
    unlisten.then(f => f());
  };
}, [projectName]);







useEffect(() => {
  // When any project finishes rendering (100%), trigger notification and keep in list as 'success'
  renderingProjects.forEach(r => {
    if (r.renderPercent >= 100 && r.renderStatus == 'rendering') {
      triggerRenderNotification(`Your project ${r.projectName} has been rendered`);
    }
  });



}, [renderingProjects])






//context menu of clips (right click mouse)

const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: any, clip: Clip } | null>(null);
const [activeSubmenu, setActiveSubmenu] = useState<'vocalRemover' | 'keyframable' | 'mask' | null>(null);

// Vocal Remover download modal
const [vocalEngineModal, setVocalEngineModal] = useState(false);
const [vocalEngineStep, setVocalEngineStep] = useState<'confirm' | 'engine' | 'model' | 'done' | null>(null);
const [vocalPendingClip, setVocalPendingClip] = useState<{ clip: Clip; mode: 'vocals_only' | 'instrumental_only' | 'both' } | null>(null);
const [trackContextMenu, setTrackContextMenu] = useState<{
  x: number;
  y: number;
  trackId: number;
  clickTime: number; // tempo em segundos onde o usuário clicou na track
} | null>(null);



const cleanEmptySpace = (trackId: number, clickTime: number) => {
  // 1. Pega todos os clips da track, ordenados por start
  const trackClips = clips
    .filter(c => Number(c.trackId) === Number(trackId))
    .sort((a, b) => a.start - b.start);

  // 2. Acha o clip imediatamente ANTES do ponto clicado (que termina antes do click)
  const clipBefore = [...trackClips]
    .reverse()
    .find(c => c.start + c.duration <= clickTime);

  // 3. Define o "fim do clip anterior" — se não houver clip antes, o espaço começa em 0
  const gapStart = clipBefore ? clipBefore.start + clipBefore.duration : 0;

  // 4. Clips que estão DEPOIS do espaço clicado (começam após gapStart)
  // e que de fato têm um gap (não estão colados no clipBefore)
  const clipsAfter = trackClips.filter(c => c.start >= clickTime);

  if (clipsAfter.length === 0) return; // nada para mover

  // 5. O gap é a diferença entre o início do primeiro clip-depois e gapStart
  const firstClipAfter = clipsAfter[0];
  const gap = firstClipAfter.start - gapStart;

  if (gap <= 0) return; // sem espaço real para limpar

  // 6. Empurra todos os clips após o gap para trás pelo tamanho do gap
  setClips(prev =>
    prev.map(c => {
      if (Number(c.trackId) === Number(trackId) && c.start >= firstClipAfter.start) {
        return { ...c, start: c.start - gap };
      }
      return c;
    })
  );

  showNotify(t('notify.gapRemoved', { gap: gap.toFixed(2), track: trackId + 1 }), 'success');
};



const handleContextMenu = (e: React.MouseEvent, type: any, clip: Clip) => {
  e.preventDefault(); // Impede o menu padrão do Windows/Browser
  setContextMenu({ x: e.clientX, y: e.clientY, type: type, clip: clip });
};

// Fecha o menu ao clicar em qualquer outro lugar
useEffect(() => {
  const closeMenu = () => { setContextMenu(null); setActiveSubmenu(null); };
  window.addEventListener('click', closeMenu);
  return () => window.removeEventListener('click', closeMenu);
}, []);


// context menu option ==> separate audio

const separateAudio = async (clip: Clip) => 
{

  var sourcePath, destPath: string
  const audio = `${clip.name.split('.').slice(0, -1).join('.')}.mp3`

  console.log('clip name', clip)



  //if is not mute it is because the audio is in separate_audio
  if(!clip.mute)
  { 
    sourcePath = `${currentProjectPath}/extracted_audios/${audio}`
    destPath = `${currentProjectPath}/videos/${audio}`

    console.log('sourcePath', sourcePath)

      try
      {
          await invoke<string>('copy_file', { 
          source: sourcePath, 
          destination: destPath 
          });


              setTracks(  (prev) => 
                {
            
                    const newTrackId = prev.length > 0 ? Math.max(...prev.map(t => t.id)) + 1 : 0; 
                    const filename = destPath.replace(/^.*[\\/]/, '');
                  
                    
                    const updatedTracks = [...prev, { 
                      id: newTrackId, 
                      type: 'audio'
                    }];

                    
                    const newClip: Clip = {
                    ...clip, id: crypto.randomUUID(), 
                            name: filename, 
                            color: getRandomColor(),
                            trackId: newTrackId
                    };


                    setClips(prevClips => [...prevClips, newClip] );

                    return updatedTracks










                }


              )

          //if the clip is muted because the audio is out and we wanna undoing it, is just change the mute variable

          const newclip = {... clip, mute: !clip.mute} 
          setClips( prev => prev.map(c => c.id === clip.id ? newclip : c ) )

          await loadAssets()

          showNotify(t('notify.audioExtracted'), "success") 

      }
      catch (error) {
      
        showNotify(t('notify.audioExtractError'), "error") 
        console.error('Error in copy_file', error);
      }
  }
  else
  {
          try
          {
            const newclip = {... clip, mute: !clip.mute} 
            setClips( prev => prev.map(c => c.id === clip.id ? newclip : c ) )
            showNotify(t('notify.audioRestored'), "success")
          }
          catch (error)
          {
             showNotify(t('notify.audioRestoreError'), "error")
             console.log(error)
          }
  }







}

// ─────────────────────────────────────────────
// VOCAL REMOVER
// ─────────────────────────────────────────────

// Run after engine+model are confirmed present
const runVocalRemover = async (clip: Clip, mode: 'vocals_only' | 'instrumental_only' | 'both') => {
  if (!currentProjectPath || !rootPath) return;

  const baseName = clip.name.split('.').slice(0, -1).join('.');
  const audioSrc = `${currentProjectPath}/extracted_audios/${baseName}.mp3`;

  showNotify(t('notify.processingVocals'), 'success');

  try {
    const result = await invoke<{ vocals?: string; instrumental?: string }>('remove_vocals', {
      settingsFolder: settingsFolder,
      workspace: rootPath,
      audioPath: audioSrc,
      outputMode: mode,
    });

    const filesToAdd: { path: string }[] = [];
    if (result.vocals)       filesToAdd.push({ path: result.vocals });
    if (result.instrumental) filesToAdd.push({ path: result.instrumental });

    for (const file of filesToAdd) {
      const filename = file.path.split('/').pop()!;
      const destPath = `${currentProjectPath}/videos/${filename}`;

      await invoke('copy_file', { source: file.path, destination: destPath });

      setTracks(prev => {
        const newTrackId = prev.length > 0 ? Math.max(...prev.map(t => t.id)) + 1 : 0;

        const newClip: Clip = {
          ...clip,
          id: crypto.randomUUID(),
          name: filename,
          color: getRandomColor(),
          trackId: newTrackId,
          type: 'audio',
          mute: false,
        };

        setClips(prevClips => [...prevClips, newClip]);
        return [...prev, { id: newTrackId, type: 'audio' as const }];
      });
    }

    await loadAssets();
    showNotify(
      mode === 'both'             ? t('notify.vocalRemoverDone', { path: 'vocals + instrumental' })
      : mode === 'vocals_only'    ? t('notify.vocalRemoverDone', { path: 'vocals' })
                                  : t('notify.vocalRemoverDone', { path: 'instrumental' }),
      'success'
    );
  } catch (err: any) {
    console.error('vocalRemover error:', err);
    showNotify(err?.toString() ?? t('notify.vocalRemoverFailed'), 'error');
  }
};

// Entry point — checks if engine/model are downloaded first
const vocalRemover = async (clip: Clip, mode: 'vocals_only' | 'instrumental_only' | 'both') => {
  if (!currentProjectPath || !rootPath) {
    showNotify(t('notify.noProjectLoaded'), 'error');
    return;
  }

   console.log('[vocalRemover] settingsFolder:', settingsFolder);
  console.log('[vocalRemover] rootPath:', rootPath);

  const ready = await invoke<{ engine: boolean; model: boolean }>('vocal_remover_ready', {
    settingsFolder: settingsFolder,
  });

  if (!ready.engine || !ready.model) {
    // Show download modal and remember what to run after
    setVocalPendingClip({ clip, mode });
    setVocalEngineStep('confirm');
    setVocalEngineModal(true);
    return;
  }

  await runVocalRemover(clip, mode);
};

// Called by the download modal's confirm button
const startVocalEngineDownload = async () => {
  
   if (!rootPath) {
    console.error('[VocalRemover] rootPath is null!');
    return;
  }
  console.log('[VocalRemover] Starting download, workspace:', rootPath);

  setVocalEngineStep('engine');


  const unlisten = await listen<{ step: string; status: string }>('vocal_remover_progress', (e) => {
    setVocalEngineStep(e.payload.step as 'engine' | 'model');
  });

  try {
    await invoke('vocal_remover_download', { settingsFolder: settingsFolder });
    setVocalEngineStep('done');

    // Auto-run the pending action
    if (vocalPendingClip) {
      setVocalEngineModal(false);
      setVocalPendingClip(null);
      await runVocalRemover(vocalPendingClip.clip, vocalPendingClip.mode);
    }
  } catch (err: any) {
    showNotify(err?.toString() ?? t('notify.downloadFailed'), 'error');
    setVocalEngineModal(false);
  } finally {
    unlisten();
  }
};

// Derived: is the currently open project being rendered?
const isRendering = renderingProjects.some(
  r => r.projectName === projectName && r.renderStatus === 'rendering'
);



const handleCancelExport = async (targetProjectName?: string) => {
  const nameToCancel = targetProjectName ?? projectName;
  try {
    await invoke('cancel_export');
    setRenderingProjects(prev => prev.filter(r => r.projectName !== nameToCancel));
    console.log("Export cancelled for:", nameToCancel);
  } catch (err) {
    console.error("Failed to cancel export:", err);
  }
};


// Multi-project export: adds this project to the renderingProjects array
const startExport = async (format: ExportFormat) => {

  console.log('format', format)

  setIsExportModalOpen(false);
  setExportKind(format.kind);

  // Add this project to the rendering list (or reset if already there)
  setRenderingProjects(prev => {
    const exists = prev.find(r => r.projectName === projectName);
    if (exists) {
      return prev.map(r =>
        r.projectName === projectName
          ? { ...r, renderStatus: 'rendering', renderPercent: 0 }
          : r
      );
    }
    return [...prev, { projectName, renderStatus: 'rendering', renderPercent: 0 }];
  });

  try {
    if (!currentProjectPath) return;
 
    const safeName = (currentProjectPath as string)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
 
    // Escolhe extensão e filtro baseados no formato
    const ext = format.codec; // 'mp4' | 'mkv' | 'mp3' | 'wav'
    const filterName  = format.kind === 'video' ? 'Video' : 'Audio';
    // mpeg4 usa extensão .mp4 na prática (mesmo container)
    const fileExt = ext === 'mp4' ? 'mp4' : ext;
 
    const targetPath = await save({
      title: `Export ${filterName}`,
      filters: [{ name: filterName, extensions: [fileExt] }],
      defaultPath: `${safeName}.${fileExt}`,
    });
 
    if (!targetPath) {
      setRenderingProjects(prev => prev.filter(r => r.projectName !== projectName));
      return;
    }
 
    const fps = projectConfig.fps || 30;
    const capturedProjectName = projectName; // capture for closures


    await exportVideo({
      targetPath: targetPath as string,
      fps,
      projectConfig,
      currentProjectPath: currentProjectPath as string,
      clips: makeSortClips(),
      sceneRef,
      rendererRef,
      cameraRef,
      groupsRef,
      getInterpolatedValueWithFades,
      settingsFolder: settingsFolder ?? undefined,
      exportKind: format.kind,
      exportCodec: format.codec,
      timelineTransitions: timelineTransitionsRef.current,
      onProgress: (percent) => {
        setRenderingProjects(prev =>
          prev.map(r =>
            r.projectName === capturedProjectName
              ? { ...r, renderPercent: percent, renderStatus: percent >= 100 ? 'success' : 'rendering' }
              : r
          )
        );
      },
      gpuName: wannacutSettings.gpu ?? undefined,
      onError: (msg) => {
        console.error('Export Error:', msg);
        setRenderingProjects(prev => prev.filter(r => r.projectName !== capturedProjectName));
      },
    });

    setRenderingProjects(prev =>
      prev.map(r =>
        r.projectName === capturedProjectName
          ? { ...r, renderStatus: 'success', renderPercent: 100 }
          : r
      )
    );
 
  } catch (error) {
    console.error('Export Error:', error);
    setRenderingProjects(prev => prev.filter(r => r.projectName !== projectName));
  }
};
 

  const sanitizeNumber = (num: number): number => {
  return Number(Math.round(num * 100) / 100);
};


const makeSortClips = (nowclips: null | Clip[] = null) => {
  const sorted_tracks = order_tracks();
  const sortedTracksId = sorted_tracks.map(t => t.id);

  const clips_here = nowclips ? nowclips : clips;

  if (clips_here.length === 0) return [];

  const clips_format = clips_here.map((c) => {
    
    return {
      ...c,
      path: `${currentProjectPath}/videos/${c.name}`,
      type: c.type ? c.type : knowTypeByAssetName(c.name),
      mute: c.mute ?? false,
      beginmoment: sanitizeNumber(c.beginmoment),
      duration: sanitizeNumber(c.duration),
      start: sanitizeNumber(c.start)
    };
  });

  const sort_clip = clips_format.sort((a, b) => {
    const trackA = sortedTracksId.indexOf(a.trackId);
    const trackB = sortedTracksId.indexOf(b.trackId);
    return trackA - trackB;
  });

  return sort_clip;
};


//code to video preview


//function to point the track that must be showed in video preview
const updatePreview = async (currentTime: number) => {
  // 1. Filter by time of playhead

 

  const currentClips = clips.filter(clip => 
    currentTime >= clip.start  && 
    currentTime <= (clip.start  + clip.duration) && 
    knowTypeByAssetName(clip.name, true) !== 'audio'
  );

  if (currentClips.length == 0)
  {
    topClips.current = []
    return
  }  
      
  //2. Order as the are showed in visual render

  const sorted_tracks = order_tracks();
  const sortedTracksId = sorted_tracks.map(t => t.id);

  const sortedClips = currentClips.sort((a, b) => {
    const trackA = sortedTracksId.indexOf(a.trackId);
    const trackB = sortedTracksId.indexOf(b.trackId);
    return trackA - trackB;
  });





  // 3. Set the winner
  //const winner = sortedClips[0] || null;
  topClips.current = sortedClips;

  //console.log('winners: ',sortedClips)

  

};


//code to make auxiliar preview resizible

useEffect(() => {
  const handleMouseMove = (e) => {
    // Redimensionar Sidebar (Media Library)
    if (isResizingSidebar.current) {
      const newWidth = Math.max(180, Math.min(500, e.clientX));
      setSidebarWidth(newWidth);
    }
    
    // Redimensionar Source Monitor
    if (isResizingSource.current) {
      // Calculamos a largura baseada na distância entre o mouse e o fim da sidebar
      const newWidth = Math.max(200, Math.min(600, e.clientX - sidebarWidth));
      setSourceWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizingSidebar.current = false;
    isResizingSource.current = false;
    document.body.style.cursor = 'default';
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [sidebarWidth]); // Adicione sidebarWidth como dependência para cálculo preciso

//show what audios to play in audio preview
const updateAudio = () => {
  
  //filter images cause it don't has audio
  

  const currentClips = clips.filter(clip => 
    currentTime >= clip.start  && 
    currentTime <= (clip.start  + clip.duration) && 
    knowTypeByAssetName(clip.name) !== 'image' && knowTypeByAssetName(clip.name) !== 'text' &&
    (tracks.find(t => t.id === clip.trackId)?.mute === false ||
    !(tracks.find(t => t.id === clip.trackId)?.mute)) &&
    (clip?.mute === false ||
    !(clip?.mute))
  );


  //console.log('cc clips',currentClips)

  if (currentClips.length == 0)
  {
    setTopAudios(null)
    return
  }  
      

  const winner = currentClips || null;

  //console.log('present audios', winner)


  const idsAtuais = topAudios?.map(c => c.id).join(',');
  const idsNovos = winner?.map(c => c.id).join(',');


    setTopAudios(winner);

  if (idsAtuais !== idsNovos) {
    //setTopAudios(winner);
    console.log('winner is ', winner)
  }



 


  

  

};


// Map of a lot of <audios>
const audioPlayersRef = useRef<Map<string, HTMLAudioElement>>(new Map());

//Render all audios of the current time







const getInterpolatedValue = (time: number, keyframes: Keyframe[]): number => {
  // 1. Se não houver keyframes, retorna o valor padrão (meio da escala = 0dB)

  console.log('keys', keyframes)
  if (!keyframes || keyframes.length === 0) return 0.5;

  // 2. Garante que estão ordenados por tempo (importante para a busca)
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // 3. Caso o tempo esteja ANTES do primeiro keyframe
  if (time <= sorted[0].time) return sorted[0].value;

  // 4. Caso o tempo esteja DEPOIS do último keyframe
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  // 5. Encontra o intervalo entre dois keyframes
  for (let i = 0; i < sorted.length - 1; i++) {
    const startKf = sorted[i];
    const endKf = sorted[i + 1];

    console.log('middle', startKf, endKf)

    if (time >= startKf.time && time <= endKf.time) {
      // Cálculo de Interpolação Linear (LERP)
      // Descobre a porcentagem do progresso entre o ponto A e o ponto B
      const rangeTime = endKf.time - startKf.time;
      const progress = (time - startKf.time) / rangeTime;

      // Aplica o progresso à diferença de valores
      const rangeValue = endKf.value - startKf.value;
      return startKf.value + progress * rangeValue;
    }
  }

  return 0.5;
};


const getInterpolatedValueWithFades_old = (
  timeFull: number, 
  clip: any, 
  type: 'opacity' | 'volume' | 'speed' | 'zoom' | 'position' | 'rotation3d'
): any => {
  
  // 1. Fallbacks com tipos numéricos garantidos
  const getDefaultValue = () => {
    switch (type) {
      case 'volume': return 0;
      case 'zoom': return 1.0;
      case 'position': return { x: 0, y: 0 };
      case 'rotation3d': return { rot: 0, rot3d: 0 };
      case 'speed': return 1.0;
      case 'opacity': return 1.0;
      default: return 0;
    }
  };

  const time = timeFull - clip.start;
  const kfArray = clip.keyframes?.[type];
  
  if (!kfArray || !Array.isArray(kfArray) || kfArray.length === 0) {
    return applyFades(getDefaultValue(), time, clip, type);
  }

  const sorted = [...kfArray].sort((a, b) => a.time - b.time);
  let baseValue: any;

  // 2. Lógica de Fronteiras
  if (time <= sorted[0].time) {
    baseValue = sorted[0].value;
  } else if (time >= sorted[sorted.length - 1].time) {
    baseValue = sorted[sorted.length - 1].value;
  } else {
    // 3. Interpolação
    for (let i = 0; i < sorted.length - 1; i++) {
      const startKf = sorted[i];
      const endKf = sorted[i + 1];

      if (time >= startKf.time && time <= endKf.time) {
        const rangeTime = endKf.time - startKf.time;
        const progress = rangeTime === 0 ? 0 : (time - startKf.time) / rangeTime;

        if (type === 'position') {
          const start = startKf.value;
          const end = endKf.value;
          baseValue = {
            x: Number(start.x) + progress * (Number(end.x) - Number(start.x)),
            y: Number(start.y) + progress * (Number(end.y) - Number(start.y))
          };
        } 
        else if (type === 'rotation3d') {
          const start = startKf.value;
          const end = endKf.value;
          baseValue = {
            rot: Number(start.rot || 0) + progress * (Number(end.rot || 0) - Number(start.rot || 0)),
            rot3d: Number(start.rot3d || 0) + progress * (Number(end.rot3d || 0) - Number(start.rot3d || 0))
          };
        } 
        else {
          // O fix principal para o erro "1-0.313..." está aqui: usar Number() em ambos os lados
          const startVal = Number(startKf.value);
          const endVal = Number(endKf.value);
          baseValue = startVal + progress * (endVal - startVal);
        }
        break;
      }
    }
  }

  // Debug solicitado
  if (type === 'opacity') {
    console.log('basevalue', baseValue);
  }

  return applyFades(baseValue, time, clip, type);
};






/**
 * Função auxiliar isolada para aplicar os Fades de entrada e saída
 */
const applyFades_old = (value: any, time: number, clip: any, type: string) => {
  if (type === 'opacity' || type === 'volume') {
    const isVideo = type === 'opacity';
    const fadeInDuration = isVideo ? (clip.fadein || 0) : (clip.fadeinAudio || 0);
    const fadeoutDuration = isVideo ? (clip.fadeout || 0) : (clip.fadeoutAudio || 0);
    
    let fadeModifier = 1.0;
    
    if (time < fadeInDuration && fadeInDuration > 0) {
      fadeModifier = time / fadeInDuration;
    } else if (time > (clip.duration - fadeoutDuration) && fadeoutDuration > 0) {
      const timeInFadeOut = time - (clip.duration - fadeoutDuration);
      fadeModifier = 1.0 - (timeInFadeOut / fadeoutDuration);
    }

    fadeModifier = Math.max(0, Math.min(1, fadeModifier));

    const finalvalue = (value as number) * fadeModifier;


    
    return finalvalue
  }




  return value;
};


const getInterpolatedValueWithFades = (
  timeFull: number, 
  clip: any, 
  type: 'opacity' | 'volume' | 'speed' | 'zoom' | 'position' | 'rotation3d'
    | 'mask.x' | 'mask.y' | 'mask.scaleX' | 'mask.scaleY'
    | 'mask.rotation' | 'mask.feather' | 'mask.cornerRadius'
): any => {
  
  const getDefaultValue = () => {
    switch (type) {
      case 'volume': return 0;
      case 'zoom': return 1.0;
      case 'position': return { x: 0, y: 0 };
      case 'rotation3d': return { rot: 0, rot3d: 0 };
      case 'speed': return 1.0;
      case 'opacity': return 1.0;
      // Mask defaults — fall back to clip.mask static value if present
      case 'mask.x':            return clip.mask?.x            ?? 0;
      case 'mask.y':            return clip.mask?.y            ?? 0;
      case 'mask.scaleX':       return clip.mask?.scaleX       ?? 1;
      case 'mask.scaleY':       return clip.mask?.scaleY       ?? 1;
      case 'mask.rotation':     return clip.mask?.rotation     ?? 0;
      case 'mask.feather':      return clip.mask?.feather      ?? 0;
      case 'mask.cornerRadius': return clip.mask?.cornerRadius ?? 0;
      default: return 0;
    }
  };

  const time = timeFull - clip.start;
  const kfArray = clip.keyframes?.[type];
  
  if (!kfArray || !Array.isArray(kfArray) || kfArray.length === 0) {
    return applyFades(getDefaultValue(), time, clip, type);
  }

  const sorted = [...kfArray].sort((a, b) => a.time - b.time);
  let baseValue: any;

  if (time <= sorted[0].time) {
    baseValue = sorted[0].value;
  } else if (time >= sorted[sorted.length - 1].time) {
    baseValue = sorted[sorted.length - 1].value;
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      const startKf = sorted[i];
      const endKf = sorted[i + 1];

      if (time >= startKf.time && time <= endKf.time) {
        const rangeTime = endKf.time - startKf.time;
        const progress = rangeTime === 0 ? 0 : (time - startKf.time) / rangeTime;

        if (type === 'position') {
          const start = startKf.value;
          const end = endKf.value;
          baseValue = {
            x: Number(start.x) + progress * (Number(end.x) - Number(start.x)),
            y: Number(start.y) + progress * (Number(end.y) - Number(start.y))
          };
        } 
        else if (type === 'rotation3d') {
          const start = startKf.value;
          const end = endKf.value;
          baseValue = {
            rot: Number(start.rot || 0) + progress * (Number(end.rot || 0) - Number(start.rot || 0)),
            rot3d: Number(start.rot3d || 0) + progress * (Number(end.rot3d || 0) - Number(start.rot3d || 0))
          };
        } 
        else {
          const startVal = Number(startKf.value);
          const endVal = Number(endKf.value);
          baseValue = startVal + progress * (endVal - startVal);
        }
        break;
      }
    }
  }

  return applyFades(baseValue, time, clip, type);
};

/**
 * Função auxiliar para aplicar Fades
 * No volume (dB), o fade silencia subtraindo decibéis.
 */
const applyFades = (value: any, time: number, clip: any, type: string) => {
  if (type === 'opacity' || type === 'volume') {
    const isVideo = type === 'opacity';
    const fadeInDuration = isVideo ? (clip.fadein || 0) : (clip.fadeinAudio || 0);
    const fadeoutDuration = isVideo ? (clip.fadeout || 0) : (clip.fadeoutAudio || 0);
    
    let fadeModifier = 1.0; // 1.0 = sem fade
    
    if (time < fadeInDuration && fadeInDuration > 0) {
      fadeModifier = time / fadeInDuration;
    } else if (time > (clip.duration - fadeoutDuration) && fadeoutDuration > 0) {
      const timeInFadeOut = time - (clip.duration - fadeoutDuration);
      fadeModifier = 1.0 - (timeInFadeOut / fadeoutDuration);
    }

    fadeModifier = Math.max(0, Math.min(1, fadeModifier));

    if (type === 'volume') {
      // LOGICA DE VOLUME EM dB:
      // Se fadeModifier é 1, não muda nada (soma 0dB).
      // Se fadeModifier é 0, queremos silêncio absoluto.
      // Em áudio digital, -100dB é considerado silêncio total.
      const silenceThreshold = -100; 
      
      // Mapeamos o progresso linear (0 a 1) para uma atenuação em dB
      // Usamos uma curva logarítmica simples para o fade soar natural
      if (fadeModifier <= 0) return silenceThreshold;
      
      // Atenuação: 20 * log10(fadeModifier)
      const attenuation = 20 * Math.log10(fadeModifier);
      
      // O valor final é o volume base somado à atenuação (que é negativa)
      let finalDb = (value as number) + attenuation;
      
      return Math.max(silenceThreshold, finalDb);
    } else {
      // Lógica linear para opacidade
      return (value as number) * fadeModifier;
    }
  }

  return value;
};



useEffect(() => {
  setCurrentTime(playheadPos/pixelsPerSecond)
  
}, [playheadPos])


const lastFrameTimeRef = useRef<number>(0);
const FPS_LIMIT = 1000 / 24; // 30 FPS (aprox 33ms)

const getOpacityAtTime = (clip: Clip) => {
  if (!clip.keyframes || !clip.keyframes.opacity || clip.keyframes.opacity.length === 0) {
    return 1; // Opacidade total se não houver keyframes
  }

  const kfs = [...clip.keyframes.opacity].sort((a, b) => a.time - b.time);
  const relativeTime = (currentTime - clip.start) + (clip.beginmoment || 0);


  console.log('relative time', relativeTime)

  // Antes do primeiro keyframe
  if (relativeTime <= kfs[0].time) return kfs[0].value;
  // Depois do último keyframe
  if (relativeTime >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  // Encontrar os dois keyframes entre os quais o tempo atual está
  for (let i = 0; i < kfs.length - 1; i++) {
    const current = kfs[i];
    const next = kfs[i + 1];

    console.log('current.value', current.value)

    if (relativeTime >= current.time && relativeTime <= next.time) {
      const range = next.time - current.time;
      const progress = (relativeTime - current.time) / range;
      // Interpolação linear simples
      return current.value + ((next.value - current.value) * progress);
    }
  }
  return 1;
};


//Render main frame





//const canvasRef = useRef<HTMLCanvasElement>(null);
const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
const sceneRef = useRef<THREE.Scene | null>(null);
const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
const groupsRef = useRef<Map<string, THREE.Group>>(new Map());
// const lastFrameTimeRef = useRef<number>(0);

// INIT: cria renderer, cena e câmera uma única vez quando o canvas monta
useEffect(() => {
  if (!canvasRef.current || rendererRef.current) return;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.current!,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });


 /* if (wannacutSettings.gpu) {
    renderer.setPixelRatio(window.devicePixelRatio);
    console.log(`🎮 GPU ativa: ${wannacutSettings.gpu}`);
  } else {
    renderer.setPixelRatio(1); // sem GPU: poupa processamento
    console.log('🖥️ Renderizando via software (sem GPU selecionada)');
  }*/

     renderer.setPixelRatio(1); // sem GPU: poupa processamento
    console.log('🖥️ Renderizando via software (sem GPU selecionada)');


  renderer.setSize(projectConfig.width, projectConfig.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  rendererRef.current = renderer;

  sceneRef.current = new THREE.Scene();

  const fov    = 45;
  const camera = new THREE.PerspectiveCamera(fov, projectConfig.width / projectConfig.height, 0.1, 10000);
  const zPos   = (projectConfig.height / 2) / Math.tan((fov * Math.PI) / 360);
  camera.position.set(projectConfig.width / 2, -projectConfig.height / 2, zPos);
  camera.lookAt(projectConfig.width / 2, -projectConfig.height / 2, 0);
  cameraRef.current = camera;

  console.log("🚀 Three.js Engine Inicializado com Sucesso");

  return () => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
  };
}, [canvasRef.current]); // roda só quando o canvas monta

// RESIZE: quando projectConfig.width/height muda, atualiza renderer e câmera sem recriar tudo
useEffect(() => {
  const { width, height } = projectConfig;
  if (!rendererRef.current || !cameraRef.current) return;

  rendererRef.current.setSize(width, height, false);

  const fov  = 45;
  const zPos = (height / 2) / Math.tan((fov * Math.PI) / 360);
  cameraRef.current.aspect = width / height;
  cameraRef.current.updateProjectionMatrix();
  cameraRef.current.position.set(width / 2, -height / 2, zPos);
  cameraRef.current.lookAt(width / 2, -height / 2, 0);

  console.log(`🔧 Three.js redimensionado para ${width}×${height}`);
}, [projectConfig.width, projectConfig.height]);


/*


useEffect(() => {
  if (!rendererRef.current) return;
  if (wannacutSettings.gpu) {
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    console.log(`🎮 GPU aplicada ao renderer: ${wannacutSettings.gpu}`);
  } else {
    rendererRef.current.setPixelRatio(1);
    console.log('🖥️ GPU removida — renderer em modo software');
  }
}, [wannacutSettings.gpu]);



*/

const newDrawFrame = async (time:number | null = null, audios: any| null = null) => 
{
  
  if (drawFrameEngine.current) {

    
      await drawFrameEngine.current({
        time: time ? time : currentTime, // ou o tempo vindo do player
        projectConfig,
        currentProjectPath,
        sceneRef,
        rendererRef,
        cameraRef,
        topClips,
        groupsRef,
        getInterpolatedValueWithFades,
        invoke,
        settingsFolder,
        topAudios: audios ? audios : topAudios, 
        isPlaying,
        timelineTransitions: timelineTransitionsRef.current,
      });

    }

}

useEffect( () => {

   newDrawFrame()

}, [isPlaying])





const lastDrawTimeRef = useRef<number>(0);
const FPS_target =  20 //projectConfig.fps ? projectConfig.fps : 24;
const frameInterval = 1000 / FPS_target; // 100ms

useEffect(() => {
  
    updatePreview(currentTime);
    updateAudio();

    const now = performance.now();
    if (now - lastDrawTimeRef.current >= frameInterval) {
      newDrawFrame()  
      lastDrawTimeRef.current = now; 
    }
  




}, [currentTime, clips, drawFrameEngine.current]);



const lastUpdateRef = useRef<number>(0); 

const currentTimeRef = useRef(0);


const animate = (time: number) => {
  if (lastTimeRef.current !== null) {
    const deltaTime = (time - lastTimeRef.current) / 1000;

  
    
   // 1. Update the REF (this is where time really "moves")
    currentTimeRef.current += deltaTime;
    const currentPos = currentTimeRef.current * pixelsPerSecond;

   // 2. Move the needle via DOM.
    if (playheadRef.current) {
      playheadRef.current.style.transform = `translateX(${currentPos}px)`;
    }

   
 // 3. Updates the stopwatch status only occasionally.
    if (time - lastUpdateRef.current > 100) {
      setCurrentTime(currentTimeRef.current); 
      lastUpdateRef.current = time;
    }
  }
  lastTimeRef.current = time;
  requestRef.current = requestAnimationFrame(animate);
};


useEffect(() => {
  if (isPlaying) {
    requestRef.current = requestAnimationFrame(animate);
    
  } else {
    //if (requestRef.current) cancelAnimationFrame(requestRef.current);
    lastTimeRef.current = null;
    
  }
  return () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };
}, [isPlaying]);





const seekToNearestCut = (direction: 1 | -1) => {
  const currentTime = currentTimeRef.current;
  let targetTime: number | null = null;

  // 1. Mapeia todos os pontos de início e fim de todos os clipes
  const cutPoints: number[] = [];
  clips.forEach(clip => {
    cutPoints.push(clip.start);
    cutPoints.push(clip.start + clip.duration);
  });

  // Remove duplicatas (ex: se o fim de um clipe encosta exatamente no início de outro)
  // e remove pontos inválidos ou o próprio tempo atual exato
  const uniqueCuts = Array.from(new Set(cutPoints)).filter(cut => cut !== currentTime);

  if (direction === -1) {
    // --- IR PARA TRÁS (Procura o maior ponto que seja MENOR que o tempo atual) ---
    const pastCuts = uniqueCuts.filter(cut => cut < currentTime);
    
    if (pastCuts.length > 0) {
      // Como queremos o mais próximo de quem está atrás, pegamos o Máximo (Math.max)
      targetTime = Math.max(...pastCuts);
    } else {
      // Se não houver nenhum corte antes, volta para o início da timeline (0)
      targetTime = 0;
    }
  } else if (direction === 1) {
    // --- IR PARA FRENTE (Procura o menor ponto que seja MAIOR que o tempo atual) ---
    const futureCuts = uniqueCuts.filter(cut => cut > currentTime);
    
    if (futureCuts.length > 0) {
      // Como queremos o mais próximo de quem está à frente, pegamos o Mínimo (Math.min)
      targetTime = Math.min(...futureCuts);
    }
    // Opcional: se não houver nada à frente, você pode decidir se mantém parado ou faz outra lógica
  }

  // 2. Se encontrou um destino válido, atualiza a referência
  if (targetTime !== null) {
    //currentTimeRef.current = targetTime;
    seekTo(targetTime)
    
    
    //console.log(`Seeked ${direction === 1 ? 'forward' : 'backward'} to: ${targetTime}`);
  }
};




//generate thubnais in timeline


useEffect(() => {
  const generateTimelineThumbs = async () => {
    if (!currentProjectPath) return;

    for (const clip of clips) {
      // It only generates if it's a video and if it's not already in the cache (or if the time has changed).
      const cacheKey = `${clip.id}-${clip.beginmoment}-${clip.duration}`;

      const assetTarget = assets.find( a => a.name === clip.name)
      
      if (assetTarget?.type === 'video' && !timelineThumbs[cacheKey]) {
        try {
          const startPath = await getThumbnail(currentProjectPath, clip.name, clip.beginmoment);
          const endPath = await getThumbnail(currentProjectPath, clip.name, clip.beginmoment + clip.duration);

          setTimelineThumbs(prev => ({
            ...prev,
            [cacheKey]: {
              start: startPath ? startPath : "",
              end: endPath ? endPath : ""
            }
          }));
        } catch (err) {
          console.error("Erro ao gerar thumb da timeline:", err);
        }
      }
    }
  };

  generateTimelineThumbs();
}, [clips, currentProjectPath]);


// Delete clean tracks
useEffect(() => {
  if (!isSetupOpen) {
    // 1. Get the IDs of the tracks that have at least one clip.
    const activeTrackIds = [...new Set(clips.map(c => c.trackId))];

    // 2. We filter the current array of tracks to keep only those that have clips.
    // In other words, we remove those that are not in the list of active IDs.

    const filteredTracks = tracks.filter(t => activeTrackIds.includes(t.id));

    //3. We check if there was an actual change (by comparing IDs) to avoid render loops.
    const hasChanged__ = 
      filteredTracks.length !== tracks.length || 
      tracks.some((t, i) => filteredTracks[i] && t.id !== filteredTracks[i].id);

    if (hasChanged__) {
      setTracks(filteredTracks);
    }
  }
}, [clips, isSetupOpen]); 


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingTimeline.current) return;
      
      // Calculate new height from the bottom of the screen
      const newHeight = window.innerHeight - e.clientY;
      
      // Limits: Min 150px, Max 80% of screen
      if (newHeight > 150 && newHeight < window.innerHeight * 0.8) {
        setTimelineHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isResizingTimeline.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);


    // Function to Delete Project
  const handleDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await invoke('delete_project', { path: projectToDelete.path });
        setAssets([])
        setClips([])
        setTracks([])
        setProjectToDelete(null);
        loadProjects(); // Reload projects list       
        showNotify(t('notify.projectDeleted'), "success");

      } catch (e) {
        showNotify(t('notify.projectDeleteError'), "error");
      }
    }
  };


  //avoid double clips


useEffect(() => {
  if (clips.length === 0) return;

  const uniqueClips = clips.reduce((acc: Clip[], current) => {
    // 1. Check if a clip with the same ID already exists
    const duplicateId = acc.find(c => c.id === current.id);
    
    // 2. Check if a clip already exists in the same Track and at the same Start position
    const duplicateSlot = acc.find(c => 
      c.trackId === current.trackId && c.start === current.start
    );

    if (duplicateId || duplicateSlot) {
      // If there is a conflict, we keep the one with the smaller ID (the oldest/original)
      // and discard the one with the larger ID (the most recent/duplicate)
      const existing = duplicateId || duplicateSlot;
      
      if (current.id > existing!.id) {
        return acc; // Ignore the current clip (higher ID)
      } else {
        // If the current ID is smaller (rare case), remove the previous one and add this one
        return [...acc.filter(c => c !== existing), current];
      }
    }

    return [...acc, current];
  }, []);

  // Only update the state if the array length changed (prevents infinite loops)
  if (uniqueClips.length !== clips.length) {
    setClips(uniqueClips);
  }
}, [clips]);

// Function to move playhead
const handlePlayheadMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const movePlayhead = (moveEvent: MouseEvent) => {
    if (!timelineContainerRef.current) return;

    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;

    // Calculate the X position relative to the container, including scroll offset.
    // Subtract asidetrackwidth (192 or similar) and padding (8) to align with the start of the tracks.
    const x = moveEvent.clientX - rect.left + scrollLeft - (asidetrackwidth + 15);

    // Set the new position (preventing negative values)
    setPlayheadPos(Math.max(0, x));
  };

  const stopMoving = () => {
    document.removeEventListener('mousemove', movePlayhead);
    document.removeEventListener('mouseup', stopMoving);
  };

  // Register events on the document so dragging continues 
  // even if the mouse leaves the playhead area
  document.addEventListener('mousemove', movePlayhead);
  document.addEventListener('mouseup', stopMoving);
};

// This ref prevents the useEffect from saving history during an Undo/Redo operation
const isUndoRedoAction = useRef(false);

const MAX_HISTORY_STEPS = 100;

/**
 * Adjusts the timeline scale.
 * @param factor - Positive to zoom in, negative to zoom out
 */ 


  const handleZoom = (factor: number) => {
    
    

    setPixelsPerSecond(prev => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + factor));


      ///code to make the playhead on the same position (time)
      const pixelsFromLeft = playheadRef.current.offsetLeft  - asidetrackwidth - 8;
     // console.log("Pixels via offsetLeft:", pixelsFromLeft);


      const variation = newZoom / (prev == 0 ? 1 : prev)
      const delta = (newZoom - prev)
     // console.log("var", prev, factor, variation, playheadPos)
     // console.log("delta", delta, factor)

      //playheadRef.current.style.transform = `translateX${pixelsFromLeft * variation}px`;

      //timelineContainerRef.current.scrollLeft = factor < 0 ? 0 : pixelsFromLeft 
      //currentTimeRef.current = currentTimeRef.current * delta

      
      return newZoom;
    });


  };



  useEffect(() => {
  // Keep ref in sync so closures (e.g. handleNativeDrop) always read the latest value
  pixelsPerSecondRef.current = pixelsPerSecond;
  timelineTransitionsRef.current = timelineTransitions;

  // Whenever the zoom changes, we visually reposition the needle.
  if (playheadRef.current) {
    const currentPos = currentTimeRef.current * pixelsPerSecond;
    playheadRef.current.style.transform = `translateX(${currentPos}px)`;
    timelineContainerRef.current.scrollLeft= currentPos
  }
}, [pixelsPerSecond]);


//functions to make the Box Selection
const handleTimelineMouseDown = (e: React.MouseEvent) => {
  // Apenas inicia se clicar no fundo da timeline (não em clips)
  if (e.target !== e.currentTarget) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const startX = e.clientX - rect.left;
  const startY = e.clientY - rect.top;

  setIsBoxSelecting(true);
  setBoxStart({ x: startX, y: startY });
  setBoxEnd({ x: startX, y: startY });

  // Limpa seleção anterior a menos que use Shift
  if (!e.shiftKey) setSelectedClipIds([]);
};


//Function to rename assets
const handleRenameAsset = async (oldName: string, newName: string) => {
  if (!newName || oldName === newName || !currentProjectPath) return;

  // Store the preview state
  const previousClips = [...clips];
  const previousAssets = [...assets];

  // Update
  setClips(prev => prev.map(c => c.name === oldName ? { ...c, name: newName } : c));
  setAssets(prev => prev.map(a => a.name === oldName ? { ...a, name: newName } : a));

  try {
    await invoke('rename_file', { 
      oldPath: `${currentProjectPath}/videos/${oldName}`, 
      newPath: `${currentProjectPath}/videos/${newName}` 
    });
    showNotify(t('notify.assetRenamed'), "success");
  } catch (err) {
    showNotify(t('notify.assetRenameError'), "error");
    // Revert in case of failure in backend
    setClips(previousClips);
    setAssets(previousAssets);
  }
};




const getThumbnail = async (
  projectPath: string,
  fileName: string,
  requestedTime: number,
  // Overrides opcionais: usados logo após download/import para não depender do estado `assets`
  overrideType?: 'video' | 'audio' | 'image',
  overrideDuration?: number,
  overridePath?: string
) => {
  // 1. Usa overrides se disponíveis, senão busca no estado `assets`
  const assetFromState = assets.find(a => a.name === fileName);
  const type     = overrideType     ?? assetFromState?.type;
  const duration = overrideDuration ?? assetFromState?.duration;
  const filePath = overridePath     ?? assetFromState?.path ?? `${projectPath}/videos/${fileName}`;

  if (!type) return null;

  // 2. Áudio não tem thumbnail
  if (type === 'audio') return null;

  // 3. Imagem: a própria imagem é a thumbnail
  if (type === 'image') return convertFileSrc(filePath);

  // 4. Ajuste de tempo (se além da duração, usa 0)
  let finalTime = requestedTime;
  if (duration !== undefined && requestedTime >= duration) {
    finalTime = 0;
  }

  try {
    // 5. Gera via Rust/FFmpeg
    const thumbPath = await invoke<string>('generate_thumbnail', {
      projectPath,
      fileName,
      timeSeconds: finalTime
    });
    return convertFileSrc(thumbPath);
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
};

// Function to copy and paste clips
const handleCopy = () => {
  if (selectedClipIds.length === 0) return;
  
  const selectedClips = clips.filter(c => selectedClipIds.includes(c.id));
  
  // Update the REF immediately (synchronously)
  clipboardRef.current = selectedClips;
  
  showNotify(t('notify.clipsCopied', { count: selectedClips.length }), "success");
};

const handlePaste = () => {
  const clipsToPaste = clipboardRef.current;
  
  if (clipsToPaste.length === 0) {
    showNotify(t('notify.clipboardEmpty'), "error");
    return;
  }

  // Use this to measure the actual time, better than playheadPos
  let now_playheadpos = playheadRef.current?.offsetLeft - asidetrackwidth - 8
  
  const playheadTime = now_playheadpos / pixelsPerSecond;
  
  saveHistory(clips, assets, tracks);

  // 2. Find the reference point (the leftmost clip in the copied group)
  const minStart = Math.min(...clipsToPaste.map(c => c.start));

  let newClipsList = [...clips];
  let updatedTracks = [...tracks];
  const pastedIds: string[] = [];

  // 3. Process the pasting operation
  clipsToPaste.forEach(originalClip => {
    // Calculate relative offset to maintain the group's structure when pasted
    const relativeOffset = originalClip.start - minStart;
    
    // Target time must be strictly Playhead + Relative Offset
    const targetStart = playheadTime + relativeOffset;
    
    let targetTrack = originalClip.trackId;

    // Improved collision/occupancy check function
    const isOccupied = (tId: number, start: number, dur: number) => {
      const end = start + dur;
      return newClipsList.some(c => 
        c.trackId === tId && 
        // Small tolerance margin (0.01) to avoid false positives
        start < (c.start + c.duration - 0.01) && 
        end > (c.start + 0.01)
      );
    };

    // 4. Track search logic: 
    // Increment only if there is ACTUALLY something occupying the same time slot and track
    while (isOccupied(targetTrack, currentTime, originalClip.duration)) {
      targetTrack++;
    }

    const newClipId = crypto.randomUUID();
    const pastedClip: Clip = {
      ...originalClip,
      id: newClipId,
      start: currentTime, // Apply the calculated time here
      trackId: targetTrack
    };

    // 5. Ensure the target track exists
    if (!updatedTracks.some(t => t.id === targetTrack)) {
      const clipType = knowTypeByAssetName(pastedClip.name, true);
      updatedTracks.push({
        id: targetTrack,
        type: clipType as 'video' | 'audio' | 'effects'
      });
    }

    newClipsList.push(pastedClip);
    pastedIds.push(newClipId);
  });

  // 6. Final sorting to keep the UI organized
  const sortedTracks = updatedTracks.sort((a, b) => {
    const priority = (type: string) => (type === 'audio' ? 1 : 0);
    return priority(a.type) - priority(b.type) || a.id - b.id;
  });

  setTracks(sortedTracks);
  setClips(newClipsList);
  setSelectedClipIds(pastedIds);
  
  showNotify(t('notify.clipsPasted', { count: clipsToPaste.length }), "success");
};


const handleTimelineMouseMove = (e: React.MouseEvent) => {
  if (!isBoxSelecting) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  setBoxEnd({ x: currentX, y: currentY });

  // Rect calculation
  const left = Math.min(boxStart.x, currentX);
  const right = Math.max(boxStart.x, currentX);
  const top = Math.min(boxStart.y, currentY);
  const bottom = Math.max(boxStart.y, currentY);

  // Detect clips inside the selection box
  const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;

  // Organize tracks as they are rendered to determine their order
  const tracksid = order_tracks().map((track) => ( track.id)) 

  const collidingClips = clips.filter(clip => {

    const indexofTrack = tracksid.indexOf(clip.trackId)

    const clipLeft = 200 + (clip.start * pixelsPerSecond) - scrollLeft ;
    const clipRight = clipLeft + (clip.duration * pixelsPerSecond);
    const clipTop = ( (indexofTrack+1) * 64) + 30; // 64px track height + ruler margin
    const clipBottom = clipTop + 60;

    return (
      clipRight > left &&
      clipLeft < right &&
      clipBottom > top &&
      clipTop < bottom
    );

  }).map(c => c.id);

  setSelectedClipIds(collidingClips);
};

const handleTimelineMouseUp = () => {
  setIsBoxSelecting(false);
};


  //logic to zoom with scroll
    useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Alt key is pressed
      if (e.altKey) {
        e.preventDefault();
        const zoomAmount = e.deltaY > 0 ? -20 : 20;
        handleZoom(zoomAmount);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom in with Ctrl + "+" or just "+"
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        order_tracks()
        handleZoom(10);
      }
      // Zoom out with Ctrl + "-" or just "-"
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoom(-10);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Manually pushes a snapshot to history.
   * Should be called BEFORE the state is updated with the new change.
   */
  const saveHistory = (currentClips: Clip[], currentAssets: Asset[], tracks: Tracks[]) => {
    setHistory(prev => {
      const newHistory = [...prev, { clips: currentClips, assets: currentAssets, tracks: tracks }];
      return newHistory.length > MAX_HISTORY_STEPS ? newHistory.slice(1) : newHistory;
    });
    setRedoStack([]); // New action invalidates the redo path
  };

const handleUndo = () => {
  if (history.length === 0) return;

  // 1. Bloqueia salvamento automático durante o undo
  isUndoRedoAction.current = true;

  // 2. Encontrar o último estado válido (que contenha tracks)
  let previousState = null;
  let validIndex = -1;

  // Percorre do fim para o início
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] && history[i].tracks) {
      previousState = history[i];
      validIndex = i;
      break; 
    }
  }

  // 3. Se não achou nada válido, aborta ou usa o estado atual
  if (!previousState) {
    console.warn("Nenhum estado válido encontrado no histórico.");
    return;
  }

  // 4. Gerencia Pilha de Redo (Salva o estado atual antes de voltar)
  setRedoStack(prev => [...prev, { clips, assets, tracks }]);

  // 5. Atualiza os estados
  setClips(previousState.clips);
  setAssets(previousState.assets);
  setTracks(previousState.tracks);

  // 6. Remove do histórico tudo após o ponto para onde voltamos
  const newHistory = history.slice(0, validIndex);
  setHistory(newHistory);

  showNotify(t('notify.undo'), "success");
};


  const handleRedo = () => {
    if (redoStack.length === 0) return;

    // 1. Lock history saving
    isUndoRedoAction.current = true;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setHistory(prev => [...prev, { clips, assets, tracks }]);

    setClips(nextState.clips);
    setAssets(nextState.assets);
    setTracks(nextState.tracks)
    setRedoStack(newRedoStack);
    
    showNotify(t('notify.redo'), "success");
  };

//Code to make player needle walk
  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };


  const triggerRenderNotification = async (bodyText: string) => {
  try {
    await invoke('send_notification_system', { 
      title: 'WannaCut', 
      body: bodyText 
    });
  } catch (e) {
    console.error('Notificação falhou:', e);
  }
}





  //undo and redo 

  const lastSavedState = useRef(JSON.stringify({ clips, assets, tracks }));


  useEffect(() => {
  const currentState = JSON.stringify({ clips, assets, tracks });
  
  if (currentState !== lastSavedState.current) {
    // 1. Check if this change was triggered by Undo/Redo
    if (isUndoRedoAction.current) {
      // If it was, we just update the ref and reset the lock
      lastSavedState.current = currentState;
      isUndoRedoAction.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const oldState = JSON.parse(lastSavedState.current);
      
      setHistory(prev => {
        const newHistory = [...prev, oldState];
        return newHistory.length > MAX_HISTORY_STEPS ? newHistory.slice(1) : newHistory;
      });
      
      setRedoStack([]);
      lastSavedState.current = currentState;
    }, 500); 

      return () => clearTimeout(timer);
    }
    }, [clips, assets]);
  

 

  /**
 * Calculates the boundaries for a specific clip
 */
  const getClipBoundaries = (clipId: string) => {
    const targetClip = clips.find(c => c.id === clipId);
    if (!targetClip) return { minStart: 0, maxDuration: 40 };

    // 1. Get all other clips on the same track
    const trackClips = clips
      .filter(c => c.trackId === targetClip.trackId && c.id !== clipId)
      .sort((a, b) => a.start - b.start);

    // 2. Find the neighbor immediately before (Left)
    const previousClip = [...trackClips]
      .reverse()
      .find(c => c.start <= targetClip.start);

    // 3. Find the neighbor immediately after (Right)
    const nextClip = trackClips.find(c => c.start >= (targetClip.start + targetClip.duration));

    // --- CALCULATIONS ---

    // Boundary Left: The end of the previous clip or 0
    const minStart = previousClip ? (previousClip.start + previousClip.duration) : 0;

    // Boundary Right: The start of the next clip or a fixed maximum (e.g., 2 hours)
    const absoluteLimit = 7200; // 2 hours in seconds
    const maxEndTimestamp = nextClip ? nextClip.start : absoluteLimit;

    // Max Duration is the space between our current start and the next obstacle
    const maxDuration = maxEndTimestamp - targetClip.start;

    return {
      minStart,    // How far back the clip can go
      maxDuration, // Maximum length it can have at current start position
      maxEndTimestamp // Absolute point it cannot cross
    };
  };

const handleResize = (id: string, deltaX: number, side: 'left' | 'right') => {
  const { minStart, maxEndTimestamp } = getClipBoundaries(id);
  const deltaSeconds = (deltaX / pixelsPerSecond) //* 0.5; // Remove 0.2 if you want raw mouse precision

  setClips(prev => prev.map(clip => {
    if (clip.id !== id) return clip;

    const asset = assets.find(a => a.name === clip.name);
    const isImage = asset?.type === 'image';

    const noKeyframesSpeed = (!clip.keyframes?.speed) || (clip.keyframes?.speed?.length == 0)

    if (side === 'right') {
      // If it's an image, the limit is only the next clip. If it's video, it's the end of the file.
      const remainingAssetTime = isImage ? Infinity : (clip.maxduration - (clip.beginmoment + clip.duration));
      
      const maxPossibleExpansion = Math.min(
        remainingAssetTime, 
        maxEndTimestamp - (clip.start + clip.duration)
      );

      // New duration (minimum of 0.1s to prevent the clip from disappearing)
      const addedDuration = Math.max(-clip.duration + 0.1, Math.min(deltaSeconds, maxPossibleExpansion));
      
      return { 
        ...clip, 
        duration: clip.duration + addedDuration,
        originalduration: noKeyframesSpeed ? clip.duration + addedDuration : clip.originalduration

      };

    } else {
      // LEFT SIDE (Trimming start)
      const maxRetractionTimeline = clip.start - minStart;
      // If it's an image, it can expand left infinitely (until the previous clip)
      const maxRetractionAsset = isImage ? Infinity : clip.beginmoment;

      const maxLeftExpansion = Math.min(maxRetractionTimeline, maxRetractionAsset);

      let safeDelta = Math.max(-maxLeftExpansion, deltaSeconds);

      // Prevent shrinking too much (minimum 0.1s duration)
      if (safeDelta > clip.duration - 0.1) safeDelta = clip.duration - 0.1;

      return {
        ...clip,
        start: clip.start + safeDelta,
        duration: clip.duration - safeDelta,
        originalduration: noKeyframesSpeed ? clip.duration - safeDelta : clip.originalduration,
        beginmoment: isImage ? 0 : clip.beginmoment + safeDelta
      };
    }
  }));
};

  // Code to make the clip resizable 

  // Function to help handleResize because standard Drag won't work due to Parent Element's Drag
  const startResizing = (e: React.MouseEvent, clipId: string, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Calculate how much the mouse has moved since the initial click
      const deltaX = moveEvent.clientX - startX;
      
      // Call the resize handler
      handleResize(clipId, deltaX * 0.2, side);
    };

    const onMouseUp = () => {
      // Clean up event listeners when the mouse is released
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    // Register events on the document to allow resizing even if the mouse leaves the handle area
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const trackContentRef = useRef<HTMLDivElement>(null);

  // Effect to handle automatic saving whenever project data changes
  useEffect(() => {

    
    


    const saveProject = async () => {
      // DO NOT save if the project hasn't finished loading yet
     
      if (!isProjectLoaded || !currentProjectPath) return;

      

     

     const projectData: ProjectFileData = {
        projectName,
        assets,
        clips,
        tracks,
        timelineTransitions,
        lastModified: Date.now()
      };

      //console.log('saveproject', projectData)
      

      


      


      try {
        await invoke('save_project_data', {
          projectPath: currentProjectPath,
          data: JSON.stringify(projectData),
          timestamp: Date.now()
        });
       // console.log("Project saved successfully.");
        
      } catch (err) {
        console.error("Auto-save failed:", err);
      }



    };

    const timeoutId = setTimeout(saveProject, 500); // 0.5 second debounce
    return () => clearTimeout(timeoutId);
  }, [clips, assets, projectName, isProjectLoaded, timelineTransitions]);  

  //Formating pos lable for min and segs

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    // Formato HH:MM:SS se tiver mais de uma hora, senão MM:SS
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));

    return `${parts.join(':')}.${ms.toString().padStart(2, '0')}`;
  };

  //allow multiples selections with shift and ctrl
  const toggleAssetSelection = (asset: Asset, isShift: boolean) => {
    setSelectedClipIds([]); // Clear clips when selecting assets

    

    setSelectedAssets(prev => {

      if (isShift) {
        return prev.includes(asset) 
          ? prev.filter(a => a.name !== asset.name) 
          : [...prev, asset];
      }
      return [asset];
    });
  };

  /**
 * Manages multiple clip selection.
 * If shiftKey is pressed, it toggles the clip in the current selection.
 * Otherwise, it selects only the clicked clip.
 */
  const toggleClipSelection = (clipId: string, isMultiSelect: boolean) => {
    // Clear asset selection when interacting with clips
    setSelectedAssets([]);

    setSelectedClipIds(prev => {
      // If Shift/Ctrl is held, add/remove from existing list
      if (isMultiSelect) {
        return prev.includes(clipId) 
          ? prev.filter(id => id !== clipId) 
          : [...prev, clipId];
      }
      // Otherwise, select ONLY this clip
      return [clipId];
    });
  };

  //delete several clips or assets in one time
  const handleDeleteEverything =  () => {
    // 1. Check if there's anything to delete
    if (selectedClipIds.length === 0 && selectedAssets.length === 0) return;

    // 2. Save snapshot for the 100-step history
    saveHistory(clips, assets, tracks);

    // 3. Delete selected CLIPS
    if (selectedClipIds.length > 0) {
      setClips(prev => prev.filter(c => !selectedClipIds.includes(c.id)));
      setSelectedClipIds([]);
    }

    // 4. Delete selected ASSETS and all their timeline instances
    if (selectedAssets.length > 0) {
      setAssets(prev => prev.filter(a => !selectedAssets.includes(a)));
      
      const selectedAssetsNames = selectedAssets.map(sa => sa.name )
      setClips(prev => prev.filter( (c) => !(selectedAssetsNames.includes(c.name))))

      selectedAssets.map( async (a) => {
          
          try {
            await invoke('delete_file', { 
              path: `${currentProjectPath}/videos/${a.name}`, 
            });
            showNotify(t('notify.assetDeleted', { name: a.name }), "success");
          } catch (err) {
            showNotify(t('notify.assetDeleteError'), "error");
            console.log('err to delete asset: ',err )
            
          }
      })


      setSelectedAssets([]);
    }

    //showNotify("Selection purged", "success");
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {

        //Avoid Write rename asset trigger the delete asset  
        if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable // Adicione isso aqui!
      ) {
        return; 
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteEverything();
      }

      if (matchShortcut(e, 'export')) {
        e.preventDefault();
        setIsExportModalOpen(true);
      }

        // Undo
        if (matchShortcut(e, 'undo')) {
          e.preventDefault();
          handleUndo();
        }

        // Redo (keep Ctrl+Shift+Z as universal fallback)
        if (matchShortcut(e, 'redo') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
          e.preventDefault();
          handleRedo();
        }

        // Toggle Snap
        if (matchShortcut(e, 'snap_toggle')) {
          e.preventDefault();
          setIsSnapEnabled(prev => !prev);
          showNotify(`Magnetic Snap: ${!isSnapEnabled ? t('notify.snapOn') : t('notify.snapOff')}`, "success");
        }

        // Split
        if (matchShortcut(e, 'split')) {
          e.preventDefault();
          handleSplit();
        }

        // Select Left
        if (matchShortcut(e, 'select_left')) {
          e.preventDefault();
          handleMassSplitAndSelect('left');
        }

        // Select Right
        if (matchShortcut(e, 'select_right')) {
          e.preventDefault();
          handleMassSplitAndSelect('right');
        }

        // Copy
        if (matchShortcut(e, 'copy')) {
          e.preventDefault();
          handleCopy();
        }

        // Paste
        if (matchShortcut(e, 'paste')) {
          e.preventDefault();
          handlePaste();
        }

        // Next / prev cut
        if (matchShortcut(e, 'next_cut')) {
          e.preventDefault();
          seekToNearestCut(1);
        } else if (matchShortcut(e, 'prev_cut')) {
          e.preventDefault();
          seekToNearestCut(-1);
        }

        // Frame step
        if (matchShortcut(e, 'frame_forward')) {
          e.preventDefault();
          seekTo(currentTimeRef.current + 0.01);
        }
        if (matchShortcut(e, 'frame_back')) {
          e.preventDefault();
          seekTo(currentTimeRef.current - 0.01);
        }

        if (!isMouseOverSource && e.code === 'Space') {
          e.preventDefault();
          togglePlay();
        }  

      





      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipIds, selectedAssets , clips, isSnapEnabled, assets, history, redoStack, isMouseOverSource, sourceAsset, inPoint, outPoint, shortcuts]);





const isMouseOverRef = useRef(false);
const isPlaying2Ref = useRef(false); // espelha isPlaying2 para uso em closures

// Mantém isPlaying2Ref sempre sincronizado com isPlaying2
useEffect(() => {
  isPlaying2Ref.current = isPlaying2;
}, [isPlaying2]);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isMouseOverRef.current) return;

    if (e.code === 'Space') {
      e.preventDefault();
      setIsPlaying2(prev => !prev);
    }

    // Usa o relógio correto (áudio ou interno)
    const time = (audioRef2.current && hasAudio2.current)
      ? (audioRef2.current.currentTime || 0)
      : internalTime2.current;

    if (e.key.toLowerCase() === 'i') setInPoint(time);
    if (e.key.toLowerCase() === 'o') setOutPoint(time);
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); 










// Function to synchronize currentTime with currentTimeRef 
const seekTo = (newTime: number) => {
  
    currentTimeRef.current = newTime;
  
    // 2. Update state so React is aware of the current position (for the timer, etc.)
    setCurrentTime(newTime);

    // 3. Move the playhead visually via DOM immediately for better performance
    if (playheadRef.current) {
      const nextPos = newTime * pixelsPerSecond;
      playheadRef.current.style.transform = `translateX(${nextPos}px)`;
    }


    audioPlayersRef.current.forEach((player, id) => {
    const clip = clips.find(c => c.id === id);
    if (clip) {
      const clipTargetTime = (newTime - clip.start) + (clip.beginmoment || 0);
      // Só faz o seek se o tempo for válido para este clipe
      if (clipTargetTime >= 0 && clipTargetTime < (player.duration || Infinity)) {
        player.currentTime = clipTargetTime;
      }
      }
    });
    // 4. If playback is paused, force a frame draw on the Canvas
    if (!isPlaying) {
      newDrawFrame(newTime);
     
    }
  };


    /**
     * Splits the selected clip (or clip under playhead) into two parts
     * based on the current playhead position.
     */
    /**
     * Advanced Split Logic:
     * 1. If a clip is selected, only split that one (even if others are below/above).
     * 2. If NO clip is selected, but multiple clips are under the playhead, 
     * prevent splitting and warn the user to avoid accidental cuts.
     * 3. Only split without selection if exactly ONE clip is found under the playhead.
     */

const handleSplit = () => {
  const playheadTime = currentTimeRef.current ? currentTimeRef.current : 0;


  //console.log('playheadtime', playheadTime)

  // 1. Find  clips at playhead
  const clipsAtPlayhead = clips.filter(c => 
    playheadTime > c.start && 
    playheadTime < (c.start + c.duration)
  );

  let targetClip: Clip | undefined;

  // 2. Selection logic
  if (selectedClipIds.length > 0) {
    targetClip = clipsAtPlayhead.find(c => selectedClipIds.includes(c.id));


    
    if (!targetClip) {
      showNotify(t('notify.clipNotUnderPlayhead'), "error");
      return;
    }
  } else {
    if (clipsAtPlayhead.length > 1) {
      showNotify(t('notify.multipleClipsFound'), "error");
      return;
    }
    if (clipsAtPlayhead.length === 0) {
      showNotify(t('notify.noClipUnderPlayhead'), "error");
      return;
    }
    targetClip = clipsAtPlayhead[0];
  }

  saveHistory(clips, assets);

  // --- TIME CALCULATION LOGIC ---

  // How much time has passed from the start of the CLIP on the timeline until the needle...

  const timeOffsetFromClipStart = playheadTime - targetClip.start;

  // Curva de velocidade do clip ORIGINAL, em tempo relativo ao início do clip
  // (é o mesmo referencial usado por compositionToMediaTime/getAssetTimeAtTimelineTime).
  const originalSpeedKfs = (targetClip.keyframes?.speed || [])
    .map((kf: any) => ({ time: kf.time, value: Number(kf.value) }));

  // Quanto tempo de MÍDIA (arquivo fonte) já foi consumido até o ponto de corte.
  // Só é igual a timeOffsetFromClipStart quando speed === 1 o tempo todo — com
  // speed ramp, o tempo de timeline e o tempo de mídia divergem, e usar o valor
  // linear aqui é o que fazia o 2º subclip começar deslocado (B+x em vez de B).
  const mediaTimeElapsedAtCut = compositionToMediaTime(timeOffsetFromClipStart, originalSpeedKfs);

  // Re-base TODOS os arrays de keyframes (speed, opacity, zoom, position,
  // rotation3d, mask.*) pro novo início do subclip 2 — tempo 0 passa a ser o
  // ponto de corte. Sem isso, os keyframes continuam "datados" em relação ao
  // início do clip original (A), mas o motor de render mede tempo relativo a
  // partir do novo `start` (B), desalinhando toda a curva.
  const rebaseKeyframesForSecondPart = (keyframes: any) => {
    if (!keyframes) return keyframes;
    const result: any = {};
    for (const key of Object.keys(keyframes)) {
      const arr = keyframes[key];
      if (!Array.isArray(arr) || arr.length === 0) { result[key] = arr; continue; }

      const shifted = [...arr]
        .sort((a: any, b: any) => a.time - b.time)
        .map((kf: any) => ({ ...kf, time: kf.time - timeOffsetFromClipStart }))
        .filter((kf: any) => kf.time >= 0);

      // Se nenhum keyframe sobrou em time=0 (todos ficaram "no passado" antes
      // do corte, ou o primeiro remanescente é > 0), insere um keyframe
      // sintético com o valor exatamente interpolado no ponto de corte, pra
      // preservar o valor visual instantâneo no início do subclip 2.
      if (shifted.length === 0 || shifted[0].time > 0) {
        const valueAtCut = getInterpolatedValueWithFades(playheadTime, targetClip, key as any);
        shifted.unshift({ time: 0, value: valueAtCut });
      }

      result[key] = shifted;
    }
    return result;
  };

  // Part One: maintains the original beginning moment, but shortens the duration.
  const firstClip: Clip = { 
    ...targetClip, 
    duration: timeOffsetFromClipStart 
  };
// Second part:
// - The start point on the timeline is the needle position.
// - The duration is what remained of the original clip.
// - The new begin moment is the original + the MEDIA time we "travel" within
//   the clip (speed-aware, not a linear assumption).
  new Promise(resolve => setTimeout(resolve, 1));

  const secondClip: Clip = { 
    ...targetClip, 
    id: crypto.randomUUID(), 
    start: playheadTime, 
    duration: targetClip.duration - timeOffsetFromClipStart,
    beginmoment: targetClip.beginmoment + mediaTimeElapsedAtCut,
    keyframes: rebaseKeyframesForSecondPart(targetClip.keyframes),
  };

  setClips(prev => [
    ...prev.filter(c => c.id !== targetClip!.id),
    firstClip,
    secondClip
  ].sort((a, b) => a.start - b.start)); // Keep in order

  //Default behavor: Select Right
  setSelectedClipIds([secondClip.id]);
  showNotify(t('notify.clipSplit'), "success");
};

  //Function to snap
    // Helper to calculate the magnetic snap point
      /**
   /**
   * Context-Aware Infinity Snap:
   * Only snaps to the immediate left or right neighbors on the track.
   * This prevents the clip from jumping over other clips to reach a distant edge.
   */
  const getSnappedTime = (currentTime: number, excludeId: string | null = null, trackId: number | null = null) => {
    if (!isSnapEnabled || trackId === null) return currentTime;

    // 1. Get all other clips on this track
    const trackClips = clips
      .filter(c => c.trackId === trackId && c.id !== excludeId)
      .sort((a, b) => a.start - b.start);

    if (trackClips.length === 0) return currentTime;

    // 2. Find the immediate neighbor to the left
    const leftNeighbor = [...trackClips].reverse().find(c => c.start <= currentTime);
    // 3. Find the immediate neighbor to the right
    const rightNeighbor = trackClips.find(c => c.start > currentTime);

    let candidatePoints: number[] = [];
    
    // Only snap to the end of the clip on the left
    if (leftNeighbor) candidatePoints.push(leftNeighbor.start + leftNeighbor.duration);
    // Only snap to the start of the clip on the right
    if (rightNeighbor) candidatePoints.push(rightNeighbor.start);

    if (candidatePoints.length === 0) return currentTime;

    // 4. Find which of these two neighbors is closer
    let closestPoint = currentTime;
    let minDistance = Infinity;

    candidatePoints.forEach(point => {
      const distance = Math.abs(currentTime - point);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    return closestPoint;
  };





const lockmuteTrack = (option: number, track: Tracks) => {
  const updatedTrack = { ...track };

  if (option === 0) {
    updatedTrack.lock = !updatedTrack.lock;
  } else if (option === 1) {
    updatedTrack.mute = !updatedTrack.mute;
  }

  setTracks(prevTracks => 
    prevTracks.map(t => t.id === track.id ? updatedTrack : t)
  );
};







  // --- TAURI V2 NATIVE DRAG & DROP LISTENER FOR FILES FROM OS (NOT ASSETS) ---
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDropListener = async () => {
      const unsubscribe = await getCurrentWindow().onDragDropEvent((event) => {
        if (event.payload.type === 'drop') {
          const { paths, position } = event.payload;
          const timelineBounds = timelineContainerRef.current?.getBoundingClientRect();
          const isTimelineZone = timelineBounds &&
            position.y >= timelineBounds.top &&
            position.y <= timelineBounds.bottom;

          handleNativeDrop(paths, position.x, position.y);
        }
      });
      unlisten = unsubscribe;
    };

    if (!isSetupOpen) {
      setupDropListener();
    }

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [isSetupOpen, currentProjectPath]);


const handleDropOnClip = async (e: React.DragEvent, targetClipId: string) => {
  e.preventDefault();
  
  // 1. Pegamos os dados e limpamos IMEDIATAMENTE para evitar leituras duplas
  const effectDataRaw = e.dataTransfer.getData('application/wannacut-effect');
  const transitionDataRaw = e.dataTransfer.getData('application/wannacut-transition');

  // Se já processamos ou se não há dados, saímos
  if (!effectDataRaw && !transitionDataRaw) return;

  // Limpa o dataTransfer para este evento
  e.dataTransfer.clearData();

  // ── GATE DE PLANO (Neon / Glow) ─────────────────────────────────────────
  // Isso roda ANTES de qualquer setClips e usa uma checagem FRESCA
  // (force=true, ignora o cache de 15s) direto no Rust via `hasPlanAccess`
  // → comando `get_license_state` → `validate_offline`. De propósito NÃO
  // usamos o state `plan` aqui: ele é só decorativo e qualquer um com o
  // DevTools aberto consegue setá-lo pra "pro" na mão. Se a pessoa não tem
  // o plano mínimo exigido (assinatura Ed25519 verificada no arquivo
  // local), o efeito nunca chega a entrar no clip — não existe "editar o
  // state depois" pra contornar isso.
  if (effectDataRaw) {
    try {
      const parsedEffect = JSON.parse(effectDataRaw);
      const minPlan = parsedEffect?.category === 'text' ? TEXT_EFFECT_MIN_PLAN[parsedEffect.effectId] : undefined;
      if (minPlan) {
        const allowed = await hasPlanAccess(settingsFolder, minPlan, true);
        if (!allowed) {
          showNotify(t('notify.proFeatureLocked'), 'error');
          setSelectedUpgrade(minPlan);
          setIsPlanModalOpen(true);
          return;
        }
      }
    } catch (err) {
      console.error('Erro ao processar drop de efeito (gate de plano):', err);
      return;
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  setClips(prevClips => {
    return prevClips.map(clip => {
      if (clip.id !== targetClipId) return clip;

      

      // Criamos uma cópia do clipe
      const updatedClip = { ...clip };

      // Lógica para EFEITO
      if (effectDataRaw) {
        try {
          const data = JSON.parse(effectDataRaw);
          const currentEffects = updatedClip.effects || [];
          const clipType = knowTypeByAssetName(clip.name);

          if(clipType == 'image' && data.category == 'audio')
          {
            showNotify(t('notify.effectNotAvailable'),'error')
            return clip;
          }
          
          if(clipType == 'audio' && data.category == 'video')
          {
            showNotify(t('notify.effectNotAvailable'),'error')
            return clip;
          }

          // Efeitos de texto (typewrite/pop-in/glitch) só fazem sentido em
          // clips de texto, e vice-versa: efeitos de vídeo/áudio não se
          // aplicam a um clip de texto (não há decodificação de frame nem
          // trilha de áudio pra afetar).
          if(data.category == 'text' && clipType != 'text')
          {
            showNotify(t('notify.effectNotAvailable'),'error')
            return clip;
          }

          if(clipType == 'text' && data.category != 'text')
          {
            showNotify(t('notify.effectNotAvailable'),'error')
            return clip;
          }

          if (data.category === 'text') {
            // Os efeitos de texto agora podem ser combinados livremente
            // (ex.: typewrite + glitch ao mesmo tempo) — cada um mexe numa
            // parte diferente do desenho (ver Render.tsx), então empilhar
            // é seguro. Só evitamos duplicar a MESMA instância de efeito
            // (ex.: dois "pop_in" ao mesmo tempo não faria sentido).
            const alreadyHasSameEffect = currentEffects.some((ef: any) => ef.category === 'text' && ef.name === data.effectId);
            if (alreadyHasSameEffect) {
              showNotify(t('notify.effectAlreadyApplied'), 'error');
              return clip;
            }

            const isReveal = !TEXT_EFFECT_MIN_PLAN[data.effectId];

            updatedClip.effects = [
              ...currentEffects,
              isReveal
                ? {
                    // typewrite / pop_in / glitch_text: efeitos de REVELAÇÃO,
                    // com janela de tempo (duration) a partir do início do clip.
                    id: crypto.randomUUID(),
                    name: data.effectId,
                    category: 'text',
                    duration: 1, // segundos até esse efeito ficar 100% "resolvido"
                    instanceId: crypto.randomUUID()
                  }
                : {
                    // neon / glow (PRO): efeitos de ESTILO persistentes pro
                    // clip inteiro, sem janela de revelação — mesmo esquema
                    // de campos do font_shine (size/intensity/color).
                    id: crypto.randomUUID(),
                    name: data.effectId,
                    category: 'text',
                    size: 12,
                    intensity: 0.8,
                    color: data.effectId === 'neon' ? '#ff2bd6' : '#ffffff',
                    instanceId: crypto.randomUUID()
                  }
            ];
          } else {
            // Evita adicionar exatamente o mesmo objeto no mesmo milissegundo
            updatedClip.effects = [
              ...currentEffects,
              { 
                id: crypto.randomUUID(),
                name: data.effectId, 
                category: data.category,
                instanceId: crypto.randomUUID() // Use um ID único para cada instância
              }
            ];
          }
        } catch (err) {
          console.error("Erro ao processar drop de efeito:", err);
        }
      }

      // Lógica para TRANSIÇÃO
      if (transitionDataRaw) {
        try {
          const data = JSON.parse(transitionDataRaw);
          const currentTransitions = updatedClip.transitions || [];
          
          updatedClip.transitions = [
            ...currentTransitions,
            {id:  crypto.randomUUID() ,name: data.transitionId, duration: data.duration || 0.5 }
          ];
        } catch (err) {
          console.error("Erro ao processar drop de transição:", err);
        }
      }

      return updatedClip;
    });
  });
};








const handleDragStartEffect = (
  e: React.DragEvent, 
  effectId: string, 
  category: 'video' | 'audio' | 'text'
) => {
  const effectData = {
    type: 'effect',
    effectId: effectId,
    category: category, // 'video' or 'audio'
  };

  e.dataTransfer.setData('application/wannacut-effect', JSON.stringify(effectData));
  
  e.dataTransfer.dropEffect = 'copy';

  console.log('transitions effects', e)

  
  //console.log(`Dragging effect: ${effectId} (${category})`);
};

const handleDragStartTransition = (
  e: React.DragEvent, 
  transitionId: string
) => {
  const transitionData = {
    type: 'transition',
    transitionId: transitionId,
    duration: 0.5, 
  };

  e.dataTransfer.setData('application/wannacut-transition', JSON.stringify(transitionData));
  e.dataTransfer.dropEffect = 'link';

  //e.dataTransfer.effectAllowed = 'copyMove';


  console.log('transitions transfer', e)
  
};


    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      //e.stopPropagation();
      const isTransition = e.dataTransfer.types.includes('application/wannacut-transition');
      e.dataTransfer.dropEffect = isTransition ? 'link' : 'copy';
    };

//Play and Pause of Player Source Auxiliar

const [sourceCurrentTime, setSourceCurrentTime] = useState(0);
const [isSourcePlaying, setIsSourcePlaying] = useState(false);


const audioRef2 = useRef<HTMLAudioElement>(null);
const canvasRef2 = useRef<HTMLCanvasElement>(null);


    // Helper: draw an image/frame centered with letterbox/pillarbox on the canvas
    const drawCenteredOnCanvas2 = (img: HTMLImageElement) => {
      const canvas = canvasRef2.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const CANVAS_W = 1280;
      const CANVAS_H = 720;
      canvas.width  = CANVAS_W;
      canvas.height = CANVAS_H;

      // Fill background black (letterbox / pillarbox bars)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Scale to fit keeping aspect ratio
      const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
      const drawW = img.width  * scale;
      const drawH = img.height * scale;
      const offsetX = (CANVAS_W - drawW) / 2;
      const offsetY = (CANVAS_H - drawH) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    };

    // Render Video Frame to Auxiliar Monitor
    const renderFrame2 = async (time: number) => {
    if (!canvasRef2.current) return;



       const now = performance.now();
        if (now - lastFrameTimeRef.current < FPS_LIMIT) 
          return;
        lastFrameTimeRef.current = now;
          



      
      if (!sourceAsset || !canvasRef2.current) return;

      const assetType = knowTypeByAssetName(sourceAsset.name);

      // --- IMAGE: load directly via convertFileSrc, no frame extraction needed ---
      if (assetType === 'image') {
        try {
          const filePath = `${currentProjectPath}/videos/${sourceAsset.name}`;
          const url = convertFileSrc(filePath);
          const img = new Image();
          img.onload = () => drawCenteredOnCanvas2(img);
          img.src = url;
        } catch (_err) {
          const ctx = canvasRef2.current?.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 1280, 720);
          }
        }
        return;
      }

      // --- VIDEO: extract frame via invoke, then draw centered ---
      try {
        // Busca o frame exato via invoke
        const frameBase64: string = await invoke("get_video_frame", { 
          path: sourceAsset.path, 
          timeMs: time * 1000
        });


       
        const img = new Image();
        img.onload = () => drawCenteredOnCanvas2(img);
        img.src = frameBase64;
      } catch (_err) {
        // On any frame error, just fill the canvas black — no console noise.
        const ctx = canvasRef2.current?.getContext("2d");
        if (ctx && canvasRef2.current) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, 1280, 720);
        }
      }
    };

    // Carrega o sourceAsset: busca duração via invoke e configura áudio (se houver)
    useEffect(() => {
      if (!sourceAsset) return;

      // Reset ao trocar de asset
      hasAudio2.current = true;
      internalTime2.current = 0;
      sourceDuration2.current = 0;
      setCurrentTime2(0);
      setIsPlaying2(false);

      const assetType = knowTypeByAssetName(sourceAsset.name);

      // --- IMAGE: render immediately, no duration/audio needed ---
      if (assetType === 'image') {
        hasAudio2.current = false;
        sourceDuration2.current = 0;
        // Draw it right away on the canvas
        const filePath = `${currentProjectPath}/videos/${sourceAsset.name}`;
        const url = convertFileSrc(filePath);
        const img = new Image();
        img.onload = () => drawCenteredOnCanvas2(img);
        img.src = url;
        return;
      }

      // Busca duração real via invoke (funciona com ou sem áudio)
      const filePath = `${currentProjectPath}/videos/${sourceAsset.name}`;
      invoke<{ duration: number }>('get_duration', { path: filePath })
        .then(meta => { sourceDuration2.current = meta.duration; })
        .catch(() => { sourceDuration2.current = 0; });

      // Tenta carregar o áudio extraído; marca hasAudio2=false se falhar
      if (audioRef2.current) {
        const audioEl = audioRef2.current;
        const audio = `${sourceAsset.name.split('.').slice(0, -1).join('.')}.mp3`;
        const audioFilePath = knowTypeByAssetName(sourceAsset.name) === 'video'
          ? `${currentProjectPath}/extracted_audios/${audio}`
          : `${currentProjectPath}/videos/${sourceAsset.name}`;

        let cancelled = false;

        const handleError = () => {
          console.error('[audioRef2] falhou ao decodificar áudio', {
            audioFilePath,
            errorCode: audioEl.error?.code,
          });
          hasAudio2.current = false;
        };
        audioEl.addEventListener('error', handleError);

        // Antes: convertFileSrc(audioFilePath) -> asset://localhost/...
        // Alguns nomes de arquivo com caracteres Unicode (ex: "：" fullwidth colon,
        // "–" en-dash) fazem o protocolo asset:// falhar silenciosamente com
        // MEDIA_ERR_SRC_NOT_SUPPORTED mesmo com o arquivo existindo. Lendo os bytes
        // via invoke() e usando um data URL, o nome do arquivo nunca entra numa URL
        // e o problema desaparece.
        invoke<string>('get_audio_data', { path: audioFilePath })
          .then(dataUrl => {
            if (cancelled) return;
            audioEl.src = dataUrl;
          })
          .catch((err) => {
            console.error('[audioRef2] falhou ao ler arquivo de áudio', { audioFilePath, err });
            if (!cancelled) hasAudio2.current = false;
          });

        return () => {
          cancelled = true;
          audioEl.removeEventListener('error', handleError);
        };
      }
    }, [sourceAsset]);


    // Sync Canvas — funciona com áudio ou sem (timer interno)
    useEffect(() => {
      if (!sourceAsset) return;

      // Images are static — no playback loop needed
      const assetType2 = knowTypeByAssetName(sourceAsset.name);
      if (assetType2 === 'image') return;

      if (!isPlaying2) {
        if (audioRef2.current && hasAudio2.current) {
          audioRef2.current.pause();
          // Sync internal timer to audio position so they stay aligned on resume
          internalTime2.current = audioRef2.current.currentTime;
        }
        return;
      }

      // Inicia o áudio se disponível, sincronizando o currentTime com o timer interno
      if (audioRef2.current && hasAudio2.current) {
        // Always re-sync audio position to internalTime before playing,
        // in case the audio element drifted or was paused at a different point.
        const targetTime = internalTime2.current;
        if (Math.abs(audioRef2.current.currentTime - targetTime) > 0.05) {
          audioRef2.current.currentTime = targetTime;
        }
        audioRef2.current.play().catch((err) => {
          // Don't permanently disable audio — it may just not be ready yet.
          // Only disable if it's a real src error (handled separately via 'error' event).
          console.warn("audio play() failed, will retry via interval:", err);
        });
      }

      const TICK = 1000 / 10; // 10 fps de polling
      const interval = setInterval(() => {
        let time: number;

        if (audioRef2.current && hasAudio2.current && !audioRef2.current.paused) {
          // Audio is running — use it as the source of truth
          time = audioRef2.current.currentTime;
          internalTime2.current = time;
        } else if (audioRef2.current && hasAudio2.current && audioRef2.current.paused) {
          // Audio stalled/paused unexpectedly — nudge it back to play
          audioRef2.current.play().catch(() => {});
          internalTime2.current += TICK / 1000;
          time = internalTime2.current;
        } else {
          internalTime2.current += TICK / 1000;
          // Para no fim do asset
          if (sourceDuration2.current > 0 && internalTime2.current >= sourceDuration2.current) {
            internalTime2.current = sourceDuration2.current;
            setCurrentTime2(internalTime2.current);
            setIsPlaying2(false);
            clearInterval(interval);
            return;
          }
          time = internalTime2.current;
        }

        setCurrentTime2(time);
        renderFrame2(time);
      }, TICK);

      return () => {
        clearInterval(interval);
        if (audioRef2.current && hasAudio2.current) {
          audioRef2.current.pause();
        }
      };
    }, [isPlaying2, sourceAsset]);


    const togglePlay2 = () => {
      setIsPlaying2(prev => !prev);
    };




const knowTypeOfFirstSelectedClip = (): string | null => {
  if (!clips || !selectedClipIds || selectedClipIds.length === 0) return null;

  const selectedClip = clips.find(c => c.id === selectedClipIds[0]);

  if (!selectedClip) return null;

  
  return knowTypeByAssetName(selectedClip.name);
};


const knowTypeByAssetName = (assetName: string, typeTrack: boolean = false) => 
{
   const extension = assetName.split('.').pop()?.toLowerCase() || '';

   



    // 2. Define allowed extensions for each type
    

    // 3. Check if the extension is valid
    const isImage = imageExtensions.includes(extension);
    const isAudio = audioExtensions.includes(extension);
    const isVideo = videoExtensions.includes(extension);



    if (!isImage && !isAudio && !isVideo) {

      const type = clips.find( c => c.name == assetName)?.type || null

      if(!type)
      {
        showNotify(t('notify.invalidFileType'), "error");
        return null
      }



    return type;
    }

    // 4. Assign the correct media type
    let type: 'video' | 'audio' | 'image' | 'text' = 'video';
    if (isImage) type = 'image';
    if (isAudio) type = 'audio';



    if(typeTrack && type == 'image')
      return 'video'


    return type

}


const createClipOnNewTrack =  async (assetName: string, dropTime: number, beginmoment: number|null = null, originalduration: number = 10, 
  typeOriginal: string | null = null, dragData: JSON | null = null) => {
    
  
  var meta;
  
  const path = `${currentProjectPath}/videos/${assetName}`

  
  
  try
  {
    meta = await invoke<{duration: number}>('get_duration', { path: path });
    
  }
  catch (err)
  {
    meta = {duration: 10}
  }

  const type = typeOriginal ? typeOriginal : knowTypeByAssetName(assetName, true);

  if(type == null) return


  const dimensions = assets.find( a => a.name === assetName)?.dimensions || null

    
    setTracks(  (prev) => 
      {
  
          const newTrackId = prev.length > 0 ? Math.max(...prev.map(t => t.id)) + 1 : 0; 
   
         
          

          const updatedTracks = [...prev, { 
            id: newTrackId, 
            type: type as 'video' | 'audio' | 'effects' | 'text',
            
          }];

          const deleteClip = clips.find(c => c.id === deleteClipId);

        

        
        const duration = meta.duration



          //console.log('maxduration in new trakc set to ', duration )
          
          const newClip: Clip = {
            id: crypto.randomUUID(),
            name: type ==='text' ? 'Text' : assetName,
            start: dropTime,
            duration: deleteClip ? deleteClip.duration : duration ? duration : 10,
            originalduration: duration,
            color: getRandomColor(),
            trackId: newTrackId,
            maxduration: typeOriginal == 'text' ? 36000 :  duration ? duration : 10,
            beginmoment: beginmoment ? beginmoment : deleteClip ? deleteClip.beginmoment : 0,
            dimensions: dimensions,
            scale: 1,
            type: type,
            font: type === 'text' ? (dragData?.font || "SofiaRoughBlackInline") : null,
            font_size: type === 'text' ? 14 : null,
            font_shine: type === 'text' ? { size: 0, intensity: 0, color: null } : null,
            font_stroke: type === 'text' ? { width: 0, color: '#000000' } : null,
            font_color: '#ffffff' 
          };

          


          setClips(prevClips => {
            const filtered = deleteClipId !== null 
              ? prevClips.filter(c => c.id !== deleteClipId) 
              : prevClips;
            return [...filtered, newClip];
          });

          return updatedTracks










      }


    )



}

//create new timelines dropping assets close of a track
const handleDropOnEmptyArea = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // 1. Coleta dados do JSON (Subclips ou Fontes do Sidebar)
  const jsonData = e.dataTransfer.getData("application/json") || null;
  const dragData = jsonData ? JSON.parse(jsonData) : null;

  // Se houver arquivos físicos sendo arrastados, saímos (outra função cuida disso)
  if (e.dataTransfer.files.length > 0) return;

  const assetName = e.dataTransfer.getData("assetName");
  
  // Se não tem nome de asset nem dados de drag, não há o que criar
  if (!assetName && !dragData) return;

  const container = e.currentTarget.getBoundingClientRect();
  
  // Cálculo do tempo de drop baseado no scroll e zoom
  const x = e.clientX - container.left;
  const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
  const dropTime = Math.max(0, (x + scrollLeft) / pixelsPerSecond);

  const TRACK_HEIGHT = 80;
  const totalTracksHeight = tracks.length * TRACK_HEIGHT;
  const margin = 20;
  const relativeY = e.clientY - container.top;

  // Determine the type and identify if it's a Font/Text
  const isText = dragData?.type === 'text';
  const whatType = isText ? 'text' : knowTypeByAssetName(assetName, true);
  
  // Define o nome que será usado (nome da fonte ou nome do asset)
  const finalName = isText ? (dragData?.font || "New Text") : assetName;
  const beginMoment = dragData?.beginmoment || 0;

  /**
   * Lógica de criação:
   * Se soltar acima da primeira track ou abaixo da última (respeitando a margem),
   * criamos uma nova track do tipo correto.
   */
  if (relativeY < -margin || relativeY > totalTracksHeight + margin) {
    
    // Chamamos a função de criação de nova track passando o tipo explicitamente
    // Note: Adicionei o parâmetro 'whatType' para que a nova track já nasça com o tipo certo
    
    
    createClipOnNewTrack(
      finalName, 
      dropTime, 
      beginMoment, 
      10,
      whatType, // Passamos 'text', 'video', 'audio', etc.
      dragData
    );
  }
};





//function to return order track as the are in the render ui
const order_tracks = () => 
{

  const activeTracksId =  [...new Set(clips.map(c => c.trackId))];

  const tracks_order= tracks.filter(t => activeTracksId.includes(t.id)).sort(

      (a, b) => {
        // We set the weights: Video/Effects = 0 (top), Audio = 1 (bottom)
        const priority = (type: string) => (type === 'audio' ? 1 : 0);

        const pA = priority(a.type);
        const pB = priority(b.type);

        if (pA !== pB) {
          return pA - pB; // If different types, order by type
        }
        return a.id - b.id; // If the type is the same, sort by the original ID.
      })

      //console.log('tracks', tracks)
      //console.log('order tracks', tracks_order)

      return tracks_order





}

  // Function to lead with Drag direct from OS
const handleNativeDrop = async (paths: string[], mouseX: number, mouseY: number) => {
  if (!currentProjectPath) return;



  //console.log('nativedrop')

  const timelineBounds = timelineContainerRef.current.getBoundingClientRect();

  const isOutsideTimeline = !timelineBounds || 
    mouseX < timelineBounds.left || 
    mouseX > timelineBounds.right || 
    mouseY < timelineBounds.top || 
    mouseY > timelineBounds.bottom;



  if (!timelineBounds) return;

  //const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
  //const relativeX = mouseX - timelineBounds.left + scrollLeft;
  //const dropTime = Math.max(0, relativeX / PIXELS_PER_SECOND);

  const rect = timelineContainerRef.current.getBoundingClientRect();
  
  // 1. Difference between the click and the beginning of the visible timeline area
  // We use Math.floor to avoid sub-pixels that cause drifts
  const scrollLeft = timelineContainerRef.current.scrollLeft;
  
  
  // 2. Adjustment: If you have a sidebar of tracks (e.g., 200px), subtract here.
  const trackSidebarWidth = 192
  const relativeX = mouseX - rect.left - trackSidebarWidth  + scrollLeft;
  //3. Calculating the time using the updated value of PIXELS_PER_SECOND
  // last term is to calibrate with newzoom
  //let factor = pixelsPerSecond > 30 ? (2 * pixelsPerSecond) : 0
  const dropTime = Math.max(0, relativeX/pixelsPerSecondRef.current) 

  
  
  //console.log(`Mouse X: ${mouseX}, Rect Left: ${rect.left}, Scroll: ${scrollLeft}, Final Time: ${dropTime}`);
  
  if (isOutsideTimeline) {
    for (const path of paths) {
      try {

        const fileName = path.split(/[\\/]/).pop() || "File";
        const extension = fileName.split('.').pop()?.toLowerCase() || '';


        const isImage = imageExtensions.includes(extension);
        const isAudio = audioExtensions.includes(extension);
        const isVideo = videoExtensions.includes(extension);

        if (!isImage && !isAudio && !isVideo) {
          showNotify(t("notify.invalidFileTypeMedia"), "error");
          return;
        }


       // console.log('curentproject0', currentProjectPath, path)




        
        await invoke('import_asset', { projectPath: currentProjectPath, filePath: path });
      } catch (err) {
        console.error("Import error:", err);
      }
    }
    loadAssets();
    showNotify(t('notify.assetsImported'), "success");
    return;
  }
  
    for (const path of paths) {


        const fileName = path.split(/[\\/]/).pop() || "File";
        const extension = fileName.split('.').pop()?.toLowerCase() || '';


        const isImage = imageExtensions.includes(extension);
        const isAudio = audioExtensions.includes(extension);
        const isVideo = videoExtensions.includes(extension);


        if (!isImage && !isAudio && !isVideo) {
          showNotify(t("notify.invalidFileTypeMedia"), "error");
          return;
        }


       // console.log('curentproject', currentProjectPath, path)

      try {
        await invoke('import_asset', { projectPath: currentProjectPath, filePath: path });
        const fileName = path.split(/[\\/]/).pop() || "Asset";

        var meta
        var dimensions: Position | null
        
        try
        {
          meta = await invoke<{duration: number}>('get_duration', { path: path });
          
        }
        catch (err)
        {
          meta = {duration: 10}
        }


        if(isVideo || isImage)
        {
            try
            {
              dimensions = await invoke< Position >('get_asset_dimensions', { path: path });
              
            }
            catch (err)
            {
              dimensions = null
            }
        }
        

        
        const duration = meta.duration

        const TRACK_HEIGHT = 80;
        const relativeY = mouseY - timelineBounds.top;
        const targetTrackIndex = Math.floor(relativeY / TRACK_HEIGHT);

        //Organize tracks as the are in the render to know its order
        const tracks_order = order_tracks()

        



        // If you drop it below the last or above the tracks area, it creates a new one.



        if(!tracks_order[targetTrackIndex])
        {
          await loadAssets();
          createClipOnNewTrack(fileName, dropTime)
          return
        }


        const isBusy = (isSpaceOccupied(tracks_order[targetTrackIndex].id, dropTime, Math.min(duration, 10), null))
        const isNotType = tracks_order[targetTrackIndex].type !== knowTypeByAssetName(fileName,true)

        //console.log('empty var', tracks_order[targetTrackIndex], isBusy, isNotType, targetTrackIndex >= tracks.length , targetTrackIndex)

        //check if drop on a empty place again and if the place is on a track but is busy or is not the clip's type 

        if ((targetTrackIndex >= tracks.length || targetTrackIndex < 0) ||  isBusy  || isNotType) {
          await loadAssets();
          createClipOnNewTrack(fileName, dropTime)
          return
        } else {

            await loadAssets();

            
          
          // Drop em track existente
            const targetTrackId = tracks_order[targetTrackIndex].id;
            
            setClips(prev => [...prev, {
              id: crypto.randomUUID() ,
              name: fileName,
              start: dropTime,
              duration: Math.min(duration, 10),
              originalduration: Math.min(duration, 10),
              color: getRandomColor(),
              trackId: targetTrackId,
              maxduration: duration ? duration : 36000,
              beginmoment: 0,
              dimensions: dimensions,
              scale: 1
            }]);


            setTracks( prev =>[... prev, {id: targetTrackId, type: knowTypeByAssetName(fileName, true) as 'video' | 'audio'}]
            )
          



        }
      } catch (err) {
        console.error("Native Import Error:", err);
      }
    }

  




  //loadAssets();
};

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", preventDefault, false);
    window.addEventListener("drop", preventDefault, false);

    return () => {
      window.removeEventListener("dragover", preventDefault, false);
      window.removeEventListener("drop", preventDefault, false);
    };
  }, []);

  
  // FADE HANDLE ENGINE

// ── TIMELINE TRANSITION RESIZE ENGINE ────────────────────────────────────────
const startResizingTransition = (
  e: React.MouseEvent,
  transitionId: string,
  side: 'left' | 'right'
) => {
  e.stopPropagation();
  e.preventDefault();

  const startX = e.clientX;
  const transition = timelineTransitionsRef.current.find(t => t.id === transitionId);
  if (!transition) return;

  const initialLeft = transition.durationLeft;
  const initialRight = transition.durationRight;

  // Buscar clips para calcular limites (50% do clip vizinho)
  const clipLeft = clips.find(c => c.id === transition.clipLeftId);
  const clipRight = clips.find(c => c.id === transition.clipRightId);

  const maxLeft = clipLeft ? clipLeft.duration * 0.5 : 10;
  const maxRight = clipRight ? clipRight.duration * 0.5 : 10;

  console.log('max: ',maxLeft, maxRight, side)

  const onMouseMove = (ev: MouseEvent) => {
    const dx = (ev.clientX - startX) / pixelsPerSecondRef.current;

    setTimelineTransitions(prev =>
      prev.map(t => {
        if (t.id !== transitionId) return t;
        if (side === 'left') {
          // Arrastar handle esquerdo: aumentar/diminuir durationLeft
          const newLeft = Math.max(0.05, Math.min(maxLeft, initialLeft - dx));
          return { ...t, durationLeft: newLeft };
        } else {
          // Arrastar handle direito: aumentar/diminuir durationRight
          const newRight = Math.max(0.05, Math.min(maxRight, initialRight + dx));
          return { ...t, durationRight: newRight };
        }
      })
    );
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};
// ─────────────────────────────────────────────────────────────────────────────

const handleFadeDrag = (e: React.MouseEvent, clipId: string, type: 'in' | 'out', clip_type: string) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const targetClip = clips.find(c => c.id === clipId);
    if (!targetClip) return;

    // 1. Determina quais são as propriedades corretas baseadas no tipo
    const isAudio = clip_type === 'audio';
    const propIn = isAudio ? 'fadeinAudio' : 'fadein';
    const propOut = isAudio ? 'fadeoutAudio' : 'fadeout';
    
    // 2. Pega o valor inicial correto
    const propertyToUpdate = type === 'in' ? propIn : propOut;
    const initialFade = (targetClip[propertyToUpdate as keyof Clip] as number) || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
        // Converte o movimento do mouse em segundos (delta)
        const deltaX = (moveEvent.clientX - startX) / pixelsPerSecond; 
        
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id !== clipId) return clip;

            let newValue: number;
            
            if (type === 'in') {
                // Fade In: aumenta puxando para a direita
                newValue = Math.max(0, Math.min(clip.duration / 2, initialFade + deltaX));
            } else {
                // Fade Out: aumenta puxando para a esquerda
                newValue = Math.max(0, Math.min(clip.duration / 2, initialFade - deltaX));
            }

            // 3. Retorna o clipe com a propriedade dinâmica atualizada
            return { 
                ...clip, 
                [propertyToUpdate]: newValue 
            };
        }));
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};




  // --- PROJECT METHODS ---

const loadProjects = async (explicitRootPath?: string) => {
  const pathToUse = explicitRootPath ?? rootPath;
  if (!pathToUse) return;
  try {
    const list = await invoke('list_projects', { rootPath: pathToUse });
    setProjects(list as Project[]);
  } catch (e) { console.error(e); }
};

  const loadAssets = async () => {
  if (!currentProjectPath) return;
  try {
    const list = await invoke<string[]>('list_assets', { projectPath: currentProjectPath });

    // 1. Show all assets immediately with no thumbnail so the UI is responsive
    const placeholders: Asset[] = list.map((filename) => {
      const extension = filename.split('.').pop()?.toLowerCase();
      const filePath = `${currentProjectPath}/videos/${filename}`;
      let type: 'video' | 'audio' | 'image' = 'video';
      if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) type = 'image';
      if (['mp3', 'wav', 'ogg'].includes(extension || '')) type = 'audio';
      return { name: filename, path: filePath, duration: 10, type, thumbnailUrl: '' };
    });
    setAssets(placeholders);

    // 2. Enrich each asset individually — as soon as one is ready it patches state
    list.forEach(async (filename) => {
      const extension = filename.split('.').pop()?.toLowerCase();
      const filePath = `${currentProjectPath}/videos/${filename}`;

      let type: 'video' | 'audio' | 'image' = 'video';
      if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) type = 'image';
      if (['mp3', 'wav', 'ogg'].includes(extension || '')) type = 'audio';

      let duration = 10;
      let dimensions: Position | null = null;

      if (type !== 'image') {
        try {
          const meta = await invoke<{ duration: number }>('get_duration', { path: filePath });
          duration = meta.duration;
        } catch (err) {
          console.warn(`Could not read meta for ${filename}`, err);
        }
      }

      if (type === 'video') {
        try {
          await invoke('extract_audio', { projectPath: currentProjectPath, fileName: filename });
        } catch (e) {
          console.error('Audio extraction failed:', e);
        }
      }

      if (type === 'video' || type === 'image') {
        try {
          dimensions = await invoke('get_asset_dimensions', { path: filePath });
        } catch (e) {
          console.error('Dimension read failed:', e);
        }
      }

      // Thumbnail: images are instant, videos go through FFmpeg
      // Passamos os overrides (type, duration, filePath) para não depender do estado `assets`,
      // que pode ainda não ter sido atualizado (ex: logo após download via YT-DLP).
      let thumbnailUrl = '';
      if (type === 'image') {
        thumbnailUrl = convertFileSrc(filePath);
      } else if (type === 'video') {
        thumbnailUrl = (await getThumbnail(currentProjectPath, filename, 2, type, duration, filePath)) ?? '';
      }

      // Patch only this asset in state — others remain untouched
      setAssets(prev =>
        prev.map(a =>
          a.name === filename
            ? { ...a, duration, dimensions: dimensions ?? undefined, thumbnailUrl }
            : a
        )
      );
    });

  } catch (e) {
    console.error('Failed to load assets:', e);
  }
};

  const handleSelectRoot = async () => {
    const selected = await open({ directory: true, multiple: false, title: "Select Workspace" });
    if (selected) setRootPath(selected as string);
  };


const handleFinishSetup = async () => {


  console.log('handle finished', rootPath, projectName)

  if (rootPath && projectName) {
    try {
      const finalPath = await invoke<string>('create_project_setup', { 
        rootPath, 
        projectName,
        config: projectConfig 
      });

      setCurrentProjectPath(finalPath);
      setIsCreatingNew(false);
      loadProjects(rootPath); // <-- passa rootPath explícito aqui!
      showNotify(t('notify.projectCreated'), "success");
      
    } catch (e) {
      console.error(e);
      showNotify(t('notify.projectCreateError'), "error");
    }
  }
};



const openProjectEarly = async (parsed: JSON) => {


  
  
  setClips([]);
  setAssets([]);
  setTracks([]);
  
  try
  {
    
    
    setClips(parsed.clips || []);
    setAssets(parsed.assets || []);
    setTracks(parsed.tracks || []);
    setTimelineTransitions(parsed.timelineTransitions || []);
    
 
    
    // Now allow saving
    setIsProjectLoaded(true); 
    setIsSetupOpen(false);
    loadSystemFonts()
  } catch (err) {
    console.log("No previous project file found, starting fresh.");
    setIsProjectLoaded(true); // Allow saving for new projects too
    setIsSetupOpen(false);
  }
};



const openProject = async (path: string) => {


  
  setCurrentProjectPath(path);
  
  setClips([]);
  setAssets([]);
  setTracks([]);
  
  try
  {
    
    const config = await invoke<ProjectSettings>('load_project_config', { path: path });
    setProjectConfig(config);
    setProjectName(config.name || "Unnamed Project" )

    
    
    const rawData = await invoke('load_latest_project', { projectPath: path });
    var parsed = JSON.parse(rawData as string) || JSON.parse('{}');
    //setProjectName(parsed.projectName)



    // Update states first
    //console.log('clips and assets', parsed.clips, parsed.assets)

    setClips(parsed.clips || []);
    setAssets(parsed.assets || []);
    setTracks(parsed.tracks || []);
    setTimelineTransitions(parsed.timelineTransitions || []);
    //setProjectName(parsed.projectName || "Unnamed Project");

 
    
    // Now allow saving
    setIsProjectLoaded(true); 
    setIsSetupOpen(false);
    loadSystemFonts()
  } catch (err) {
    console.log("No previous project file found, starting fresh.");
    setIsProjectLoaded(true); // Allow saving for new projects too
    setIsSetupOpen(false);
  }
};

  // --- EDITOR HANDLERS ---


  const handleYoutubeDownload = async () => {
    if (!youtubeUrl || !currentProjectPath) return;
    setIsDownloading(true);
    setDownloadYTprogress(0);
    showNotify(t('notify.downloading'), "success");
    try {
      await invoke('download_video', { projectPath: currentProjectPath, settingsFolder: settingsFolder, url: youtubeUrl, downloadMode });
      showNotify(t('notify.downloadComplete'), "success");
      setIsImportModalOpen(false);
      setYoutubeUrl("");
      setDownloadYTprogress(0);
      await loadAssets();
    } catch (e) {
      alert(e)
      showNotify(t('notify.ytdlpError'), "error");
    } finally {
      setIsDownloading(false);
      setDownloadYTprogress(0);
    }
  };

  // Listener para progresso real do yt-dlp (evento emitido pelo Rust)
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<number>('yt-download-progress', (event) => {
      setDownloadYTprogress(event.payload);
    }).then((fn) => { unlisten = fn; });
    return () => { if (unlisten) unlisten(); };
  }, []);


  const handleDragStartText = (
  e: React.DragEvent, 
  fontName: string, 
  fontPath: string
) => {
  // 1. Definimos o tipo de dado como 'text' para o handleDrop identificar
  const dragData = {
    type: 'text',
    font: fontName,
    path: fontPath,
    isTimelineClip: false // Como vem do sidebar, sempre será falso aqui
  };

  // 2. Armazenamos o objeto completo em formato JSON para facilitar o parsing no drop
  e.dataTransfer.setData("application/json", JSON.stringify(dragData));

  // 3. Mantemos compatibilidade com os campos individuais que sua lógica original usa
  e.dataTransfer.setData("assetName", fontName);
  e.dataTransfer.setData("fontPath", fontPath); // Dado específico da fonte
  e.dataTransfer.setData("isTimelineClip", "false");
  
  // 4. Offset de clique (para fontes vindo do sidebar, o padrão é 0)
  e.dataTransfer.setData("clickOffset", "0");

  // 5. Feedback visual do arrasto (opcional)
  // Define o efeito de cópia ao arrastar do menu para a timeline
  e.dataTransfer.effectAllowed = "copy";

  // Log para debug (opcional)
  //console.log("Dragging Font:", fontName);
};

  const handleDragStart = (
  e: React.DragEvent, 
  color: string | null, 
  trackId: number | null, 
  duration: number | null, 
  assetName: string, 
  isTimelineClip: boolean, 
  clipId: string | null
) => {

  if(tracks.find(t => t.id === trackId)?.lock === true) return


  // If the dragged clip is not in the current selection, we select only that clip.
  if (clipId !== null && !selectedClipIds.includes(clipId)) {
    setSelectedClipIds([clipId]);
  }

  const presentclip = clips.find(c => c.id == clipId )

  var start = presentclip ? presentclip.start : null

  if (isTimelineClip && start !== null) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Calculate how many seconds there are between the start of the clip and where the mouse clicked.
    const clickOffset = (e.clientX - rect.left) / pixelsPerSecond;
    e.dataTransfer.setData("clickOffset", clickOffset.toString());
  } else {
    // For new assets coming from the sidebar, we usually click at the beginning or center
    // // We can set it to 0 or calculate it if desired
    e.dataTransfer.setData("clickOffset", "0");
  }

  // Store clips datas
  e.dataTransfer.setData("assetName", assetName);
  e.dataTransfer.setData("isTimelineClip", isTimelineClip.toString());

  if(trackId)
    e.dataTransfer.setData("previousTrackId", trackId.toString());

  if(color)
    e.dataTransfer.setData("previousColor", color.toString());
  
  if (isTimelineClip && clipId !== null) {
    setDeleteClipId(clipId);
    
    // Store start time of the clip
    const anchorClip = clips.find(c => c.id === clipId);
    if (anchorClip) {
      e.dataTransfer.setData("anchorStart", anchorClip.start.toString());
    }
  }
};


 



  //make function split and selection
 const handleMassSplitAndSelect = (direction: 'left' | 'right') => {
    const playheadTime =  currentTimeRef.current //Math.floor(playheadPos / pixelsPerSecond);

    
    saveHistory(clips, assets);
    
    let processedClips: Clip[] = [];
    
    clips.forEach(clip => {
        // If chick is in the playhead we divide it
        if (playheadTime > clip.start && playheadTime < (clip.start + clip.duration)) {
            const firstPartDuration = playheadTime - clip.start;
            const secondPartDuration = clip.duration - firstPartDuration;

            const firstClip: Clip = { 
                ...clip, 
                duration: firstPartDuration 
            };

               
            const secondClip: Clip = { 
                ...clip, 
                id: crypto.randomUUID(), 
                start: playheadTime, 
                duration: secondPartDuration,
                beginmoment: clip.beginmoment + firstPartDuration
            };

            processedClips.push(firstClip, secondClip);
        } else {
            // If it is not in playhead, keep the file
            processedClips.push(clip);
        }
    });

    // Order the clips
    processedClips.sort((a, b) => a.start - b.start);

    setClips(processedClips);

    //  Selection Logic:

    // For 'left': we select clips that end before or exactly at the needle
    // For 'right': we select clips that start from the needle
    const selectedIds = processedClips
        .filter(c => {
            if (direction === 'left') {
                // Consideramos o fim do clip com uma pequena margem (EPSILON)
                return (c.start + c.duration) <= playheadTime + 0.01;
            } else {
                return c.start >= playheadTime - 0.01;
            }
        })
        .map(c => c.id);

    setSelectedClipIds(selectedIds);
    setSelectedAssets([]); 
    
    showNotify(t('notify.splitSelected', { direction }), "success");
};



const isSpaceOccupied = (trackId: number, start: number, duration: number, excludeId: string | null = null) => {
    const newEnd = start + duration;
    const EPSILON = 0.01; 

    return clips.some(clip => {
      if (excludeId !== null && clip.id === excludeId) return false;
      if (clip.trackId !== trackId) return false;

      const clipEnd = clip.start + clip.duration;
      const isOverlapping = start < (clipEnd - EPSILON) && newEnd > (clip.start + EPSILON);
      
      return isOverlapping;
    });
  };



const handleDropOnTimeline = (e: React.DragEvent, trackId: number) => {
  e.preventDefault();
  e.stopPropagation();

  console.log('chamou drop time')

  const targetTrack = tracks.find(t => t.id === trackId);
  if (targetTrack?.lock === true) return;

  // ── TRANSITION DROP ──────────────────────────────────────────────────────────
  let transitionDataRaw = e.dataTransfer.getData('application/wannacut-transition');
  console.log('[transition]', e.dataTransfer,  transitionDataRaw)
  if (transitionDataRaw) {
    try {
      const data = JSON.parse(transitionDataRaw);
      const rect = timelineContainerRef.current!.getBoundingClientRect();
      const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
      const x = e.clientX - rect.left;
      

      const calib2 = 2*(pixelsPerSecond - 10)/10
      const calib = 20/calib2 
      const dropTime = Math.max(0, ((x + scrollLeft) / pixelsPerSecond)- calib - 3);



      
      alert(dropTime)

      // Clips nessa track ordenados por start
      const trackClips = clips
        .filter(c => Number(c.trackId) === Number(trackId))
        .sort((a, b) => a.start - b.start);

      const MAX_JUNCTION_GAP = 0.4; // 400 ms

      // Achar par de clips onde dropTime está próximo da junção (end do A / start do B)
      let foundLeft: Clip | null = null;
      let foundRight: Clip | null = null;
      let junctionTime = 0;

      /*
      
      for (let i = 0; i < trackClips.length - 1; i++) {
        const clipA = trackClips[i];
        const clipB = trackClips[i + 1];
        const endA = clipA.start + clipA.duration;
        const startB = clipB.start;
        const gap = startB - endA;

        if (gap > MAX_JUNCTION_GAP) continue;

        console.log('[transition] passou')

        // Ponto central da junção
        const junction = (endA + startB) / 2;
        const halfWindow = Math.max(clipA.duration, clipB.duration) * 0.5 + MAX_JUNCTION_GAP;

        if (Math.abs(dropTime - junction) <= halfWindow) {
          foundLeft = clipA;
          foundRight = clipB;
          junctionTime = endA; // usar o fim do clip esquerdo como ponto de referência
          console.log('variaveis pra trasition', endA, junction)
          break;
        }


      }
      
      
      */


      for (let i = 0; i < trackClips.length - 1; i++) 
      {
        const clipA = trackClips[i];
        const clipB = trackClips[i + 1];
        
        if((clipA.start <=  dropTime) && (clipB.start >= dropTime) )
        {
          foundLeft = clipA;
          foundRight = clipB;
          const endA = clipA.start + clipA.duration;
          const startB = clipB.start;
          const gap = startB - endA;
  
          if (gap > MAX_JUNCTION_GAP) 
          {
            foundLeft = null;
            foundRight = null;          
            break;
          }  

          const junction = (endA + startB) / 2;
          junctionTime = endA; // usar o fim do clip esquerdo como ponto de referência
          console.log('variaveis pra trasition', dropTime ,clipA, clipB, endA, junction)
          break;
        }  


      }



      if (!foundLeft || !foundRight) {
        setNotification({ message: 'Drop transition between two adjacent clips (max 400ms gap)', type: 'error' }); setTimeout(() => setNotification(null), 3000);
        return;
      }

      // Duração padrão: 0.5s para cada lado, limitada a 50% do clip vizinho
      const defaultHalf = Math.min(0.5, foundLeft.duration * 0.5, foundRight.duration * 0.5);

      // Remover transição existente nessa mesma junção, se houver
      const newTransition: TimelineTransition = {
        id: crypto.randomUUID(),
        name: data.transitionId,
        trackId,
        junctionTime,
        durationLeft: defaultHalf,
        durationRight: defaultHalf,
        clipLeftId: foundLeft.id,
        clipRightId: foundRight.id,
      };

      setTimelineTransitions(prev => {
        // Substituir transição existente na mesma junção
        const filtered = prev.filter(
          t => !(t.trackId === trackId && Math.abs(t.junctionTime - junctionTime) < 0.05)
        );
        return [...filtered, newTransition];
      });

      setNotification({ message: `Transition "${data.transitionId}" added`, type: 'success' }); setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error processing transition drop:', err);
    }
    return;
  }
  // ────────────────────────────────────────────────────────────────────────────

  const isTimelineClip = e.dataTransfer.getData("isTimelineClip") === "true";
  const anchorStart = parseFloat(e.dataTransfer.getData("anchorStart") || "0");
  const clickOffset = parseFloat(e.dataTransfer.getData("clickOffset") || "0");
  
  const rect = e.currentTarget.getBoundingClientRect();
  const mouseTime = (e.clientX - rect.left) / pixelsPerSecond;
  const rawDropTime = mouseTime - clickOffset; 
  const dropTime = getSnappedTime(rawDropTime, isTimelineClip ? deleteClipId : null, trackId);

  // Parse JSON data (used for subclips or fonts from sidebar)
  const jsonData = e.dataTransfer.getData("application/json");
  const dragData = jsonData ? JSON.parse(jsonData) : null;



  saveHistory(clips, assets, tracks);

  //console.log('dados chegaram', e)

  // --- CASE 1: DROP FROM SIDEBAR (New Assets or Fonts) ---
  if (!isTimelineClip) {

    //console.log('chegou case 1')

    const assetName = e.dataTransfer.getData("assetName") || dragData.name;
    const fontPath = e.dataTransfer.getData("fontPath"); // From handleDragStartText
    
    // Determine type: check dragData first, then asset name
    const whatType = dragData?.type == 'text' ? 'text' : knowTypeByAssetName(assetName, true);




    const assetNow = assets.find(a => a.name === assetName);
    
    // Setup durations: Text is effectively infinite, Media follows asset duration
    const defaultDuration = whatType === 'text' ? 5 : (assetNow ? Math.min(assetNow.duration, 10) : 5);


    const totalMaxDuration = whatType === 'text' ? 36000 : (assetNow ? assetNow.duration : 10);


    



    const isBusy = isSpaceOccupied(trackId, dropTime, defaultDuration, null);
    const isWrongType = targetTrack?.type !== whatType;

    if (!isBusy && !isWrongType) {

     const newClip: Clip = {
        id: crypto.randomUUID(),
        name: whatType === 'text' ? "Text" : assetName,
        start: dropTime,
        duration: dragData?.duration || defaultDuration,
        originalduration: dragData?.duration || defaultDuration,
        beginmoment: dragData?.beginmoment || 0,
        color: getRandomColor(),
        trackId: trackId,
        maxduration: totalMaxDuration,
        dimensions: assetNow?.dimensions || null,
        scale: 1,
        type: whatType,
        font: whatType === 'text' ? (dragData?.font || "SofiaRoughBlackInline") : null,
        font_size: whatType === 'text' ? 14 : null,
        font_shine: whatType === 'text' ? { size: 0, intensity: 0, color: null } : null,
        font_stroke: whatType === 'text' ? { width: 0, color: '#000000' } : null,
        font_color: '#ffffff'
      };

      setClips(prev => [...prev, newClip]);
    } else {

      // Create new track if occupied or type mismatch
      if (whatType === 'text') {
          // Special case for creating text on new track if needed
          createClipOnNewTrack(dragData?.font || "Text", dropTime, 0, 10, 'text', dragData);

      } else {
          createClipOnNewTrack(assetName, dropTime, dragData?.beginmoment || 0);
      }
    }
  } 
  
  // --- CASE 2: MOVING EXISTING CLIPS ON TIMELINE ---
  else if (isTimelineClip && selectedClipIds.length > 0) {

    //console.log('chegou case 2')
    const timeOffset = dropTime - anchorStart;
    const anchorClip = clips.find(c => c.id === deleteClipId);
    const trackOffset = anchorClip ? trackId - anchorClip.trackId : 0;

    const otherClips = clips.filter(c => !selectedClipIds.includes(c.id));
    const tracksIds = tracks.map(t => t.id);
    let maxTrackId = Math.max(...tracksIds, trackId);
    
    const finalMovedClips = clips
      .filter(c => selectedClipIds.includes(c.id))
      .map(clip => {
        let targetTrackId = Math.max(0, clip.trackId + trackOffset);
        const targetStart = Math.max(0, clip.start + timeOffset);
        const currentTrack = tracks.find(t => t.id === targetTrackId);
        
        const clipType = clip.type || knowTypeByAssetName(clip.name, true);

        // Collision or Type Mismatch check
        if (isSpaceOccupied(targetTrackId, targetStart, clip.duration, clip.id) || 
            (currentTrack && currentTrack.type !== clipType)) {
          maxTrackId++;
          targetTrackId = maxTrackId;
        }

        return {
          ...clip,
          start: targetStart,
          trackId: targetTrackId,
          color: clip.trackId === targetTrackId ? clip.color : getRandomColor()
        };
      });

    setClips([...otherClips, ...finalMovedClips]);

    // Handle dynamic track creation for moved clips
    const highestId = Math.max(...finalMovedClips.map(c => c.trackId));
    if (highestId > Math.max(...tracksIds)) {
      const newTracksCreated = finalMovedClips
        .filter(fc => !tracksIds.includes(fc.trackId))
        .map(fc => ({
          id: fc.trackId,
          type: (fc.type || knowTypeByAssetName(fc.name, true)) as any,
          lock: false,
          visible: true
        }));

      setTracks(prev => {
        const uniqueTracks = [...prev, ...newTracksCreated].filter((track, index, self) =>
          index === self.findIndex((t) => t.id === track.id)
        );
        return uniqueTracks.sort((a, b) => a.id - b.id);
      });
    }
  }

  setDeleteClipId(null);
};
 

const filteredAssets = assets.filter(asset => 
  asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  asset.type.toLowerCase().includes(searchQuery.toLowerCase())
);



const handleImportFile = async () => {
  try {
    // Restore last used folder (if any)
    const lastFolder = localStorage.getItem("wannacut_last_import_folder") || undefined;

    // 1. Open native dialog - multiple files allowed, starting at last folder
    const selected = await open({
      multiple: true,
      defaultPath: lastFolder,
      filters: [{
        name: 'Media',
        extensions: ['mp4', 'mkv', 'avi', 'mov', 'mp3', 'wav', 'ogg', 'png', 'jpg', 'jpeg', 'webp']
      }]
    });

    if (!selected) return;

    // Normalise to array whether the user picked one or many files
    const filePaths: string[] = Array.isArray(selected) ? selected : [selected];

    if (filePaths.length === 0) return;

    // Persist the folder of the first selected file for next time
    const firstDir = filePaths[0].replace(/[\/][^\/]+$/, '');
    localStorage.setItem("wannacut_last_import_folder", firstDir);

    let imported = 0;
    let skipped = 0;

    for (const filePath of filePaths) {
      const fileName  = filePath.split(/[\/]/).pop() || "File";
      const extension = fileName.split('.').pop()?.toLowerCase() || '';

      const isImage = imageExtensions.includes(extension);
      const isAudio = audioExtensions.includes(extension);
      const isVideo = videoExtensions.includes(extension);

      if (!isImage && !isAudio && !isVideo) {
        skipped++;
        continue;
      }

      const destPath = `${currentProjectPath}/videos/${fileName}`;
      const type: 'video' | 'audio' | 'image' = isImage ? 'image' : isAudio ? 'audio' : 'video';

      // 2. Add placeholder immediately so the asset appears in the list right away
      setAssets(prev => {
        if (prev.some(a => a.name === fileName)) return prev;
        return [...prev, { name: fileName, path: destPath, duration: 10, type, thumbnailUrl: '' }];
      });

      // 3. Copy file to project
      await invoke('import_asset', { projectPath: currentProjectPath, filePath });
      imported++;

      // 4. Enrich asynchronously - thumbnail + duration + dimensions appear as soon as ready
      (async () => {
        let duration = 10;
        let dimensions: Position | null = null;
        let thumbnailUrl = '';

        if (type !== 'image') {
          try {
            const meta = await invoke<{ duration: number }>('get_duration', { path: destPath });
            duration = meta.duration;
          } catch (e) { /* keep default */ }
        }

        if (type === 'video') {
          try { await invoke('extract_audio', { projectPath: currentProjectPath, fileName }); }
          catch (e) { /* non-fatal */ }
        }

        if (type === 'video' || type === 'image') {
          try { dimensions = await invoke('get_asset_dimensions', { path: destPath }); }
          catch (e) { /* non-fatal */ }
        }

        if (type === 'image') {
          thumbnailUrl = convertFileSrc(destPath);
        } else if (type === 'video') {
          // Call generate_thumbnail directly — avoids the assets-state closure issue
          // where getThumbnail() would return null because the placeholder isn't
          // committed to the state yet when this async closure runs.
          try {
            const thumbPath = await invoke<string>('generate_thumbnail', {
              projectPath: currentProjectPath,
              fileName,
              timeSeconds: 2
            });
            thumbnailUrl = convertFileSrc(thumbPath);
          } catch (e) {
            console.error('Thumbnail generation failed:', e);
          }
        }

        // Patch only this asset in state - others remain untouched
        setAssets(prev =>
          prev.map(a =>
            a.name === fileName
              ? { ...a, duration, dimensions: dimensions ?? undefined, thumbnailUrl }
              : a
          )
        );
      })();
    }

    if (imported > 0) {
      showNotify(
        skipped > 0
          ? `${imported} asset(s) imported, ${skipped} skipped (invalid type)`
          : `${imported} asset(s) imported`,
        "success"
      );
    } else {
      showNotify(t('notify.noValidMedia'), "error");
    }

  } catch (err) {
    console.error(err);
    showNotify(t('notify.fileSelectError'), "error");
  }
};


  const showNotify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  
  //open main page with projects
  useEffect(() => { if (rootPath) loadProjects(); }, [rootPath]);
  
  //oping project
  useEffect(() => { if (!isSetupOpen && currentProjectPath) loadAssets(); }, [isSetupOpen]);


  //elements for aside of config clips



//speed keyframe system

// sync anothers keyframes to the speed keyframes






// ─── getMaxDurationForClip ────────────────────────────────────────────────────
// Returns the maximum duration a clip can have at its current start position,
// limited by the start of the next clip on the same track (if any).
const getMaxDurationForClip = (targetClip: Clip, allClips: Clip[]): number => {
  const ABSOLUTE_MAX = 7200; // 2 hours
  const nextClip = allClips
    .filter(c => c.trackId === targetClip.trackId && c.id !== targetClip.id && c.start > targetClip.start)
    .sort((a, b) => a.start - b.start)[0];
  return nextClip ? nextClip.start - targetClip.start : ABSOLUTE_MAX;
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── handleSpeedKeyframeChange ────────────────────────────────────────────────
// Called whenever speed keyframes change on the selected clip.
// 1. Remaps all other keyframes so they stay anchored to their originalTime.
// 2. Recalculates clip.duration so the clip block on the timeline reflects
//    how much composition time the footage occupies at the new speed curve.
//    The new duration is capped at the free space before the next clip.
//
// Formula:
//   newDuration = min(mediaToCompositionTime(originalduration, speedKfs), maxAllowed)
//
// i.e. "how long does the original footage take to play through this speed curve?"
const handleSpeedKeyframeChange = (clip: Clip) => {
  const speedKfs = clip.keyframes?.speed;
  if (!speedKfs || speedKfs.length === 0) return;

  // Build a clean SpeedKf[] from the speed keyframe array
  const speedPoints = speedKfs
    .map(kf => ({ time: kf.time, value: Number(kf.value) }))
    .sort((a, b) => a.time - b.time);

  setClips(prev => prev.map(c => {
    if (c.id !== clip.id) return c;
    if (!c.keyframes) return c;

    // Remap other keyframes
    const remapped = remapKeyframesToSpeed(c.keyframes, speedPoints);

    // Recalculate composition duration from originalduration (media time)
    const uncappedDuration = mediaToCompositionTime(c.originalduration, speedPoints);

    // Cap to the free space before the next clip on the same track
    const maxAllowed = getMaxDurationForClip(c, prev);
    const newDuration = Math.min(uncappedDuration, maxAllowed);

    return { ...c, keyframes: remapped, duration: newDuration };
  }));
};
// ─────────────────────────────────────────────────────────────────────────────

// NOTA: useEffect de recálculo de duration ao trocar seleção foi removido.
// Ele disparava sempre que `selectedClipIds[0]` mudava para um clip com
// keyframes de speed diferentes do clip selecionado anteriormente (já que a
// dependência era o JSON.stringify desses keyframes), recalculando a duration
// mesmo sem nenhuma edição real — o que fazia o clip "esticar" visualmente ao
// simplesmente clicar nele. O recálculo de duration já é feito nos pontos
// corretos, onde o speed é de fato alterado: handleKeyframeDrag, deleteKeyframe
// e addKeyframe (todos chamam handleSpeedKeyframeChange diretamente).






//Keyframes System

const [hoverKeyframe, setHoverKeyframe] = useState<{
  x: number;
  y: number;
  value: string;
  visible: boolean;
} | null>(null);

const handleClipMouseMove = (e: React.MouseEvent, clip: Clip) => {
  if (!clip.activeKeyframeView) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const clickY = e.clientY - rect.top;
  
  // Valor visual (0 a 1)
  let value = Math.max(0, Math.min(1, 1 - (clickY / rect.height)));
  let displayValue = "";

  // Formatação baseada no tipo de keyframe
  if (clip.activeKeyframeView === 'speed') {
    const realSpeed = converterSpeed(value);
    displayValue = `${realSpeed.toFixed(2)}x`;
  } else if (clip.activeKeyframeView === 'volume') {
    const db = convertDB(value);
    displayValue = `${db} dB`;
  }else if (clip.activeKeyframeView === 'zoom') {
    const zoom = convertZoom(value);
    displayValue = `${zoom}x`;
  }else if ((clip.activeKeyframeView === 'position') || 
  (clip.activeKeyframeView === 'rotation3d')) {
    displayValue = `Use the edit mode on preview player`;
  }
  
  else {
    displayValue = `${Math.round(value * 100)}%`;
  }

  setHoverKeyframe({
    x: e.clientX,
    y: e.clientY,
    value: displayValue,
    visible: true
  });
};


const updateKeyframes = (
  clip: Clip,
  type: 'opacity' | 'volume' | 'speed' | 'position' | 'rotation3d' | 'zoom'
      | 'mask.x' | 'mask.y' | 'mask.scaleX' | 'mask.scaleY'
      | 'mask.rotation' | 'mask.feather' | 'mask.cornerRadius',
  // Atualizei a tipagem para aceitar as novas chaves
  newValue: number | { x?: number; y?: number; rot?: number; rot3d?: number }
) => {


  console.log('update', type, newValue)
  const threshold = 0.05;
  const relativeTime = currentTimeRef.current - clip.start;
  const safeKeyframes = clip.keyframes || {};
  const currentTypeArray = [...(safeKeyframes[type] || [])];

  // 1. Define o valor padrão baseado no tipo (Corrigido para rot/rot3d)
  const getDefaultValue = () => {
    switch (type) {
      case 'position': return { x: 0, y: 0 };
      case 'rotation3d': return { rot: 0, rot3d: 0 };
      case 'zoom': return 1.0;
      case 'speed': return 1.0;
      case 'opacity': return 1.0;
      case 'volume': return 0;
      case 'mask.x':            return clip.mask?.x            ?? 0;
      case 'mask.y':            return clip.mask?.y            ?? 0;
      case 'mask.scaleX':       return clip.mask?.scaleX       ?? 1;
      case 'mask.scaleY':       return clip.mask?.scaleY       ?? 1;
      case 'mask.rotation':     return clip.mask?.rotation     ?? 0;
      case 'mask.feather':      return clip.mask?.feather      ?? 0;
      case 'mask.cornerRadius': return clip.mask?.cornerRadius ?? 0;
      default: return 0;
    }
  };


   /*
   
   newValue = type === 'volume' ? convertDB(newValue) : 
   type === 'zoom' ? convertZoom(newValue) : newValue;
   */

  // 2. Função para mesclar valores (Merge Inteligente)
  const getUpdatedValue = (oldValue: any) => {
    // Se o novo valor for um objeto (Position ou Rotation)
    if (typeof newValue === 'object' && newValue !== null) {
      // Se já existe um valor no KF, usa ele como base, senão usa o default
      const base = oldValue !== undefined && oldValue !== null ? oldValue : getDefaultValue();
      
      // Retorna a união do antigo com o novo (ex: mantém rot e muda apenas rot3d)
      return { ...base, ...newValue };
    }
    // Se for um número (opacity, zoom, etc)
    return newValue;
  };

  let updatedTypeArray: Keyframe[];

  // LÓGICA DE ATUALIZAÇÃO DA TRACK (CASOS DE ESTADO)

  // CASO 0: Inicialização (Track vazia e não estamos visualizando a linha de automação)
  if (currentTypeArray.length === 0 && clip.activeKeyframeView !== type) {
    updatedTypeArray = [{
      id: crypto.randomUUID(),
      time: 0,
      value: getUpdatedValue(null) // O null força o uso do getDefaultValue dentro do merge
    }];
  }
  // CASO 1: Ajuste Global (Apenas 1 KF e não estamos no modo de "animação" ativa)
  else if (currentTypeArray.length === 1 && clip.activeKeyframeView !== type) {
    updatedTypeArray = [{
      ...currentTypeArray[0],
      value: getUpdatedValue(currentTypeArray[0].value)
    }];
  }
  // CASO 2: Modo Animação (Múltiplos KFs ou gravando no playhead atual)
  else {
    const existingIndex = currentTypeArray.findIndex(
      (kf) => Math.abs(kf.time - relativeTime) <= threshold
    );

    if (existingIndex !== -1) {
      // Atualiza KF existente no tempo atual
      updatedTypeArray = currentTypeArray.map((kf, index) =>
        index === existingIndex ? { ...kf, value: getUpdatedValue(kf.value) } : kf
      );
    } else {
      // Cria novo KF no tempo atual baseado no valor interpolado ou anterior
      // Para garantir suavidade, o valor inicial do novo KF deve ser o valor que o clipe já tinha naquele momento
      const currentValueAtTime = getInterpolatedValueWithFades(currentTimeRef.current, clip, type);
      
      const newKeyframe = {
        id: crypto.randomUUID(),
        time: relativeTime,
        value: getUpdatedValue(currentValueAtTime),
        // anchor to media time so speed remap can reposition this KF correctly
        originalTime: (safeKeyframes.speed && safeKeyframes.speed.length > 0)
          ? compositionToMediaTime(relativeTime, safeKeyframes.speed.map((k: Keyframe) => ({ time: k.time, value: Number(k.value) })))
          : relativeTime
      };
      
      updatedTypeArray = [...currentTypeArray, newKeyframe].sort((a, b) => a.time - b.time);
    }
  }

  // 3. Persistência no Estado do React
  const updatedKeyframes = { ...safeKeyframes, [type]: updatedTypeArray };

  setClips((prev) =>
    prev.map((c) => (c.id === clip.id ? { ...c, keyframes: updatedKeyframes } : c))
  );

  // 4. Gatilhos de processamento pesado (Ex: Recalcular Speed Ramp no Rust/Backend)
  if (type === 'speed') {
    handleSpeedKeyframeChange({ ...clip, keyframes: updatedKeyframes });
  }
};









const addKeyframe = (e: React.MouseEvent, clipId: string) => {
  const clip = clips.find(c => c.id === clipId);
  if (!clip || !clip.activeKeyframeView) return;

  const view = clip.activeKeyframeView;

  // mask.x and mask.y are position-like — no value from Y, just mark time
  const isMaskPosition = view === 'mask.x' || view === 'mask.y';
  // other mask props, position, rotation3d are view-only (no Y-to-value mapping)
  const isViewOnly = view === 'position' || view === 'rotation3d' || isMaskPosition;

  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const time = clickX / pixelsPerSecond;
  const rawValue = Math.max(0, Math.min(1, 1 - (clickY / rect.height)));

  setClips(prev => {
    return prev.map(c => {
      if (c.id !== clipId) return c;

      const kfView = c.activeKeyframeView as string;
      const currentKfs = (c.keyframes as any)?.[kfView] || [];

      if (currentKfs.some((k: Keyframe) => Math.abs(k.time - time) < 0.05)) return c;

      // Compute the keyframe value
      let finalValue: any;
      if (isViewOnly) {
        // Use the currently interpolated value at this time (no change, just record)
        finalValue = getInterpolatedValueWithFades(c.start + time, c, kfView as any);
      } else if (kfView === 'speed') {
        finalValue = converterSpeed(rawValue);
      } else if (kfView === 'volume') {
        finalValue = convertDB(rawValue);
      } else if (kfView === 'zoom') {
        finalValue = convertZoom(rawValue);
      } else if (kfView === 'mask.feather' || kfView === 'mask.cornerRadius') {
        // 0-100 range
        finalValue = rawValue * 100;
      } else if (kfView === 'mask.scaleX' || kfView === 'mask.scaleY') {
        // 0.05-3 range
        finalValue = 0.05 + rawValue * (3 - 0.05);
      } else if (kfView === 'mask.rotation') {
        // 0-360 range
        finalValue = rawValue * 360;
      } else {
        finalValue = rawValue;
      }

      const newKeyframe: Keyframe = {
        id: crypto.randomUUID(),
        time: time,
        value: finalValue,
        originalTime: (c.keyframes?.speed && c.keyframes.speed.length > 0)
          ? compositionToMediaTime(time, c.keyframes.speed.map(k => ({ time: k.time, value: Number(k.value) })))
          : time
      };

      const updatedClip = {
        ...c,
        keyframes: {
          ...c.keyframes,
          [kfView]: [...currentKfs, newKeyframe].sort((a: Keyframe, b: Keyframe) => a.time - b.time)
        }
      };

      if (kfView === 'speed') {
        setTimeout(() => handleSpeedKeyframeChange(updatedClip), 0);
      }

      return updatedClip;
    });
  });
};


{/* Função auxiliar para calcular o Y em pixels baseado na altura do clipe (ex: 40px) */}
const calculateY = (value: number, height: number, type:string = '') => {
  
  if(type == 'speed')
    return (1 - reverterSpeed(value)) * height

  if(type == 'volume')
    return (1- reverterVolume(value)) * height

  if(type == 'zoom')
    return (1- reverterZoom(value)) * height

  if(type == 'position' || type == 'rotation3d' || type == 'mask.x' || type == 'mask.y')
    return 0.5

  if(type == 'mask.feather' || type == 'mask.cornerRadius')
    return (1 - value / 100) * height

  if(type == 'mask.scaleX' || type == 'mask.scaleY')
    return (1 - (value - 0.05) / (3 - 0.05)) * height

  if(type == 'mask.rotation')
    return (1 - value / 360) * height
  
  return (1 - value) * height;
};



// No seu código dentro do SVG:



const handleKeyframeDrag = (
  e: React.MouseEvent, 
  clipId: string, 
  kfId: string, 
  view: 'volume' | 'opacity' | 'speed' | 'rotation3d'
) => {

  const onMouseMove = (moveEvent: MouseEvent) => {
    const clipElement = document.getElementById(`clip-${clipId}`);
    if (!clipElement) return;

    const rect = clipElement.getBoundingClientRect();
    
    // Calcula novos valores baseados na posição do mouse
    const newTime = (moveEvent.clientX - rect.left) / pixelsPerSecond;
    let newValue = Math.max(0, Math.min(1, 1 - (moveEvent.clientY - rect.top) / rect.height));

    setClips(prev => prev.map(c => {
      if (c.id !== clipId) return c;

      const kfs = [...(c.keyframes?.[view] || [])];
      const idx = kfs.findIndex(k => k.id === kfId);
      if (idx === -1) return c;

      // --- LOGICA DE RESPEITO AOS VIZINHOS ---
      const minTime = kfs[idx - 1]?.time || 0;
      const maxTime = kfs[idx + 1]?.time || c.duration;

      const clampedTime = Math.max(minTime, Math.min(maxTime, newTime));

      // Convert raw 0-1 visual value → real domain value
      const realValue = view === 'speed'  ? converterSpeed(newValue)  :
                        view === 'volume' ? convertDB(newValue)        : newValue;

      // For speed KFs the time IS already composition time, so originalTime = itself.
      // For other KFs dragged in time we update originalTime to follow (drag = intentional reposition).
      const updatedKf: Keyframe = {
        ...kfs[idx],
        time: clampedTime,
        value: realValue,
        ...(view !== 'speed' ? { originalTime: clampedTime } : {})
      };

      kfs[idx] = updatedKf;

      const updatedKeyframes = { ...c.keyframes, [view]: kfs };

      // If a speed KF was dragged, remap all other KFs immediately and update duration
      if (view === 'speed') {
        const speedPoints = kfs.map(k => ({ time: k.time, value: Number(k.value) }));
        const remapped = remapKeyframesToSpeed(updatedKeyframes, speedPoints);
        const uncappedDuration = mediaToCompositionTime(c.originalduration, speedPoints);
        // Cap to the free space before the next clip on the same track
        const maxAllowed = getMaxDurationForClip(c, prev);
        const newDuration = Math.min(uncappedDuration, maxAllowed);
        return { ...c, keyframes: remapped, duration: newDuration };
      }

      return {
        ...c,
        keyframes: updatedKeyframes
      };
    }));
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);



};

const deleteKeyframe = (clipId: string, kfId: string, view: string) => {
  setClips(prev => prev.map(c => {
    if (c.id !== clipId) return c;
    
    const currentKfs = c.keyframes?.[view as keyof NonNullable<Clip['keyframes']>] || [];
    const filteredKfs = currentKfs.filter(k => k.id !== kfId);

    const updatedKeyframes = {
      ...c.keyframes,
      [view]: filteredKfs
    };

    // If a speed KF was deleted, remap all other KFs and update duration
    if (view === 'speed') {
      const speedPoints = (filteredKfs as Keyframe[]).map(k => ({ time: k.time, value: Number(k.value) }));

      // If no speed KFs remain, duration reverts to originalduration (speed = 1x throughout)
      if (speedPoints.length === 0) {
        const clearedKeyframes = { ...updatedKeyframes, speed: [] };
        return { ...c, keyframes: clearedKeyframes, duration: c.originalduration };
      }

      const remapped = remapKeyframesToSpeed(updatedKeyframes, speedPoints);
      const newDuration = mediaToCompositionTime(c.originalduration, speedPoints);
      return { ...c, keyframes: remapped, duration: newDuration };
    }

    return { ...c, keyframes: updatedKeyframes };
  }));
};



  // --- RENDER ---
return (
  <div className="flex flex-col h-screen w-screen bg-black text-zinc-300 font-sans overflow-hidden select-none">
    
{/* Export Format Picker */}
<ExportModal
  isOpen={isExportModalOpen}
  onClose={() => setIsExportModalOpen(false)}
  onConfirm={(format) => startExport(format)}
  
/>

{/*Modal for Select Plan (Upgrade)*/}
<AnimatePresence>
  {isPlanModalOpen && (
    <>
      {/* Backdrop de Fundo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          setIsPlanModalOpen(false);
          setSelectedUpgrade(null);
          setActivationKey('');
        }}
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md"
      />

      {/* Card do Modal */}
      <motion.div
        layout // Faz o modal expandir o tamanho com animação suave
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{t('plan.account')}</h3>
            <h2 className="text-sm font-bold text-zinc-200 mt-0.5">{t('plan.subscriptionPlan')}</h2>
          </div>
          <button 
            onClick={() => {
              setIsPlanModalOpen(false);
              setSelectedUpgrade(null);
              setActivationKey('');
            }}
            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-full transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Status do Plano Atual (Ocultado se estiver ativando para focar no input) */}
        {!selectedUpgrade && (
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{t('plan.currentStatus')}</p>
              <p className="text-sm font-black uppercase tracking-widest mt-0.5 text-white">
                {plan === 'ultimate' ? '🚀 Ultimate' : plan === 'pro' ? '💎 Pro' : t('plan.freePlan')}
              </p>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full 
              ${plan === 'free' ? 'bg-zinc-800 text-zinc-400' : 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-rose-500/30 text-rose-400'}`}
            >
              {plan === 'free' ? t('plan.limited') : t('plan.active')}
            </span>
          </div>
        )}

        {/* LISTA DE OPÇÕES (Se nenhuma foi selecionada ainda) */}
        {!selectedUpgrade ? (
          <div className="space-y-3">
            {/* Botão de Upgrade Pro */}
            {plan === 'free' && (
              <button
                onClick={() => setSelectedUpgrade('pro')}
                className="w-full text-left border border-zinc-800 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl p-3.5 hover:border-zinc-700 transition-all cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-200">{t('plan.upgradeToPro')}</p>
                  <span className="text-[10px] font-semibold text-zinc-500">{t('plan.proSplits')}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">{t('plan.proDescription')}</p>
              </button>
            )}

            {/* Botão de Upgrade Ultimate */}
            {(plan === 'free' || plan === 'pro') && (
              <button
                onClick={() => setSelectedUpgrade('ultimate')}
                className="w-full text-left border border-zinc-800 bg-gradient-to-br from-amber-500/[0.01] to-rose-500/[0.01] hover:bg-gradient-to-br hover:from-amber-500/[0.03] hover:to-rose-500/[0.03] rounded-xl p-3.5 hover:border-rose-500/20 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400 group-hover:brightness-110 transition-all">{t('plan.upgradeToUltimate')}</p>
                  <span className="text-[9px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md tracking-wider">{t('plan.unlimited')}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">{t('plan.ultimateDescription')}</p>
              </button>
            )}
          </div>
        ) : (
          /* FORMULÁRIO DE ATIVAÇÃO DE CHAVE */
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-4"
          >
            {/* Botão de Voltar */}
            <button 
              onClick={() => { setSelectedUpgrade(null); setActivationKey(''); }}
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {t('plan.backToPlans')}
            </button>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
                {t('plan.enterKey', { plan: selectedUpgrade === 'ultimate' ? '🚀 Ultimate' : '💎 Pro' })}
              </label>
              <input
                type="text"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                placeholder= {selectedUpgrade === 'pro' ? t('plan.proPlaceholder') : t('plan.ultPlaceholder')}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all font-mono"
              />
            </div>

            {/* Botão de Ativação (Função onClick vazia para você implementar a lógica depois) */}
            <button
              onClick={() => activateLicense()}
              className="w-full bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-black uppercase tracking-widest py-2.5 rounded-xl transition-all cursor-pointer shadow-lg"
            >
              {t('plan.activateLicense')}
            </button>
          </motion.div>
        )}

        {/* Links do rodapé e Cancelamento */}
        <div className="mt-6 pt-4 border-t border-zinc-800/60 space-y-3">
          {plan !== 'ultimate' && (
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                {t('plan.getKeyAt')}<br/>
                <a 
                  href="https://wannacut.app/getpro" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold mt-0.5 cursor-pointer"
                >
                  wannacut.app/getpro <ExternalLink size={8} />
                </a>
              </p>
            </div>
          )}

          {(plan === 'pro' || plan === 'ultimate') && !selectedUpgrade && (
            <div className="text-center">
              <button 
                onClick={() => console.log("Ação de cancelamento futura")} 
                className="text-[9px] uppercase font-black tracking-widest text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
              >
                {t('plan.cancelSubscription')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
 

{(activeProjects.length > 0) ? 
  // Removido: bg-*, border, rounded, padding. Adicionado: relative.
  <div className="fixed top-10 right-10 z-[800] flex flex-col gap-2 w-64  group transition-all duration-300"> 
    
    {/* Botão Flutuante - Continua aparecendo com a estilização própria */}
    <button 
      onClick={() => setIsHudListOpen(!isHudListOpen)}
      className="absolute -top-2 -right-2 p-1.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 opacity-40 group-hover:opacity-100 hover:text-white transition-opacity shadow-lg z-[810]"
      title={isHudListOpen ? t('header.collapseHud') : t('header.expandHud')}
    >
      {isHudListOpen ? (
        <ArrowDownToLine size={14} className="rotate-180 transition-transform duration-300" />
      ) : (
        <ArrowDownToLine size={14} className="transition-transform duration-300" />
      )}

       <span className="relative -top-0 -right-0 ml-1 bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full text-[10px]">
        {activeProjects.length}
      </span>
    </button>

    {/* Lista de Projetos - Ela mantém o background individual se o ExportHUD tiver */}
    <div className={`flex fixed top-15 flex-col gap-2 transition-all duration-300 origin-top overflow-hidden ${
      isHudListOpen ? 'max-h-[400px] opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 pointer-events-none'
    }`}>
      {activeProjects.map((rp) => (
        <ExportHUD
          key={rp.projectName}
          isVisible={true}
          percent={rp.renderPercent}
          kind={exportKind}
          projectName={rp.projectName}
          onCancel={() => handleCancelExport(rp.projectName)}
        />
      ))}
    </div>
  </div>
  : null
}



    {/* NOTIFICATIONS SYSTEM */}
    <AnimatePresence>
      {notification && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: 20, opacity: 0 }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-full font-bold text-xs shadow-2xl flex items-center gap-3 border ${
            notification.type === 'success' ? 'bg-zinc-900 border-green-500/50 text-green-400' : 'bg-zinc-900 border-red-500/50 text-red-400'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {notification.message.toUpperCase()}
        </motion.div>
      )}
    </AnimatePresence>

    {isSetupOpen ? (
      /* --- PROJECT MANAGER VIEW ---
      <button onClick={handleSelectRoot} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-900 text-zinc-500 rounded-lg text-sm transition-colors"><FolderOpen size={18} /> Workspace</button>  */
      <div className="flex flex-col h-full w-full bg-[#0a0a0a]">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#111]">
          <div className="flex items-center gap-4">
            <img 
              src="logoWannaCut.png" 
              alt="WannaCut Logo" 
              className="w-10 h-10 object-contain" // Mesmas dimensões do div antigo
            />
            <h1 className="text-lg text-white m-0 b-0"> Wanna<span className='font-bold m-0 b-0'>Cut</span> <span className="text-zinc-500 font-light text-sm not-italic">  {t('header.managename')}</span></h1>
          </div>



          <div>

          <button className="inline-flex mr-15 items-center gap-2 p-2 bg-indigo-600/15 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-amber-400 transition-colors" title={t('header.manageAccount')} onClick={() => setIsPlanModalOpen(true)}>
            <Sparkles size={20} />
            <span className="text-xs font-bold uppercase tracking-wider pr-1">{plan === 'free' ? t('header.getPro') : plan === 'pro' ? t('header.getUltimate') : t('header.managePlan')}</span>
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" onClick={() => setIsSettingsOpen(true)}><Settings size={20} /></button>
          <button 
            onClick={() => {
              notifyRef.current?.toggle();
              setHasNewMessages(false); // Remove o alerta quando o usuário abre
            }}
            className="relative p-2 hover:bg-white/10 rounded-full transition-all group"
          >
            <Bell 
              size={20} 
              className={hasNewMessages ? "text-cyan-400" : "text-zinc-400 group-hover:text-white"} 
            />
            
            {/* O Ponto Vermelho (Badge) */}
            {hasNewMessages && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse" />
            )}

          </button>
          </div>
        </header>

        <main className={`flex-1 flex overflow-hidden min-h-0`}>
          <aside className="w-64 border-r border-zinc-800 p-6 space-y-2 bg-[#0d0d0d]">
            <button className="w-full flex items-center gap-3 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold"><Clock size={18} /> {t('manager.recent')}</button>
            
          </aside>

          <section className="flex-1 p-10 overflow-y-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-black text-white mb-1">{t('manager.yourProductions')}</h2>
                <p className="text-zinc-600 text-[10px] font-mono uppercase">{rootPath || t('manager.selectWorkspace')}</p>
              </div>
              <button 
                className="
                  relative flex items-center gap-2 px-8 py-3 
                  bg-black text-white font-black text-xs rounded-xl
                  transition-all duration-300
                  hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:scale-[1.02]
                  
                  border border-transparent
                  [background:linear-gradient(#000,#000)_padding-box,linear-gradient(to_right,#06b6d4,#d946ef)_border-box]
                "

                onClick={() => setIsCreatingNew(true)} 
              >
                <Plus size={20} strokeWidth={3} className="text-white" />
                <span className="tracking-widest uppercase">{t('manager.newProject')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((proj) => (
                <motion.div 
                  key={proj.path} 
                  whileHover={{ scale: 1.02 }} 
                  onClick={() => openProject(proj.path)}
                  className="group bg-[#121212] border border-zinc-800/50 rounded-2xl overflow-hidden cursor-pointer hover:border-fuchsia-400 transition-all relative"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setProjectToDelete(proj); }}
                    className="absolute top-2 right-2 z-50 p-2 bg-black/50 hover:bg-red-600 text-zinc-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} /> 
                  </button>
                  {proj.thumbnail ? (
                    <div className="aspect-video bg-[#1a1a1a] border-b border-zinc-800 overflow-hidden">
                      <img src={convertFileSrc(proj.thumbnail)} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-[#1a1a1a] flex items-center justify-center border-b border-zinc-800">
                      <LayoutGrid size={40} className="text-zinc-800 group-hover:text-fuchsia-800/20" />
                    </div>
                  )}
                  
                  <div className="p-5">
                    <h3 className="font-bold text-zinc-100 truncate text-sm uppercase">{proj.name}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </main>
      </div>
    ) : (
      /* --- EDITOR VIEW --- */
      <div className="flex flex-col h-full">
        {/* Editor Header */}
        <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#111] z-10 shadow-md">
          <div className="flex items-center gap-4">
            <button onClick={() => {setIsSetupOpen(true); setIsProjectLoaded(false)}} className="text-zinc-500 hover:text-white text-[10px] font-bold">{t('header.back')}</button>
            <h1 className="text-[11px] font-black uppercase text-white tracking-widest">{projectName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex mr-15 items-center gap-2 p-2 bg-indigo-600/15 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-amber-400 transition-colors" title={t('header.manageAccount')} onClick={() => setIsPlanModalOpen(true)}>
              <Sparkles size={20} />
              <span className="text-xs font-bold uppercase tracking-wider pr-1">{plan === 'free' ? t('header.getPro') : plan === 'pro' ? t('header.getUltimate') : t('header.managePlan')}</span>
            </button>


            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black px-6 py-2 rounded-full transition-all active:scale-95 shadow-lg shadow-red-900/20"
            >
              <Youtube size={14} /> {t('header.download')}
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" title={t('header.setShortcuts')} onClick={() => setIsShortcutsOpen(true)}><Keyboard size={16}/></button>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" title={t('header.postSocial')}><Share2 size={16}/></button>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" title={t('header.settings')} onClick={() => setIsSettingsOpen(true)}><Settings size={16}/></button>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" title={t('header.exportVideo')} onClick={()=> { setIsExportModalOpen(true)}}><Import size={16}/></button>
          </div>
        </header>

        {/* Top Section: Sidebar + Preview */}
        <main className="flex-1 flex overflow-hidden min-h-0">
          
          
          <ItensAside 
            sidebarWidth={sidebarWidth}
            typeofclip = {knowTypeOfFirstSelectedClip() }
            handleDragStartEffect={handleDragStartEffect}
            handleDragStartTransition = {handleDragStartTransition}
            isResizingSidebar={isResizingSidebar}
            handleImportFile={handleImportFile}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredAssets={filteredAssets}
            selectedAssets={selectedAssets}
            toggleAssetSelection={toggleAssetSelection}
            setSourceAsset={setSourceAsset}
            setInPoint={setInPoint}
            setOutPoint={setOutPoint}
            setCurrentTime2={setCurrentTime2}
            handleDragStart={handleDragStart}
            handleRenameAsset={handleRenameAsset}
            formatTime={formatTime}
            availableFonts = {availableFonts}
            loadSystemFonts = {loadSystemFonts}
            handleDragStartText = {handleDragStartText}
            isRendering = {isRendering}
            currentProjectPath = {currentProjectPath}
            loadAssets={loadAssets}
            settingsFolder = {settingsFolder}
            showNotify={showNotify}
          />

<div id="twopreview" className="flex-1 flex overflow-hidden min-h-0 bg-[#050505]">


  
    {/* SOURCE MONITOR (Auxiliary) - Now properly aligned and centered */}
      <section 
      style={{ width: `${sourceWidth}px` }}
      className="relative h-full w-72 border-r border-white/5 bg-[#080808] flex flex-col shrink-0"
      onMouseEnter={() => {setIsMouseOverSource(true); isMouseOverRef.current = true;}}
      onMouseLeave={() => {setIsMouseOverSource(false); isMouseOverRef.current = false;}}
      >
      <div 
        className="flex flex-col gap-4 p-4 bg-zinc-900/60 rounded-2xl border border-white/5"
        
      >
  {/* Canvas Monitor */}
  <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-2xl">
   

    {sourceAsset ? (

    <div>
        <canvas
          ref={canvasRef2}
          width={1280}
          height={720}
          className="w-full h-full object-contain"
        />
        
        <audio 
          ref={audioRef2}
          onTimeUpdate={(e) => setCurrentTime2(e.currentTarget.currentTime)}
          hidden
        />

    </div>
      
    ) : (
      <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
        {t('main.selectasset')}
      </div>
    )}

    {/* Overlay de Status */}
    <div className="absolute bottom-4 left-4 flex items-center gap-2">
       <div className={`w-2 h-2 rounded-full ${isPlaying2 ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
       <span className="text-[10px] font-mono text-white/50 tracking-tighter">
         {currentTime2.toFixed(3)}s
       </span>
    </div>
  </div>

  {/* Overlay de Drag and Drop */}
    {sourceAsset && (
      <div
        draggable
        onDragStart={(e) => {
          const subClip = {
            name: sourceAsset.name,
            beginmoment: inPoint,
            duration: outPoint - inPoint,
            id: crypto.randomUUID() // Novo ID para o subclip
          };
          e.dataTransfer.setData("application/json", JSON.stringify(subClip));

          

          
        }}
        className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity"
      >
        <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
           <Plus size={24} className="text-white" />
        </div>
      </div>
    )}

  {/* Interação: Barra de Progresso e Marcadores I/O */}
  <div className="space-y-4">
    <div 
      className="relative h-3 bg-white/5 rounded-full cursor-pointer overflow-hidden"
      onClick={(e) => {
        if (!sourceAsset) return;
        const duration = sourceDuration2.current;
        if (!duration || duration <= 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * duration;

        // Atualiza SEMPRE o relógio interno — usado para sincronizar o play após seek
        internalTime2.current = newTime;

        // Também atualiza o áudio se disponível
        if (audioRef2.current && hasAudio2.current) {
          audioRef2.current.currentTime = newTime;
        }

        setCurrentTime2(newTime);
        renderFrame2(newTime);
      }}
    >
      {/* Marcador de Range (I -> O) */}
      <div 
        className="absolute h-full bg-indigo-500/30 border-x border-indigo-500/50"
        style={{
          left: `${(inPoint / (sourceDuration2.current || 1)) * 100}%`,
          width: `${((outPoint - inPoint) / (sourceDuration2.current || 1)) * 100}%`
        }}
      />

      {/* Playhead */}
      <div 
        className="absolute h-full w-0.5 bg-white z-20"
        style={{ left: `${(currentTime2 / (sourceDuration2.current || 1)) * 100}%` }}
      />
    </div>

    {/* Controles de Tempo */}
    <div className="flex justify-between text-[10px] font-mono">
       <div className="flex gap-4">
          <span className="text-blue-400">IN: {inPoint.toFixed(2)}s</span>
          <span className="text-red-400">OUT: {outPoint.toFixed(2)}s</span>
       </div>
       <span className="text-zinc-500 italic">{t('player.pressToMark')}</span>
    </div>
  </div>
</div>

        {/* RIGHT RESIZER HANDLE */}
  <div 
    onMouseDown={(e) => {
      isResizingSource.current = true;
      document.body.style.cursor = 'col-resize';
    }}
    className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-[60] hover:bg-blue-500/40 transition-colors"
  />
      </section>


      {showContextMenu && (
                  <div 
                    className="absolute z-[100] bg-[#050505] border border-zinc-800 rounded-lg shadow-2xl p-1 w-52"
                    style={{ top: showContextMenu.y, left: showContextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Impede o fechamento ao clicar no menu
                  >
                    <div className="px-3 py-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-tighter border-b border-zinc-900 mb-1">
                      Clip Actions
                    </div>
                    
                    <button 
                      onClick={() => {
                        setInteractionMode('transform');
                        setShowContextMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-400 text-[10px] font-black uppercase transition-all group"
                    >
                      <Maximize size={14} className="group-hover:scale-110 transition-transform" />
                      Set Position (Transform)
                    </button>

                    <button 
                      onClick={() => {
                        
                        
                        setClips( prev => prev.map( c => 

                            (c.id == selectedClipIdRef.current) ? {...c, activeKeyframeView : null} : c
                        ))
                        
                        setInteractionMode('none')
                        setShowContextMenu(null);
                      
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 text-[10px] font-black uppercase transition-all"
                    >
                      <X size={14} /> Clear Mode
                    </button>

                    {/* Divider */}
                    <div className="border-t border-zinc-900 my-1" />

                    {/* Add Frame to Project */}
                    <div
                      className="relative"
                      onMouseEnter={() => setFrameSubmenuOpen(true)}
                      onMouseLeave={() => setFrameSubmenuOpen(false)}
                    >
                      <button
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-violet-500/10 text-zinc-400 hover:text-violet-400 text-[10px] font-black uppercase transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <ImageIcon size={14} className="group-hover:scale-110 transition-transform" />
                          Add Frame to Project
                        </div>
                        <ChevronDown size={10} className="-rotate-90 opacity-50" />
                      </button>

                      {frameSubmenuOpen && (
                        <div className="absolute left-full top-0 ml-1 bg-[#050505] border border-zinc-800 rounded-lg shadow-2xl p-1 w-52 z-[110]">
                          {/* Option 1: Add to Assets only */}
                          <button
                            onClick={async () => {
                              setShowContextMenu(null);
                              setFrameSubmenuOpen(false);
                              try {
                                if (!rendererRef.current || !drawFrameEngine.current || !currentProjectPath) return;
                                const W = projectConfig.width;
                                const H = projectConfig.height;
                                const rt = new THREE.WebGLRenderTarget(W, H, {
                                  format: THREE.RGBAFormat,
                                  type: THREE.UnsignedByteType,
                                  colorSpace: THREE.SRGBColorSpace,
                                });
                                rendererRef.current.setRenderTarget(rt);
                                await drawFrameEngine.current({
                                  time: currentTime, projectConfig, currentProjectPath,
                                  sceneRef, rendererRef, cameraRef, topClips, groupsRef,
                                  getInterpolatedValueWithFades, invoke, settingsFolder,
                                  topAudios, isPlaying: false,
                                });
                                const pixels = new Uint8Array(W * H * 4);
                                rendererRef.current.readRenderTargetPixels(rt, 0, 0, W, H, pixels);
                                rendererRef.current.setRenderTarget(null);
                                rt.dispose();
                                // Y-flip (WebGL origin is bottom-left)
                                const rowSize = W * 4;
                                const flipped = new Uint8ClampedArray(pixels.length);
                                for (let y = 0; y < H; y++) {
                                  flipped.set(pixels.subarray((H - 1 - y) * rowSize, (H - y) * rowSize), y * rowSize);
                                }
                                const aux = document.createElement('canvas');
                                aux.width = W; aux.height = H;
                                aux.getContext('2d')!.putImageData(new ImageData(flipped, W, H), 0, 0);
                                const pngBase64 = aux.toDataURL('image/png');
                                aux.remove();
                                const fileName = `frame_${Date.now()}.png`;
                                await invoke('save_frame_as_asset', {
                                  projectPath: currentProjectPath,
                                  fileName,
                                  pngBase64,
                                });
                                await loadAssets();
                                showNotify(t('notify.frameSavedAsset'), 'success');
                              } catch (err: any) {
                                showNotify(err?.toString() ?? t('notify.frameSaveError'), 'error');
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-500/10 text-zinc-400 hover:text-violet-400 text-[10px] font-black uppercase transition-all"
                          >
                            <ArrowDownToLine size={13} />
                              {t('menuClip.AddtoAssets')}
                          </button>

                          {/* Option 2: Add to Assets and insert clip */}
                          <button
                            onClick={async () => {
                              setShowContextMenu(null);
                              setFrameSubmenuOpen(false);
                              try {
                                if (!rendererRef.current || !drawFrameEngine.current || !currentProjectPath) return;
                                const W = projectConfig.width;
                                const H = projectConfig.height;
                                const rt = new THREE.WebGLRenderTarget(W, H, {
                                  format: THREE.RGBAFormat,
                                  type: THREE.UnsignedByteType,
                                  colorSpace: THREE.SRGBColorSpace,
                                });
                                rendererRef.current.setRenderTarget(rt);
                                await drawFrameEngine.current({
                                  time: currentTime, projectConfig, currentProjectPath,
                                  sceneRef, rendererRef, cameraRef, topClips, groupsRef,
                                  getInterpolatedValueWithFades, invoke, settingsFolder,
                                  topAudios, isPlaying: false,
                                });
                                const pixels = new Uint8Array(W * H * 4);
                                rendererRef.current.readRenderTargetPixels(rt, 0, 0, W, H, pixels);
                                rendererRef.current.setRenderTarget(null);
                                rt.dispose();
                                const rowSize = W * 4;
                                const flipped = new Uint8ClampedArray(pixels.length);
                                for (let y = 0; y < H; y++) {
                                  flipped.set(pixels.subarray((H - 1 - y) * rowSize, (H - y) * rowSize), y * rowSize);
                                }
                                const aux = document.createElement('canvas');
                                aux.width = W; aux.height = H;
                                aux.getContext('2d')!.putImageData(new ImageData(flipped, W, H), 0, 0);
                                const pngBase64 = aux.toDataURL('image/png');
                                aux.remove();
                                const fileName = `frame_${Date.now()}.png`;
                                await invoke('save_frame_as_asset', {
                                  projectPath: currentProjectPath,
                                  fileName,
                                  pngBase64,
                                });
                                await loadAssets();

                                // Create new clip at currentTime
                                setTracks(prev => {
                                  const newTrackId = prev.length > 0 ? Math.max(...prev.map(t => t.id)) + 1 : 0;
                                  const newClip: Clip = {
                                    id: crypto.randomUUID(),
                                    name: fileName,
                                    start: currentTime,
                                    duration: 5,
                                    originalduration: 5,
                                    color: getRandomColor(),
                                    trackId: newTrackId,
                                    maxduration: 36000,
                                    beginmoment: 0,
                                    dimensions: null,
                                    scale: 1,
                                    type: 'video',
                                    font: null,
                                    font_size: null,
                                    font_shine: null,
                                    font_stroke: null,
                                    font_color: '#ffffff',
                                    mute: false,
                                    opacity: 1,
                                    bg_dimetions: null,
                                    activeKeyframeView: null,
                                  } as any;
                                  setClips(prev => [...prev, newClip]);
                                  return [...prev, { id: newTrackId, type: 'video' as any }];
                                });

                                showNotify(t('notify.frameAddedTimeline'), 'success');
                              } catch (err: any) {
                                showNotify(err?.toString() ?? t('notify.frameInsertError'), 'error');
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-500/10 text-zinc-400 hover:text-violet-400 text-[10px] font-black uppercase transition-all"
                          >
                            <DiamondPlus size={13} />
                            {t('menuClip.AddtoAssetsInsert')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
         )}



          {/* PREVIEW PLAYER */}
          <section className="flex-1 bg-black flex flex-col items-center justify-center p-8 relative h-full overflow-hidden">
            




              
                <div 
                  className="bg-[#050505] rounded-xl border border-zinc-800 flex items-center justify-center relative group cursor-pointer overflow-hidden shadow-2xl transition-all duration-500 ease-in-out"
                  style={{ 
                    aspectRatio: `${projectConfig.width} / ${projectConfig.height}`,
                    // Portrait: limita pela altura disponível da section (h-full)
                    // Landscape/Square: limita pela largura (max-w de 896px)
                    ...(projectConfig.height > projectConfig.width
                      ? { height: '100%', maxHeight: '100%', width: 'auto' }
                      : { width: '100%', maxWidth: '896px' }
                    )
                  }}
                  onClick={togglePlay}
                >

                  <canvas 
                    ref={canvasRef}
                    width={projectConfig.width}
                    height={projectConfig.height}

                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleCanvasClick(e); // Sua função de Hit Test que define o selectedClipIdRef
                    }}
                    onMouseDown={(e) => {
                      if (interactionMode === 'transform' && selectedClipIdRef.current) {
                        isDraggingRef.current = true;
                        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                         
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isDraggingRef.current && interactionMode === 'transform' && selectedClipIdRef.current) {
                        const dx = e.clientX - lastMousePosRef.current.x;
                        const dy = e.clientY - lastMousePosRef.current.y;


                       
                        
                        // Pegamos o clipe atual
                        const clip = clips.find(c => c.id === selectedClipIdRef.current);
                        if (!clip) return;

                        // Pegamos a posição atual interpolada
                        const currentPos = getInterpolatedValueWithFades(currentTime, clip, 'position') as Position;


                       
                        
                        
                        updateKeyframes(clip, 'position', { 
                          x: currentPos.x + dx, 
                          y: currentPos.y + dy 
                        });

                        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                      }
                    }}
                    onMouseUp={() => {
                      isDraggingRef.current = false;
                       
                    }}  
                    style={{ cursor: canvasCursor }}
                    className="absolute inset-0 w-full h-full"
                  />
                  

                  {interactionMode === 'transform' && selectedClipIdRef.current && (
                    <div className="absolute inset-0 pointer-events-none">
                      <svg className="w-full h-full">
                          {/* Desenha o retângulo ao redor do clipe selecionado */}
                          {(() => {
                            const clip = clips.find(c => c.id === selectedClipIdRef.current);
                            const pos = getInterpolatedValueWithFades(currentTime, clip, 'position');
                            // Lógica de projeção de coordenadas Canvas -> Div UI

                            //variaveis temporarias 

                            const scale = getInterpolatedValueWithFades(currentTimeRef.current, clip , 'zoom') || 1
                            const clipWidth = clip?.dimensions?.x || projectConfig.width
                            const clipHeight = clip?.dimensions?.y|| projectConfig.height




                            return (
                              <rect 
                                x={pos.x * scale} 
                                y={pos.y * scale} 
                                width={clipWidth * scale} 
                                height={clipHeight * scale} 
                                fill="none" 
                                stroke="#ff0000" 
                                strokeWidth="2"
                              />
                            )
                          })()}
                      </svg>
                    </div>
                  )}

                  
                  
                  {/* Ícones de Play/Pause centralizados */}
                  <div className="z-10 pointer-events-none">
                    {isPlaying ? (
                      <Pause size={56} className="text-white/5 group-hover:text-white/30 transition-all scale-90 group-hover:scale-100" />
                    ) : (
                      <Play size={56} className="text-white/5 group-hover:text-white/30 transition-all scale-90 group-hover:scale-100" />
                    )}
                  </div>
                </div>

         

            

            {/* PLAYER CONTROLS */}
            <div className="flex items-center gap-8 mt-6">
              <button onClick={() => {seekToNearestCut(-1)}} className="text-zinc-600 hover:text-white transition-colors"><SkipBack size={24} fill="currentColor"/></button>
              <button 
                onClick={togglePlay}
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}
              </button>
              <button onClick={() => {seekToNearestCut(1)}} className="text-zinc-600 hover:text-white transition-colors"><SkipForward size={24} fill="currentColor"/></button>
            </div>
          </section>



</div>

      <PropertiesAside 
      selectedClipIds={selectedClipIds}
      clips={clips}
      assets={assets}
      currentTime={currentTime}
      currentTimeRef={currentTimeRef}
      setClips={setClips}
      updateKeyframes={updateKeyframes}
      getInterpolatedValueWithFades={getInterpolatedValueWithFades}
      knowTypeByAssetName={knowTypeByAssetName}
      COLOR_MAP={COLOR_MAP}
      availableFonts = {availableFonts}
      removeEffectFromClip = {removeEffectFromClip}
      isRendering = {isRendering}
    />



        </main>

        {/* --- DYNAMIC TIMELINE SECTION --- */}
       <footer
          className={`bg-[#0c0c0c] border-t border-zinc-800 flex flex-col relative ${ isRendering ? 'opacity-40 pointer-events-none select-none' : ''}`}
          style={{ height: `${timelineHeight}px` }}
        >
          {/* TOP RESIZER HANDLE */}
          <div 
            onMouseDown={() => {
              isResizingTimeline.current = true;
              document.body.style.cursor = 'row-resize';
            }}
            className="absolute -top-1 left-0 w-full h-2 cursor-row-resize z-[60] hover:bg-blue-500/40 transition-colors"
          />

          {/* Timeline Toolbar */}
          <div className="h-10 border-b border-zinc-900 flex items-center px-4 justify-between bg-[#0e0e0e] shrink-0">
            <div className="flex items-center gap-6">
              <button onClick={handleSplit} className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-red-500 uppercase transition-colors">
                <Scissors size={14}/> {t('timeline.split')}
              </button>
              
              <button 
                onClick={() => {
                  const newState = !isSnapEnabled;
                  setIsSnapEnabled(newState);
                  showNotify(`Snap: ${newState ? t('notify.snapOn') : t('notify.snapOff')}`, "success");
                }}
                className={`flex items-center gap-2 text-[10px] font-black uppercase transition-all ${isSnapEnabled ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                title={t('timeline.snapCtrl')}
              >
                <LayoutGrid size={14} className={isSnapEnabled ? "animate-pulse" : ""} />
                {t('timeline.snap')}
              </button>

              {/* Zoom Control */}
              <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-md border border-zinc-800">
                <ZoomOut size={14} className="text-zinc-600" />
                <input
                  type="range" min={MIN_ZOOM} max={MAX_ZOOM} value={pixelsPerSecond}
                  onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
                  className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                  [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none"
                />
                <div className="text-[10px]" > {pixelsPerSecond} </div>
                <ZoomIn size={14} className="text-zinc-600" />
              </div>

              {/* Timecode Display */}
              <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-zinc-800/50">
                <Clock size={12} className="text-zinc-600" />
                <span className="text-white font-bold tracking-widest min-w-[80px]">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>


                {/* Buttons of Split and Select */}
                <div className="flex items-center gap-1 border-l border-zinc-800 ml-4 pl-4">
                  <button 
                    onClick={() => handleMassSplitAndSelect('left')}
                    className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-zinc-800 group transition-all"
                    title={t('timeline.splitSelectLeft')}
                  >
                    <div className="flex items-center text-zinc-500 group-hover:text-blue-400">
                      <SkipBack size={14} className="mr-[-4px]" />
                      <Scissors size={12} />
                    </div>
                    <span className="text-[8px] font-black text-zinc-600 uppercase">{t('timeline.selLeft')}</span>
                  </button>

                  <button 
                    onClick={() => handleMassSplitAndSelect('right')}
                    className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-zinc-800 group transition-all"
                    title={t('timeline.splitSelectRight')}
                  >
                    <div className="flex items-center text-zinc-500 group-hover:text-blue-400">
                      <Scissors size={12} />
                      <SkipForward size={14} className="ml-[-4px]" />
                    </div>
                    <span className="text-[8px] font-black text-zinc-600 uppercase">{t('timeline.selRight')}</span>
                  </button>
                </div>
            </div>
          </div>


         
      
{/* --- TIMELINE SECTION --- */}

<div className="flex flex-col bg-black/20 rounded-xl border border-white/5 overflow-hidden relative">
  



  {/* Main Timeline Area (Tracks + Needle) */}
  <div 
    ref={timelineContainerRef}
    onMouseDown={handleTimelineMouseDown} //(e) => { if (e.target === e.currentTarget) setSelectedClipIds([]); 
            onDrop={handleDropOnEmptyArea}
            onDragOver={(e) => e.preventDefault()}
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUp}
            onMouseLeave={handleTimelineMouseUp}



    className="flex flex-col p-2 gap-1.5 overflow-x-auto custom-scrollbar relative"
  >

     

     {/* Header da Timeline / Ruler */}
  <div className="flex bg-zinc-900/50" style = {{width: (totalDuration+60) * pixelsPerSecond }}>
    <div className="w-50 shrink-0 border-r border-white/5" /> 
    
    <div 
      className="flex-1 relative h-8 border-b border-white/5 cursor-pointer"
      onClick={(e) => {

        const rect = e.currentTarget.getBoundingClientRect();
        //const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
        const newPos = e.clientX   - rect.left  - (pixelsPerSecond/20); //calibration
        currentTimeRef.current = newPos/pixelsPerSecond
        seekTo(currentTimeRef.current);
        setPlayheadPos(newPos);
        
       
        
        
      }}

    >
      {(() => {
        // Choose tick interval so marks are always ~80px apart
        const targetPx = 80;
        const rawInterval = targetPx / pixelsPerSecond;
        const niceIntervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
        const tickInterval = niceIntervals.find(v => v >= rawInterval) ?? 600;
        const labelEvery = tickInterval < 1 ? 10 : tickInterval < 10 ? 5 : 2;
        const tDuration = 36000
        const tickCount = Math.ceil(tDuration / tickInterval) + 1;

        return [...Array(tickCount)].map((_, i) => {
          const timeInSeconds = i * tickInterval;
          const showLabel = i % labelEvery === 0;
          return (
            <div
              key={i}
              className="absolute border-l border-zinc-800/50 h-full text-[8px] pl-1 pt-1 text-zinc-500 font-mono pointer-events-none"
              style={{ left: timeInSeconds * pixelsPerSecond }}
            >
              {showLabel ? formatTime(timeInSeconds) : ''}
              <div className="absolute top-0 left-0 h-2 border-l border-zinc-700" />
            </div>
          );
        });
      })()}
    </div>
  </div>

    {/* PLAYHEAD - Now released inside the scroll container. */}
    <div ref={playheadRef}
      className="absolute top-0 bottom-0 w-[2px] bg-sky-600 z-[100] pointer-events-none transition-transform duration-75 ease-out" 
      style={{ left: asidetrackwidth + 15, height: (tracks.length * 75) +50  }} // +8 por causa do padding p-2 do container
      
    >
        {/* Needle head (Triangle or Circle) */}
        <div onMouseDown={handlePlayheadMouseDown}  className="w-4 h-4 bg-sky-600 rounded-b-full shadow-[0_0_10px_rgba(220,38,38,0.5)] -ml-[7px]" />
    </div>

 

    {/* Track Rendering (Your sort and map code here) */}
    {Array.from(
  // 1. Create a Map using the ID as the key to eliminate duplicates.
  new Map(tracks.map((t) => [t.id, t])).values()
)
  // 2. Sort the unique tracks
  .sort((a, b) => {
    const priority = (type: string) => (type === "audio" ? 1 : 0);
    const pA = priority(a.type);
    const pB = priority(b.type);

    //console.log('clips: ', clips)



    if (pA !== pB) {
      return pA - pB;
    }
    return a.id - b.id;
  })
  // 3. Maps to the component
  .map((track, index) => (
      <div key={track.id} className="flex gap-2 group">
        
        {/* ASIDE: Icons Track and id */}
        <div  ref={asidetrack} className="w-48 shrink-0 bg-zinc-900/40 border border-zinc-800/40 rounded-md flex items-center px-3 gap-3"
        
        >
          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
            {track.type === 'audio' && <Music size={14} />}
            {track.type === 'video' && <Play size={14} fill="currentColor" />}
            {track.type === 'effects' && <Sparkles size={14} />}
            {track.type === 'text' && <Type size={14} />}

          </div>
          
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black text-white/70 uppercase tracking-tighter truncate">
              {t(`timeline.trackTypes.${track.type}`)} 
            </span>
            <span className="text-[7px] font-bold text-zinc-600 uppercase">
              ID: {track.id + 1}
            </span>
          </div>

          <div className="flex flex-row min-w-0">

            <LockIcon size={14}  onClick={() => lockmuteTrack(0, track)} 
              className={`cursor-pointer transition-colors duration-200 ${
                track.lock 
                  ? 'text-violet-500 fill-violet-500/20' // Roxo moderno com um leve preenchimento (opcional)
                  : 'text-gray-400 hover:text-gray-200'  // Cor neutra quando desligado
              }`}/>

            <MicOffIcon size={14} onClick={() => lockmuteTrack(1, track)} 
              className={`cursor-pointer transition-colors duration-200 ${
                track.mute 
                  ? 'text-violet-500 fill-violet-500/20' // Roxo moderno com um leve preenchimento (opcional)
                  : 'text-gray-400 hover:text-gray-200'  // Cor neutra quando desligado
              }`}/>

            {
             (index !== 0 && track.type != 'audio') && <ArrowBigUpDash size={14} onClick={()=> transferClipsToNewTrackZero(track.id)}
             className={"cursor-pointer transition-colors duration-200"}/> 
            }

            {
             (index !== 0 && index !==1 && track.type != 'audio') && <ArrowUp size={14} onClick={()=> moveTrackDownAndShiftOthers(track.id)}
             className={"cursor-pointer transition-colors duration-200"}/> 
            }



          </div>


        </div>

        {/* DROPS AREA: Where is the Clips stay */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => { handleDropOnTimeline(e, track.id)}}
          onContextMenu={(e) => {
            // Só abre se clicou em área vazia (não em cima de um clip)
            const target = e.target as HTMLElement;
            if (target.closest('[draggable="true"]')) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickTime = clickX / pixelsPerSecond;

            setTrackContextMenu({
              x: e.clientX,
              y: e.clientY,
              trackId: track.id,
              clickTime,
            });
          }}
          className={`relative flex-1  border 
          rounded-md  
          transition-colors min-w-[10000px]
          ${ track.lock &&
            'text-slate-500 opacity-40 hover:opacity-60 transition-opacity'
          }

          ${isDraggingTransition
            ? 'border-blue-500/40 bg-blue-900/10'
            : track.mute 
              ? 'bg-rose-950/30 border-rose-500/40'
              : 'bg-zinc-900/10 border-zinc-800/20 hover:bg-zinc-900/20'
          }`
        
        
          }
          style={{ height: '64px', minWidth: Math.max(10000, (totalDuration + 60) * pixelsPerSecond) }}


           onClick ={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            //const scrollLeft = timelineContainerRef.current?.scrollLeft || 0;
            const newPos = e.clientX   - rect.left  - (pixelsPerSecond/20); //calibration
            currentTimeRef.current = playheadPos/pixelsPerSecond
            seekTo(currentTimeRef.current);
            setPlayheadPos(newPos);
            

        
        
        }}
         

          

        >


      {/* Track Context Menu */}
      {trackContextMenu && (() => {
        const menuHeight = 60;
        const menuWidth = 190;
        const overflowY = trackContextMenu.y + menuHeight > window.innerHeight;
        const overflowX = trackContextMenu.x + menuWidth > window.innerWidth;
        const adjustedY = overflowY ? trackContextMenu.y - menuHeight : trackContextMenu.y;
        const adjustedX = overflowX ? trackContextMenu.x - menuWidth : trackContextMenu.x;

        return (
          <div
            className="fixed z-[200] min-w-[190px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-lg py-1.5 animate-in fade-in zoom-in duration-100"
            style={{ top: adjustedY, left: adjustedX }}
          >
            <button
              onClick={() => {
                cleanEmptySpace(trackContextMenu.trackId, trackContextMenu.clickTime);
                setTrackContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-cyan-600 hover:text-white transition-colors flex items-center gap-3"
            >
              <BrushCleaning size={14} className="opacity-70" />
              <span>{t('timeline.cleanEmptySpace')}</span>
            </button>

            <button
              onClick={() => {
                pasteEffectsTrack(trackContextMenu.trackId);
                setTrackContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-cyan-600 hover:text-white transition-colors flex items-center gap-3"
            >
              <ClipboardPaste size={14} className="opacity-70" />
              <span>{t('timeline.pasteEffectsKeyframes')}</span>
            </button>



            <button
              onClick={() => {
                pasteMaskTrack(trackContextMenu.trackId);
                setTrackContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-cyan-600 hover:text-white transition-colors flex items-center gap-3"
            >
              <ClipboardPaste size={14} className="opacity-70" />
              <span>{t('timeline.pasteMask')}</span>
            </button>



          </div>
        );
      })()}





      


          {/* Clips filtrados por track.id */}
          {clips.filter(c => Number(c.trackId) === Number(track.id)).map((clip) => {
            

            const cacheKey = `${clip.id}-${clip.beginmoment}-${clip.duration}`;
            const thumbs = timelineThumbs[cacheKey];
            const assetTarget = assets.find( a => a.name === clip.name) || null
            if(!assetTarget && !clip.type) return

            //alert(clip.name + ' ' + clip.type)

            
            const isVideo = (assetTarget?.type  === 'video')
            
            let margintitle = pixelsPerSecond > 30 ? -15 : -15
            const iconSize = pixelsPerSecond > 30 ? 17 : 17


            margintitle = pixelsPerSecond > 50 ? 30 : margintitle
            const isAudioOnly = assetTarget?.type === 'audio';
            const currentFadeIn = isAudioOnly ? (clip.fadeinAudio || 0) : (clip.fadein || 0);
            const currentFadeOut = isAudioOnly ? (clip.fadeoutAudio || 0) : (clip.fadeout || 0);

            



            


            
            return (


            <motion.div 
              key={clip.id} layoutId={clip.id}
              onDragOver={(e) => {
                e.preventDefault(); // Crítico: permite o drop
                e.stopPropagation();
                console.log('dragover')
                //const isTransition = e.dataTransfer.types.includes('application/wannacut-transition');
                //e.dataTransfer.dropEffect = isTransition ? 'link' : 'copy';

               
              }}
              onDrop={(e) => {
                e.preventDefault();
                

                // Em vez de olhar os types, tente ler o conteúdo diretamente
                const transitionData = e.dataTransfer.types.includes('application/wannacut-transition');
                const effectData = e.dataTransfer.types.includes('application/wannacut-effect');

                console.log('Drop detectado!', { transitionData, effectData });

                if (transitionData) {
                  e.stopPropagation(); // Importante para não propagar para a timeline pai
                  alert(clip.trackId)
                  handleDropOnTimeline(e, clip.trackId);
                } else if (effectData) {
                  e.stopPropagation(); // Importante para não propagar para a timeline pai
                  handleDropOnClip(e, clip.id);
                }
              }}

                
                
              
              draggable="true"
              onContextMenu={(e) => handleContextMenu(e, assetTarget?.type, clip)}
              onDragStart={(e) => handleDragStart(e, clip.color, track.id, clip.duration, clip.name, true, clip.id)}
              onClick={(e) => { e.stopPropagation(); toggleClipSelection(clip.id, e.shiftKey || e.ctrlKey); setContextMenu(null); 
                
                
                
              if((clip.activeKeyframeView !== 'position') && (clip.activeKeyframeView !== 'rotation3d'))  
                    addKeyframe(e, clip.id)
              
              
              }}
              className={`absolute  inset-y-1.5 ${clip.color} rounded-md flex items-center shadow-lg cursor-grab active:cursor-grabbing border-2 ${
                selectedClipIds.includes(clip.id) ? 'border-white ring-4 ring-white/10 z-30' : 'border-black/20'
              }`}
              style={{
                left: clip.start * pixelsPerSecond,
                width: clip.duration * pixelsPerSecond,
              }}

              onMouseMove={(e) => handleClipMouseMove(e, clip)}
              onMouseLeave={() => setHoverKeyframe(prev => prev ? { ...prev, visible: false } : null)}

               //onDoubleClick={(e) =>{ e.stopPropagation(); }}
            >

        {clip.effects?.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] flex gap-0.5 px-1">
                      {clip.effects?.map((_, i) => (
                        <div key={i} className="h-full flex-1 bg-purple-400 opacity-60 rounded-full" />
                      ))}
                    </div>
            )}

             

              

            <AnimatePresence>
              {hoverKeyframe?.visible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed pointer-events-none z-[9999] px-2 py-1 bg-zinc-900 border border-white/20 rounded shadow-2xl flex items-center gap-2"
                  style={{
                    left: hoverKeyframe.x + 15, // Offset para não ficar embaixo do cursor
                    top: hoverKeyframe.y - 10,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-[10px] font-mono font-bold text-white tracking-tighter uppercase">
                    {hoverKeyframe.value}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

              {/* Context Menu (right click mouse) */}

             {contextMenu && (() => {
             
             const menuHeight = 180; 
              const menuWidth = 200;  
              
              const overflowY = contextMenu.y + menuHeight > window.innerHeight;
              
              const overflowX = contextMenu.x + menuWidth > window.innerWidth;

              const adjustedY = overflowY ? contextMenu.y - menuHeight : contextMenu.y;
              const adjustedX = overflowX ? contextMenu.x - menuWidth : contextMenu.x;

              return (
                

                      <div 
                        className="fixed z-200 min-w-[200px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-lg py-1.5 animate-in fade-in zoom-in duration-100 "
                        style={{ top: adjustedY, left: adjustedX }}
                      >
                        {/* Opção: Separate/Recover Audio (Apenas Vídeo) */}

                        {contextMenu?.type === 'video' && 
                        (

                          <>

                          
                          
                          <button 
                              onClick={() => {
                                
                                setClips( prev => prev.map(c => (c.id === clip.id) ?  {...c, mute: !(clip.mute)}  : c ))
                                setContextMenu(null);
                                !(clip.mute) ? showNotify(t('timeline.notify.muted'),'success') : showNotify(t('timeline.notify.unmuted'),'success')
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                            >
                              {!(clip.mute) ?  <VolumeOff size={14} className="opacity-70" /> :  <VolumeIcon size={14} className="opacity-70" />}
                               <span>{!(clip.mute) ? t('timeline.mute') : t('timeline.unmute')}</span>
                              
                             
                              
                          </button>

                          
                          
                          
                          </>
                        )}

                        {(contextMenu) && ( 
                        
                        
                        <>
                        
                        
                        
                        
                        <button 
                              onClick={() => {
                                setcopiedEffects(contextMenu.clip);
                                setContextMenu(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                            >
                              <Copy size={14} className="opacity-70" />
                              <span> {t('timeline.copyEffects')} </span>
                            </button>


                            {
                              copiedEffects && Object.keys(copiedEffects).length > 0 && 

                                <button 
                                  onClick={() => {
                                    pasteEffects(contextMenu.clip);
                                    setContextMenu(null);

                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                                >
                                  <ClipboardPaste size={14} className="opacity-70" />
                                  <span> {t('timeline.pasteEffectsKeyframes')} </span>
                                </button>
                            }
                        
                        
                        
                        
                        
                        
                        
                        </>
                        
                        
                        
                        
                        )}






                        {(contextMenu?.type === 'video' || contextMenu?.type === 'image') && ( 
                          
                          <>

                          <button 
                              onClick={() => {
                                setcopiedMask(contextMenu.clip);
                                setContextMenu(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                            >
                              <Copy size={14} className="opacity-70" />
                              <span> {t('timeline.copyMask')} </span>
                          </button>


                            {
                              copiedMask && Object.keys(copiedMask).length > 0 && 

                                <button 
                                  onClick={() => {
                                    pasteMask(contextMenu.clip);
                                    setContextMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                                >
                                  <ClipboardPaste size={14} className="opacity-70" />
                                  <span>{t('timeline.pasteMask')}</span>
                                </button>
                            }



                            

                            </>
                            )
                        }


                        {/*Vocal Remover menu context*/}
                        {

                           (contextMenu?.type === 'video' || contextMenu?.type === 'audio')   && (

                           
                            
                            <div className="relative"
                              onMouseEnter={() => setActiveSubmenu('vocalRemover')}
                              onMouseLeave={() => setActiveSubmenu(null)}
                            >
                              <div className={`w-full text-left px-3 py-2 text-sm text-zinc-200 transition-colors flex items-center justify-between cursor-default ${activeSubmenu === 'vocalRemover' ? 'bg-zinc-800' : ''}`}>
                                <div className="flex items-center gap-3">
                                  <MicOffIcon size={14} className="opacity-70" />
                                  <span>{t('timeline.vocalRemover')}</span>
                                </div>
                                <SkipForward size={12} className="opacity-40" />
                              </div>
                              {activeSubmenu === 'vocalRemover' && (
                                <div className="absolute left-[calc(100%-4px)] top-[-6px]
                                  min-w-[170px] bg-zinc-900 border border-white/10 shadow-2xl rounded-lg py-1.5
                                  transition-all duration-150 transform translate-x-2">
                                  {([
                                    { label: t('timeline.vocal'),       mode: 'vocals_only'      as const, icon: <MicOffIcon size={14} /> },
                                    { label: t('timeline.instrumental'), mode: 'instrumental_only' as const, icon: <Music size={14} /> },
                                    { label:  t('timeline.both'), mode: 'both'              as const, icon: <Wind size={14} /> },
                                  ] as const).map(opt => (
                                    <button
                                      key={opt.mode}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        vocalRemover(contextMenu.clip, opt.mode);
                                        setContextMenu(null);
                                      }}
                                      className="w-full text-left px-3 py-2 text-[12px] text-zinc-300 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                                    >
                                      <span className="opacity-50">{opt.icon}</span>
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                              )



                        }




                        {contextMenu?.type === 'video' && (
                          <>


                           

                            <button 
                              onClick={() => {
                                separateAudio(contextMenu?.clip);
                                setContextMenu(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                            >
                              <Music size={14} className="opacity-70" />
                              <span>{contextMenu?.clip.mute ? `${t('timeline.recoverAudio')}` : `${t('timeline.separateAudio')}` } </span>
                            </button>


                            <div className="h-[1px] bg-white/5 my-1 mx-2" />
                          </>
                        )}


                        <button 
                          onClick={() => {
                            setClips(prev => prev.map(c => 
                              c.id === contextMenu.clip.id ? { ...c, activeKeyframeView: null } : c
                            ));
                            setContextMenu(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-zinc-800 transition-all flex items-center gap-3"
                        >
                          <EyeOff size={14} />
                          <span>{t('timeline.hideKeyframes')}</span>
                        </button>


                        {/* Opção KEYFRAMABLE com Submenu Lateral */}
                        <div className="relative"
                          onMouseEnter={() => setActiveSubmenu('keyframable')}
                          onMouseLeave={() => setActiveSubmenu(null)}
                        >
                          <div 
                            className={`w-full text-left px-3 py-2 text-sm text-zinc-200 
                                      transition-colors flex items-center justify-between cursor-default ${activeSubmenu === 'keyframable' ? 'bg-zinc-800' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <Diamond size={14} className="text-violet-400 opacity-80" />
                              <span className="font-medium">{t('timeline.keyframable')}</span>
                            </div>
                            <SkipForward size={12} className="opacity-40" />
                          </div>

                          {/* Submenu Lateral */}
                          {activeSubmenu === 'keyframable' && (
                            <div className="absolute left-[calc(100%-4px)] top-[-6px]
                            min-w-[160px] bg-zinc-900 border border-white/10 shadow-2xl rounded-lg py-1.5 
                            transform translate-x-2
                            max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-700
                            ">
                              
                              {[
                                { label: 'Volume', value: 'volume', icon: <Volume2 size={14} /> },
                                { label: 'Opacity', value: 'opacity', icon: <Layers size={14} /> },
                                { label: 'Speed', value: 'speed', icon: <Clock size={14} /> },
                                { label: '3D Rotation', value: 'rotation3d', icon: <Rotate3d size={14} /> },
                                { label: 'Position', value: 'position', icon: <Crosshair size={14} /> },
                                { label: 'Zoom', value: 'zoom', icon: <ZoomIn size={14} /> },

                              ].map((sub) => (
                                <button
                                  key={sub.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    // View Keyframes
                                    setClips(prev => prev.map(c => 
                                      c.id === contextMenu.clip.id 
                                        ? { ...c, activeKeyframeView: sub.value as any } 
                                        : c
                                    ));
                                    
                                    setContextMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[12px] text-zinc-300 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-3"
                                  >
                                    <span className="opacity-50">{sub.icon}</span>
                                    <span>{sub.label}</span>
                                  </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Opção MASK com Submenu Lateral */}
                        {(contextMenu.type === 'video' || contextMenu.type === 'image' || contextMenu.type === 'text') &&
                          contextMenu.clip.mask?.type && contextMenu.clip.mask.type !== 'none' && (
                          <div className="relative"
                            onMouseEnter={() => setActiveSubmenu('mask')}
                            onMouseLeave={() => setActiveSubmenu(null)}
                          >
                            <div
                              className={`w-full text-left px-3 py-2 text-sm text-zinc-200
                                        transition-colors flex items-center justify-between cursor-default ${activeSubmenu === 'mask' ? 'bg-zinc-800' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <Scissors size={14} className="text-sky-400 opacity-80" />
                                <span className="font-medium">{t('timeline.mask')}</span>
                              </div>
                              <SkipForward size={12} className="opacity-40" />
                            </div>

                            {/* Submenu Lateral */}
                           {/* Submenu Lateral */}
                            {activeSubmenu === 'mask' && (
                              <div className="absolute left-[calc(100%-4px)] top-[-6px]
                              min-w-[170px] bg-zinc-900 border border-white/10 shadow-2xl rounded-lg py-1.5
                              transform translate-x-2
                              max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-sky-700">
                                {(contextMenu.clip.mask?.type === 'trailer' ? ([
                                  { label: 'Bar Size',   value: 'mask.scaleY',  icon: <ZoomIn size={14} /> },
                                  { label: 'Center',     value: 'mask.y',       icon: <Crosshair size={14} />, note: 'view only' },
                                  { label: 'Feather',    value: 'mask.feather', icon: <Wind size={14} /> },
                                ] as { label: string; value: string; icon: React.ReactNode; note?: string }[]) : ([
                                  { label: 'Position X',     value: 'mask.x',            icon: <Crosshair size={14} />,  note: 'view only' },
                                  { label: 'Position Y',     value: 'mask.y',            icon: <Crosshair size={14} />,  note: 'view only' },
                                  { label: 'Scale X',        value: 'mask.scaleX',       icon: <ZoomIn size={14} /> },
                                  { label: 'Scale Y',        value: 'mask.scaleY',       icon: <ZoomIn size={14} /> },
                                  { label: 'Rotation',       value: 'mask.rotation',     icon: <Rotate3d size={14} /> },
                                  { label: 'Feather',        value: 'mask.feather',      icon: <Wind size={14} /> },
                                  ...(contextMenu.clip.mask?.type === 'rectangle'
                                    ? [{ label: 'Corner Radius', value: 'mask.cornerRadius', icon: <Layers size={14} /> }]
                                    : []),
                                ] as { label: string; value: string; icon: React.ReactNode; note?: string }[])).map((sub) => (
                                  <button
                                    key={sub.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClips(prev => prev.map(c =>
                                        c.id === contextMenu.clip.id
                                          ? { ...c, activeKeyframeView: sub.value as any }
                                          : c
                                      ));
                                      setContextMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-[12px] text-zinc-300 hover:bg-sky-600 hover:text-white transition-colors flex items-center gap-3"
                                  >
                                    <span className="opacity-50">{sub.icon}</span>
                                    <span>{sub.label}</span>
                                    {sub.note && (
                                      <span className="ml-auto text-[9px] text-zinc-500 italic">{sub.note}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Outras opções padrão (Exemplo: Delete) */}
                        <div className="h-[1px] bg-white/5 my-1 mx-2" />
                        <button 
                          onClick={() => {
                            setClips(prev => prev.filter(c => c.id !== contextMenu.clip.id));
                            setContextMenu(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-3"
                        >
                          <X size={14} className="opacity-70" />
                          <span 
                          
                          onClick={() => {
                            setClips( prev => prev.filter( c => c !== clip))
                          }}
                          
                          
                          >{t('timeline.removeClip')}</span>
                        </button>
                      </div>





              );
            })()}
                  

              {/*Keyframes system */}

              


          {clip.activeKeyframeView && (
            <div className="absolute inset-0 w-full h-full z-50 overflow-visible">
              <svg 
                className="w-full h-full overflow-visible cursor-crosshair pointer-events-auto"
                onDoubleClick={(e) => addKeyframe(e, clip.id)}
              >
                {/* 1. Linha de fundo (Guia) */}
                <line 
                  x1="0" y1="50%" x2="100%" y2="50%" 
                  stroke="white" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2" 
                />

                {/* 2. A Linha de Keyframes Branca */}
                {clip.keyframes?.[clip.activeKeyframeView] && clip.keyframes[clip.activeKeyframeView]!.length > 0 && (
                  <polyline
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  className="drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]"
                  points={(clip.keyframes?.[clip.activeKeyframeView!] || [])
                    .map(kf => {
                      const x = kf.time * pixelsPerSecond;
                      const y = calculateY(kf.value, 40, clip.activeKeyframeView); // 40 é a altura da sua track
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                )}

                {/* 3. Os Pontos Arrastáveis */}
                {(clip.keyframes?.[clip.activeKeyframeView] || []).map((kf) => 
                
                
                {

                  var cyString = ""
                  const av = clip.activeKeyframeView;

                  if (av === 'volume')
                    cyString = `${(1 - reverterVolume(kf.value)) * 100}%`;
                  else if (av === 'speed')
                    cyString = `${(1 - reverterSpeed(kf.value)) * 100}%`;
                  else if (av === 'zoom')
                    cyString = `${(1 - reverterZoom(kf.value)) * 100}%`;
                  else if (av === 'position' || av === 'rotation3d' || av === 'mask.x' || av === 'mask.y')
                    cyString = '50%';
                  else if (av === 'mask.feather' || av === 'mask.cornerRadius')
                    cyString = `${(1 - (kf.value as number) / 100) * 100}%`;
                  else if (av === 'mask.scaleX' || av === 'mask.scaleY')
                    cyString = `${(1 - ((kf.value as number) - 0.05) / (3 - 0.05)) * 100}%`;
                  else if (av === 'mask.rotation')
                    cyString = `${(1 - (kf.value as number) / 360) * 100}%`;
                  else
                    cyString = `${(1 - (kf.value as number)) * 100}%`;

                  var title =
                    av === 'position'    ? `X: ${(kf.value as any).x}, Y: ${(kf.value as any).y}` :
                    av === 'rotation3d'  ? `Rot: ${(kf.value as any).rot}, Rot3D: ${(kf.value as any).rot3d}` :
                    av === 'mask.x'      ? `X: ${kf.value}` :
                    av === 'mask.y'      ? `Y: ${kf.value}` :
                    av === 'zoom'        ? `${(1 - reverterZoom(kf.value as number)) * 100}%` :
                    `${kf.value}`;

                  // These types have object values — dragging Y doesn't make sense, view-only
                  const isViewOnlyKf = av === 'position' || av === 'rotation3d' || av === 'mask.x' || av === 'mask.y';
                  
                  return(
                  <circle
                    key={kf.id}
                    cx={kf.time * pixelsPerSecond}
                    cy={cyString}
                    r="5"
                    fill="white"
                    stroke="#7c3aed"
                    strokeWidth="2"
                    //hover:scale-150 
                    className="cursor-move transition-transform pointer-events-auto"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isViewOnlyKf)
                        handleKeyframeDrag(e, clip.id, kf.id, clip.activeKeyframeView! as any);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteKeyframe(clip.id, kf.id, clip.activeKeyframeView!);
                    }}
                    
                  >

                    <title> {title} </title>

                  </circle>  
                )



                }
                
                
                
                
                
                
                
                )}
              </svg>
              
              {/* Badge indicando o que estamos editando */}
              <div className="absolute top-1 left-1 bg-violet-600 text-[8px] px-1 rounded uppercase font-bold text-white opacity-70">
                Editing {clip.activeKeyframeView}
              </div>
              <button 
              onClick={(e) => {
                e.stopPropagation();
                setClips(prev => prev.map(c => c.id === clip.id ? { ...c, activeKeyframeView: null } : c));
              }}
              className="bg-zinc-800 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
            >
              <X size={8} />
            </button>
            <button 
            onClick={(e) => {
              e.stopPropagation();
              // Confirmação simples para evitar exclusão acidental
              if(!confirm(t('timeline.deleteKfConfirm'))) return;

              setClips(prev => prev.map(c => {
                if (c.id === clip.id && c.activeKeyframeView) {
                  // Criamos uma cópia segura dos keyframes
                  const updatedKeyframes = { ...c.keyframes };
                  
                  // Limpamos apenas a propriedade que está sendo visualizada (volume, opacity, etc)
                  // @ts-ignore - ou use o tipo correto da chave
                  updatedKeyframes[c.activeKeyframeView] = []; 

                  return { 
                    ...c, 
                    keyframes: updatedKeyframes,
                    activeKeyframeView: null 
                  };
                }
                return c;
              }));
            }}
            className="bg-zinc-800 hover:bg-amber-600 text-white rounded-full p-0.5 transition-colors"
            title={t('timeline.clearKfTitle')}
          >
            <BrushCleaning size={8} />
          </button>
            </div>
          )}



              {/* 1. Waveform - Ocupando o fundo proporcionalmente */}
              {assetTarget?.type === 'audio' && (
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                  <Waveform  
                    path={`${currentProjectPath}/videos/${clip.name}`} 
                    color="rgba(255, 255, 255, 0.3)" // Cor clara e semi-transparente sobre o fundo colorido
                  />
                </div>
              )}

              {/* Thumbnails (Video/Image) */}
              {thumbs?.start && assetTarget?.type === 'video' && (
                <img src={thumbs.start} className="absolute left-0 top-0 h-full w-16 object-cover opacity-80 pointer-events-none border-r border-white/10" alt="" />
              )}
              {assetTarget?.type === 'image' && (
                <img src={convertFileSrc(`${currentProjectPath}/videos/${clip.name}`)} className="absolute left-0 top-0 h-full w-16 object-cover opacity-80 pointer-events-none border-r border-white/10" alt="" />
              )}
              {thumbs?.end && assetTarget?.type === 'video' && (
                <img src={thumbs.end} className="absolute right-0 top-0 h-full w-16 object-cover opacity-80 pointer-events-none border-l border-white/10" alt="" />
              )}

              {/* 2. Container Central do Título */}
              {/* Justify-start com um padding-left coloca o texto centralizado porém "pendendo" para a esquerda */}
              <div className="relative flex items-center justify-start w-full h-full px-4 overflow-hidden pointer-events-none">
                <p 
                  className="text-[9px] font-black text-white uppercase italic leading-none drop-shadow-lg truncate max-w-[80%]"
                  style={{ marginLeft: assetTarget?.type !== 'video' ? '0' : '64px' }} // Ajusta se houver thumbnail
                >
                  {clip.name}
                </p>
              </div>

              {/*FADE HANDLE */}

              {/* Lógica para decidir qual valor ler */}

                {/* Visual do Fade In (Triângulo) */}
                {currentFadeIn > 0 && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-black/40 pointer-events-none"
                    style={{
                      width: currentFadeIn * pixelsPerSecond,
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    }}
                  />
                )}

                {/* Visual do Fade Out (Triângulo) */}
                {currentFadeOut > 0 && (
                  <div 
                    className="absolute top-0 right-0 h-full bg-black/40 pointer-events-none"
                    style={{
                      width: currentFadeOut * pixelsPerSecond,
                      clipPath: 'polygon(0 0, 100% 100%, 100% 0)',
                    }}
                  />
                )}

                {/* Handle de Fade In */}
                <div
                  className="absolute top-0 left-0 w-3 h-3 bg-white border border-black/50 rounded-bl-full cursor-ew-resize opacity-0 group-hover:opacity-100 z-30 hover:scale-125 transition-transform rotate-90"
                  onMouseDown={(e) => handleFadeDrag(e, clip.id, 'in', assetTarget?.type)}
                />

                {/* Handle de Fade Out */}
                <div
                  className="absolute top-0 right-0 w-3 h-3 bg-white border border-black/50 rounded-br-full cursor-ew-resize opacity-0 group-hover:opacity-100 z-30 hover:scale-125 transition-transform rotate-270"
                  onMouseDown={(e) => handleFadeDrag(e, clip.id, 'out', assetTarget?.type)}
                />

              {/* Handles de Redimensionamento */}
              <div className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-white/40 z-10" onMouseDown={(e) => startResizing(e, clip.id, 'left')} />
              <div className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-white/40 z-10" onMouseDown={(e) => startResizing(e, clip.id, 'right')} />

              {/* Indicadores de junção (aparecem ao arrastar uma transição) */}
              {isDraggingTransition && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-400/70 shadow-[0_0_8px_rgba(96,165,250,0.8)] pointer-events-none z-[65] animate-pulse" />
                  <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-blue-400/70 shadow-[0_0_8px_rgba(96,165,250,0.8)] pointer-events-none z-[65] animate-pulse" />
                </>
              )}


              {/* --- VISUAL PRO LAYERS (EFEITOS) --- */}
              {clip.effects && clip.effects.length > 0 && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[4px] flex gap-[1px] px-[2px] z-[60] pointer-events-none"
                >
                  {clip.effects.map((eff, i) => (
                    <div 
                      key={`${clip.id}-eff-${i}`} 
                      className={`h-full flex-1 rounded-full shadow-[0_0_5px_rgba(168,85,247,0.4)] ${
                        eff.category === 'audio' ? 'bg-fuchsia-400' : 'bg-purple-400'
                      }`}
                      title={eff.name}
                    />
                  ))}
                </div>
              )}

              {/* --- VISUAL PRO LAYERS (TRANSIÇÕES) --- */}
              {/* As transições agora são renderizadas como overlays globais na timeline */}



            </motion.div>
          )})}
        </div>
      </div>
    ))}


    {/* ── TIMELINE TRANSITION OVERLAYS ──────────────────────────────────────── */}
      {timelineTransitions.map(trans => {
        const trackIndex = tracks.findIndex(t => t.id === trans.trackId);
        if (trackIndex === -1) return null;


        

      // Na renderização do overlay, calcule o offset dinamicamente:


        // linha 8002 — troca o +200 pelo valor real da ref

        const width = (trans.durationLeft + trans.durationRight) * pixelsPerSecond;

        const calib = pixelsPerSecond > 40 ?  (0.83 *pixelsPerSecond)  : pixelsPerSecond;
        const calib2 =  pixelsPerSecond > 10 ?  0.75 * width : 0


        const left = ((trans.junctionTime - trans.durationLeft) * pixelsPerSecond) + 200 + calib - calib2
        const TRACK_HEIGHT = 64;
        const TRACK_GAP = 4;
        const RULER_H = 32;
        const ids_order = order_tracks().map(t => t.id);

        
        const top = RULER_H + ids_order.indexOf(trans.trackId) * (TRACK_HEIGHT + TRACK_GAP) + 20;



        //console.log('transitions: ', trans.junctionTime, top, ids_order.indexOf(track.id) )

        return (
          <div
            key={trans.id}
            className="absolute z-[55] test-trans"
            style={{ top, left, width, height: TRACK_HEIGHT - 4 }}
          >
            <div className="absolute inset-0 rounded-md bg-blue-500/20 border border-blue-400/60 pointer-events-none" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none select-none">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 3l4 4-4 4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest truncate max-w-full px-1">
                {trans.name}
              </span>
            </div>
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md bg-blue-400/40 hover:bg-blue-400/80 transition-colors"
              onMouseDown={(e) => startResizingTransition(e, trans.id, 'left')}
            >
              <div className="absolute inset-y-0 left-0.5 w-[2px] bg-blue-300/80 rounded-full my-2" />
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md bg-blue-400/40 hover:bg-blue-400/80 transition-colors"
              onMouseDown={(e) => startResizingTransition(e, trans.id, 'right')}
            >
              <div className="absolute inset-y-0 right-0.5 w-[2px] bg-blue-300/80 rounded-full my-2" />
            </div>
            <button
              className="absolute -top-2 -right-2 w-4 h-4 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-400 hover:text-red-400 hover:border-red-500 flex items-center justify-center text-[10px] font-bold z-20 transition-colors leading-none"
              onClick={(e) => {
                e.stopPropagation();
                setTimelineTransitions(prev => prev.filter(t => t.id !== trans.id));
              }}
              title={t('timeline.removeTransition')}
            >
              ×
            </button>
          </div>
        );
      })}



      
      {/* ────────────────────────────────────────────────────────────────────────── */}

       {isBoxSelecting && (
          <div 
            className="absolute border border-blue-500 bg-blue-500/20 z-[100] pointer-events-none"
            style={{
              zIndex: 9999,
              left: Math.min(boxStart.x  , boxEnd.x ),
              top: Math.min(boxStart.y  , boxEnd.y),
              width: Math.abs(boxEnd.x - boxStart.x),
              height: Math.abs(boxEnd.y - boxStart.y),
            }}
          />
        )}


    


      <button 
        onClick={() => {
          const nextId = tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) + 1 : 0;
          setTracks(prev => [...prev, { id: nextId, type: 'video' }]);
        }}
        className="mb-[200px] h-8 mt-2 w-fit flex items-center gap-2 text-[9px] font-black text-zinc-700 hover:text-zinc-400 uppercase tracking-widest transition-colors px-3 py-2 border border-dashed border-zinc-800/50 rounded-md"
        
      >
        <Plus size={10} /> {t('timeline.addtrack')}
      </button>



       

  </div>
</div>  




        </footer>
      </div>
    )}

    {/* MODALS  */}

    {/* Modal to create new project */}
<AnimatePresence>
  {isCreatingNew && (
    <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-[#121212] border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-black mb-6 text-white italic tracking-tighter">{t('newProject.title')}</h2>
        
        <div className="space-y-4">
          {/* Project Title */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">{t('newProject.projectName')}</label>
            <input 
              type="text" 
              placeholder={t('newProject.projectNamePlaceholder')} 
              onChange={(e) => {setProjectName(e.target.value)
                setProjectConfig({ ...projectConfig, name: e.target.value})
              }}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" 
            />
          </div>

          {/* Resolution & FPS Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">{t('newProject.resolution')}</label>
              <select 
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setProjectConfig({ ...projectConfig, width: w, height: h });
                }}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-white font-bold outline-none focus:border-red-600 transition-all text-xs appearance-none"
              >
                <option value="1920x1080">1080p (16:9)</option>
                <option value="1080x1920">TikTok (9:16)</option>
                <option value="3840x2160">4K Ultra HD</option>
                <option value="1080x1080">Square (1:1)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block">{t('newProject.frameRate')}</label>
              <select 
                onChange={(e) => setProjectConfig({ ...projectConfig, fps: Number(e.target.value) })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-white font-bold outline-none focus:border-red-600 transition-all text-xs appearance-none"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button 
            onClick={() => setIsCreatingNew(false)} 
            className="flex-1 py-4 text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-widest"
          >
            {t('newProject.cancel')}
          </button>
          <button 
            onClick={handleFinishSetup} 
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 py-4 rounded-2xl font-black text-xs text-white uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all"
          >
            {t('newProject.create')}
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

    {/* Import Modal */}
    <AnimatePresence>
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[400] flex items-center justify-center p-4">
          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-[#18181b] border border-zinc-800 p-8 rounded-3xl w-full max-w-md">
            <h2 className="text-xl font-black flex items-center gap-3 text-white mb-6"><Youtube className="text-red-600" /> {t('ytDownload.title')}</h2>
            <input type="text" placeholder={t('ytDownload.urlPlaceholder')} value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-red-600 mb-5" />

            {/* Mode selector */}
            <div className="mb-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">{t('ytDownload.formatQuality')}</p>

              {/* Video options */}
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{t('ytDownload.video')}</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {([
                  { id: 'video_best', label: 'Best',  sub: 'auto' },
                  { id: 'video_1080', label: '1080p', sub: 'HD' },
                  { id: 'video_720',  label: '720p',  sub: 'HD' },
                  { id: 'video_480',  label: '480p',  sub: 'SD' },
                ] as const).map(({ id, label, sub }) => (
                  <button
                    key={id}
                    onClick={() => setDownloadMode(id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all
                      ${downloadMode === id
                        ? 'bg-red-700/20 border-red-600/60 text-red-400'
                        : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                  >
                    <span className="text-xs font-black">{label}</span>
                    <span className="text-[9px] font-medium opacity-60">{sub}</span>
                  </button>
                ))}
              </div>

              {/* Audio options */}
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{t('ytDownload.audioOnly')}</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'audio_mp3', label: 'MP3', sub: '192 kbps' },
                  { id: 'audio_wav', label: 'WAV', sub: 'lossless' },
                ] as const).map(({ id, label, sub }) => (
                  <button
                    key={id}
                    onClick={() => setDownloadMode(id)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-center transition-all
                      ${downloadMode === id
                        ? 'bg-rose-600/20 border-rose-500/60 text-rose-400'
                        : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                  >
                    <span className="text-xs font-black">{label}</span>
                    <span className="text-[9px] font-medium opacity-60">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Download button with progress */}
            <div className="relative mb-4">
              <button disabled={isDownloading} onClick={handleYoutubeDownload}
                className={`relative w-full py-4 rounded-xl font-black text-xs text-white overflow-hidden ${isDownloading ? 'bg-zinc-800' : 'bg-rose-700 hover:bg-rose-800'}`}>
                {isDownloading ? `${t('ytDownload.downloading')} ${DownloadYTprogress}%` : t('ytDownload.fetchMedia')}

                {DownloadYTprogress > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-900">
                    <motion.div
                      animate={{ width: `${DownloadYTprogress}%` }}
                      className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    />
                  </div>
                )}
              </button>

              {isDownloading && (
                <button
                  onClick={async () => {
                    await invoke('cancel_video_download');
                    setIsDownloading(false);
                    setDownloadYTprogress(0);
                    showNotify(t('notify.downloadCancelled'), 'error');
                  }}
                  className="w-full mt-2 py-3 rounded-xl font-black text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 uppercase tracking-widest transition-all"
                >
                  {t('ytDownload.cancel')}
                </button>
              )}
            </div>

            <button onClick={() => setIsImportModalOpen(false)} className="w-full mt-4 text-[10px] text-zinc-500 font-bold uppercase"> Close </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Delete Confirmation */}
    <AnimatePresence>
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/90 z-[400] flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#121212] border border-red-900/30 p-8 rounded-3xl w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 bg-red-600/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} />
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">{t('deleteProject.title')}</h2>
            <p className="text-zinc-500 text-xs mb-8">
              {t('deleteProject.description', { name: projectToDelete.name })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setProjectToDelete(null)} className="flex-1 py-3 text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest">{t('deleteProject.cancel')}</button>
              <button onClick={handleDeleteProject} className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-black text-xs text-white uppercase">{t('deleteProject.delete')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>


  {/* Project Config */}
  <SettingsModal 
    isOpen={isSettingsOpen}
    onClose={() => setIsSettingsOpen(false)}
    currentProjectSettings={projectConfig}
    onSaveProject={handleSaveSettings}
    isProjectLoaded = {isProjectLoaded}
    showNotify = {showNotify}
    currentProjectPath={currentProjectPath ? currentProjectPath : null} // Estado/String que guarda o path atual do projeto
    onLoadHistoryVersion={(projectDataJson) => {
    try {
      const parsedData = JSON.parse(projectDataJson);
      
      // 1. Atualize o estado do seu projeto (Timeline, Clipes, etc.)
      openProjectEarly(parsedData); 
      
     
      showNotify(t('notify.historyRolledBack'), "success");
    } catch (e) {
      console.error("Error parsing history project json:", e);
      showNotify(t('notify.historyParseError'), "error");
    }
  }}
  checkConfig = {checkConfig}
   
  />


  <Notifications 
  ref={notifyRef} 
  onNewNotifications={(has) => setHasNewMessages(has)} 
  />

  <ShortcutsModal
    isOpen={isShortcutsOpen}
    onClose={() => setIsShortcutsOpen(false)}
    settingsFolder={settingsFolder}
    onShortcutsChange={(updated) => setShortcuts(updated)}
  />

  {/* ── Vocal Remover — Engine Download Modal ─────────────────── */}
  <AnimatePresence>
    {vocalEngineModal && (
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000]
            w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">AI Engine</h3>
              <h2 className="text-sm font-bold text-zinc-200 mt-0.5">Vocal Remover Setup</h2>
            </div>
            {(vocalEngineStep === 'confirm' || vocalEngineStep === 'done') && (
              <button
                onClick={() => { setVocalEngineModal(false); setVocalPendingClip(null); }}
                className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-full transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Not downloading yet — explain what will be downloaded */}
          {vocalEngineStep === 'confirm' && (
            <>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5 space-y-2">
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  The <span className="text-white font-semibold">Vocal Remover</span> requires a one-time download of the AI engine and model.
                </p>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>🧠 AI Engine (inference binary)</span>
                  <span className="text-zinc-400">~99 MB</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>🎵 HTDemucs model weights</span>
                  <span className="text-zinc-400">~161 MB</span>
                </div>
                <p className="text-[10px] text-zinc-600 pt-1">
                  Downloaded once · Stored in your workspace · Works offline after
                </p>
              </div>
              <button
                onClick={startVocalEngineDownload}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition text-white text-xs font-black uppercase tracking-widest"
              >
                Download & Continue
              </button>
            </>
          )}

          {/* Downloading */}
          {(vocalEngineStep === 'engine' || vocalEngineStep === 'model') && (
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Engine row */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">AI Engine</span>
                  {vocalEngineStep === 'engine'
                    ? <span className="text-violet-400 animate-pulse">Downloading...</span>
                    : <span className="text-green-400">✓ Done</span>
                  }
                </div>
                {/* Model row */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">HTDemucs Model</span>
                  {vocalEngineStep === 'model'
                    ? <span className="text-violet-400 animate-pulse">Downloading...</span>
                    : vocalEngineStep === 'done'
                    ? <span className="text-green-400">✓ Done</span>
                    : <span className="text-zinc-600">Waiting...</span>
                  }
                </div>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-violet-500 rounded-full"
                  animate={{ width: vocalEngineStep === 'engine' ? '45%' : '90%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[10px] text-zinc-600 text-center">Do not close the app during download</p>
            </div>
          )}

          {/* Done */}
          {vocalEngineStep === 'done' && (
            <div className="text-center space-y-3">
              <p className="text-green-400 text-sm font-bold">✓ Engine ready!</p>
              <p className="text-[11px] text-zinc-500">Processing your audio now...</p>
            </div>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>

  </div>
);
}
