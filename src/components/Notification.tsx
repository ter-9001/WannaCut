import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { X, ExternalLink, BellOff, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

// Interface para que o App.tsx possa controlar o modal
export interface NotificationsRef {
  toggle: () => void;
}

// Interface para as propriedades (Props) do componente
interface NotificationsProps {
  onNewNotifications?: (hasMsgs: boolean) => void;
}

const Notifications = forwardRef<NotificationsRef, NotificationsProps>(({ onNewNotifications }, ref) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Expõe o método toggle para ser chamado via Ref pelo App.tsx
  useImperativeHandle(ref, () => ({
    toggle: () => {
      setIsOpen(!isOpen);
    }
  }));

  useEffect(() => {
    const settingsFolder = localStorage.getItem("wannacut_settings_folder");
    
    if (settingsFolder) {
      // Chama o comando Rust enviando o caminho da pasta de settings
      invoke('check_notifications', { settingsPath: settingsFolder })
        .then((msgs: any) => {
          setNotifications(msgs);
          // Se houver mensagens, avisamos o componente pai para mostrar o alerta (badge)
          if (msgs.length > 0 && onNewNotifications) {
            onNewNotifications(true);
          }
        })
        .catch(err => console.error("WannaCut Notification Error:", err));
    }
  }, [onNewNotifications]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Blur no fundo estilo Backrooms/Cyberpunk) */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 50 }}
            className="fixed top-16 right-6 w-[400px] bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] overflow-hidden"
          >
            {/* Header com estilo industrial */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/10 p-1.5 rounded">
                    <Zap size={14} className="text-cyan-400" />
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    System Feed
                </h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-white/10 rounded-md text-zinc-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista de Notificações */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-zinc-950 to-zinc-900/20">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <BellOff size={40} strokeWidth={1} />
                  <p className="text-[10px] mt-4 uppercase tracking-[0.3em] font-mono">No incoming signals</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                    <motion.div 
                        key={n.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        // Adicionei 'relative' aqui para que o ping absoluto se oriente por este card
                        className="relative group bg-white/[0.02] border border-white/5 p-4 rounded-xl hover:border-cyan-500/30 transition-all hover:bg-white/[0.04]"
                    >
                        {/* PING PARA UPDATES - Posicionado no canto superior direito */}
                        {n.type_ === 'update' && (
                        <div className="absolute top-3 right-3 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </div>
                        )}

                        {n.image && (
                        <div className="relative overflow-hidden rounded-lg mb-3 h-32">
                            <img 
                                src={n.image} 
                                alt="" 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
                        </div>
                        )}
                        
                        <h3 className="text-cyan-400 font-bold text-sm mb-1 group-hover:text-cyan-300 transition-colors pr-4">
                            {n.title}
                        </h3>
                        
                        <p className="text-zinc-400 text-[11px] leading-relaxed font-medium">
                        {n.description}
                        </p>
                        
                        {n.link && (
                        <a 
                            href={n.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 mt-4 text-[9px] text-zinc-500 hover:text-white uppercase font-black tracking-widest transition-all hover:gap-3"
                        >
                            {n.link_text ? n.link_text : 'Access'} <ExternalLink size={10} />
                        </a>
                        )}
                    </motion.div>
                    ))
                                )}
            </div>

            {/* Footer / Identificador do App */}
            <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between px-6">
              <span className="text-[7px] text-zinc-600 uppercase tracking-[0.5em] font-mono">
                Wannacut.OS // v.0.9 Beta
              </span>
              
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default Notifications;