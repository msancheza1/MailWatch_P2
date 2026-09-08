import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { api } from "../api/axios";

import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";

interface Stats {
  emailsAnalyzed: number;
  threatsBlocked: number;
  quarantine: number;
  protectionLevel: string;
}

export default function Dashboard() {
  const sidebarRef = useRef<HTMLDivElement>(null);

  const headerRef = useRef<HTMLDivElement>(null);

  const cardsRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api
      .get("/dashboard/stats")

      .then((response) => {
        setStats(response.data);
      })

      .catch((error) => {
        console.error("Error cargando estadísticas:", error);
      });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = Array.from(cardsRef.current?.children ?? []);

      gsap.from(sidebarRef.current, {
        x: -100,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      gsap.from(headerRef.current, {
        y: -50,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: "power3.out",
      });

      gsap.from(cards, {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        delay: 0.4,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#eef3ff]">
      <div ref={sidebarRef}>
        <Sidebar />
      </div>

      <main className="flex-1 p-10">
        <section
          ref={headerRef}
          className="mb-8 rounded-3xl bg-blue-600 p-8 text-white"
        >
          <p className="text-sm opacity-80">MARTES, 8 DE SEPTIEMBRE DE 2026</p>

          <h1 className="mt-3 text-4xl font-bold">Hola, Ana 👋</h1>

          <p className="mt-3">🟢 Tu correo está protegido — todo se ve bien</p>
        </section>

        <section ref={cardsRef} className="grid grid-cols-4 gap-6">
          <StatCard
            title="Correos analizados"

            value={stats?.emailsAnalyzed ?? 0}

            color="bg-blue-600"
          />

          <StatCard
            title="Amenazas bloqueadas"

            value={stats?.threatsBlocked ?? 0}

            color="bg-red-500"
          />

          <StatCard
            title="En cuarentena"

            value={stats?.quarantine ?? 0}

            color="bg-orange-400"
          />

          <StatCard
            title="Nivel de protección"

            value={stats?.protectionLevel ?? "-"}

            color="bg-emerald-500"
          />
        </section>
      </main>
    </div>
  );
}
