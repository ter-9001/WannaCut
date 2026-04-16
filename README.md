# 🚀 WannaCut - Professional Open Source Video Editor

**WannaCut** is a high-performance, lightweight video editor built for the modern creator. Combining the safety of **Rust** (Tauri) with the flexibility of **React**, it offers a professional-grade timeline experience without the bloat of traditional editors.

**I am trying to creating the Free CapCut available even for Linux, MacOS and Windows. More complet than OpenCut:  So give a start to the project if you like.**  **I am accepting recommendations**

> **Status:** 🛠️ _Under Active Development (Alpha)_

----------

## 📸 Project Glimpse

**Project Manager**

![Texto Alternativo](./img_readme/manager2.png)

**Professional Timeline**

![Texto Alternativo](./img_readme/preview_video_2.png)

**Clips's Context Menu and Keyframes**

![Texto Alternativo](./img_readme/Clip's_context_menu_with_keyframes.png)

![Texto Alternativo](./img_readme/Keyframes.png)

**Fadein and out:**

![Texto Alternativo](./img_readme/fadeinout.png)


 ----------

## ✨ Current Features

-   [x] **Smart Project Manager:** Workspace-based file system to organize all your productions.
    
-   [x] **Multi-Track Timeline:** Resizable and vertical-scrolling timeline with dynamic track management.
    
-   [x] **Pro Playback System:** `requestAnimationFrame` driven playhead with sub-second timecode precision.
    
-   [x] **Infinite History (100+ Steps):** Robust Undo/Redo system protecting your creative process.
    
-   [x] **Intelligent Manipulation:**
    
    -   Precision **Split (S)** tool.
        
    -   Multi-select clips and assets for bulk actions.
        
    -   **Magnetic Snapping:** Magnetic timeline for perfect alignment.


-   [x] **Easy Fadein and Out:** Easy Fade In and Out (for video and audio) moving the conners of the clips.
        
-   [x] **Scale Controls:** Dynamic zoom (Ctrl/Alt + Scroll) and resizable UI panels.
    
-   [x] **Asset Purge:** Automatic cleaning of unused tracks to keep the workspace optimized.

-   [x] **Separate Audio:** Separate or Recover Audio with one click

-   [x] **Keyframable Volume, Opacity and Speed:** Change Volume, Speed and Opacity using Keyframes, Keyframes that is not the speed has auto sync with the time distortion caused by change of speed

-   [x] **Sub clips:** Create subclips before import to project



----------

## 🛠️ Built With

-   **Tauri:** High-performance desktop framework.
    
-   **React + TypeScript:** For a type-safe and reactive UI.
    
-   **Tailwind CSS:** Professional-grade styling.
    
-   **Lucide React:** Beautiful and consistent iconography.

-   **Python + Moviepy:** Binary version of a Python program to export videos
    
-   **Framer Motion:** Smooth transitions and UI feedback.
    

----------

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
    
-   Rust toolchain
    
-   Tauri CLI

-  Pyinstaller
    

### Installation

Bash

```
# Clone the repository
git clone https://github.com/ter-9001/WannaCut

# Install dependencies
npm install

#go to exporter python folder
cd src-tauri/bin

#build the binary with pyinstaller

pyinstaller --onefile \
  --copy-metadata imageio \
  --copy-metadata moviepy \
  --collect-all moviepy \
  --hidden-import moviepy.video.fx.all \
  --hidden-import moviepy.audio.fx.all \
  exporter2.py


#move the new binary file from src-tauri/bin/dist for src-tauri/bin/ and rename with the target triple 

#go back to main folder

cd .. 
cd ..

# Run in development mode
npm run tauri dev

```

----------

## 🗺️ Roadmap (Upcoming Features)

-   [ ] **Drag & Drop Trimming:** Resizing clips directly on the timeline edges.
    
-   [ ] **Audio Waveforms:** Visual representation of audio tracks for sync.
    
-   [ ] **Export Engine:** Native rendering via MoviePy.
    
-   [ ] **Transition Library:** Fade-ins, cuts, and visual effects.
    
-   [ ] **AI-Powered Tools:** Automated subtitles and smart silence cutting.
    

----------

## ⚖️ License

wannacut is open-source software licensed under the **GNU AGPLv3**.

_Because creative tools should belong to everyone._

