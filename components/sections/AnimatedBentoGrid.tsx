"use client";

import { motion } from "framer-motion";
import { TERMINAL_MEMBERS, TERMINAL_PROJECTS } from "@/constants/terminalData";
import { GlowBadge } from "@/components/ui/GlowBadge";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

/**
 * AnimatedBentoGrid — Replaces the old terminal parallax.
 * Displays members and projects in a sleek, glassmorphic bento layout.
 */
export function AnimatedBentoGrid() {
  const topMembers = TERMINAL_MEMBERS.slice(0, 4);
  const topProjects = TERMINAL_PROJECTS.slice(0, 3);

  return (
    <section className="px-6 py-24 md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]"
        >
          {/* Members Card - spans 2 columns */}
          <motion.div
            custom={0}
            variants={fadeUp}
            className="md:col-span-2 glass-panel rounded-3xl p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity duration-700">
              <div className="h-40 w-40 rounded-full bg-accent blur-[64px]" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div>
                <GlowBadge label="TOP MEMBERS" variant="experimental" />
                <h3 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white">
                  Meet The Collective
                </h3>
                <p className="mt-2 text-sm text-text-muted max-w-md">
                  Our top contributors shaping the future of DevNation.
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-4">
                {topMembers.map((member) => (
                  <div key={member.handle} className="flex items-center gap-3 bg-surface-3/50 backdrop-blur-md rounded-full pl-2 pr-4 py-2 border border-white/5">
                    <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center font-heading text-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white leading-none">{member.name}</span>
                      <span className="text-[10px] text-text-muted mt-1">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            custom={1}
            variants={fadeUp}
            className="glass-card rounded-3xl p-8 relative flex flex-col justify-center items-center text-center"
          >
            <div className="text-6xl font-heading font-bold text-gradient mb-2">1,024+</div>
            <div className="text-sm font-body font-medium text-text-muted uppercase tracking-widest">Total Commits</div>
          </motion.div>

          {/* Projects Card - spans all columns or remaining */}
          <motion.div
            custom={2}
            variants={fadeUp}
            className="md:col-span-3 glass-panel rounded-3xl p-8 relative overflow-hidden"
          >
            <div className="absolute bottom-0 left-1/4 h-32 w-full bg-gradient-to-t from-accent/10 to-transparent" />
            <div className="flex flex-col md:flex-row gap-8 relative z-10 h-full">
              <div className="md:w-1/3 flex flex-col justify-center">
                <GlowBadge label="ARCHIVE" variant="stable" className="w-fit" />
                <h3 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white">
                  Active Projects
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Discover the tools and systems built by our community.
                </p>
              </div>
              <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {topProjects.map((project) => (
                  <div key={project.name} className="bg-surface-2/50 border border-white/5 rounded-2xl p-5 hover:bg-surface-3/50 transition-colors">
                    <h4 className="font-heading text-lg font-bold text-white mb-2">{project.name}</h4>
                    <p className="text-xs text-text-muted line-clamp-3 mb-4">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {project.tech.slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] px-2 py-1 rounded bg-surface border border-border text-text-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

