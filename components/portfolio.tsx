"use client";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Download,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Copy,
  Check,
  Code2,
  BriefcaseBusiness,
  Cpu,
  Workflow,
  AudioLines,
  Cloud,
  Plus,
  Command,
  Mail,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { normalizeContent } from "@/lib/editorial";
import type { Content, Entry } from "@/lib/content";
import PortraitStage from "./portrait-stage";
import SystemLab from "./system-lab";
import ContactForm from "./contact-form";
import Magnetic from "./magnetic";
import FlippingWord from "./flipping-word";
import VelocityScroll from "./velocity-scroll";
import AiGuide from "./ai-guide";
import CollectionSurfer from "./collection-surfer";
import AchievementGallery from "./achievement-gallery";
import LiveBackground from "./live-background";
import { useBrowserPreference } from "@/hooks/use-browser-preference";

export default function Portfolio({
  content,
  preview = false,
}: {
  content: Content;
  preview?: boolean;
}) {
  const c = normalizeContent(content),
    p = c.profile,
    s = c.settings;
  const [menu, setMenu] = useState(false),
    [selected, setSelected] = useState<Entry | null>(null),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [chapter, setChapter] = useState("home"),
    [copied, setCopied] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useBrowserPreference("anbu-theme", s.defaultTheme),
    [consent, setConsent] = useBrowserPreference("anbu-privacy");
  const root = useRef<HTMLElement>(null),
    progress = useRef<HTMLDivElement>(null),
    tracked = useRef(false);
  const navigation = [
    { id: "home", label: "Intro", show: true },
    { id: "work", label: "Work", show: c.sections.projects },
    { id: "about", label: "About", show: c.sections.about },
    {
      id: "experience",
      label: "Journey",
      show: c.sections.experience || c.sections.education,
    },
    {
      id: "credentials",
      label: "Credentials",
      show:
        c.sections.certifications && c.certifications.some((x) => x.visible),
    },
    {
      id: "gallery",
      label: "Gallery",
      show: c.sections.gallery && (c.gallery?.some((x) => x.visible) ?? false),
    },
    { id: "contact", label: "Contact", show: c.sections.contact },
  ].filter((n) => n.show);
  useEffect(() => {
    if (
      preview ||
      s.analytics !== "on" ||
      consent !== "allowed" ||
      navigator.doNotTrack === "1" ||
      tracked.current
    )
      return;
    tracked.current = true;
    const source =
      new URLSearchParams(location.search)
        .get("utm_source")
        ?.replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 40) || "direct";
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "view", source }),
    }).catch(() => {});
  }, [preview, s.analytics, consent]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.current?.style.setProperty(
        "transform",
        `scaleX(${max > 0 ? scrollY / max : 0})`,
      );
      setScrolled(scrollY > 500);
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll);
    update();
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) setChapter(e.target.id);
        }),
      { rootMargin: "-15% 0px -60% 0px" },
    );
    root.current?.querySelectorAll("section[id]").forEach((e) => io.observe(e));
    return () => {
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") setMenu(false);
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    if (
      s.motion !== "on" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    root.current?.querySelectorAll(".v2-reveal").forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [s.motion]);
  function choosePrivacy(value: string) {
    setConsent(value);
    setPrivacy(false);
  }
  function toggleTheme() {
    const value = theme === "dark" ? "light" : "dark";
    setTheme(value);
  }
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(p.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  const results = [
    ...(c.sections.projects ? c.projects : [])
      .filter((x) => x.visible)
      .map((x) => ({ title: x.title, detail: x.tags, id: "work", entry: x })),
    ...(c.sections.skills ? c.skills : [])
      .filter((x) => x.visible)
      .map((x) => ({
        title: x.title,
        detail: x.tags,
        id: "toolkit",
        entry: null,
      })),
    ...(c.sections.experience ? c.experience : [])
      .filter((x) => x.visible)
      .map((x) => ({
        title: x.title,
        detail: x.subtitle,
        id: "experience",
        entry: null,
      })),
    ...(c.sections.certifications ? c.certifications : [])
      .filter((x) => x.visible)
      .map((x) => ({
        title: x.title,
        detail: x.subtitle,
        id: "credentials",
        entry: null,
      })),
    ...(c.sections.gallery ? c.gallery || [] : [])
      .filter((x) => x.visible)
      .map((x) => ({
        title: x.title,
        detail: x.subtitle + " " + x.tags,
        id: "gallery",
        entry: null,
      })),
    ...(c.sections.customSections ? c.customSections || [] : [])
      .filter((x) => x.visible)
      .map((x) => ({
        title: x.title,
        detail: x.description,
        id: "chapter-" + x.id,
        entry: null,
      })),
    ...navigation.map((n) => ({
      title: n.label,
      detail: "Section",
      id: n.id,
      entry: null,
    })),
  ].filter((x) =>
    (x.title + " " + x.detail).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main
      ref={root}
      className="portfolio"
      data-theme={theme}
      data-visual={s.visualTheme}
      data-background={s.liveBackground}
      data-motion={s.motion}
      style={
        {
          "--folio-accent": s.accent,
          "--folio-paper": s.paperColor,
          "--folio-ink": s.inkColor,
          "--folio-olive": s.oliveColor,
          "--folio-blue": s.journeyColor,
          "--folio-lab": s.labColor,
        } as CSSProperties
      }
    >
      <a className="skip" href="#main-content">
        Skip to content
      </a>
      <div className="reading-progress" ref={progress} aria-hidden />
      {preview && (
        <div className="preview-banner">
          Draft preview · Only visible to you{" "}
          <a href="/admin">Back to studio ↗</a>
        </div>
      )}
      <header className="folio-header">
        <a
          href="#home"
          className="folio-wordmark"
          aria-label={`${p.name} home`}
        >
          {p.name.split(" ")[0].toLowerCase()}
          <span> / {p.surname || p.name.split(" ").at(-1)}</span>
          <i />
        </a>
        <span className="header-discipline">{p.role}</span>
        <div className="header-tools">
          {s.builder === "on" && (
            <a
              className="builder-launch"
              href="/resume-builder"
              aria-label="Open free ATS resume builder"
            >
              <Download size={17} />
              <span>Resume builder</span>
            </a>
          )}
          <button aria-label="Search portfolio" onClick={() => setSearch(true)}>
            <Search size={18} />
            <kbd>⌘ K</kbd>
          </button>
          <button
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            className="menu-toggle"
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {menu && (
        <nav
          id="mobile-navigation"
          className="folio-mobile-nav"
          aria-label="Mobile navigation"
        >
          {navigation.map((n, i) => (
            <a key={n.id} href={`#${n.id}`} onClick={() => setMenu(false)}>
              <span>0{i + 1}</span>
              {n.label}
              <ArrowUpRight />
            </a>
          ))}
        </nav>
      )}
      <section id="home" className="folio-hero">
        <LiveBackground
          enabled={s.motion === "on" && s.liveBackground === "on"}
        />
        <div className="ambient-shape ambient-a" aria-hidden />
        <div className="ambient-shape ambient-b" aria-hidden />
        <div className="hero-paper-grid" aria-hidden />
        <div className="hero-layout" id="main-content" tabIndex={-1}>
          <div className="hero-editorial">
            <p className="folio-kicker">
              <span className="status-dot" />
              {p.eyebrow}
            </p>
            <h1>
              {p.headline.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </h1>
            <p className="hero-title">{p.role}</p>
            <p className="hero-summary">{p.intro}</p>
            <div className="folio-actions">
              <Magnetic>
                <a
                  className="folio-button filled"
                  href={c.sections.projects ? "#work" : "#contact"}
                >
                  Step into my work <ArrowUpRight size={18} />
                </a>
              </Magnetic>
              {p.resume && (
                <a
                  className="underlink"
                  href={
                    p.resume === "/api/resume" &&
                    consent === "allowed" &&
                    !preview
                      ? "/api/resume?analytics=1"
                      : p.resume
                  }
                  download
                >
                  Get my resume <Download size={16} />
                </a>
              )}
            </div>
            <div className="hero-exploring">
              <span>EXPLORING</span>
              <FlippingWord
                words={c.skills.filter((x) => x.visible).map((x) => x.title)}
              />
            </div>
          </div>
          <PortraitStage
            src={p.photo}
            name={`${p.name} ${p.surname}`}
            location={p.location}
            stamp={s.heroStamp}
          />
        </div>
        <div className="hero-colophon">
          <span>
            <MapPin size={14} />
            {p.location} <i /> {p.timezone.split("·").pop()}
          </span>
          <span>{s.heroNote}</span>
          <a href={c.sections.projects ? "#work" : "#about"}>
            SCROLL TO DISCOVER <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <VelocityScroll>
        <div className="folio-marquee">
          {c.skills
            .filter((x) => x.visible)
            .map((x) => (
              <span key={x.id}>
                {x.title}
                <Plus size={28} />
              </span>
            ))}
        </div>
      </VelocityScroll>
      {c.sections.projects && (
        <section id="work" className="folio-section work-story">
          <div className="chapter-bar">
            <span>{s.labLabel}</span>
            <span>SELECT → EXPLORE → UNDERSTAND</span>
          </div>
          <div className="section-title v2-reveal">
            <h2>{s.workTitle}</h2>
            <p>{s.labNote}</p>
          </div>
          <SystemLab
            projects={c.projects.filter((x) => x.visible)}
            onOpen={setSelected}
          />
          <CollectionSurfer>
            {c.projects
              .filter((x) => x.visible)
              .map((x, i) => (
                <button
                  className="project-index-card"
                  key={x.id}
                  onClick={() => setSelected(x)}
                >
                  <span className="mono">
                    /{String(i + 1).padStart(2, "0")} <ArrowUpRight size={18} />
                  </span>
                  <h3>{x.title}</h3>
                  <p>{x.subtitle}</p>
                  <span className="mono">{x.period}</span>
                </button>
              ))}
          </CollectionSurfer>
        </section>
      )}
      {c.sections.about && (
        <section id="about" className="folio-section about-story">
          <div className="chapter-bar">
            <span>{s.aboutLabel}</span>
            <span>{s.aboutNote}</span>
          </div>
          <div className="about-layout">
            <div className="v2-reveal">
              <div className="about-symbol" aria-hidden>
                <div />
                <div />
                <div />
                <Plus size={46} />
              </div>
              <h2>
                {s.aboutTitle.split("\n").map((x, i) => (
                  <span key={i}>{x}</span>
                ))}
              </h2>
            </div>
            <div className="about-text v2-reveal">
              <p className="lead">{p.bio}</p>
              <p>{p.journey}</p>
              <p>{p.personality}</p>
              <a
                className="underlink"
                href={p.linkedin}
                target="_blank"
                rel="noreferrer"
              >
                More of my story on LinkedIn <ArrowUpRight size={17} />
              </a>
              <div className="about-signature">
                {p.name}
                <span> / {p.surname || p.name.split(" ").at(-1)}</span>
              </div>
            </div>
          </div>
        </section>
      )}
      {c.sections.skills && (
        <section id="toolkit" className="folio-section toolkit-story">
          <div className="chapter-bar">
            <span>{s.toolkitLabel}</span>
            <span>SOFTWARE ↔ HARDWARE</span>
          </div>
          <h2 className="v2-reveal">{s.skillsTitle}</h2>
          <div className="toolkit-rows">
            {c.skills
              .filter((x) => x.visible)
              .map((x, i) => {
                const Icon = [Workflow, Cpu, Cloud, AudioLines][i % 4];
                return (
                  <details className="toolkit-row" key={x.id} open={i === 0}>
                    <summary>
                      <span className="toolkit-icon">
                        <Icon size={24} />
                      </span>
                      <h3>{x.title}</h3>
                      <span className="skill-preview">
                        {x.tags.split(",").slice(0, 2).join(" / ")}
                      </span>
                      <Plus className="details-plus" size={22} />
                    </summary>
                    <div className="toolkit-expanded">
                      <p>{x.description}</p>
                      <div className="v2-tags">
                        {x.tags
                          .split(",")
                          .filter(Boolean)
                          .map((t) => (
                            <span key={t}>{t.trim()}</span>
                          ))}
                      </div>
                    </div>
                  </details>
                );
              })}
          </div>
        </section>
      )}
      {(c.sections.experience || c.sections.education) && (
        <section id="experience" className="folio-section journey-story">
          <div className="chapter-bar">
            <span>{s.journeyLabel}</span>
            <span>LEARNING IN MOTION</span>
          </div>
          <div className="journey-layout">
            <div className="journey-heading v2-reveal">
              <h2>{s.experienceTitle}</h2>
              <div className="journey-mark" aria-hidden>
                ↗
              </div>
              <p>
                {p.location}
                <br />
                {p.role}
              </p>
            </div>
            <div className="journey-entries">
              {(c.sections.experience ? c.experience : [])
                .filter((x) => x.visible)
                .map((x, i) => (
                  <article className="journey-entry v2-reveal" key={x.id}>
                    <div className="journey-date">
                      <span className="journey-dot" />
                      {x.period}
                      <span>0{i + 1}</span>
                    </div>
                    <h3>{x.title}</h3>
                    <p className="journey-role">{x.subtitle}</p>
                    <p>{x.description}</p>
                    {x.link && (
                      <a
                        className="underlink"
                        href={x.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Learn more <ArrowUpRight size={16} />
                      </a>
                    )}
                  </article>
                ))}
              {c.sections.education && (
                <div className="education-panel">
                  <p className="mono">EDUCATION</p>
                  {c.education
                    .filter((x) => x.visible)
                    .map((x) => (
                      <article key={x.id}>
                        <span className="mono">{x.period}</span>
                        <h3>{x.title}</h3>
                        <p>{x.subtitle}</p>
                        <p>{x.description}</p>
                        {x.tags && (
                          <div className="education-interests">
                            <p className="mono">ACTIVITIES & INTERESTS</p>
                            <div className="v2-tags">
                              {x.tags
                                .split(",")
                                .filter(Boolean)
                                .map((t) => (
                                  <span key={t}>{t.trim()}</span>
                                ))}
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {c.sections.certifications && c.certifications.some((x) => x.visible) && (
        <section id="credentials" className="folio-section credentials-story">
          <div className="chapter-bar">
            <span>{s.credentialLabel}</span>
            <a href={p.linkedin} target="_blank" rel="noreferrer">
              PROFILE ↗
            </a>
          </div>
          <div className="section-title v2-reveal">
            <h2>{s.credentialTitle}</h2>
            <p>{s.credentialNote}</p>
          </div>
          <div className="credentials-grid">
            {c.certifications
              .filter((x) => x.visible)
              .map((x, i) => (
                <article className="credential v2-reveal" key={x.id}>
                  <div className="credential-head">
                    <span className="credential-index">
                      /{String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{x.subtitle}</span>
                    <ArrowUpRight size={20} />
                  </div>
                  <h3>{x.title}</h3>
                  <p>{x.description}</p>
                  <div className="credential-foot">
                    <span>{x.period}</span>
                    {x.link && (
                      <a
                        className="underlink"
                        href={x.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {x.link.includes("credly")
                          ? "View badge"
                          : "View on LinkedIn"}
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </section>
      )}
      {c.sections.gallery && c.gallery?.some((x) => x.visible) && (
        <section id="gallery" className="folio-section gallery-story">
          <div className="chapter-bar">
            <span>07 / THE PROOF OF PROGRESS</span>
            <span>ACHIEVEMENTS ARCHIVE</span>
          </div>
          <div className="section-title v2-reveal">
            <h2>{s.galleryTitle}</h2>
            <p>{s.galleryNote}</p>
          </div>
          <AchievementGallery entries={c.gallery.filter((x) => x.visible)} />
        </section>
      )}
      {c.sections.customSections &&
        c.customSections
          ?.filter((x) => x.visible)
          .map((x) => (
            <section
              key={x.id}
              id={`chapter-${x.id}`}
              className={`folio-section custom-chapter ${["paper", "lab", "journey"].includes(x.tags) ? x.tags : "paper"}`}
            >
              <div className="chapter-bar">
                <span>{x.subtitle || "MORE TO THE STORY"}</span>
              </div>
              <div className="custom-chapter-layout v2-reveal">
                <div>
                  <h2>{x.title}</h2>
                  <p>{x.description}</p>
                  {x.link && (
                    <a
                      className="button"
                      href={x.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Explore <ArrowUpRight size={16} />
                    </a>
                  )}
                </div>
                {x.image && (
                  <img
                    src={x.image}
                    alt={x.title}
                    loading="lazy"
                    width={800}
                    height={600}
                  />
                )}
              </div>
            </section>
          ))}
      {s.builder === "on" && (
        <section className="folio-section builder-story" id="resume-tool">
          <div className="chapter-bar">
            <span>AN APP BY ANBU SELVAN T</span>
            <span>FREE / NO SIGN-UP REQUIRED</span>
          </div>
          <div className="builder-promo">
            <div>
              <h2>
                Your next chapter.
                <br />
                Written clearly.
              </h2>
              <p>
                Build a readable resume, check job-description keywords, and
                export PDF or Word. Your draft stays on your device.
              </p>
              <a className="button" href="/resume-builder">
                Open the resume studio <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="builder-glyph" aria-hidden>
              <Download size={70} strokeWidth={1} />
              <span>CV / 01</span>
            </div>
          </div>
        </section>
      )}
      {c.sections.testimonials && c.testimonials.some((x) => x.visible) && (
        <section className="folio-section quotes-story">
          <div className="chapter-bar">
            <span>FROM COLLABORATORS</span>
          </div>
          {c.testimonials
            .filter((x) => x.visible)
            .map((x) => (
              <blockquote key={x.id}>
                <p>“{x.description}”</p>
                <cite>
                  {x.title} / {x.subtitle}
                </cite>
              </blockquote>
            ))}
        </section>
      )}
      {c.sections.faq && c.faq?.some((x) => x.visible) && (
        <section className="folio-section faq-story">
          <h2>{s.faqTitle}</h2>
          <div>
            {c.faq
              .filter((x) => x.visible)
              .map((x) => (
                <details key={x.id}>
                  <summary>
                    {x.title}
                    <Plus size={20} />
                  </summary>
                  <p>{x.description}</p>
                </details>
              ))}
          </div>
        </section>
      )}
      {c.sections.contact && (
        <section id="contact" className="folio-section contact-story">
          <div className="chapter-bar">
            <span>{s.contactLabel}</span>
            <span>{p.availability}</span>
          </div>
          <h2 className="v2-reveal">
            {p.contactTitle.split("\n").map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </h2>
          <div className="contact-layout">
            <div>
              <p className="contact-intro">{p.contactText}</p>
              <div className="contact-email">
                <a href={`mailto:${p.email}`}>{p.email}</a>
                <button
                  aria-label={copied ? "Email copied" : "Copy email address"}
                  onClick={copyEmail}
                >
                  {copied ? <Check size={19} /> : <Copy size={19} />}
                </button>
              </div>
              <span className="copy-status" role="status">
                {copied ? "Email copied to clipboard" : ""}
              </span>
              <div className="folio-socials">
                {p.github && (
                  <a href={p.github} target="_blank" rel="noreferrer">
                    <Code2 size={19} />
                    GitHub <ArrowUpRight size={15} />
                  </a>
                )}
                {p.linkedin && (
                  <a href={p.linkedin} target="_blank" rel="noreferrer">
                    <BriefcaseBusiness size={19} />
                    LinkedIn <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
              <p className="contact-meta">
                {p.location}
                <br />
                {p.timezone}
              </p>
            </div>
            <ContactForm preview={preview} />
          </div>
        </section>
      )}
      <footer className="folio-footer">
        <a className="folio-wordmark" href="#home">
          {p.name.split(" ")[0].toLowerCase()}
          <span> / {p.surname || p.name.split(" ").at(-1)}</span>
        </a>
        <p>{s.footer}</p>
        <div>
          <span>
            © {new Date().getFullYear()} {p.name} {p.surname}
          </span>
          <span>Updated {s.lastUpdated}</span>
        </div>
        <button className="underlink" onClick={() => setPrivacy(true)}>
          Privacy
        </button>
        <a href="/admin" className="underlink">
          Studio <ArrowUpRight size={14} />
        </a>
      </footer>
      <nav className="magnetic-dock" aria-label="Section navigation">
        {navigation.map((n) => (
          <Magnetic key={n.id}>
            <a
              href={`#${n.id}`}
              className={chapter === n.id ? "active" : ""}
              aria-current={chapter === n.id ? "location" : undefined}
            >
              <span>{n.label}</span>
            </a>
          </Magnetic>
        ))}
      </nav>
      <div className="floating-tools">
        {scrolled && (
          <button
            aria-label="Back to top"
            onClick={() =>
              document.getElementById("home")?.scrollIntoView({
                behavior:
                  s.motion === "on" &&
                  !matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "smooth"
                    : "instant",
              })
            }
          >
            <ArrowUp size={18} />
          </button>
        )}
        {c.sections.contact && (
          <a href="#contact" aria-label="Contact Anbu">
            <Mail size={18} />
          </a>
        )}
        {s.chatbot === "on" && (
          <AiGuide title={s.chatTitle} intro={s.chatIntro} email={p.email} />
        )}
      </div>
      {consent === null &&
        s.privacyNotice === "on" &&
        s.analytics === "on" &&
        !preview && (
          <div
            className="privacy-banner"
            role="region"
            aria-label="Privacy preferences"
          >
            <div>
              <strong>A small privacy note.</strong>
              <p>
                Optional anonymous usage counts. No advertising cookies. Your
                theme and privacy choice stay in this browser.
              </p>
            </div>
            <button onClick={() => choosePrivacy("necessary")}>
              Essential only
            </button>
            <button onClick={() => choosePrivacy("allowed")}>
              Allow analytics <Check size={14} />
            </button>
          </div>
        )}
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent className="folio-search">
          <DialogTitle>
            <Search size={19} />
            Find something
          </DialogTitle>
          <DialogDescription>
            Search projects, skills, credentials, achievements, and chapters.
          </DialogDescription>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try Raspberry Pi, cloud, Deloitte…"
            aria-label="Search portfolio"
          />
          <div className="search-results">
            {results.slice(0, 12).map((r, i) => (
              <button
                key={r.title + i}
                onClick={() => {
                  setSearch(false);
                  setQuery("");
                  if (r.entry) setSelected(r.entry);
                  else location.hash = r.id;
                }}
              >
                <div>
                  <strong>{r.title}</strong>
                  <span>{r.detail}</span>
                </div>
                <ArrowUpRight size={18} />
              </button>
            ))}
            {results.length === 0 && <p>No matches. Try a different word.</p>}
          </div>
          <small>
            <Command size={13} /> K to search · Escape to close
          </small>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="folio-case">
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription>{selected?.description}</DialogDescription>
          {selected?.image && <img src={selected.image} alt={selected.title} />}
          {[
            ["The context", selected?.problem],
            ["My role & process", selected?.process],
            ["The outcome", selected?.outcome],
          ].map(
            ([title, body]) =>
              body && (
                <div key={title}>
                  <p className="mono">{title}</p>
                  <p>{body}</p>
                </div>
              ),
          )}
          <div className="v2-tags">
            {selected?.tags
              .split(",")
              .filter(Boolean)
              .map((t) => (
                <span key={t}>{t.trim()}</span>
              ))}
          </div>
          <div className="folio-actions">
            {selected?.link && (
              <a
                className="folio-button filled"
                href={selected.link}
                target="_blank"
                rel="noreferrer"
              >
                Open project <ArrowUpRight size={16} />
              </a>
            )}
            {selected?.code && (
              <a
                className="underlink"
                href={selected.code}
                target="_blank"
                rel="noreferrer"
              >
                View source <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={privacy} onOpenChange={setPrivacy}>
        <DialogContent className="folio-case">
          <DialogTitle>Your privacy choices</DialogTitle>
          <DialogDescription>
            Simple preferences, under your control.
          </DialogDescription>
          <p>
            Theme and privacy preferences use local browser storage. Optional
            analytics count visits, resume downloads, form attempts, and broad
            campaign sources. No advertising profiles or tracking cookies are
            created. Contact messages are stored so Anbu can respond. AI chat is
            sent to Google Gemini only when you choose to start the AI guide;
            avoid sensitive information.
          </p>
          <div className="folio-actions">
            <button
              className="folio-button"
              onClick={() => choosePrivacy("necessary")}
            >
              Essential only
            </button>
            <button
              className="folio-button filled"
              onClick={() => choosePrivacy("allowed")}
            >
              Allow analytics
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
