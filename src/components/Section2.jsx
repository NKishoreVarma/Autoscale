import React from 'react';
import { 
  MessageSquare, 
  PhoneCall, 
  TrendingUp, 
  Cpu, 
  HelpCircle, 
  Calendar, 
  MessageCircle, 
  GitBranch 
} from 'lucide-react';

const SERVICES = [
  { title: "WhatsApp AI", icon: MessageSquare },
  { title: "Voice Agents", icon: PhoneCall },
  { title: "Lead Generation", icon: TrendingUp },
  { title: "CRM Automation", icon: Cpu },
  { title: "Customer Support", icon: HelpCircle },
  { title: "Appointment Booking", icon: Calendar },
  { title: "AI Chatbots", icon: MessageCircle },
  { title: "Sales Pipelines", icon: GitBranch }
];

export default function Section2() {
  const handleOpenModal = (service) => {
    window.dispatchEvent(new CustomEvent('open-lead-modal', {
      detail: { service, message: `Inquiry about ${service} System.` }
    }));
  };

  return (
    <section id="automate-selector" className="section-container relative w-full bg-transparent border-t border-white/10 overflow-hidden flex flex-col items-center">
      
      {/* Soft background aura glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none w-[500px] h-[500px] rounded-full filter blur-[35px] opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle, #5E0ED7 0%, #7C3AED 40%, transparent 70%)',
          transform: 'translate(-50%, -50%) translateZ(0)',
          willChange: 'transform'
        }}
      />

      <div className="w-full flex flex-col items-center">
        {/* Eyebrow */}
        <span className="text-[10px] md:text-[11px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase mb-4 text-center">
          SYSTEM SELECTION
        </span>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-normal leading-[1.1] text-white uppercase tracking-tight text-center max-w-2xl mb-12 md:mb-16">
          HOW WE BUILD REVENUE SYSTEMS
        </h2>

        {/* Orbit Responsive Container */}
        <div className="relative w-full max-w-[800px] aspect-square flex items-center justify-center scale-[0.45] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 transition-transform duration-300 origin-center my-[-180px] sm:my-[-120px] md:my-[-60px] lg:my-0">
          
          {/* Center Circle Content */}
          <div className="absolute z-20 pointer-events-auto">
            <div className="orbit-center">
              <span>AI SYSTEMS</span>
              <h3>AUTOSCALE</h3>
              <p>Automate. Optimize. Scale.</p>
            </div>
          </div>

          {/* SVG Orbit Track Rings */}
          <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none z-0" />
          
          {/* Main rotating orbit ring (GPU CSS animated) */}
          <div className="absolute w-[600px] h-[600px] rounded-full z-10 orbit-ring-animated">
            {SERVICES.map((service, idx) => {
              const angle = (idx * 360) / SERVICES.length;
              const Icon = service.icon;
              return (
                <div
                  key={idx}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translate(300px) rotate(-${angle}deg)`,
                  }}
                >
                  {/* GPU CSS counter-rotation keeps cards horizontal */}
                  <div className="pointer-events-auto orbit-card-counter-animated">
                    <div 
                      className="service-orbit-card cursor-target cursor-pointer group"
                      onClick={() => handleOpenModal(service.title)}
                    >
                      <Icon className="w-[18px] h-[18px] text-gray-400 group-hover:text-white transition-colors duration-300" />
                      <span className="whitespace-nowrap">{service.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
