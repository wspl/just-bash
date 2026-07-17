import {Audio} from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timeline from "../public/timeline.json";
import {Captions} from "./Captions";
import {TOTAL_FRAMES} from "./Composition";

const C = {
  bg: "#070910",
  panel: "#101522",
  panel2: "#171d2d",
  text: "#f7f8ff",
  muted: "#9da8bf",
  blue: "#62a7ff",
  cyan: "#64e9d7",
  violet: "#9a86ff",
  red: "#ff7187",
  green: "#6be6a5",
  amber: "#ffd166",
};

const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);

type TimelineChapter = (typeof timeline.chapters)[number];

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.bg, overflow: "hidden"}}>
      <div style={{position: "absolute", inset: 0, opacity: 0.23, backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize: "72px 72px", translate: `${interpolate(frame, [0, TOTAL_FRAMES], [0, -72])}px ${interpolate(frame, [0, TOTAL_FRAMES], [0, -36])}px`}} />
      <div style={{position: "absolute", width: 1000, height: 1000, borderRadius: "50%", left: -430, top: -460, background: "radial-gradient(circle, rgba(69,115,255,.2), transparent 68%)", translate: `${interpolate(frame, [0, TOTAL_FRAMES], [0, 240])}px 0`}} />
      <div style={{position: "absolute", width: 900, height: 900, borderRadius: "50%", right: -330, bottom: -350, background: "radial-gradient(circle, rgba(151,91,255,.2), transparent 68%)", translate: `${interpolate(frame, [0, TOTAL_FRAMES], [0, -180])}px 0`}} />
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(circle at 55% 45%, transparent 30%, rgba(0,0,0,.56) 100%)"}} />
    </AbsoluteFill>
  );
};

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, TOTAL_FRAMES], [0, 1], clamp);
  return (
    <>
      <div style={{position: "absolute", left: 72, top: 48, display: "flex", alignItems: "center", gap: 14, zIndex: 10}}>
        <div style={{width: 38, height: 38, borderRadius: 10, border: `3px solid ${C.blue}`, borderLeftColor: C.violet, rotate: "45deg", boxShadow: "0 0 24px rgba(98,167,255,.4)"}} />
        <div style={{color: C.text, fontSize: 28, fontWeight: 800, letterSpacing: 2}}>JUSTBASH / UNDER THE HOOD</div>
      </div>
      <div style={{position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "rgba(255,255,255,.05)", zIndex: 20}}>
        <div style={{width: `${progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.violet}, ${C.cyan})`}} />
      </div>
    </>
  );
};

const Host: React.FC<{speaking: boolean; compact?: boolean}> = ({speaking, compact = false}) => {
  const frame = useCurrentFrame();
  const width = compact ? 560 : 690;
  const bob = Math.sin(frame / 38) * 5;
  return (
    <div style={{position: "absolute", width, height: width * 1.333, right: compact ? 34 : -10, bottom: compact ? -54 : -118, translate: `0 ${bob}px`, filter: "drop-shadow(0 30px 70px rgba(0,0,0,.58))"}}>
      <Img src={staticFile("host/virtual-host.png")} style={{width: "100%", height: "100%", objectFit: "contain"}} />
      <div
        style={{
          position: "absolute",
          left: width * 0.496,
          top: width * 0.349,
          width: width * 0.039,
          height: speaking ? 6 + Math.abs(Math.sin(frame * 1.72)) * 11 : 4,
          borderRadius: 999,
          background: speaking ? "#8f3f50" : "rgba(143,63,80,.25)",
          opacity: speaking ? 0.84 : 0.12,
          boxShadow: speaking ? "inset 0 2px 2px rgba(0,0,0,.45)" : "none",
        }}
      />
      {compact ? (
        <div style={{position: "absolute", left: 28, bottom: 152, padding: "14px 22px", borderRadius: 16, background: "rgba(10,13,22,.9)", border: "1px solid rgba(100,233,215,.28)", color: C.text, fontSize: 25, fontWeight: 750}}>
          小柏 <span style={{color: C.cyan, fontSize: 20, fontWeight: 550}}>VIRTUAL HOST</span>
        </div>
      ) : null}
    </div>
  );
};

