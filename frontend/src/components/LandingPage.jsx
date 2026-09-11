import React from 'react';
import ScrambleText from './ScrambleText';
import ScrollTextHighlight from './ScrollTextHighlight';
import { 
  UilMapPin, 
  UilShieldExclamation, 
  UilCamera, 
  UilSync, 
  UilCar, 
  UilChartLine, 
  UilArrowRight, 
  UilBus, 
  UilCheckCircle,
  UilCompass
} from '@iconscout/react-unicons';

const FEATURE_CARDS = [
  {
    id: 'gis',
    title: 'Live GIS Observations',
    icon: UilMapPin,
    badge: 'Spatial Intelligence',
    description: 'Geographic visualization of physical road observations, traffic density, and edge sensor telemetry on Leaflet interactive map.',
  },
  {
    id: 'detection',
    title: 'Road & Safety Detection',
    icon: UilShieldExclamation,
    badge: 'Perception Core',
    description: 'Multi-category road defect observations including potholes, waterlogging hazards, and VRU safety risks.',
  },
  {
    id: 'incidents',
    title: 'Incident Monitoring',
    icon: UilCamera,
    badge: 'ANPR Stream',
    description: 'Automated ANPR violation feeds, license plate recognition confidence, and evidence clip inspection.',
  },
  {
    id: 'lifecycle',
    title: 'Lifecycle & Verification',
    icon: UilSync,
    badge: 'Defect Workflow',
    description: 'Structured observation lifecycle tracking from edge detection through verification and resolution.',
  },
  {
    id: 'traffic',
    title: 'Traffic & Vehicle Density',
    icon: UilCar,
    badge: 'Flow Telemetry',
    description: 'Segment-level vehicle count telemetry, congestion level classification, and urban traffic metrics.',
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    icon: UilChartLine,
    badge: 'Executive Dashboard',
    description: 'Comprehensive perception charts, operational priority queues, and spatial hotspot analysis.',
  },
];

export default function LandingPage({ onEnterDashboard }) {
  return (
    <div className="min-h-screen bg-[#FFFFF0] text-[#1e293b] bg-dot-pattern flex flex-col justify-between selection:bg-[#334155] selection:text-white">
      {/* ── Landing Header / Top Branding Bar ── */}
      <header className="px-6 py-5 border-b border-[#334155]/15 flex items-center justify-between liquid-glass sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e293b] text-[#FFFFF0] flex items-center justify-center shadow-md">
            <UilBus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-[#1e293b] uppercase">
                TransitEye
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#334155] text-[#FFFFF0]">
                SIH 2026
              </span>
            </div>
            <p className="text-xs text-[#334155] font-medium hidden sm:block">
              City-Wide Mobile AI Perception Platform
            </p>
          </div>
        </div>

        <button
          onClick={onEnterDashboard}
          className="liquid-glass text-[#1e293b] hover:bg-[#1e293b] hover:text-[#FFFFF0] border border-[#334155]/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
        >
          <span>Check Main Map & Telemetry</span>
          <UilArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </header>

      {/* ── Main Landing Hero Section ── */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-16 flex-1 w-full">
        {/* Hero Banner */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#334155]/10 text-[#334155] text-xs font-bold border border-[#334155]/20">
            <UilCompass className="w-3.5 h-3.5 text-[#334155]" />
            <span>Next-Generation Municipal Surveillance</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-[#1e293b] tracking-tight leading-tight">
            <ScrambleText text="TransitEye" autoRun={true} speed={25} />
          </h1>

          <p className="text-lg md:text-xl font-medium text-[#334155] tracking-wide italic">
            “Every Bus. A Mobile AI Sensor for the City.”
          </p>

          <p className="text-sm md:text-base text-[#334155]/90 leading-relaxed font-normal max-w-2xl mx-auto">
            TransitEye transforms existing public transportation fleets into mobile sensing nodes for real-time urban observation. By capturing continuous GIS telemetry across city corridors, TransitEye surfaces road defect observations, waterlogging alerts, vulnerable road user (VRU) hazards, ANPR traffic violations, and segment congestion levels directly to city planners.
          </p>

          {/* Primary Hero CTA */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={onEnterDashboard}
              className="bg-[#1e293b] text-[#FFFFF0] hover:bg-[#334155] px-8 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer"
            >
              <span>Check Main Map & Telemetry</span>
              <UilArrowRight className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        </section>

        {/* ── 6 Feature Cards Section with Subtle Hover Zoom Interaction ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold uppercase tracking-wider text-[#1e293b]">
              <ScrambleText text="Core System Capabilities" />
            </h2>
            <p className="text-xs text-[#334155] max-w-md mx-auto">
              Explore the six observation modules powering TransitEye edge perception.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {FEATURE_CARDS.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="liquid-glass rounded-2xl p-6 border border-[#334155]/20 hover:border-[#1e293b]/40 hover:shadow-lg hover:scale-[1.03] transition-all duration-200 ease-out flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-[#1e293b] text-[#FFFFF0] shadow-xs">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#334155]/10 text-[#334155] border border-[#334155]/15">
                        {feature.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#1e293b] mb-2">
                      <ScrambleText text={feature.title} />
                    </h3>

                    <ScrollTextHighlight
                      text={feature.description}
                      className="text-xs text-[#334155] leading-relaxed"
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#334155]/10 flex items-center gap-1.5 text-[11px] text-[#334155] font-bold">
                    <UilCheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>Active Telemetry Module</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#334155]/15 py-6 px-6 bg-[#FFFFF0]/90 text-xs text-[#334155]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-[#1e293b]">Team Name: [INSERT TEAM NAME]</p>
            <p className="text-[#334155]/80">Developers: [INSERT DEVELOPER NAMES]</p>
          </div>
          <div className="text-center sm:text-right text-[11px] text-[#334155]/80">
            <p>TransitEye Municipal Urban Intelligence © 2026</p>
            <p>Smart India Hackathon (SIH) 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
