const { useState, useRef, useEffect } = React;

// ── Design tokens ──────────────────────────────────────────────────────────
// Deep-space navy + electric amber + chalk white
// Display: "Space Grotesk" (geometric, scientific authority)
// Body: "Inter" (clean readability)
// Signature: animated "discovery path" flow indicator between Nature → Equation

const MODULES = [
  {
    id: "M1", label: "Module I", title: "Motion", subtitle: "Kinematics",
    theme: "Nature allows motion to continue naturally.", color: "#F59E0B",
    topics: ["Physical Quantities & Units","Scalars & Vectors","Position & Displacement","Speed & Velocity","Acceleration","Motion Graphs","Projectile Motion","Circular Motion","Rotational Kinematics"],
  },
  {
    id: "M2", label: "Module II", title: "Dynamics", subtitle: "Forces & Interactions",
    theme: "Interactions change motion.", color: "#10B981",
    topics: ["Newton's Laws","Free Body Diagrams","Gravity","Normal Force","Friction & Drag","Springs & Hooke's Law","Torque","Rotational Dynamics","Center of Mass"],
  },
  {
    id: "M3", label: "Module III", title: "Energy", subtitle: "Work & Conservation",
    theme: "Energy transforms while remaining conserved.", color: "#6366F1",
    topics: ["Work","Power","Kinetic Energy","Potential Energy","Conservative Forces","Conservation of Mechanical Energy","Energy Transfer"],
  },
  {
    id: "M4", label: "Module IV", title: "Momentum", subtitle: "Collisions & Impulse",
    theme: "Interactions redistribute motion.", color: "#EC4899",
    topics: ["Linear Momentum","Impulse","Elastic Collisions","Inelastic Collisions","Conservation of Momentum","Center of Mass Motion"],
  },
  {
    id: "M5", label: "Module V", title: "Waves", subtitle: "Oscillations & Sound",
    theme: "Oscillatory motion transports energy.", color: "#14B8A6",
    topics: ["Simple Harmonic Motion","Springs","Pendulums","Mechanical Waves","Standing Waves","Resonance","Sound"],
  },
  {
    id: "M6", label: "Module VI", title: "Thermo", subtitle: "Heat & Entropy",
    theme: "Energy governs heat, work, and disorder.", color: "#F97316",
    topics: ["Temperature & Heat","Thermal Expansion","Ideal Gas Law","Laws of Thermodynamics","Heat Engines","Entropy"],
  },
  {
    id: "M7", label: "Module VII", title: "E & M", subtitle: "Electricity & Magnetism",
    theme: "Electric charge creates electric and magnetic interactions.", color: "#8B5CF6",
    topics: ["Electric Charge","Coulomb's Law","Electric Field","Electric Potential","Capacitance","Current & Resistance","Magnetic Fields","Electromagnetic Induction"],
  },
  {
    id: "M8", label: "Module VIII", title: "Optics", subtitle: "Light & Waves",
    theme: "Light reveals how information propagates through space.", color: "#06B6D4",
    topics: ["Reflection & Refraction","Lenses & Mirrors","Wave Optics","Diffraction","Interference","Polarization"],
  },
  {
    id: "M9", label: "Module IX", title: "Modern", subtitle: "Quantum & Relativity",
    theme: "Nature behaves differently at atomic and cosmic scales.", color: "#EF4444",
    topics: ["Special Relativity","General Relativity","Quantum Mechanics","Atomic Physics","Nuclear Physics","Particle Physics"],
  },
];

const DISCOVERY_PATH = ["Nature","Observation","Pattern","Physical Law","Math","Prediction","Application"];

const LESSON_SECTIONS = [
  "Overview","Learning Objectives","Prerequisite Knowledge",
  "Physical Reality","Observation","Historical Motivation",
  "Scientific Principle","Mathematical Translation","Derivation",
  "Physical Interpretation","Visual Intuition","Worked Example",
  "Alternative Solution","Limiting Cases","Unit Analysis",
  "Common Misconceptions","Real-World Applications",
  "Engineering Applications","Connections to Other Topics",
  "Summary","Key Takeaways","Conceptual Questions",
  "Challenge Problems","Reflection Questions",
];

