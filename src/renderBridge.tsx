
export interface RenderEngineContext {
  time: number;
  projectConfig: any;
  currentProjectPath: string;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.OrthographicCamera | null>;
  topClips: React.MutableRefObject<any[]>;
  groupsRef: React.MutableRefObject<Map<string, THREE.Group>>;
  getInterpolatedValueWithFades: (time: number, clip: any, prop: string) => any;
  invoke: any; // Função invoke do Tauri
  topAudios: React.MutableRefObject<any[]>;


}

export async function getDrawFrameFunction() {
  try {
    // Tenta importar dinamicamente o arquivo que está no submódulo privado
    // O caminho deve apontar para onde o submódulo foi montado
    const module = await import("./engine_core/previewRender");
    return module.drawFrame;
  } catch (e) {
    console.warn("WannaCut: Motor Pro não encontrado. Usando renderização básica.");
    
    // FALLBACK: Uma versão ultra simples para o repositório público não quebrar
    return async (ctx: RenderEngineContext) => {
      const { rendererRef, sceneRef, cameraRef } = ctx;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Apenas renderiza a cena atual (vazia ou estática)
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
  }
}