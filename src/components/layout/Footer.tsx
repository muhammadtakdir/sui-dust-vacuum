"use client";

import { motion } from "framer-motion";
import { Github, Twitter, ExternalLink, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-sui-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-bold text-xl gradient-text mb-2">Sui Dust Vacuum</h3>
            <p className="text-sui-muted text-sm mb-4">
              Clean your Sui wallet by swapping dust tokens into SUI. 
              Sui Dust Vacuum
            </p>
            <div className="flex gap-4">
              <SocialLink href="https://github.com/yourusername/sui-dust-vacuum" icon={<Github />} />
              <SocialLink href="https://twitter.com/yourhandle" icon={<Twitter />} />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <FooterLink href="https://sui.io" text="Sui Network" />
              <FooterLink href="https://cetus.zone" text="Cetus Protocol" />
              <FooterLink href="https://docs.sui.io" text="Sui Docs" />
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Project</h4>
            <ul className="space-y-2">
              <FooterLink href="#features" text="Features" internal />
              <FooterLink href="#how-it-works" text="How it Works" internal />
              <FooterLink href="/AI_DISCLOSURE.md" text="AI Disclosure" internal />
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-sui-border flex flex-col md:flex-row justify-between items-center gap-4">
          <motion.p
            className="text-sui-muted text-sm flex items-center gap-1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Sui Dust Vacuum
          </motion.p>

          <div className="flex items-center gap-4 text-sm text-sui-muted">
            <span>Powered by</span>
            <a
              href="https://cetus.zone"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sui-blue hover:underline flex items-center gap-1"
            >
              Cetus <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 bg-sui-card border border-sui-border rounded-xl flex items-center justify-center text-sui-muted hover:text-sui-blue hover:border-sui-blue transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
    </motion.a>
  );
}

function FooterLink({ href, text, internal }: { href: string; text: string; internal?: boolean }) {
  const linkProps = internal ? {} : { target: "_blank", rel: "noopener noreferrer" };
  
  return (
    <li>
      <a
        href={href}
        {...linkProps}
        className="text-sui-muted hover:text-sui-blue transition-colors text-sm flex items-center gap-1"
      >
        {text}
        {!internal && <ExternalLink className="w-3 h-3" />}
      </a>
    </li>
  );
}
