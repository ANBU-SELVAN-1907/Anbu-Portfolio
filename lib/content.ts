export type Entry = {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  description: string;
  tags: string;
  problem: string;
  process: string;
  outcome: string;
  image: string;
  link: string;
  code: string;
  visible: boolean;
};
export type Content = {
  profile: Record<string, string>;
  sections: Record<string, boolean>;
  projects: Entry[];
  experience: Entry[];
  education: Entry[];
  skills: Entry[];
  testimonials: Entry[];
  certifications: Entry[];
  faq?: Entry[];
  gallery?: Entry[];
  customSections?: Entry[];
  settings: Record<string, string>;
};
export const entry = (v: Partial<Entry>): Entry => ({
  id: v.id ?? crypto.randomUUID(),
  title: "",
  subtitle: "",
  period: "",
  description: "",
  tags: "",
  problem: "",
  process: "",
  outcome: "",
  image: "",
  link: "",
  code: "",
  visible: true,
  ...v,
});
export const initialContent: Content = {
  profile: {
    name: "Anbu Selvan T",
    surname: "",
    role: "AI & Embedded Systems Engineer",
    eyebrow: "INTELLIGENCE, ENGINEERED.",
    headline: "Bridging intelligence.\nBuilding possibilities.",
    intro:
      "I build AI applications and connected systems that turn complex ideas into useful, real-world experiences.",
    bio: "I'm Anbu, an AI & Data Science undergraduate based in Chennai. My work lives at the intersection of intelligent software and the physical world — from agents that understand codebases to voice assistants running on edge hardware.",
    journey:
      "Through my internship at Deloitte and research with IIT Ropar's CPS Lab, I'm developing hands-on experience in agentic AI, embedded systems, and the connections between them.",
    personality:
      "What drives me? Understanding how things work, then finding a better way to build them.",
    email: "anbu.t80555@gmail.com",
    phone: "+91 73059 78207",
    location: "Chennai, India",
    timezone: "Asia/Kolkata · UTC +05:30",
    linkedin: "https://www.linkedin.com/in/anbu-selvan-t-2a1238324/",
    github: "https://github.com/ANBU-SELVAN-1907",
    photo: "",
    resume: "/api/resume",
    availability: "Let's build something meaningful",
    contactTitle: "Have an idea?\nLet's make it real.",
    contactText:
      "Exploring an AI application, an embedded system, or an opportunity to collaborate? I'd love to hear about it.",
  },
  sections: {
    about: true,
    projects: true,
    skills: true,
    experience: true,
    education: true,
    testimonials: false,
    certifications: false,
    contact: true,
  },
  projects: [
    entry({
      id: "discovery",
      title: "Application Discovery Agent",
      subtitle: "Making complex codebases understandable.",
      period: "Jun — Aug 2026",
      description:
        "An application discovery pipeline built for enterprise architecture analysis during my Deloitte internship.",
      tags: "Agentic AI, Architecture discovery, Compliance",
      problem:
        "Enterprise codebases hold dependencies, API boundaries, and security considerations that are difficult to map manually.",
      process:
        "Independently designed a pipeline from code-pattern parsing to compliance reports and topology blueprints. Applied foundational multi-agent orchestration to structure the discovery workflow.",
      outcome:
        "Generated dependency maps, logical API endpoints, security-posture reports, and topology blueprints directly from source code.",
    }),
    entry({
      id: "jarvis",
      title: "Jarvis AI Voice Assistant",
      subtitle: "A conversation beyond the screen.",
      period: "Jun — Sep 2025",
      description:
        "A real-time conversational AI assistant running on Raspberry Pi 3B+.",
      tags: "Raspberry Pi, LiveKit, Google Gemini, STT / TTS",
      problem:
        "Bring natural conversational interaction to resource-constrained edge hardware.",
      process:
        "Integrated LiveKit Agent with Gemini Cloud LLM and implemented speech-to-text and text-to-speech pipelines.",
      outcome:
        "Enabled real-time voice interaction and natural dialogue on Raspberry Pi 3B+.",
    }),
    entry({
      id: "air",
      title: "Real-Time Air Quality Monitor",
      subtitle: "Listening to the world around us.",
      period: "Jan — Feb 2026",
      description:
        "Connected environmental sensing with weather context for more informed predictions.",
      tags: "STM32, ESP32, Raspberry Pi, Windy",
      problem:
        "Environmental readings need timely acquisition and weather context to become useful insights.",
      process:
        "Developed high-frequency sensor acquisition with STM32, ESP32, and Raspberry Pi. Integrated the Windy weather platform.",
      outcome:
        "Combined live air quality readings with weather forecasts in one monitoring system.",
    }),
  ],
  experience: [
    entry({
      id: "deloitte",
      title: "Deloitte Touche Tohmatsu India LLP",
      subtitle: "AI Engineering & Data Intern",
      period: "Jun — Sep 2026",
      description:
        "Technology & Transformation · T. Nagar, Chennai. Designed and built an application discovery agent to automate enterprise codebase architecture analysis.",
    }),
    entry({
      id: "iit",
      title: "Indian Institute of Technology Ropar",
      subtitle: "Undergraduate Intern · CPS Lab",
      period: "Feb 2026 — Present",
      description:
        "HITS Campus, Chennai. Contributing to the design and integration of AI-driven IoT and robotics systems for ongoing research initiatives.",
    }),
    entry({
      id: "aws",
      title: "AWS Cloud Club · HITS",
      subtitle: "Technical Team Member",
      period: "Feb 2026 — Present",
      description:
        "Coordinating technical stack decisions and initiatives with the campus technical team.",
    }),
  ],
  education: [
    entry({
      id: "hits",
      title: "Hindustan Institute of Technology and Science",
      subtitle: "B.Tech · CSE — Artificial Intelligence and Data Science",
      period: "2024 — 2028 (Expected)",
      description: "Chennai · CGPA 8.38/10 through 4th semester.",
    }),
    entry({
      id: "school",
      title: "Velammal Vidhyashram",
      subtitle: "12th Grade · MPCC",
      period: "2024",
      description: "Chennai · 75%",
    }),
  ],
  skills: [
    entry({
      id: "ai",
      title: "Agentic AI & LLMs",
      tags: "CrewAI, LangGraph, LangChain, Claude Sonnet, Google Gemini",
      description:
        "Multi-agent fundamentals, LLM applications, code discovery, and compliance analysis.",
    }),
    entry({
      id: "hardware",
      title: "Embedded & IoT",
      tags: "STM32, ESP32, Raspberry Pi, Linux, Edge AI",
      description:
        "Real-time data acquisition, IoT electronics, robotics, and automation.",
    }),
    entry({
      id: "backend",
      title: "Backend & Cloud",
      tags: "Python, FastAPI, REST APIs, AWS EC2, Lambda, Bedrock, S3, IAM",
      description:
        "API integration, cloud fundamentals, and practical application development.",
    }),
    entry({
      id: "voice",
      title: "Voice & Collaboration",
      tags: "LiveKit, STT, TTS, Voice recognition, Project leadership",
      description:
        "Conversational interfaces and collaborative technical decision-making.",
    }),
  ],
  testimonials: [],
  certifications: [],
  settings: {
    seoTitle: "Anbu Selvan T — AI & Embedded Systems Engineer",
    seoDescription:
      "Explore Anbu Selvan's work in agentic AI, LLM applications, embedded IoT, and real-time voice systems. Based in Chennai, India.",
    accent: "#9caaff",
    motion: "on",
    analytics: "on",
    footer: "Built with curiosity. Engineered with purpose.",
    workTitle: "Selected work",
    aboutTitle: "Curiosity meets engineering.",
    skillsTitle: "A connected skill set.",
    experienceTitle: "Learning. Building. Evolving.",
  },
};