const Terminal: React.FC<{code: string; accent?: string}> = ({code, accent = C.cyan}) => {
  const frame = useCurrentFrame();
  const chars = Math.floor(interpolate(frame, [20, 110], [0, code.length], clamp));
  return (
    <div style={{borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,.13)", background: "rgba(7,10,17,.92)", boxShadow: "0 30px 80px rgba(0,0,0,.38)"}}>
      <div style={{height: 58, display: "flex", alignItems: "center", padding: "0 22px", gap: 10, background: C.panel2}}>
        {[C.red, C.amber, C.green].map((color) => <div key={color} style={{width: 13, height: 13, borderRadius: "50%", background: color}} />)}
        <div style={{marginLeft: 16, color: C.muted, fontSize: 21}}>just-bash / virtual-shell</div>
      </div>
      <pre style={{margin: 0, minHeight: 160, padding: "30px 32px", color: C.text, fontSize: 26, lineHeight: 1.55, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"}}>
        <span style={{color: accent}}>$ </span>{code.slice(0, chars)}<span style={{opacity: Math.floor(frame / 15) % 2}}>▋</span>
      </pre>
    </div>
  );
};

const Flow: React.FC<{items: string[]}> = ({items}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: "flex", alignItems: "center", gap: 14, width: "100%"}}>
      {items.map((item, index) => (
        <React.Fragment key={item}>
          <div style={{flex: 1, minHeight: 104, padding: "20px 14px", borderRadius: 19, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: index === items.length - 1 ? C.cyan : C.text, fontSize: 26, fontWeight: 720, background: index === items.length - 1 ? "rgba(100,233,215,.1)" : C.panel, border: `1px solid ${index === items.length - 1 ? "rgba(100,233,215,.5)" : "rgba(255,255,255,.12)"}`, opacity: interpolate(frame, [18 + index * 10, 35 + index * 10], [0, 1], {...clamp, easing: ease}), translate: `0 ${interpolate(frame, [18 + index * 10, 35 + index * 10], [20, 0], {...clamp, easing: ease})}px`}}>{item}</div>
          {index < items.length - 1 ? <div style={{fontSize: 30, color: C.blue}}>→</div> : null}
        </React.Fragment>
      ))}
    </div>
  );
};

const Bullets: React.FC<{items: string[]}> = ({items}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: "grid", gridTemplateColumns: items.length > 3 ? "1fr 1fr" : "1fr", gap: 16}}>
      {items.map((item, index) => (
        <div key={item} style={{display: "flex", alignItems: "center", gap: 18, padding: "19px 22px", borderRadius: 17, background: "rgba(16,21,34,.86)", border: "1px solid rgba(255,255,255,.1)", color: C.text, fontSize: 27, opacity: interpolate(frame, [35 + index * 12, 52 + index * 12], [0, 1], {...clamp, easing: ease}), translate: `${interpolate(frame, [35 + index * 12, 52 + index * 12], [-20, 0], {...clamp, easing: ease})}px 0`}}>
          <div style={{width: 13, height: 13, borderRadius: 4, background: index % 2 ? C.violet : C.cyan, rotate: "45deg", flexShrink: 0}} />{item}
        </div>
      ))}
    </div>
  );
};

const AstVisual: React.FC<{chapter: TimelineChapter}> = ({chapter}) => {
  const frame = useCurrentFrame();
  const nodes = ["Script", "ForLoop", "Pipeline", "grep", "head"];
  return (
    <div style={{display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 28}}>
      <Terminal code={chapter.code ?? ""} />
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 12, justifyContent: "center"}}>
        {nodes.map((node, index) => <div key={node} style={{width: 250 + index * 45, height: 54, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: index < 2 ? "rgba(98,167,255,.13)" : "rgba(154,134,255,.11)", border: `1px solid ${index < 2 ? "rgba(98,167,255,.5)" : "rgba(154,134,255,.45)"}`, color: C.text, fontSize: 23, fontFamily: "ui-monospace, monospace", opacity: interpolate(frame, [55 + index * 9, 70 + index * 9], [0, 1], clamp)}}>{node}</div>)}
      </div>
    </div>
  );
};

const FileSystemVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const systems = [
    ["InMemoryFs", "完全位于内存", C.cyan],
    ["OverlayFs", "读取磁盘 · 写入内存", C.blue],
    ["ReadWriteFs", "受控目录读写", C.amber],
    ["MountableFs", "组合多个挂载点", C.violet],
  ];
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18}}>
      {systems.map(([name, desc, color], index) => (
        <div key={name} style={{height: 150, borderRadius: 22, padding: "26px 28px", background: `linear-gradient(135deg, ${color}18, rgba(13,17,28,.94))`, border: `1px solid ${color}66`, opacity: interpolate(frame, [25 + index * 12, 43 + index * 12], [0, 1], {...clamp, easing: ease}), translate: `0 ${interpolate(frame, [25 + index * 12, 43 + index * 12], [26, 0], {...clamp, easing: ease})}px`}}>
          <div style={{fontSize: 31, fontWeight: 780, color}}>{name}</div><div style={{fontSize: 25, marginTop: 13, color: C.muted}}>{desc}</div>
        </div>
      ))}
    </div>
  );
};

const SecurityVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const rings = [
    ["能力最小化", C.cyan, 630],
    ["资源限制", C.blue, 490],
    ["数据结构防御", C.violet, 350],
  ] as const;
  return (
    <div style={{height: 410, position: "relative", display: "flex", alignItems: "center", justifyContent: "center"}}>
      {rings.map(([label, color, size], index) => <div key={label} style={{position: "absolute", width: size, height: size * 0.57, borderRadius: "50%", border: `2px solid ${color}88`, background: `${color}09`, scale: interpolate(frame, [18 + index * 14, 40 + index * 14], [.7, 1], {...clamp, easing: ease}), boxShadow: `0 0 50px ${color}12`}} />)}
      <div style={{zIndex: 2, width: 190, height: 210, clipPath: "polygon(50% 0, 95% 18%, 88% 72%, 50% 100%, 12% 72%, 5% 18%)", background: `linear-gradient(150deg, ${C.blue}, ${C.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.text, fontSize: 32, fontWeight: 800}}>HOST<br/>POLICY</div>
      <div style={{position: "absolute", left: 80, top: 34, color: C.cyan, fontSize: 26, fontWeight: 740}}>{rings[0][0]}</div>
      <div style={{position: "absolute", right: 150, top: 106, color: C.blue, fontSize: 26, fontWeight: 740}}>{rings[1][0]}</div>
      <div style={{position: "absolute", left: 180, bottom: 34, color: C.violet, fontSize: 26, fontWeight: 740}}>{rings[2][0]}</div>
    </div>
  );
};

const SceneVisual: React.FC<{chapter: TimelineChapter}> = ({chapter}) => {
  if (chapter.visual === "ast") return <AstVisual chapter={chapter} />;
  if (chapter.visual === "filesystem") return <FileSystemVisual />;
  if (chapter.visual === "security") return <SecurityVisual />;
  if (chapter.visual === "flow") return <><Terminal code={chapter.code ?? ""} /><div style={{height: 24}}/><Flow items={chapter.bullets ?? []} /></>;
  if (chapter.visual === "pipeline") return <><Terminal code={chapter.code ?? ""} /><div style={{height: 24}}/><Flow items={["cat", "grep", "wc -l", "errors.txt"]} /></>;
  if (chapter.visual === "boundary") return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24}}>
      <div style={{padding: 28, borderRadius: 22, background: "rgba(255,113,135,.08)", border: "1px solid rgba(255,113,135,.35)"}}><div style={{fontSize: 30, color: C.red, fontWeight: 780, marginBottom: 18}}>NOT AN OS</div><div style={{color: C.muted, fontSize: 27, lineHeight: 1.5}}>不是系统进程<br/>不是完整 Linux 内核<br/>不是绝对安全边界</div></div>
      <div style={{padding: 28, borderRadius: 22, background: "rgba(100,233,215,.08)", border: "1px solid rgba(100,233,215,.35)"}}><div style={{fontSize: 30, color: C.cyan, fontWeight: 780, marginBottom: 18}}>A CONTROLLED SHELL</div><div style={{color: C.muted, fontSize: 27, lineHeight: 1.5}}>高频 Bash 语义<br/>Agent 常用命令<br/>可测试、可组合、可限制</div></div>
    </div>
  );
  if (chapter.visual === "command") return <><Terminal code={chapter.code ?? ""} /><div style={{height: 24}}/><Flow items={["args + stdin", "CommandContext", "TypeScript fn", "ExecResult"]} /></>;
  if (chapter.visual === "interpreter") return <><Flow items={["Alias", "Expansion", "Control Flow", "Command", "Exit Code"]} /><div style={{height: 26}}/><Bullets items={chapter.bullets ?? []} /></>;
  if (chapter.visual === "demo") return <><Terminal code={chapter.code ?? ""} /><div style={{height: 22}}/><Bullets items={chapter.bullets ?? []} /></>;
  if (chapter.visual === "problem") return <Bullets items={chapter.bullets ?? []} />;
  if (chapter.visual === "outro") return <Flow items={["Parser", "AST", "Interpreter", "Commands", "Virtual FS"]} />;
  return chapter.bullets ? <Bullets items={chapter.bullets} /> : <Terminal code="npm install @demicodes/just-bash" accent={C.blue} />;
};

const ChapterScene: React.FC<{chapter: TimelineChapter}> = ({chapter}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const durationFrames = Math.ceil(((chapter.endMs - chapter.startMs) / 1000) * fps);
  const audioStartFrame = Math.round(((chapter.audioStartMs - chapter.startMs) / 1000) * fps);
  const audioEndFrame = audioStartFrame + Math.ceil((chapter.durationMs / 1000) * fps);
  const speaking = frame >= audioStartFrame && frame <= audioEndFrame;
  const intro = chapter.visual === "intro";
  return (
    <AbsoluteFill style={{opacity: interpolate(frame, [0, 14, durationFrames - 14, durationFrames], [0, 1, 1, 0], {...clamp, easing: ease})}}>
      <div style={{position: "absolute", left: 80, top: 142, width: intro ? 1120 : 1080, display: "flex", flexDirection: "column", gap: 26}}>
        <div style={{display: "flex", alignItems: "center", gap: 18, color: C.cyan, fontSize: 25, fontWeight: 760, letterSpacing: 3}}>
          <span style={{color: C.blue}}>{chapter.number}</span><span>/</span><span>{chapter.shortTitle.toUpperCase()}</span>
        </div>
        <div style={{fontSize: intro ? 104 : 76, lineHeight: 1.04, letterSpacing: -3, fontWeight: 790, color: C.text, maxWidth: 1080}}>{chapter.title}</div>
        {intro ? <div style={{fontSize: 42, color: C.muted, lineHeight: 1.35}}>用 TypeScript 重建一个<br/><span style={{color: C.blue}}>可控制、可组合的虚拟 Shell</span></div> : null}
        <div style={{marginTop: intro ? 24 : 6, width: intro ? 980 : 1040}}><SceneVisual chapter={chapter} /></div>
      </div>
      <Host speaking={speaking} compact={!intro} />
    </AbsoluteFill>
  );
};

export const JustBashPodcast: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"}}>
      <Background />
      <Audio src={staticFile("music/ambient.m4a")} volume={() => 0.28} />
      {timeline.chapters.map((chapter) => {
        const from = Math.round((chapter.startMs / 1000) * 30);
        const duration = Math.max(1, Math.round(((chapter.endMs - chapter.startMs) / 1000) * 30));
        const audioFrom = Math.round((chapter.audioStartMs / 1000) * 30);
        return (
          <React.Fragment key={chapter.id}>
            <Sequence name={`${chapter.number} — ${chapter.title}`} from={from} durationInFrames={duration}><ChapterScene chapter={chapter} /></Sequence>
            <Sequence from={audioFrom} durationInFrames={Math.ceil((chapter.durationMs / 1000) * 30)} layout="none">
              <Audio src={staticFile(chapter.audioFile)} volume={1} />
            </Sequence>
          </React.Fragment>
        );
      })}
      <Header />
      <Captions />
      <div style={{position: "absolute", right: 72, top: 50, color: C.muted, fontSize: 23, zIndex: 12}}>{Math.floor(frame / 30 / 60).toString().padStart(2, "0")}:{Math.floor((frame / 30) % 60).toString().padStart(2, "0")} / 09:03</div>
    </AbsoluteFill>
  );
};
