import { useState, useRef, useCallback } from "react";

const GOOGLE_BLUE = "#1a73e8";
const GOOGLE_BLUE_DARK = "#1557b0";

/* ── Syntax Highlight ─────────────────────────────────────────────── */
const KEYWORDS = /\b(public|private|protected|class|extends|implements|new|return|if|else|while|for|do|break|continue|static|final|void|true|false|null|this|super|import|package|try|catch|throw|throws|instanceof|enum|interface)\b/g;
const TYPES    = /\b(DcMotor|DcMotorEx|Servo|CRServo|ColorSensor|DistanceSensor|IMU|TouchSensor|DigitalChannel|AnalogInput|HardwareMap|LinearOpMode|OpMode|Telemetry|ElapsedTime|RevHubOrientationOnRobot|YawPitchRollAngles|AngleUnit|double|int|long|boolean|String|float|char|byte|short|Object|List|ArrayList|Math|GamepadButton)\b/g;
const ANNOTS   = /(@\w+)/g;
const STRINGS  = /"([^"\\]|\\.)*"/g;
const NUMBERS  = /\b(\d+(\.\d+)?[fdlLfF]?)\b/g;
const LINE_CMT = /(\/\/[^\n]*)/g;
const BLK_CMT  = /(\/\*[\s\S]*?\*\/)/g;

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function highlight(code) {
  let r = escHtml(code);
  const strs = [], bcms = [], lcms = [];
  r = r.replace(STRINGS,  m => { strs.push(m); return `\x00S${strs.length-1}\x00`; });
  r = r.replace(BLK_CMT,  m => { bcms.push(m); return `\x00B${bcms.length-1}\x00`; });
  r = r.replace(LINE_CMT, m => { lcms.push(m); return `\x00L${lcms.length-1}\x00`; });
  r = r.replace(KEYWORDS, m => `<span style="color:#569cd6">${m}</span>`);
  r = r.replace(TYPES,    m => `<span style="color:#4ec9b0">${m}</span>`);
  r = r.replace(ANNOTS,   m => `<span style="color:#dcdcaa">${m}</span>`);
  r = r.replace(NUMBERS,  m => `<span style="color:#b5cea8">${m}</span>`);
  r = r.replace(/\x00S(\d+)\x00/g, (_,i) => `<span style="color:#ce9178">${strs[i]}</span>`);
  r = r.replace(/\x00B(\d+)\x00/g, (_,i) => `<span style="color:#6a9955;font-style:italic">${bcms[i]}</span>`);
  r = r.replace(/\x00L(\d+)\x00/g, (_,i) => `<span style="color:#6a9955;font-style:italic">${lcms[i]}</span>`);
  return r;
}

/* ── Small UI pieces ──────────────────────────────────────────────── */
function Tag({ color, bg, border, children }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      background: bg, color, border:`1px solid ${border}`,
      borderRadius:4, padding:"2px 8px",
      fontFamily:"'Roboto Mono',monospace", fontSize:"0.68rem",
      fontWeight:500, whiteSpace:"nowrap", flexShrink:0, marginTop:1
    }}>{children}</span>
  );
}

const TAG_STYLES = {
  motor:   { color:"#f9ab00", bg:"#fef7e0", border:"#f9ab0044" },
  servo:   { color:"#7b1fa2", bg:"#f3e8fd", border:"#7b1fa244" },
  sensor:  { color:"#188038", bg:"#e6f4ea", border:"#18803344" },
  gamepad: { color:"#1a73e8", bg:"#e8f0fe", border:"#1a73e844" },
  note:    { color:"#c62828", bg:"#fce8e6", border:"#c6282844" },
};