// ── System prompt builder ─────────────────────────────────────────────────
function buildSystemPrompt(module, topic) {
  return `You are The Nature-First Physics Professor: an elite university physicist and educator whose teaching philosophy is rooted in first principles.

YOUR SACRED RULE: NEVER begin with an equation. ALWAYS follow this discovery order:
Nature → Observation → Pattern → Physical Law → Mathematical Representation → Prediction → Application

The student must think: "The equation was inevitable because I already understood what Nature was doing."

Current lesson: ${topic} (${module.title} — ${module.subtitle})
Module theme: "${module.theme}"

REQUIRED LESSON STRUCTURE — produce exactly these sections in order, using ## headings:
${LESSON_SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n")}

ABSOLUTE PEDAGOGICAL RULES:
1. No equations before intuition is established.
2. Begin with: What is Nature doing? What observation led to this discovery? Why MUST Nature behave this way?
3. Use thought experiments, visual imagination, everyday experiences, and analogies.
4. When introducing math: explain WHY every variable exists, WHY it's multiplied/divided, WHY exponents appear, what each operation PHYSICALLY means.
5. Derive whenever possible — students must know WHERE formulas come from.
6. Before any numerical example: ask "What should physically happen?" — qualitative reasoning first.
7. Worked examples follow this sequence: (1) Physical situation → (2) Interactions → (3) Governing laws → (4) Knowns → (5) Unknowns → (6) Assumptions → (7) Math model → (8) Solve → (9) Check units → (10) Physical reasonableness → (11) Interpret result.
8. Address common misconceptions explicitly.
9. Connect to at least 3 other physics topics / real-world applications.
10. End with conceptual questions + challenge problems students can attempt.

Use LaTeX for all math: inline with $...$ and display with $$...$$
Use **bold** for key terms, > blockquotes for key principles, and --- for section dividers.

Be scientifically rigorous, conversational, encouraging, and free from unnecessary jargon. Suitable for advanced high school through first-year undergraduate.`;
}

// ── Streaming API call ───────────────────────────────────────────────────
async function streamLesson(systemPrompt, userMessage, onChunk, onDone, onError) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json.type === "content_block_delta" && json.delta?.text) {
              onChunk(json.delta.text);
            }
          } catch {}
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err.message);
  }
}

// ── Simple Markdown renderer ─────────────────────────────────────────────
function renderMD(text) {
  // LaTeX placeholders to avoid interference
  const latexBlocks = [];
  let t = text
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => { latexBlocks.push({type:"block",content:m}); return `%%LATEX${latexBlocks.length-1}%%`; })
    .replace(/\$([^$\n]+)\$/g, (_, m) => { latexBlocks.push({type:"inline",content:m}); return `%%LATEX${latexBlocks.length-1}%%`; });

  const lines = t.split("\n");
  const html = [];
  let inUL = false, inOL = false, olCount = 0;

  const closeList = () => {
    if (inUL) { html.push("</ul>"); inUL = false; }
    if (inOL) { html.push("</ol>"); inOL = false; olCount = 0; }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^## (.+)/.test(line)) {
      closeList();
      const h = line.replace(/^## /, "");
      html.push(`<h2 class="md-h2">${inlineFormat(h)}</h2>`);
    } else if (/^### (.+)/.test(line)) {
      closeList();
      html.push(`<h3 class="md-h3">${inlineFormat(line.replace(/^### /,""))}</h3>`);
    } else if (/^> (.+)/.test(line)) {
      closeList();
      html.push(`<blockquote class="md-bq">${inlineFormat(line.replace(/^> /,""))}</blockquote>`);
    } else if (/^---+$/.test(line.trim())) {
      closeList();
      html.push(`<hr class="md-hr"/>`);
    } else if (/^\- (.+)/.test(line)) {
      if (!inUL) { if(inOL){html.push("</ol>");inOL=false;} html.push("<ul class='md-ul'>"); inUL=true; }
      html.push(`<li>${inlineFormat(line.replace(/^\- /,""))}</li>`);
    } else if (/^\d+\. (.+)/.test(line)) {
      if (!inOL) { if(inUL){html.push("</ul>");inUL=false;} html.push("<ol class='md-ol'>"); inOL=true; }
      html.push(`<li>${inlineFormat(line.replace(/^\d+\. /,""))}</li>`);
    } else if (line.trim() === "") {
      closeList();
      html.push("<br/>");
    } else {
      closeList();
      html.push(`<p class="md-p">${inlineFormat(line)}</p>`);
    }
  }
  closeList();

  let result = html.join("");
  // Restore LaTeX
  result = result.replace(/%%LATEX(\d+)%%/g, (_, idx) => {
    const { type, content } = latexBlocks[parseInt(idx)];
    if (type === "block") return `<div class="latex-block">$$${content}$$</div>`;
    return `<span class="latex-inline">$${content}$</span>`;
  });
  return result;
}

