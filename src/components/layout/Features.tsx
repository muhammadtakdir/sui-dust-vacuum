"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Wallet, RefreshCw, DollarSign, Sparkles } from "lucide-react";

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "One-Click Vacuum",
    description: "Select your dust tokens and swap them all into SUI with a single transaction.",
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Non-Custodial",
    description: "Your tokens never leave your wallet. All swaps happen directly through PTB.",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: <Wallet className="w-6 h-6" />,
    title: "Clean Wallet",
    description: "Get rid of those annoying small balances cluttering your portfolio view.",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    icon: <RefreshCw className="w-6 h-6" />,
    title: "Best Rates",
    description: "Powered by Cetus Aggregator to find the optimal swap routes.",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: "Recover Value",
    description: "Turn your forgotten dust into usable SUI that can pay for gas fees.",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Satisfying UX",
    description: "Enjoy watching your dust get vacuumed up with smooth animations.",
    gradient: "from-pink-400 to-rose-500",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Use <span className="gradient-text">Dust Vacuum</span>?
          </h2>
          <p className="text-sui-muted max-w-2xl mx-auto">
            Stop ignoring those tiny token balances. Turn them into something useful!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="card card-hover group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sui-muted text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <motion.div
          id="how-it-works"
          className="mt-24"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It <span className="gradient-text">Works</span>
          </h2>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sui-blue/30 to-transparent" />

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: 1, title: "Connect Wallet", desc: "Link your Sui wallet" },
                { step: 2, title: "Detect Dust", desc: "We scan for small balances" },
                { step: 3, title: "Select Tokens", desc: "Choose what to vacuum" },
                { step: 4, title: "Vacuum!", desc: "One tx, all SUI" },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  className="relative text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                >
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 bg-sui-gradient rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto">
                      {item.step}
                    </div>
                    <motion.div
                      className="absolute inset-0 bg-sui-gradient rounded-full blur-xl opacity-30"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.5, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.5,
                      }}
                    />
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sui-muted text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