function Card({ icon, iconBg, iconColor, title, subtitle, children, delay=0 }) {
  return (
    <div style={{
      background:"#fff", borderRadius:8, border:"1px solid #dadce0",
      marginBottom:16, overflow:"hidden",
      boxShadow:"0 1px 2px rgba(60,64,67,.15)",
      animation:`fadeUp 0.3s ease ${delay}s both`
    }}>
      <div style={{
        padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
        borderBottom:"1px solid #f1f3f4"
      }}>
        <div style={{
          width:36, height:36, borderRadius:8, flexShrink:0,
          background:iconBg, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, color:iconColor
        }}>{icon}</div>
        <div>
          <div style={{fontFamily:"'Google Sans',sans-serif", fontSize:"0.95rem", fontWeight:500, color:"#202124"}}>{title}</div>
          <div style={{fontSize:"0.75rem", color:"#5f6368", marginTop:1}}>{subtitle}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ListItem({ tag, primary, secondary }) {
  return (
    <div style={{
      padding:"10px 16px", display:"flex", alignItems:"flex-start", gap:12,
      borderBottom:"1px solid #f8f9fa"
    }}>
      <Tag {...TAG_STYLES[tag]}>{tag.toUpperCase()}</Tag>
      <div style={{flex:1}}>
        {primary && <div style={{fontFamily:"'Roboto Mono',monospace", fontSize:"0.82rem", fontWeight:500, color:"#202124"}}>{primary}</div>}
        {secondary && <div style={{fontSize:"0.8rem", color:"#5f6368", marginTop:3, lineHeight:1.5}}>{secondary}</div>}
      </div>
    </div>
  );
}

/* ── Main App ──────────────────────────────────────────────────────── */
export default function App() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const taRef = useRef(null);
  const hlRef = useRef(null);

  const lines = code.split("\n");
  const lineCount = lines.length;

  const onInput = useCallback((e) => {
    setCode(e.target.value);
    if (hlRef.current) {
      hlRef.current.innerHTML = highlight(e.target.value) + "\n";
    }
  }, []);

  const syncScroll = useCallback(() => {
    if (taRef.current && hlRef.current) {
      hlRef.current.scrollTop  = taRef.current.scrollTop;
      hlRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }, []);

  const handleTab = useCallback((e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current;
      const s = ta.selectionStart;
      const newVal = ta.value.substring(0,s) + "    " + ta.value.substring(ta.selectionEnd);
      setCode(newVal);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = s + 4;
      if (hlRef.current) hlRef.current.innerHTML = highlight(newVal) + "\n";
    }
  }, []);

  const clearAll = () => {
    setCode(""); setResult(null); setError("");
    if (taRef.current) taRef.current.value = "";
    if (hlRef.current) hlRef.current.innerHTML = "";
  };

  const analyze = async () => {
    if (!code.trim()) { alert("Paste some FTC Java code first!"); return; }
    setLoading(true); setResult(null); setError("");

    const prompt = `You are an FTC (First Tech Challenge) robot code expert. Analyze this Java OpMode and return ONLY valid JSON (no markdown fences, no explanation):

{
  "summary": "2-3 sentence plain-English description of what this robot program does.",
  "opmode_type": "TeleOp or Autonomous or Unknown",
  "opmode_name": "name string from the annotation",
  "motors": [{ "config_name": "hardwareMap name", "variable_name": "java var", "description": "what it does, direction, mode" }],
  "servos": [{ "config_name": "hardwareMap name", "variable_name": "java var", "description": "what it does, positions used" }],
  "sensors": [{ "config_name": "hardwareMap name", "type": "class name", "description": "what it is used for" }],
  "gamepad_controls": [{ "control": "gamepad1.x", "description": "what it controls" }],
  "other_notes": ["important details: encoders, sleep, telemetry, PID, zero power behavior, etc."]
}

Java Code:
${code}`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content.map(c => c.text || "").join("").replace(/```json|```/g,"").trim();
      setResult(JSON.parse(raw));
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const monoFont = "'Roboto Mono', 'Courier New', monospace";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500&family=Roboto+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Roboto', sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 3px; }
      `}</style>

      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f8f9fa" }}>

        {/* APP BAR */}
        <div style={{
          background:"#fff", borderBottom:"1px solid #dadce0", height:56,
          display:"flex", alignItems:"center", padding:"0 20px", gap:12,
          boxShadow:"0 1px 3px rgba(60,64,67,.15)", flexShrink:0, zIndex:10
        }}>
          <div style={{
            width:36, height:36, borderRadius:8, background:GOOGLE_BLUE,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontFamily:"'Google Sans',sans-serif", fontWeight:700, fontSize:"0.78rem"
          }}>FTC</div>
          <span style={{fontFamily:"'Google Sans',sans-serif", fontSize:"1.1rem", color:"#202124"}}>
            Code <strong style={{color:GOOGLE_BLUE}}>Analyzer</strong>
          </span>
          <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:6,
            border:"1px solid #dadce0", borderRadius:100, padding:"4px 12px 4px 8px",
            fontSize:"0.78rem", color:"#5f6368", fontFamily:"'Google Sans',sans-serif"
          }}>
            <span style={{color:GOOGLE_BLUE, fontSize:16}}>✦</span> AI Powered
          </div>
        </div>

        {/* LAYOUT */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", flex:1, minHeight:0 }}>

          {/* ── LEFT: Editor ── */}
          <div style={{ display:"flex", flexDirection:"column", borderRight:"1px solid #dadce0", background:"#1e1e1e" }}>

            {/* Editor toolbar */}
            <div style={{
              background:"#2d2d2d", borderBottom:"1px solid #3a3a3a",
              padding:"6px 14px", display:"flex", alignItems:"center", gap:8
            }}>
              <span style={{color:"#888", fontSize:14}}>{"</>"}</span>
              <span style={{fontFamily:monoFont, fontSize:"0.75rem", color:"#ccc", flex:1}}>MyOpMode.java</span>
              <span style={{
                background:"rgba(79,193,255,0.12)", color:"#4fc1ff",
                border:"1px solid rgba(79,193,255,0.3)", borderRadius:4,
                padding:"1px 8px", fontFamily:monoFont, fontSize:"0.68rem"
              }}>Java</span>
            </div>

            {/* Code editor with line numbers */}
            <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

              {/* Line numbers */}
              <div style={{
                background:"#1e1e1e", borderRight:"1px solid #333",
                padding:"14px 10px 14px 6px",
                fontFamily:monoFont, fontSize:"0.78rem", lineHeight:"1.7",
                color:"#4a4a4a", textAlign:"right", userSelect:"none",
                overflowY:"hidden", flexShrink:0, minWidth:44,
                pointerEvents:"none"
              }}>
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Highlight + textarea overlay */}
              <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
                <div ref={hlRef}
                  dangerouslySetInnerHTML={{ __html: highlight(code) + "\n" }}
                  style={{
                    position:"absolute", inset:0,
                    padding:"14px 14px",
                    fontFamily:monoFont, fontSize:"0.78rem", lineHeight:"1.7",
                    color:"#d4d4d4", whiteSpace:"pre", overflow:"auto",
                    pointerEvents:"none", tabSize:4
                  }}
                />
                <textarea
                  ref={taRef}
                  defaultValue={code}
                  onInput={onInput}
                  onScroll={syncScroll}
                  onKeyDown={handleTab}
                  spellCheck={false}
                  placeholder={"// Paste your FTC Java OpMode here...\n// Motors, servos, sensors will all be detected!"}
                  style={{
                    position:"absolute", inset:0,
                    padding:"14px 14px",
                    fontFamily:monoFont, fontSize:"0.78rem", lineHeight:"1.7",
                    color:"transparent", caretColor:"#fff",
                    background:"transparent", border:"none", outline:"none",
                    resize:"none", tabSize:4, whiteSpace:"pre", overflow:"auto", zIndex:2
                  }}
                />
              </div>
            </div>

            {/* Editor footer */}
            <div style={{
              background:"#2d2d2d", borderTop:"1px solid #3a3a3a",
              padding:"8px 14px", display:"flex", alignItems:"center", gap:10
            }}>
              <button onClick={analyze} disabled={loading} style={{
                display:"inline-flex", alignItems:"center", gap:6,
                background: loading ? "#80868b" : GOOGLE_BLUE,
                color:"#fff", border:"none", borderRadius:4,
                padding:"7px 18px", fontFamily:"'Google Sans',sans-serif",
                fontWeight:500, fontSize:"0.85rem", cursor: loading ? "not-allowed" : "pointer",
                boxShadow:"0 1px 3px rgba(0,0,0,.3)", transition:"background .15s"
              }}>
                {loading ? "⏳" : "▶"} {loading ? "Analyzing..." : "Analyze"}
              </button>
              <button onClick={clearAll} style={{
                background:"transparent", color:"#aaa", border:"1px solid #444",
                borderRadius:4, padding:"7px 14px", fontFamily:"'Google Sans',sans-serif",
                fontSize:"0.85rem", cursor:"pointer"
              }}>Clear</button>
              <span style={{ marginLeft:"auto", fontFamily:monoFont, fontSize:"0.7rem", color:"#666" }}>
                {lineCount} line{lineCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── RIGHT: Results ── */}
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{
              background:"#fff", borderBottom:"1px solid #dadce0",
              padding:"10px 18px", display:"flex", alignItems:"center", gap:8,
              fontFamily:"'Google Sans',sans-serif", fontSize:"0.85rem", color:"#5f6368", flexShrink:0
            }}>
              <span style={{color:GOOGLE_BLUE}}>📊</span> Analysis Results
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:18 }}>

              {/* Placeholder */}
              {!loading && !result && !error && (
                <div style={{ textAlign:"center", padding:"60px 30px", color:"#9aa0a6" }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>⚙️</div>
                  <div style={{ fontFamily:"'Google Sans',sans-serif", fontSize:"1rem", color:"#80868b", marginBottom:8 }}>
                    Paste your Java code and click Analyze
                  </div>
                  <div style={{ fontSize:"0.82rem", lineHeight:1.6 }}>
                    Motors, servos, sensors, gamepad controls<br/>and more will appear here.
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div style={{ textAlign:"center", padding:"60px 30px" }}>
                  <div style={{
                    width:44, height:44, borderRadius:"50%", margin:"0 auto 18px",
                    border:"3px solid #dadce0", borderTopColor:GOOGLE_BLUE,
                    animation:"spin 0.7s linear infinite"
                  }}/>
                  <div style={{ fontFamily:"'Google Sans',sans-serif", color:"#5f6368" }}>
                    Analyzing robot code...
                  </div>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background:"#fce8e6", border:"1px solid #f5c6c2", borderRadius:8,
                  padding:"14px 18px", display:"flex", gap:12, alignItems:"flex-start"
                }}>
                  <span style={{ color:"#d93025", fontSize:20 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight:500, color:"#a50e0e", marginBottom:4 }}>Analysis failed</div>
                    <div style={{ fontSize:"0.82rem", color:"#c62828", lineHeight:1.5 }}>{error}</div>
                  </div>
                </div>
              )}

              {/* Results */}
              {result && (<>

                {/* Summary */}
                <Card icon="📋" iconBg="#e8f0fe" iconColor={GOOGLE_BLUE}
                  title="Program Summary" subtitle={`${result.opmode_type} · ${result.opmode_name}`} delay={0}>
                  <div style={{ padding:16 }}>
                    <p style={{ fontSize:"0.88rem", color:"#202124", lineHeight:1.65 }}>{result.summary}</p>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        background:"#f1f3f4", border:"1px solid #dadce0", borderRadius:100,
                        padding:"3px 12px", fontSize:"0.78rem", fontFamily:"'Google Sans',sans-serif", color:"#202124"
                      }}>Type: <strong style={{color:GOOGLE_BLUE}}>{result.opmode_type}</strong></span>
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        background:"#f1f3f4", border:"1px solid #dadce0", borderRadius:100,
                        padding:"3px 12px", fontSize:"0.78rem", fontFamily:"'Google Sans',sans-serif", color:"#202124"
                      }}>Name: <strong style={{color:GOOGLE_BLUE}}>{result.opmode_name}</strong></span>
                    </div>
                  </div>
                </Card>

                {/* Motors */}
                {result.motors?.length > 0 && (
                  <Card icon="⚙️" iconBg="#fef7e0" iconColor="#f9ab00"
                    title="Motors" subtitle={`${result.motors.length} detected`} delay={0.05}>
                    {result.motors.map((m,i) => (
                      <ListItem key={i} tag="motor"
                        primary={<>{m.config_name} <span style={{color:"#9aa0a6",fontWeight:400}}>→ {m.variable_name}</span></>}
                        secondary={m.description} />
                    ))}
                  </Card>
                )}

                {/* Servos */}
                {result.servos?.length > 0 && (
                  <Card icon="🔄" iconBg="#f3e8fd" iconColor="#7b1fa2"
                    title="Servos" subtitle={`${result.servos.length} detected`} delay={0.1}>
                    {result.servos.map((s,i) => (
                      <ListItem key={i} tag="servo"
                        primary={<>{s.config_name} <span style={{color:"#9aa0a6",fontWeight:400}}>→ {s.variable_name}</span></>}
                        secondary={s.description} />
                    ))}
                  </Card>
                )}

                {/* Sensors */}
                {result.sensors?.length > 0 && (
                  <Card icon="📡" iconBg="#e6f4ea" iconColor="#188038"
                    title="Sensors" subtitle={`${result.sensors.length} detected`} delay={0.15}>
                    {result.sensors.map((s,i) => (
                      <ListItem key={i} tag="sensor"
                        primary={<>{s.config_name} <span style={{color:"#9aa0a6",fontWeight:400}}>({s.type})</span></>}
                        secondary={s.description} />
                    ))}
                  </Card>
                )}

                {/* Gamepad */}
                {result.gamepad_controls?.length > 0 && (
                  <Card icon="🎮" iconBg="#e8f0fe" iconColor={GOOGLE_BLUE}
                    title="Gamepad Controls" subtitle={`${result.gamepad_controls.length} bindings`} delay={0.2}>
                    {result.gamepad_controls.map((g,i) => (
                      <ListItem key={i} tag="gamepad" primary={g.control} secondary={g.description} />
                    ))}
                  </Card>
                )}

                {/* Notes */}
                {result.other_notes?.length > 0 && (
                  <Card icon="📝" iconBg="#fce8e6" iconColor="#c62828"
                    title="Additional Notes" subtitle={`${result.other_notes.length} notes`} delay={0.25}>
                    {result.other_notes.map((n,i) => (
                      <ListItem key={i} tag="note" secondary={n} />
                    ))}
                  </Card>
                )}
              </>)}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}