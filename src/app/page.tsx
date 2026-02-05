"use client";

import { Header } from "@/components/layout/Header";
import { DustVacuum } from "@/components/dust/DustVacuum";
import { HeroSection } from "@/components/layout/HeroSection";
import { Features } from "@/components/layout/Features";
import { Footer } from "@/components/layout/Footer";
import { BackgroundEffects } from "@/components/effects/BackgroundEffects";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <BackgroundEffects />
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <DustVacuum />
        <Features />
        <Footer />
      </div>
    </main>
  );
}
