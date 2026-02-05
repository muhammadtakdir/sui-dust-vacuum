"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface VacuumEffectProps {
  isActive: boolean;
  targetPosition?: { x: number; y: number };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

export function VacuumEffect({ isActive, targetPosition }: VacuumEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const generateParticles = useCallback(() => {
    const colors = ["#4DA2FF", "#6366F1", "#F59E0B", "#22C55E", "#EF4444"];
    const newParticles: Particle[] = [];

    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: Math.random() * 300 - 150,
        y: Math.random() * 300 - 150,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
      });
    }

    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (isActive) {
      generateParticles();
      const interval = setInterval(generateParticles, 2000);
      return () => clearInterval(interval);
    }
  }, [isActive, generateParticles]);

  const target = targetPosition || { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Vacuum center glow */}
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <motion.div
              className="w-32 h-32 rounded-full bg-sui-gradient blur-2xl"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Particles being vacuumed */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 10px ${particle.color}`,
              }}
              initial={{
                x: particle.x + window.innerWidth / 2,
                y: particle.y + window.innerHeight / 2,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                x: target.x || window.innerWidth / 2,
                y: target.y || window.innerHeight / 2,
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 1.5,
                ease: "easeIn",
              }}
            />
          ))}

          {/* Swirl effect */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <motion.div
                key={angle}
                className="absolute w-2 h-16 bg-gradient-to-t from-sui-blue to-transparent rounded-full"
                style={{
                  transformOrigin: "50% 100%",
                  transform: `rotate(${angle}deg) translateY(-40px)`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: angle / 360,
                }}
              />
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
