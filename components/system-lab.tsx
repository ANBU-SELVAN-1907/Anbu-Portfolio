"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Braces,
  Cpu,
  AudioLines,
  Workflow,
  Radio,
  Cloud,
  FileCode,
  ScanLine,
} from "lucide-react";
import type { Entry } from "@/lib/content";
const diagrams = [
  [
    {
      name: "Source",
      Icon: FileCode,
      note: "Code patterns and dependencies enter the discovery workflow.",
    },
    {
      name: "Reason",
      Icon: Workflow,
      note: "Agent orchestration structures the architecture analysis.",
    },
    {
      name: "Map",
      Icon: ScanLine,
      note: "The workflow produces topology, API boundaries, and security reports.",
    },
  ],
  [
    {
      name: "Listen",
      Icon: AudioLines,
      note: "Speech-to-text turns microphone input into a conversation.",
    },
    {
      name: "Understand",
      Icon: Cloud,
      note: "Gemini processes the conversation through LiveKit Agent.",
    },
    {
      name: "Respond",
      Icon: Cpu,
      note: "Speech synthesis brings the response back to Raspberry Pi.",
    },
  ],
  [
    {
      name: "Sense",
      Icon: Radio,
      note: "STM32 and ESP32 acquire environmental sensor readings.",
    },
    {
      name: "Connect",
      Icon: Cpu,
      note: "Raspberry Pi coordinates the connected monitoring system.",
    },
    {
      name: "Context",
      Icon: Cloud,
      note: "Windy weather data adds forecasting context to air quality readings.",
    },
  ],
];
export default function SystemLab({
  projects,
  onOpen,
}: {
  projects: Entry[];
  onOpen: (p: Entry) => void;
}) {
  const [active, setActive] = useState(0),
    [node, setNode] = useState(1);
  const index = Math.min(active, projects.length - 1),
    p = projects[index];
  if (!p) return <p>No published projects yet.</p>;
  const diagramIndex = ["discovery", "jarvis", "air"].indexOf(p.id);
  const stages =
    diagramIndex >= 0
      ? diagrams[diagramIndex]
      : [
          { name: "Context", Icon: FileCode, note: p.problem },
          { name: "Process", Icon: Workflow, note: p.process },
          { name: "Outcome", Icon: ScanLine, note: p.outcome },
        ];
  return (
    <div className="system-lab">
      <div className="lab-selector" role="tablist" aria-label="Choose project">
        {projects.map((x, i) => (
          <button
            id={`project-tab-${i}`}
            role="tab"
            aria-selected={index === i}
            aria-controls="project-panel"
            tabIndex={index === i ? 0 : -1}
            key={x.id}
            onClick={() => {
              setActive(i);
              setNode(1);
            }}
            onKeyDown={(e) => {
              if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? projects.length - 1
                      : (i +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          projects.length) %
                        projects.length;
                setActive(next);
                setNode(1);
                document.getElementById(`project-tab-${next}`)?.focus();
              }
            }}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {x.title}
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <div
        id="project-panel"
        role="tabpanel"
        aria-labelledby={`project-tab-${index}`}
        className="lab-panel"
        key={p.id}
      >
        <div className="lab-windowbar">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>{p.id.toUpperCase()} / SYSTEM WALKTHROUGH</span>
          <Braces size={16} />
        </div>
        {p.image ? (
          <img
            className="lab-image"
            src={p.image}
            alt={p.title}
            loading="lazy"
          />
        ) : (
          <div className="lab-schematic">
            <div className="signal-track" aria-hidden />
            <div className="lab-nodes">
              {stages.map(({ name, Icon }, i) => (
                <div className="lab-node-wrap" key={name}>
                  <button
                    className={node === i ? "lab-node active" : "lab-node"}
                    aria-pressed={node === i}
                    onClick={() => setNode(i)}
                  >
                    <Icon size={30} />
                    <span>{name}</span>
                    <small>0{i + 1}</small>
                  </button>
                  {i < 2 && <ArrowRight className="node-arrow" size={20} />}
                </div>
              ))}
            </div>
            <p className="node-note" aria-live="polite">
              <span>0{node + 1} / </span>
              {[p.problem, p.process, p.outcome][node] || stages[node].note}
            </p>
          </div>
        )}
        <div className="lab-description">
          <div>
            <p className="mono">{p.period}</p>
            <h3>{p.title}</h3>
            <p>{p.subtitle}</p>
          </div>
          <button
            className="round-arrow"
            aria-label={`Read ${p.title} case study`}
            onClick={() => onOpen(p)}
          >
            <ArrowUpRight size={28} />
          </button>
        </div>
        <div className="lab-bottom">
          <div className="v2-tags">
            {p.tags
              .split(",")
              .filter(Boolean)
              .map((t) => (
                <span key={t}>{t.trim()}</span>
              ))}
          </div>
          <button className="underlink" onClick={() => onOpen(p)}>
            Read the case study <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
