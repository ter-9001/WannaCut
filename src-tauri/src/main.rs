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


use std::fs;
use std::path::PathBuf;

use tauri::command;
use std::process::Command;

use std::thread;
use std::fs::File;
use tiny_http::{Server, Response, Header};
use std::io::{Read, Seek, SeekFrom};

use std::path::Path;


use tauri_plugin_shell::ShellExt;
use tauri::Manager;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};



use std::process::Child;
use std::sync::Mutex;
use tauri::State;

use tauri::AppHandle;
use tauri_plugin_shell::process::CommandChild;



//  Updated state to hold the Tauri Sidecar CommandChild
pub struct ExportState(pub Mutex<Option<CommandChild>>);


#[derive(serde::Serialize)]
struct Project {
    name: String,
    path: String,
    thumbnail: Option<String>, 

}


#[derive(Debug, Serialize, Deserialize)]
pub struct Dimensions {
    pub x: f64, 
    pub y: f64,
}


#[derive(serde::Serialize)]
pub struct VideoMetadata {
    duration: f64,
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Keyframe {
    pub id: String,
    pub time: f64,
    pub value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Keyframes {
    pub volume: Option<Vec<Keyframe>>,
    pub opacity: Option<Vec<Keyframe>>,
    pub speed: Option<Vec<Keyframe>>,
    pub rotation3d: Option<Vec<Keyframe>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Clip {
    pub id: String,
    pub name: String,
    pub path: String,
    pub start: f64,
    pub duration: f64,
    pub beginmoment: f64,
    #[serde(rename = "trackId")]
    pub track_id: String, // Mantive String para bater com seu código anterior, mas mudei o binding
    #[serde(rename = "type")]
    pub clip_type: String,
    #[serde(default)]
    pub mute: Option<bool>,
    pub fadein: Option<f64>,
    pub fadeout: Option<f64>,
    pub fadeinAudio: Option<f64>, 
    pub fadeoutAudio: Option<f64>,
    
    // Opcional: para suportar a nova estrutura de keyframes
    pub keyframes: Option<Keyframes>,
    
    #[serde(rename = "activeKeyframeView")]
    pub active_keyframe_view: Option<String>,
}

use tauri::Emitter; // Adicione este import no topo


// 1. Você PRECISA desta struct definida para os erros E0425 sumirem
#[derive(Serialize, Deserialize, Clone)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub type_: Option<String>,
    pub description: String,
    pub image: Option<String>,
    pub link: Option<String>,
    pub link_text: Option<String>,
    pub repeat: bool
}

#[tauri::command]
async fn check_notifications(settings_path: String) -> Result<Vec<Notification>, String> {
    let path = std::path::Path::new(&settings_path).join("seen_notifications.json");

    // 2. Usando o reqwest que você acabou de adicionar
    let url = "https://wannacut.app/notifications.json";
    let client = reqwest::Client::new();
    
    // Especificamos que o erro vindo do reqwest é um reqwest::Error para o compilador não se perder
    let response = client.get(url)
        .header("User-Agent", "WannaCut-App")
        .send()
        .await
        .map_err(|e: reqwest::Error| e.to_string())?;
    
    let data: serde_json::Value = response.json()
        .await
        .map_err(|e: reqwest::Error| e.to_string())?;
        
    let remote_msgs: Vec<Notification> = serde_json::from_value(data["messages"].clone())
        .unwrap_or_default();

    // 3. Lógica de leitura do arquivo local
    let seen_ids: Vec<String> = if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    let mut to_show = Vec::new();
    let mut updated_seen_ids = seen_ids.clone();

    for msg in remote_msgs {
        let already_seen = seen_ids.contains(&msg.id);
        if !already_seen || msg.repeat {
            to_show.push(msg.clone());
            if !already_seen {
                updated_seen_ids.push(msg.id.clone());
            }
        }
    }

    // Salva os novos IDs vistos
    std::fs::write(path, serde_json::to_string(&updated_seen_ids).unwrap()).ok();

    Ok(to_show)
}


#[tauri::command]
async fn check_notifications_test(settings_path: String) -> Result<Vec<Notification>, String> {
    let path = std::path::Path::new(&settings_path).join("seen_notifications.json");

    // --- MOCK OFFLINE (Substituindo a requisição HTTP) ---
    let data = serde_json::json!({
      "messages": [
        {
          "id": "update_01",
          "title": "Versão 2.0 Disponível!",
          "type_": "update",
          "description": "Adicionamos os novos efeitos de áudio Alien e Pitch.",
          "image": "https://wannacut.app/img/promo.jpg",
          "link_text": "Check here",
          "link": "https://wannacut.app/blog/v2",
          "repeat": true
        },
        {
          "id": "tip_daily",
          "title": "Dica do Dia",
          "description": "Use a tecla 'S' para cortar clipes rapidamente.",
          "image": null,
          "link": null,
          "repeat": true
        }
      ]
    });
    // --- FIM DO MOCK ---

    // Converte o JSON mockado para o nosso vetor de structs
    let remote_msgs: Vec<Notification> = serde_json::from_value(data["messages"].clone())
        .unwrap_or_default();

    // Lógica de leitura do arquivo local (para testar se o seen_notifications funciona)
    let seen_ids: Vec<String> = if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    let mut to_show = Vec::new();
    let mut updated_seen_ids = seen_ids.clone();

    for msg in remote_msgs {
        let already_seen = seen_ids.contains(&msg.id);
        
        // Regra de exibição
        if !already_seen || msg.repeat {
            to_show.push(msg.clone());
            if !already_seen {
                updated_seen_ids.push(msg.id.clone());
            }
        }
    }

    // Tenta salvar para você verificar se o arquivo nasce na sua pasta de settings
    std::fs::write(path, serde_json::to_string(&updated_seen_ids).unwrap()).ok();

    Ok(to_show)
}

#[derive(Serialize)]
struct ExportPayload {
    export_path: String,
    total_duration: f64,
    project_dimentions: Dimensions,
    clips: Vec<Clip>,
}

use tauri::{ Runtime}; // Certifique-se de usar Emitter no Tauri v2

#[derive(Serialize, Deserialize, Debug)]
pub struct ProjectSettings {
    name: String,
    width: u32,
    height: u32,
    fps: f32,
    #[serde(rename = "backgroundColor")] // Mapeia o camelCase do TS para o snake_case do Rust
    background_color: String,
    #[serde(rename = "sampleRate")]
    sample_rate: u32,
}


#[tauri::command]
async fn get_asset_dimensions(path: String) -> Result<Dimensions, String> {
    let path_obj = Path::new(&path);
    
    let extension = path_obj.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .ok_or("Arquivo sem extensão válida")?;

    // --- LÓGICA PARA IMAGENS ---
    if ["jpg", "jpeg", "png", "webp", "bmp"].contains(&extension.as_str()) {
        let img = image::image_dimensions(&path)
            .map_err(|e| format!("Erro ao ler imagem: {}", e))?;
        return Ok(Dimensions { x: img.0 as f64, y: img.1 as f64 });
    }

    // --- LÓGICA PARA VÍDEOS (Via OpenCV) ---
    // OpenCV abre o arquivo e lê o cabeçalho via FFmpeg interno do sistema
    let mut v_cap = videoio::VideoCapture::from_file(&path, videoio::CAP_ANY)
        .map_err(|e| format!("OpenCV não conseguiu abrir o vídeo: {}", e))?;

    let opened = videoio::VideoCapture::is_opened(&v_cap)
        .map_err(|e| e.to_string())?;

    if !opened {
        return Err("Falha ao abrir stream de vídeo".to_string());
    }

    // CAP_PROP_FRAME_WIDTH e HEIGHT retornam as dimensões reais do vídeo
    let width = v_cap.get(videoio::CAP_PROP_FRAME_WIDTH).map_err(|e| e.to_string())?;
    let height = v_cap.get(videoio::CAP_PROP_FRAME_HEIGHT).map_err(|e| e.to_string())?;

    if width == 0.0 || height == 0.0 {
        return Err("Não foi possível determinar as dimensões do vídeo".to_string());
    }

    Ok(Dimensions {
        x: width,
        y: height,
    })
}

#[tauri::command]
async fn create_project_setup(
    root_path: String, 
    project_name: String, 
    config: ProjectSettings
) -> Result<String, String> {
    let mut project_path = PathBuf::from(&root_path);
    project_path.push(&project_name);

    if project_path.exists() {
        return Err("A project with this name already exists in this folder.".into());
    }
    
    fs::create_dir_all(&project_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let mut config_file = project_path.clone();
    config_file.push("projectConfig.json");

    let json_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_file, json_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    println!("🚀 New project initialized at: {:?}", project_path);


    std::fs::create_dir_all(&project_path).map_err(|e| e.to_string())?;
    std::fs::create_dir(project_path.join("videos")).map_err(|e| e.to_string())?;
    std::fs::create_dir(project_path.join("exports")).map_err(|e| e.to_string())?;

    Ok(project_path.to_string_lossy().into_owned())
}


#[tauri::command]
async fn save_project_config(path: String, config: ProjectSettings) -> Result<String, String> {
    let current_dir = PathBuf::from(&path);
    let parent_dir = current_dir.parent()
        .ok_or("Não foi possível encontrar a pasta pai")?;
    
    let new_dir = parent_dir.join(&config.name);

    let mut config_file_path = current_dir.clone();
    config_file_path.push("projectConfig.json");

    let json_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Erro ao gerar JSON: {}", e))?;

    fs::write(&config_file_path, json_content)
        .map_err(|e| format!("Erro ao gravar projectConfig.json: {}", e))?;

    if current_dir != new_dir {
        if new_dir.exists() {
            return Err("Already exist a project with this name!".into());
        }

        fs::rename(&current_dir, &new_dir)
            .map_err(|e| format!("Err to rename project: {}", e))?;
        
        
    }

    // Retornamos o NOVO caminho da pasta para o Frontend atualizar o estado
    Ok(new_dir.to_string_lossy().into_owned())
}
#[tauri::command]
async fn load_project_config(path: String) -> Result<ProjectSettings, String> {
    println!("🔍 Tentando ler projeto em: {}", path);

    let mut config_path = PathBuf::from(&path);
    config_path.push("projectConfig.json");

    // 1. Verificar se o caminho existe fisicamente
    if !config_path.exists() {
        let err_msg = format!("Arquivo não encontrado: {:?}", config_path);
        println!("❌ {}", err_msg);
        return Err(err_msg);
    }

    // 2. Tentar ler o arquivo
    let content = fs::read_to_string(&config_path).map_err(|e| {
        let err = format!("Erro de leitura no disco: {}", e);
        println!("❌ {}", err);
        err
    })?;

    // 3. Tentar parsear o JSON
    let settings: ProjectSettings = serde_json::from_str(&content).map_err(|e| {
        let err = format!("JSON Inválido ou campos faltando: {}", e);
        println!("❌ {}", err);
        err
    })?;

    println!("✅ Projeto '{}' carregado com sucesso!", settings.name);
    Ok(settings)
}



#[tauri::command]
async fn export_video(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, ExportState>,
    project_path: String,
    export_path: String,
    wannacut_settings: String,
    project_dimensions: serde_json::Value,
    clips: serde_json::Value,
) -> Result<(), String> {
    

    // 1. Criar o objeto de configuração

    let config_data = serde_json::json!({
        "project_path": project_path,
        "wannacut_settings": wannacut_settings,
        "export_path": export_path,
        "project_dimensions": project_dimensions,
        "clips": clips
    });

    // 2. Definir o caminho do JSON dentro da pasta do projeto
    let project_dir = std::path::PathBuf::from(&project_path);
    
    // Garante que a pasta do projeto existe
    if !project_dir.exists() {
        return Err(format!("A pasta do projeto não existe: {}", project_path));
    }

    let config_path = project_dir.join("export_config.json");

    // 3. Salvar/Sobrescrever o JSON
    let json_string = serde_json::to_string_pretty(&config_data)
        .map_err(|e| format!("Erro ao serializar JSON: {}", e))?;
    
    std::fs::write(&config_path, json_string)
        .map_err(|e| format!("Erro ao gravar export_config.json no projeto: {}", e))?;

    let config_path_str = config_path.to_string_lossy().to_string();

    // 4. Iniciar o Sidecar Python
    let (mut rx, child) = app_handle
        .shell()
        .sidecar("exporter")
        .map_err(|e| format!("Sidecar não encontrado: {}", e))?
        .env("PYTHONUNBUFFERED", "1")
        .arg(&config_path_str) // Passamos o caminho completo do JSON dentro do projeto
        .spawn()
        .map_err(|e| format!("Falha ao iniciar processo Python: {}", e))?;

    // Guardar processo para cancelamento
    {
        let mut lock = state.0.lock().unwrap();
        *lock = Some(child);
    }

    // 5. Monitorização do progresso (Stderr)
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stderr(line_bytes) => {
                    let raw = String::from_utf8_lossy(&line_bytes);
                    for line in raw.lines() {
                        let line = line.trim();
                        
                        if line.contains("PERCENT:") {
                            if let Some(val_str) = line.split("PERCENT:").last() {
                                if let Ok(percent) = val_str.parse::<u32>() {
                                    // Log para você acompanhar no terminal
                                    println!("Progresso Real: {}%", percent);
                                    let _ = app_handle.emit("export-progress", percent);
                                }
                            }
                        }
                        // println!("[Python Log]: {}", line); // Opcional
                    }
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(status) => {
                    println!("Renderização concluída com código: {:?}", status.code);
                    // Opcional: manter o json no projeto para histórico ou apagar
                    // let _ = std::fs::remove_file(config_path);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}


#[tauri::command]
async fn cancel_export(state: State<'_, ExportState>) -> Result<(), String> {
    let mut lock = state.0.lock().unwrap();
    if let Some(child) = lock.take() {
        //  Kill the Tauri Sidecar process
        child.kill().map_err(|e| format!("Failed to kill process: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn generate_thumbnail(
    app_handle: tauri::AppHandle,
    project_path: String,
    file_name: String,
    time_seconds: f64
) -> Result<String, String> {

    let thumbnail_folder = std::path::Path::new(&project_path).join("thumbnails");
    
    // Create folder if does not exist
    if !thumbnail_folder.exists() {
        std::fs::create_dir_all(&thumbnail_folder).map_err(|e| e.to_string())?;
    }
    // Paths based on project structure
    let video_path = PathBuf::from(&project_path).join("videos").join(&file_name);
    let output_name = format!("{}-{}.png", file_name, time_seconds);
    let output_path = PathBuf::from(&project_path).join("thumbnails").join(&output_name);

    // If the thumbnail already exists, skip generation to save resources
    if output_path.exists() {
        return Ok(output_path.to_string_lossy().into_owned());
    }

    // Execute FFmpeg Sidecar
    // -ss: fast seek to timestamp / -i: input / -frames:v 1: capture one frame / -q:v 2: quality level
    let sidecar_command = app_handle
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-ss", &time_seconds.to_string(), // Seek to specific time
            "-i", &video_path.to_string_lossy(), // Input source
            "-frames:v", "1", // Grab exactly 1 frame
            "-update", "1",   // ESSENTIAL: Specifies a single image output rather than a sequence
            "-y",             // Overwrite if exists (prevents hanging on prompts)
            &output_path.to_string_lossy(), // Output path
        ]);

    let output = sidecar_command.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(output_path.to_string_lossy().into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}



fn build_complex_filter(clips: &[Clip]) -> String {
    let mut filters = Vec::new();
    let mut inputs = Vec::new();

    for (i, clip) in clips.iter().enumerate() {
        // Trim the source file and reset timestamps to the timeline start
        // [vX] represents the video stream of the current clip
        let filter = format!(
            "[{}:v]trim=start={}:duration={},setpts=PTS-STARTPTS+{}/TB[v{}]",
            i, clip.beginmoment, clip.duration, clip.start, i
        );
        filters.push(filter);
        inputs.push(format!("[v{}]", i));
    }

    // Merge all video streams into one using overlay or concat
    // For simple linear editing, we use concat. For tracks, we would use overlay.
    let concat = format!("{}concat=n={}:v=1:a=0[outv]", inputs.join(""), clips.len());
    filters.push(concat);

    filters.join(";")
}



#[tauri::command]
fn list_project_files(project_path: String) -> Result<Vec<String>, String> {
    let paths = fs::read_dir(project_path).map_err(|e| e.to_string())?;
    let mut files: Vec<String> = paths
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .filter(|name| name.ends_with(".project"))
        .collect();
    files.sort(); // Sort by name (timestamp-based sorting)
    Ok(files)
}

#[tauri::command]
fn read_specific_file(project_path: String, file_name: String) -> Result<String, String> {
    let mut path = PathBuf::from(project_path);
    path.push(file_name);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_project_data(project_path: String, data: String, timestamp: u64) -> Result<(), String> {
    let mut path = PathBuf::from(&project_path);
    let filename = format!("main{}.project", timestamp);
    path.push(filename);

    // 1. Write the new file
    fs::write(&path, data).map_err(|e| e.to_string())?;

    // 2. Clean up old files (Keep only the 50,000 newest)
    let paths = fs::read_dir(&project_path).map_err(|e| e.to_string())?;
    let mut project_files: Vec<_> = paths
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("project"))
        .collect();

    // Sort by name (which includes timestamp)
    project_files.sort();

    // If we exceed the limit, delete the oldest ones
    let limit = 50000;
    if project_files.len() > limit {
        let to_delete = project_files.len() - limit;
        for i in 0..to_delete {
            let _ = fs::remove_file(&project_files[i]);
        }
    }

    Ok(())
}


#[tauri::command]
fn list_fonts(fonts_path: String) -> Result<Vec<String>, String> {
    let mut fonts = Vec::new();
    let path = Path::new(&fonts_path);

    if !path.exists() { return Ok(fonts); }

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let p = entry.path();
        if let Some(ext) = p.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            if ext_str == "ttf" || ext_str == "otf" {
                fonts.push(p.to_string_lossy().into_owned());
            }
        }
    }
    Ok(fonts)
}

// Function to load the last saved state of the project
#[tauri::command]
fn load_latest_project(project_path: String) -> Result<String, String> {
    let paths = fs::read_dir(project_path).map_err(|e| e.to_string())?;
    
    // Filter files ending with .project and find the one with the highest timestamp in name
    let mut project_files: Vec<_> = paths
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|s| s.to_str()) == Some("project"))
        .collect();

    project_files.sort(); // Sorts alphabetically/numerically
    
    if let Some(latest) = project_files.last() {
        fs::read_to_string(latest).map_err(|e| e.to_string())
    } else {
        Err("No project file found".into())
    }
}

#[tauri::command]
fn load_specific_project(project_path: String, file_name: String) -> Result<String, String> {
    // 1. Construct the full path: project_path/file_name
    let mut path = PathBuf::from(&project_path);
    path.push(&file_name);

    // 2. Validate that the file exists and is indeed a file
    if !path.exists() {
        return Err(format!("File not found: {}", file_name));
    }

    // 3. Read content and return as String (JSON)
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_youtube_video(project_path: String, url: String) -> Result<String, String> {
    let mut download_path = std::path::PathBuf::from(&project_path);
    download_path.push("videos");

    let output = Command::new("yt-dlp")
        .args([
            "--no-check-certificate",
            "--prefer-free-formats",
            "--add-header", "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", &format!("{}/%(title)s.%(ext)s", download_path.to_string_lossy()),
            &url,
        ])
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if output.status.success() {
        Ok("Download completed successfully".into())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("yt-dlp error: {}", err))
    }
}

#[tauri::command]
async fn import_asset(project_path: String, file_path: String) -> Result<String, String> {
    let source = PathBuf::from(&file_path);
    let filename = source.file_name().ok_or("Invalid file name")?;
    
    let mut target = PathBuf::from(&project_path);
    target.push("videos");
    target.push(filename);

    fs::copy(&source, &target).map_err(|e| e.to_string())?;
    
    Ok(filename.to_string_lossy().into_owned())
}

#[tauri::command]
fn list_assets(project_path: String) -> Result<Vec<String>, String> {
    let mut videos_path = PathBuf::from(project_path);
    videos_path.push("videos");

    let mut assets = Vec::new();
    if let Ok(entries) = fs::read_dir(videos_path) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                assets.push(entry.file_name().to_string_lossy().into_owned());
            }
        }
    }
    Ok(assets)
}



#[tauri::command]
fn list_projects(root_path: String) -> Result<Vec<Project>, String> {
    let mut projects = Vec::new();
    let paths = fs::read_dir(root_path).map_err(|e| e.to_string())?;

    for path in paths {
        if let Ok(entry) = path {
            let project_path = entry.path();
            
            if project_path.is_dir() {
                let mut latest_thumbnail = None;
                let thumb_dir = project_path.join("thumbnails");

                // Tenta ler a pasta de thumbnails
                if let Ok(thumb_entries) = fs::read_dir(thumb_dir) {
                    let mut latest_time = std::time::SystemTime::UNIX_EPOCH;

                    for thumb_entry in thumb_entries.flatten() {
                        let p = thumb_entry.path();
                        // Verifica se é um arquivo (extensões comuns de imagem)
                        if p.is_file() {
                            if let Ok(metadata) = thumb_entry.metadata() {
                                if let Ok(modified) = metadata.modified() {
                                    if modified > latest_time {
                                        latest_time = modified;
                                        latest_thumbnail = Some(p.to_string_lossy().into_owned());
                                    }
                                }
                            }
                        }
                    }
                }

                projects.push(Project {
                    name: entry.file_name().to_string_lossy().into_owned(),
                    path: project_path.to_string_lossy().into_owned(),
                    thumbnail: latest_thumbnail, // Retorna o caminho ou None
                });
            }
        }
    }
    Ok(projects)
}

#[tauri::command]
fn delete_project(path: String) -> Result<(), String> {
    let project_path = std::path::PathBuf::from(path);
    if project_path.exists() && project_path.is_dir() {
        std::fs::remove_dir_all(project_path).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Project folder not found".into())
    }
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    // We use PathBuf for consistency with other functions like 'import_asset'
    let path_buf = std::path::PathBuf::from(&path);

    // 1. Safety checks
    if !path_buf.exists() {
        return Err("File path not found".to_string());
    }

    if !path_buf.is_file() {
        return Err("The provided path is not a file".to_string());
    }

    // 2. Execute deletion
    fs::remove_file(path_buf).map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(())
}

#[command]
async fn get_duration(path: String) -> Result<VideoMetadata, String> {
    // Command: ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 path
    let output = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            &path,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let duration_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let duration = duration_str.parse::<f64>().map_err(|_| "Failed to parse duration")?;

    Ok(VideoMetadata { duration })
}




use opencv::{prelude::*, videoio, core, imgcodecs};
use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
async fn get_image_data(path: String) -> Result<String, String> {
    use std::fs;
    
    // Lê os bytes brutos da imagem
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    
    // Converte para Base64 (estou assumindo que você usa a crate base64)
    use base64::{Engine as _, engine::general_purpose};
    let b64 = general_purpose::STANDARD.encode(bytes);
    
    // Detecta a extensão para o MIME type correto
    let mime = if path.to_lowercase().ends_with(".png") { "image/png" } else { "image/jpeg" };
    
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
async fn get_video_frame(path: String, time_ms: f64) -> Result<String, String> {
    
    
    
    let mut cam = videoio::VideoCapture::from_file(&path, videoio::CAP_ANY)
        .map_err(|e| e.to_string())?;
    
    
    // Move the video seek pointer to the desired millisecond
    cam.set(videoio::CAP_PROP_POS_MSEC, time_ms).map_err(|e| e.to_string())?;
    
    let mut frame = core::Mat::default();
    if cam.read(&mut frame).map_err(|e| e.to_string())? {
        let mut buffer = core::Vector::<u8>::new();
        imgcodecs::imencode(".jpg", &frame, &mut buffer, &core::Vector::default()).map_err(|e| e.to_string())?;
        
        let b64 = general_purpose::STANDARD.encode(buffer.as_slice());
        Ok(format!("data:image/jpeg;base64,{}", b64))
    } else {
        Err("Unable to read the video frame".into())
    }
}


#[tauri::command]
fn move_file(source: String, destination: String) -> Result<String, String> {
    let src_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    // 1. Check if source file exists
    if !src_path.exists() {
        return Err("Source file does not exist".to_string());
    }

    // 2. Perform the copy and delete operation (move)
    // fs::rename is the standard way to move files
    match fs::rename(src_path, dest_path) {
        Ok(_) => Ok("File transferred successfully".to_string()),
        Err(e) => Err(format!("Failed to transfer file: {}", e)),
    }
}



#[tauri::command]
async fn extract_audio(project_path: String, file_name: String) -> Result<String, String> {
    let video_path = Path::new(&project_path).join("videos").join(&file_name);
    let output_folder = Path::new(&project_path).join("extracted_audios");
    
    // Create directory if it doesn't exist
    if !output_folder.exists() {
        fs::create_dir_all(&output_folder).map_err(|e| e.to_string())?;
    }

    // Output filename will be the same as input, but with .mp3 extension (for compatibility)
    let audio_file_name = format!("{}.mp3", Path::new(&file_name).file_stem().unwrap().to_str().unwrap());
    let output_path = output_folder.join(&audio_file_name);

    // If audio is already extracted, skip to improve performance
    if output_path.exists() {
        return Ok(audio_file_name);
    }

    // FFmpeg Command: -i (input), -vn (no video), -acodec libmp3lame (audio codec)
    let status = Command::new("ffmpeg")
        .arg("-i")
        .arg(&video_path)
        .arg("-vn")
        .arg("-acodec")
        .arg("libmp3lame")
        .arg("-q:a")
        .arg("2") // High quality setting
        .arg(&output_path)
        .output()
        .map_err(|e| e.to_string())?;

    if status.status.success() {
        Ok(audio_file_name)
    } else {
        let error = String::from_utf8_lossy(&status.stderr);
        Err(format!("Error extracting audio: {}", error))
    }
}


#[tauri::command]
async fn get_waveform_data(path: String, samples: usize) -> Result<Vec<f32>, String> {
    // Use ffmpeg to read audio and output raw data (f32)
    let output = Command::new("ffmpeg")
        .args([
            "-i", &path,
            "-ar", "8000",       // Reduce sample rate to 8kHz (sufficient for waveform visualization)
            "-ac", "1",          // Convert to Mono
            "-f", "f32le",       // Format as Float 32-bit Little Endian
            "-",                 // Direct output to stdout
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let bytes = output.stdout;
    let f32_data: Vec<f32> = bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes(chunk.try_into().unwrap()))
        .collect();

    if f32_data.is_empty() { return Ok(vec![]); }

    // Downsample the array to the desired number of 'samples' (e.g., 100 peaks per clip)
    let chunk_size = f32_data.len() / samples;
    let mut peaks = Vec::new();
    
    for chunk in f32_data.chunks(chunk_size.max(1)) {
        // Calculate the absolute peak value for the current chunk
        let max = chunk.iter().fold(0.0f32, |a, &b| a.max(b.abs()));
        peaks.push(max);
    }

    Ok(peaks)
}


#[tauri::command]
fn copy_file(source: String, destination: String) -> Result<String, String> {
    let src_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    

    // Validate if the source exists before attempting to copy
    if !src_path.exists() {
        return Err("Source file not found".to_string());
    }

    // Attempt to copy the file bytes
    // fs::copy returns the number of bytes copied on success
    match fs::copy(src_path, dest_path) {
        Ok(bytes) => Ok(format!("Successfully copied {} bytes", bytes)),
        Err(e) => Err(format!("Copy failed: {}", e)),
    }
}

#[tauri::command]
async fn transfer_folder_content(old_path: String, new_path: String) -> Result<(), String> {
    let old_dir = Path::new(&old_path);
    let new_dir = Path::new(&new_path);

    if !old_dir.exists() { return Ok(()); } // Nada para transferir

    fs::create_dir_all(new_dir).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(old_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let dest = new_dir.join(entry.file_name());
        
        // Se for o arquivo de config ou pastas de assets, movemos
        if entry.path().is_dir() {
             // Lógica simples de mover diretório
             let mut options = fs_extra::dir::CopyOptions::new();
             options.copy_inside = true;
             fs_extra::dir::move_dir(&old_dir, &new_dir, &options)
                .map_err(|err| format!("Error in moving the directory: {}", err))?;
        } else {
             fs::rename(entry.path(), dest).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn get_system_gpus() -> Vec<String> {
    // Exemplo usando detecção simples. 
    // Em produção, você pode usar a crate 'wgpu' ou 'sysinfo'
    vec!["NVIDIA GeForce RTX 3060".into(), "Intel Iris Xe Graphics".into()]
}

#[tauri::command]
async fn read_settings_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_settings_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn init_workspace_structure(path: String) -> Result<(), String> {
    let base_path = Path::new(&path);
    
    if !base_path.exists() {
        fs::create_dir_all(base_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// Mantenha o seu init_settings_structure apenas para as pastas técnicas:
#[tauri::command]
async fn init_settings_structure(path: String) -> Result<(), String> {
    let base = Path::new(&path);
    let folders = ["effects", "transitions", "fonts", "presets"];
    
    for folder in folders {
        let p = base.join(folder);
        if !p.exists() {
            fs::create_dir_all(p).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}




fn main() {
    thread::spawn(move || {
    let server = Server::http("127.0.0.1:1234").unwrap();
    for request in server.incoming_requests() {
        let url = request.url().trim_start_matches('/');
        let decoded_path = percent_encoding::percent_decode_str(url).decode_utf8_lossy().into_owned();
        let path = Path::new(&decoded_path);

        if path.exists() && path.is_file() {
            let mut file = File::open(&path).unwrap();
            let metadata = file.metadata().unwrap();
            let file_size = metadata.len();

            // Lógica de Range Header
            let range_header = request.headers().iter()
                .find(|h| h.field.as_str().to_ascii_lowercase() == "range")
                .map(|h| h.value.as_str());

            let mut response = if let Some(range) = range_header {
                // Parse range: "bytes=start-end"
                let range = range.replace("bytes=", "");
                let parts: Vec<&str> = range.split('-').collect();
                let start = parts[0].parse::<u64>().unwrap_or(0);
                let end = if parts.len() > 1 && !parts[1].is_empty() {
                    parts[1].parse::<u64>().unwrap_or(file_size - 1)
                } else {
                    file_size - 1
                };

                let length = end - start + 1;
                file.seek(SeekFrom::Start(start)).unwrap();
                let mut buffer = vec![0; length as usize];
                file.read_exact(&mut buffer).unwrap();

                let mut res = Response::from_data(buffer).with_status_code(206);
                res.add_header(Header::from_bytes(&b"Content-Range"[..], 
                    format!("bytes {}-{}/{}", start, end, file_size).as_bytes()).unwrap());
                res
            } else {
                let mut buffer = Vec::new();
                file.read_to_end(&mut buffer).unwrap();
                Response::from_data(buffer).with_status_code(200)
            };

            // Headers Obrigatórios
            response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"audio/mpeg"[..]).unwrap());
            response.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin\""[..], &b"*"[..]).unwrap());
            response.add_header(Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap());

            let _ = request.respond(response);
        } else {
            let _ = request.respond(Response::from_string("Not Found").with_status_code(404));
        }
    }
});

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init()) // Dialog plugin for system file pickers
        // Custom protocol for serving local video files with range-request support
        .manage(ExportState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            list_projects, 
            delete_project, 
            import_asset, 
            list_assets, 
            download_youtube_video, 
            load_latest_project, 
            save_project_data,
            list_project_files, 
            read_specific_file, 
            load_specific_project, 
            rename_file, 
            get_duration, 
            generate_thumbnail, 
            delete_file, 
            get_video_frame, 
            extract_audio, 
            get_waveform_data,
            export_video,
            cancel_export,
            move_file,
            copy_file,
            load_project_config,
            save_project_config,
            create_project_setup,
            get_asset_dimensions,
            get_system_gpus, 
            read_settings_file, 
            save_settings_file,
            init_settings_structure,
            init_workspace_structure,
            transfer_folder_content,
            list_fonts,
            get_image_data,
            check_notifications
           
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}