function inlineFormat(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='md-code'>$1</code>");
}

// ── MathJax trigger ──────────────────────────────────────────────────────
function MathRenderer({ html }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.MathJax) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, [html]);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Discovery Path Indicator ─────────────────────────────────────────────
function DiscoveryPath({ active }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, flexWrap:"wrap", margin:"12px 0 20px" }}>
      {DISCOVERY_PATH.map((step, i) => (
        <div key={step} style={{ display:"flex", alignItems:"center" }}>
          <div style={{
            padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
            letterSpacing:.5, background: active===i ? "#F59E0B" : "#1E293B",
            color: active===i ? "#0F172A" : "#64748B",
            border: `1px solid ${active===i ? "#F59E0B" : "#1E293B"}`,
            transition:"all .3s",
          }}>{step}</div>
          {i < DISCOVERY_PATH.length - 1 && (
            <div style={{ width:16, height:1, background: active>i ? "#F59E0B" : "#1E293B", transition:"all .3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState("home"); // home | module | lesson
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lessonContent, setLessonContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [pathStep, setPathStep] = useState(0);
  const lessonRef = useRef(null);
  const chatEndRef = useRef(null);

  // Animate discovery path while streaming
  useEffect(() => {
    if (!isStreaming) return;
    let i = 0;
    const iv = setInterval(() => { setPathStep(i % DISCOVERY_PATH.length); i++; }, 900);
    return () => clearInterval(iv);
  }, [isStreaming]);

  useEffect(() => {
    if (!window.MathJax) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [chatHistory, isChatting]);

  function startLesson(module, topic) {
    setSelectedModule(module);
    setSelectedTopic(topic);
    setLessonContent("");
    setChatHistory([]);
    setError("");
    setView("lesson");
    setIsStreaming(true);
    setPathStep(0);

    const sys = buildSystemPrompt(module, topic);
    streamLesson(
      sys,
      `Teach me: ${topic}`,
      (chunk) => setLessonContent(prev => prev + chunk),
      () => { setIsStreaming(false); setPathStep(6); },
      (msg) => { setError(msg); setIsStreaming(false); }
    );
  }

  async function sendChat() {
    if (!chatInput.trim() || isChatting) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role:"user", content: userMsg }];
    setChatHistory(newHistory);
    setIsChatting(true);

    const sys = buildSystemPrompt(selectedModule, selectedTopic) +
      `\n\nThe student has already received the full lesson on "${selectedTopic}". Answer their follow-up question using the same Nature-First philosophy. Be concise but thorough.`;

    const messages = [
      { role:"user", content:`Teach me: ${selectedTopic}` },
      { role:"assistant", content: lessonContent.slice(0,2000) + "\n[lesson continues...]" },
      ...newHistory.map(m => ({ role: m.role, content: m.content })),
    ];

    let reply = "";
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, stream:true, system:sys, messages }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      setChatHistory(h => [...h, { role:"assistant", content:"" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream:true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const j = JSON.parse(line.slice(6));
              if (j.type==="content_block_delta" && j.delta?.text) {
                reply += j.delta.text;
                setChatHistory(h => {
                  const copy = [...h];
                  copy[copy.length-1] = { role:"assistant", content: reply };
                  return copy;
                });
              }
            } catch {}
          }
        }
      }
    } catch(e) { setError(e.message); }
    setIsChatting(false);
  }

  // ── HOME ────────────────────────────────────────────────────────────────
  if (view === "home") return (
    <div style={styles.root}>
      <style>{css}</style>
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoAtom}>
            <div style={styles.nucleus} />
            <div style={styles.orbit1} /><div style={styles.orbit2} />
          </div>
          <div>
            <div style={styles.logoTitle}>Nature-First Physics</div>
            <div style={styles.logoSub}>Equations emerge from understanding — never before it</div>
          </div>
        </div>
        <div style={styles.pillRow}>
          {DISCOVERY_PATH.map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:0 }}>
              <span style={{ ...styles.pill, animationDelay:`${i*0.12}s` }}>{s}</span>
              {i<6 && <span style={styles.arrow}>→</span>}
            </div>
          ))}
        </div>
      </header>

      <div style={styles.grid}>
        {MODULES.map(m => (
          <div key={m.id} style={{ ...styles.card, borderTop:`3px solid ${m.color}` }}
            onClick={() => { setSelectedModule(m); setView("module"); }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <span style={{ fontSize:11, fontWeight:700, color:m.color, letterSpacing:1 }}>{m.label}</span>
              <span style={{ fontSize:11, color:"#475569" }}>{m.topics.length} topics</span>
            </div>
            <div style={styles.cardTitle}>{m.title}</div>
            <div style={styles.cardSub}>{m.subtitle}</div>
            <div style={{ fontSize:12, color:"#64748B", marginTop:8, lineHeight:1.5, fontStyle:"italic" }}>"{m.theme}"</div>
            <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:4 }}>
              {m.topics.slice(0,3).map(t => (
                <span key={t} style={{ fontSize:10, padding:"2px 7px", borderRadius:10, background:"#1E293B", color:"#94A3B8" }}>{t}</span>
              ))}
              {m.topics.length>3 && <span style={{ fontSize:10, color:"#475569" }}>+{m.topics.length-3} more</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.philosophyBox}>
        <div style={{ fontSize:13, color:"#F59E0B", fontWeight:700, letterSpacing:1, marginBottom:8 }}>THE PROFESSOR'S CREED</div>
        <div style={{ fontSize:15, color:"#E2E8F0", lineHeight:1.8, maxWidth:680, margin:"0 auto" }}>
          Every equation you will ever encounter is <strong style={{color:"#F59E0B"}}>inevitable</strong> — not because someone invented it, but because Nature could not work any other way. Your job is not to memorize. Your job is to <em>see</em>.
        </div>
      </div>
    </div>
  );

  // ── MODULE ──────────────────────────────────────────────────────────────
  if (view === "module") return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => setView("home")}>← All Modules</button>
        <span style={{ color: selectedModule.color, fontWeight:700 }}>{selectedModule.label}</span>
      </div>
      <div style={{ padding:"32px 24px 16px", borderBottom:"1px solid #1E293B" }}>
        <div style={{ fontSize:13, color:selectedModule.color, fontWeight:700, letterSpacing:1, marginBottom:4 }}>
          {selectedModule.subtitle.toUpperCase()}
        </div>
        <h1 style={{ margin:0, fontSize:32, color:"#F8FAFC", fontFamily:"'Space Grotesk',sans-serif" }}>
          {selectedModule.title}
        </h1>
        <p style={{ color:"#94A3B8", marginTop:8, fontStyle:"italic" }}>"{selectedModule.theme}"</p>
      </div>
      <div style={{ padding:"24px" }}>
        <div style={{ fontSize:12, color:"#64748B", fontWeight:600, letterSpacing:1, marginBottom:16 }}>SELECT A TOPIC TO BEGIN</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
          {selectedModule.topics.map((t, i) => (
            <button key={t} style={styles.topicBtn} onClick={() => startLesson(selectedModule, t)}>
              <span style={{ color:selectedModule.color, fontWeight:700, fontSize:12 }}>{String(i+1).padStart(2,"0")}</span>
              <span style={{ flex:1, textAlign:"left" }}>{t}</span>
              <span style={{ color:"#475569" }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── LESSON ──────────────────────────────────────────────────────────────
  const renderedLesson = renderMD(lessonContent);

  return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => setView("module")}>← {selectedModule.title}</button>
        <span style={{ color: selectedModule.color, fontWeight:600, fontSize:13 }}>{selectedTopic}</span>
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 52px)" }}>
        {/* Lesson column */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 32px" }} ref={lessonRef}>
          {isStreaming && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#64748B", marginBottom:6 }}>Following the discovery path…</div>
              <DiscoveryPath active={pathStep} />
            </div>
          )}

          {error && (
            <div style={{ background:"#7F1D1D", border:"1px solid #EF4444", padding:16, borderRadius:8, color:"#FCA5A5", marginBottom:16 }}>
              {error}
            </div>
          )}

          {lessonContent ? (
            <div className="lesson-body">
              <MathRenderer html={renderedLesson} />
              {!isStreaming && (
                <div style={{ marginTop:24, padding:"16px", background:"#0F172A", borderRadius:10, border:"1px solid #1E293B" }}>
                  <div style={{ fontSize:12, color:"#F59E0B", fontWeight:700, marginBottom:4 }}>LESSON COMPLETE</div>
                  <div style={{ color:"#94A3B8", fontSize:13 }}>
                    Use the chat panel → to ask follow-up questions, request more examples, or explore connections.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:12 }}>
              <div style={styles.spinner} />
              <div style={{ color:"#475569", fontSize:13 }}>The Professor is observing Nature…</div>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div style={styles.chatPanel}>
          <div style={{ padding:"16px", borderBottom:"1px solid #1E293B" }}>
            <div style={{ fontSize:12, color:"#F59E0B", fontWeight:700 }}>ASK THE PROFESSOR</div>
            <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>Follow-up questions, examples, deeper dives</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:12 }}>
            {chatHistory.length === 0 && (
              <div style={{ color:"#334155", fontSize:12, textAlign:"center", marginTop:20 }}>
                No questions yet. Ask anything about this lesson.
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role==="user" ? "flex-end" : "flex-start",
                maxWidth:"90%",
                background: m.role==="user" ? selectedModule.color : "#1E293B",
                color: m.role==="user" ? "#0F172A" : "#E2E8F0",
                borderRadius: m.role==="user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding:"10px 12px", fontSize:13, lineHeight:1.6,
              }}>
                {m.role==="assistant"
                  ? <MathRenderer html={renderMD(m.content)} />
                  : m.content}
              </div>
            ))}
            {isChatting && chatHistory[chatHistory.length-1]?.role==="user" && (
              <div style={{ alignSelf:"flex-start", color:"#475569", fontSize:12 }}>Thinking…</div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding:12, borderTop:"1px solid #1E293B", display:"flex", gap:8 }}>
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey){e.preventDefault();sendChat();} }}
              placeholder="Ask a follow-up question…"
              rows={2}
              style={styles.chatInput}
            />
            <button onClick={sendChat} disabled={isChatting || !chatInput.trim()} style={{ ...styles.sendBtn, background:selectedModule.color }}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = {
  root: { background:"#0A0F1E", minHeight:"100vh", fontFamily:"'Inter',sans-serif", color:"#E2E8F0" },
  header: { padding:"32px 24px 20px", borderBottom:"1px solid #1E293B", background:"#080D1A" },
  logoRow: { display:"flex", alignItems:"center", gap:16, marginBottom:20 },
  logoTitle: { fontSize:22, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", color:"#F8FAFC", letterSpacing:-0.5 },
  logoSub: { fontSize:12, color:"#64748B", marginTop:2 },
  logoAtom: { position:"relative", width:44, height:44, flexShrink:0 },
  nucleus: { position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:10, height:10, borderRadius:"50%", background:"#F59E0B" },
  orbit1: { position:"absolute", top:2, left:2, right:2, bottom:2, border:"1.5px solid #F59E0B44", borderRadius:"50%", transform:"rotate(30deg)" },
  orbit2: { position:"absolute", top:2, left:2, right:2, bottom:2, border:"1.5px solid #6366F144", borderRadius:"50%", transform:"rotate(-30deg)" },
  pillRow: { display:"flex", alignItems:"center", flexWrap:"wrap", gap:4 },
  pill: { fontSize:11, padding:"3px 10px", borderRadius:20, background:"#1E293B", color:"#94A3B8", fontWeight:600 },
  arrow: { color:"#334155", fontSize:12, margin:"0 2px" },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16, padding:24 },
  card: { background:"#0F172A", borderRadius:12, padding:18, cursor:"pointer", transition:"transform .15s, box-shadow .15s", border:"1px solid #1E293B" },
  cardTitle: { fontSize:22, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", marginTop:10, color:"#F8FAFC" },
  cardSub: { fontSize:12, color:"#64748B", marginTop:2, fontWeight:600, letterSpacing:.5 },
  philosophyBox: { margin:"8px 24px 32px", padding:"24px", background:"#080D1A", border:"1px solid #1E293B", borderRadius:12, textAlign:"center" },
  topBar: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:"1px solid #1E293B", background:"#080D1A", position:"sticky", top:0, zIndex:10 },
  backBtn: { background:"none", border:"1px solid #1E293B", color:"#94A3B8", padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:13 },
  topicBtn: { display:"flex", alignItems:"center", gap:12, background:"#0F172A", border:"1px solid #1E293B", color:"#CBD5E1", padding:"14px 16px", borderRadius:10, cursor:"pointer", fontSize:14, transition:"background .15s" },
  chatPanel: { width:320, borderLeft:"1px solid #1E293B", display:"flex", flexDirection:"column", background:"#080D1A", flexShrink:0 },
  chatInput: { flex:1, background:"#0F172A", border:"1px solid #1E293B", color:"#E2E8F0", borderRadius:8, padding:"8px 10px", fontSize:13, resize:"none", fontFamily:"inherit", outline:"none" },
  sendBtn: { width:40, height:40, borderRadius:8, border:"none", cursor:"pointer", fontSize:18, color:"#0F172A", fontWeight:700, alignSelf:"flex-end", flexShrink:0 },
  spinner: { width:32, height:32, border:"3px solid #1E293B", borderTop:"3px solid #F59E0B", borderRadius:"50%", animation:"spin 1s linear infinite" },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
.lesson-body h2.md-h2 { color: #F8FAFC; font-family: 'Space Grotesk', sans-serif; font-size: 20px; margin: 32px 0 10px; padding-bottom: 8px; border-bottom: 1px solid #1E293B; }
.lesson-body h3.md-h3 { color: #94A3B8; font-size: 15px; margin: 20px 0 8px; font-weight: 600; }
.lesson-body p.md-p { color: #CBD5E1; line-height: 1.8; margin: 8px 0; font-size: 15px; }
.lesson-body ul.md-ul, .lesson-body ol.md-ol { color: #CBD5E1; line-height: 1.9; font-size: 15px; padding-left: 24px; margin: 8px 0; }
.lesson-body blockquote.md-bq { border-left: 3px solid #F59E0B; margin: 16px 0; padding: 10px 16px; background: #0F1929; color: #FCD34D; font-style: italic; border-radius: 0 8px 8px 0; }
.lesson-body hr.md-hr { border: none; border-top: 1px solid #1E293B; margin: 24px 0; }
.lesson-body code.md-code { background: #1E293B; color: #38BDF8; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
.lesson-body .latex-block { text-align: center; margin: 20px 0; padding: 16px; background: #0F172A; border: 1px solid #1E293B; border-radius: 8px; color: #A5F3FC; overflow-x: auto; }
.lesson-body .latex-inline { color: #A5F3FC; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.lesson-body h2 { animation: fadeUp .3s ease; }
button:hover { opacity: 0.88; }
`;
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
