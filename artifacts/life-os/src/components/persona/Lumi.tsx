import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export type LumiEmotion = "idle" | "happy" | "excited" | "proud" | "thoughtful" | "encouraging" | "warning";

interface LumiProps {
  emotion?: LumiEmotion;
  className?: string;
  size?: number;
}

export function Lumi({ emotion = "idle", className = "", size = 64 }: LumiProps) {
  const [sparkles, setSparkles] = useState<number[]>([]);

  useEffect(() => {
    if (emotion === "excited" || emotion === "proud") {
      const newSparkles = Array.from({ length: 5 }).map((_, i) => i);
      setSparkles(newSparkles);
      const timer = setTimeout(() => setSparkles([]), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [emotion]);

  const variants: any = {
    idle: {
      y: ["-8px", "8px"],
      scale: [1, 1.02, 1],
      transition: {
        y: { duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
        scale: { duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
      }
    },
    excited: {
      y: ["0px", "-20px", "0px"],
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
    },
    happy: {
      y: ["-10px", "10px"],
      rotate: [-5, 5],
      transition: { duration: 2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
    },
    thoughtful: {
      y: ["0px", "-5px"],
      x: ["0px", "5px"],
      transition: { duration: 2.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
    },
    warning: {
      x: ["-2px", "2px"],
      transition: { duration: 0.1, repeat: Infinity, repeatType: "mirror" }
    },
    proud: {
      scale: [1, 1.15, 1.05],
      y: ["0px", "-15px"],
      transition: { duration: 1.5, repeat: Infinity, repeatType: "mirror", ease: "easeOut" }
    },
    encouraging: {
      y: ["-5px", "5px"],
      scale: [1, 1.05],
      transition: { duration: 1.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
    }
  };

  const colors = {
    idle: "rgba(108, 99, 255, 0.8)", // Primary
    happy: "rgba(16, 185, 129, 0.8)", // Success
    excited: "rgba(245, 158, 11, 0.8)", // XP/Gold
    proud: "rgba(139, 92, 246, 0.9)", // Accent
    thoughtful: "rgba(160, 174, 192, 0.8)", // Muted
    warning: "rgba(244, 63, 94, 0.8)", // Destructive
    encouraging: "rgba(108, 99, 255, 0.9)", // Primary
  };

  const eyeY = emotion === "thoughtful" ? -2 : emotion === "excited" ? -4 : 0;
  const eyeScaleY = emotion === "happy" || emotion === "proud" ? 0.3 : 1;

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      variants={variants}
      animate={emotion}
    >
      {/* Glow / Halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors[emotion]} 0%, rgba(0,0,0,0) 70%)`,
          filter: "blur(8px)",
        }}
        animate={{ opacity: [0.6, 0.8, 0.6], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Orb Body */}
      <div 
        className="absolute inset-2 rounded-full backdrop-blur-md border border-white/20 shadow-inner"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, ${colors[emotion]} 50%, rgba(0,0,0,0.4) 100%)`,
        }}
      >
        {/* Face */}
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {/* Left Eye */}
          <motion.div 
            className="w-2 h-3 bg-white rounded-full"
            animate={{ y: eyeY, scaleY: eyeScaleY }}
          />
          {/* Right Eye */}
          <motion.div 
            className="w-2 h-3 bg-white rounded-full"
            animate={{ y: eyeY, scaleY: eyeScaleY }}
          />
        </div>
      </div>

      {/* Sparkles */}
      <AnimatePresence>
        {sparkles.map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0, 1, 0],
              x: (Math.random() - 0.5) * 60,
              y: (Math.random() - 0.5) * 60,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full"
            style={{ boxShadow: "0 0 5px #fbbf24" }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
