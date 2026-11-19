'use client';

import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative" aria-label="Dashboard hero">
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-2 mb-5"
      >
        <div
          className="w-px h-3 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
        <span className="label" style={{ color: 'var(--accent)', letterSpacing: '0.14em' }}>
          MH AI OS
        </span>
      </motion.div>

      {/* Main headline — responsive, never clips */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        className="hero-headline"
        style={{ color: 'var(--text-primary)' }}
      >
        Build.{' '}
        <span className="gradient-text">Think.</span>
        {' '}Operate.
      </motion.h1>

      {/* Supporting line */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 text-sm md:text-base max-w-md leading-relaxed"
        style={{ color: 'var(--text-tertiary)' }}
      >
        One intelligent workspace — business, software, research, college.
      </motion.p>
    </section>
  );
}
