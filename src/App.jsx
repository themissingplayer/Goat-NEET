import { useState, useEffect, useRef } from 'react'
import {
  Flame, Zap, Target, Brain, BookOpen, PenTool, RotateCcw,
  Play, Pause, SkipForward, RefreshCw, Home, Bot, Clock,
  MoreHorizontal, Plus, LogOut, ChevronDown, ChevronUp, Wind,
  Dumbbell, NotebookPen, Sparkles, Activity, Shield,
  ArrowRight, BookMarked, Check, CheckCircle2, Layers, Timer as TimerIcon
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { getStudyPlan, getErrorVaultQuestion, getDailyMotivation, getMeditationScript } from './lib/gemini'

const SUBJECTS = ['biology', 'physics', 'chemistry']
const SUBJECT_COLORS = { biology: '#00ffa3', physics: '#00c8ff', chemistry: '#ff9500' }
const MOODS = ['Focused', 'Good', 'Okay', 'Tired', 'Stressed']
const MOOD_COLORS = { Focused: '#00ffa3', Good: '#00c8ff', Okay: '#ff9500', Tired: '#bf5af2', Stressed: '#ff375f' }
const WORKOUTS = [
  { id: 1, name: '20 Push-ups', Icon: Dumbbell, detail: 'Upper body · 3 sets', color: '#00ffa3' },
  { id: 2, name: '30 Squats', Icon: Activity, detail: 'Lower body · 2 sets', color: '#00c8ff' },
  { id: 3, name: '1 min Plank', Icon: Shield, detail: 'Core stability · 2 sets', color: '#bf5af2' },
  { id: 4, name: '10 min Walk', Icon: Target, detail: 'Active recovery · 1 round', color: '#ff9500' },
  { id: 5, name: 'Neck Rolls', Icon: RotateCcw, detail: 'Tension relief · 5 each', color: '#ff375f' },
]
const fmt = (s) => String(Math.floor(s)).padStart(2, '0')
const timeStr = (secs) => `${fmt(secs / 60)}:${fmt(secs % 60)}`

// ── AUTH ──────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError(''); setSuccess('')
    if (!email || !password) return setError('Please fill all fields')
    setLoading(true)
    try {
      if (tab === 'signup') {
        if (!name) { setLoading(false); return setError('Please enter your name') }
        const { error: e } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (e) throw e
        setSuccess('Check your email to confirm your account')
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) throw e
        onAuth(data.user)
      }
    } catch (e) { setError(e.message || 'Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo-wrap anim-fade-up">
        <div className="auth-logo">GOAT NEET</div>
        <div className="auth-tagline">Elite Preparation OS · AI-Powered</div>
        <div className="auth-pulse" />
      </div>
      <div className="auth-card anim-fade-up-1">
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>Login</button>
          <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError(''); setSuccess('') }}>Sign Up</button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        {tab === 'signup' && (
          <div className="input-group">
            <label>Your Name</label>
            <input placeholder="e.g. Gulshan" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="input-group">
          <label>Email</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Create Account'}
        </button>
      </div>
    </div>
  )
}

// ── ONBOARDING ────────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [studentType, setStudentType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [weakSubjects, setWeakSubjects] = useState([])
  const [weakChapters, setWeakChapters] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState('')
  const [loading, setLoading] = useState(false)
  const toggle = (s) => setWeakSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  async function finish() {
    setLoading(true)
    try {
      await supabase.from('user_profiles').update({
        student_type: studentType, start_date: startDate,
        weak_subjects: weakSubjects.join(','), weak_chapters: weakChapters,
        hours_per_day: parseInt(hoursPerDay) || 8, onboarded: true
      }).eq('id', user.id)
      try {
        const plan = await getStudyPlan({
          name: user.user_metadata?.display_name || 'Student',
          studentType, startDate, weakSubjects: weakSubjects.join(', '), weakChapters, hoursPerDay
        })
        if (plan?.weekPlan) {
          await supabase.from('study_plans').insert(plan.weekPlan.map(day => ({
            user_id: user.id, day_name: day.day, subject: day.subject, chapter: day.chapter,
            lecture_task: day.phases.lecture, practice_task: day.phases.practice,
            revision_task: day.phases.revision, error_fix_task: day.phases.errorFix,
            quote: day.quote, tip: day.tip
          })))
        }
      } catch (e) { console.error(e) }
      onComplete()
    } catch (e) { console.error(e); onComplete() }
    finally { setLoading(false) }
  }

  return (
    <div className="onboarding">
      <div className="progress-track">
        <div className="progress-track-fill" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      {step === 1 && (
        <div className="anim-fade-up">
          <div className="onboarding-step">Step 1 of 4</div>
          <div className="onboarding-title">Who are you,<br /><span>NEET warrior?</span></div>
          <div className="input-group">
            <label>I am currently</label>
            <div className="chip-group mt-8">
              {['Class 11th', 'Class 12th', 'Dropper (1st)', 'Dropper (2nd+)'].map(t => (
                <div key={t} className={`chip ${studentType === t ? 'selected' : ''}`} onClick={() => setStudentType(t)}>{t}</div>
              ))}
            </div>
          </div>
          <div className="input-group mt-24">
            <label>Preparation Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <button className="btn-primary mt-24" onClick={() => studentType && setStep(2)} disabled={!studentType}>
            Continue <ArrowRight size={15} style={{ display: 'inline', marginLeft: 4 }} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="anim-fade-up">
          <div className="onboarding-step">Step 2 of 4</div>
          <div className="onboarding-title">Your <span>weak spots</span></div>
          <div className="input-group">
            <label>Weak subjects</label>
            <div className="chip-group mt-8">
              {SUBJECTS.map(s => (
                <div key={s} className={`chip ${weakSubjects.includes(s) ? 'selected' : ''}`} onClick={() => toggle(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </div>
              ))}
              <div className={`chip ${weakSubjects.length === 0 ? 'selected' : ''}`} onClick={() => setWeakSubjects([])}>All solid</div>
            </div>
          </div>
          <div className="input-group mt-24">
            <label>Specific weak chapters</label>
            <textarea placeholder="e.g. Thermodynamics, Genetics, Organic Chemistry..." value={weakChapters} onChange={e => setWeakChapters(e.target.value)} style={{ minHeight: 80, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="anim-fade-up">
          <div className="onboarding-step">Step 3 of 4</div>
          <div className="onboarding-title">Daily <span>capacity</span></div>
          <div className="input-group">
            <label>Hours available per day</label>
            <div className="chip-group mt-8">
              {['4', '6', '8', '10', '12+'].map(h => (
                <div key={h} className={`chip ${hoursPerDay === h ? 'selected' : ''}`} onClick={() => setHoursPerDay(h)}>{h} hrs</div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 32, padding: 18, background: 'rgba(0,255,163,0.04)', borderRadius: 16, border: '1px solid rgba(0,255,163,0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--green)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Atomic Habits — James Clear</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, fontStyle: 'italic' }}>"You don't rise to the level of your goals. You fall to the level of your systems."</div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={() => hoursPerDay && setStep(4)} disabled={!hoursPerDay}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="anim-fade-up">
          <div className="onboarding-step">Step 4 of 4</div>
          <div className="onboarding-title">AI crafting your<br /><span>personal plan</span></div>
          <div style={{ marginTop: 24, padding: 18, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Profile</div>
            {[['Target', studentType], startDate ? ['Started', startDate] : null, ['Weak Areas', weakSubjects.length ? weakSubjects.join(', ') : 'None'], ['Daily Study', `${hoursPerDay} hours`]].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-24" onClick={finish} disabled={loading}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Building AI plan...</span>
              : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Sparkles size={16} />Launch GOAT NEET</span>}
          </button>
        </div>
      )}
    </div>
  )
}

// ── TIMER ─────────────────────────────────────────────────────
function TimerScreen() {
  const [mode, setMode] = useState('pomodoro')
  const [phase, setPhase] = useState('focus')
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(25 * 60)
  const [customMins, setCustomMins] = useState(45)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)
  const total = mode === 'flow' ? customMins * 60 : phase === 'focus' ? 25 * 60 : 5 * 60
  const color = phase === 'focus' ? '#00ffa3' : '#00c8ff'
  const r = 96; const circ = 2 * Math.PI * r
  const offset = circ - ((total - secs) / total) * circ

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current); setRunning(false)
            if (mode === 'pomodoro') {
              if (phase === 'focus') { setSessions(n => n + 1); setPhase('break'); return 5 * 60 }
              else { setPhase('focus'); return 25 * 60 }
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, phase])

  function switchMode(m) { setMode(m); setRunning(false); clearInterval(intervalRef.current); setSecs(m === 'flow' ? customMins * 60 : 25 * 60); setPhase('focus') }
  function reset() { setRunning(false); clearInterval(intervalRef.current); setSecs(mode === 'flow' ? customMins * 60 : phase === 'focus' ? 25 * 60 : 5 * 60) }

  return (
    <div className="timer-screen">
      <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 24 }}>Focus Timer</div>
      <div className="timer-toggle">
        <button className={`timer-mode-btn ${mode === 'pomodoro' ? 'active' : ''}`} onClick={() => switchMode('pomodoro')}>
          <TimerIcon size={13} /> Pomodoro
        </button>
        <button className={`timer-mode-btn ${mode === 'flow' ? 'active' : ''}`} onClick={() => switchMode('flow')}>
          <Layers size={13} /> Flow
        </button>
      </div>
      {mode === 'flow' && !running && (
        <div className="chip-group" style={{ justifyContent: 'center', marginTop: 16 }}>
          {[30, 45, 60, 90].map(m => (
            <div key={m} className={`chip ${customMins === m ? 'selected' : ''}`} onClick={() => { setCustomMins(m); setSecs(m * 60) }} style={{ padding: '7px 14px', fontSize: 12 }}>{m}m</div>
          ))}
        </div>
      )}
      <div className="timer-circle">
        <svg className="timer-svg" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 10px ${color}50)` }} />
        </svg>
        <div className="timer-text">
          <div className="timer-time" style={{ color }}>{timeStr(secs)}</div>
          <div className="timer-phase-label">{mode === 'flow' ? 'Flow State' : phase === 'focus' ? 'Focus' : 'Break'}</div>
          {sessions > 0 && <div className="timer-sessions">{sessions} sessions done</div>}
        </div>
      </div>
      <div className="timer-controls">
        <button className="btn-circle" onClick={reset}><RefreshCw size={17} /></button>
        <button className="btn-circle primary" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: running ? `0 0 24px ${color}40` : 'none' }} onClick={() => setRunning(r => !r)}>
          {running ? <Pause size={24} fill="#000" color="#000" /> : <Play size={24} fill="#000" color="#000" />}
        </button>
        <button className="btn-circle" onClick={() => { const n = phase === 'focus' ? 'break' : 'focus'; setPhase(n); setSecs(n === 'focus' ? 25 * 60 : 5 * 60); setRunning(false) }}>
          <SkipForward size={17} />
        </button>
      </div>
      <div className="timer-info">
        <div style={{ fontSize: 9, color: 'var(--green)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
          {mode === 'pomodoro' ? 'Pomodoro Technique' : 'Flow State — Csikszentmihalyi'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          {mode === 'pomodoro' ? '25 min deep focus · 5 min break · 4 rounds = long break' : 'One goal. Zero distractions. Let your brain enter the zone naturally.'}
        </div>
      </div>
    </div>
  )
}

// ── MEDITATION ────────────────────────────────────────────────
function MeditationScreen() {
  const [phase, setPhase] = useState('idle')
  const [count, setCount] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [totalCycles] = useState(8)
  const [duration, setDuration] = useState(5)
  const [aiScript, setAiScript] = useState(null)
  const [loadingScript, setLoadingScript] = useState(false)
  const toRef = useRef(null); const ivRef = useRef(null)
  const PHASES = [
    { name: 'inhale', label: 'Inhale', duration: 4, color: '#00ffa3', message: 'Breathe In', note: 'Fill your lungs completely. Feel your chest expand.' },
    { name: 'hold', label: 'Hold', duration: 4, color: '#00c8ff', message: 'Hold', note: 'Stay calm. Let oxygen absorb fully.' },
    { name: 'exhale', label: 'Exhale', duration: 6, color: '#bf5af2', message: 'Release', note: 'Let go of all tension. Empty completely.' },
  ]

  async function loadAiScript() {
    setLoadingScript(true)
    try { const s = await getMeditationScript(duration); setAiScript(s) } catch (e) { console.error(e) }
    setLoadingScript(false)
  }

  function runPhase(pi, cn) {
    if (cn >= totalCycles) { setPhase('done'); setCount(0); return }
    const p = PHASES[pi]; setPhase(p.name); setCount(p.duration)
    let rem = p.duration; clearInterval(ivRef.current)
    ivRef.current = setInterval(() => {
      rem -= 1; setCount(rem)
      if (rem <= 0) {
        clearInterval(ivRef.current)
        const next = (pi + 1) % 3
        if (next === 0) setCycle(c => c + 1)
        toRef.current = setTimeout(() => runPhase(next, next === 0 ? cn + 1 : cn), 300)
      }
    }, 1000)
  }

  function start() { setCycle(0); runPhase(0, 0) }
  function stop() { clearTimeout(toRef.current); clearInterval(ivRef.current); setPhase('idle'); setCount(0); setCycle(0) }
  useEffect(() => () => { clearTimeout(toRef.current); clearInterval(ivRef.current) }, [])

  const cp = PHASES.find(p => p.name === phase)
  const breathClass = ['inhale', 'hold', 'exhale'].includes(phase) ? `breathing-${phase}` : ''

  return (
    <div className="meditation-screen">
      <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Breathe & Recover</div>
      {phase === 'idle' && (
        <div style={{ width: '100%', maxWidth: 320, marginTop: 32 }} className="anim-fade-up">
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, textAlign: 'center' }}>Choose duration</div>
          <div className="chip-group" style={{ justifyContent: 'center', marginBottom: 28 }}>
            {[3, 5, 7, 10].map(d => <div key={d} className={`chip ${duration === d ? 'selected' : ''}`} onClick={() => setDuration(d)}>{d} min</div>)}
          </div>
          <button className="btn-primary" onClick={start} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Wind size={16} /> Start Breathing
          </button>
          <button className="btn-primary mt-8" style={{ background: 'transparent', color: 'var(--purple)', border: '1px solid rgba(191,90,242,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={loadAiScript} disabled={loadingScript}>
            {loadingScript ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--purple)' }} /> Generating...</> : <><Sparkles size={15} /> AI Guided Script</>}
          </button>
          {aiScript && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--purple)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>AI Script</div>
              {aiScript.cycles?.slice(0, 4).map((c, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.instruction}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>In: {c.inhale}s · Hold: {c.hold}s · Out: {c.exhale}s</div>
                  {c.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>{c.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {['inhale', 'hold', 'exhale'].includes(phase) && (
        <>
          <div className={`breath-container ${breathClass}`}>
            <div className="breath-ring breath-ring-1" />
            <div className="breath-ring breath-ring-2" />
            <div className="breath-ring breath-ring-3" />
            <div className="breath-core" style={{ background: `linear-gradient(135deg, ${cp?.color}, ${cp?.color}88)` }}>
              {cp?.label?.toUpperCase()}
            </div>
          </div>
          <div className="breath-count" style={{ color: cp?.color }}>{count}</div>
          <div className="breath-phase-label" style={{ color: cp?.color }}>{cp?.message}</div>
          <div className="breath-note">{cp?.note}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 14, fontWeight: 600, letterSpacing: '1px' }}>CYCLE {cycle + 1} OF {totalCycles}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {PHASES.map(p => <div key={p.name} style={{ width: 6, height: 6, borderRadius: '50%', background: phase === p.name ? p.color : 'var(--border)', transition: 'background 0.3s', boxShadow: phase === p.name ? `0 0 8px ${p.color}` : 'none' }} />)}
          </div>
          <button onClick={stop} style={{ marginTop: 28, padding: '9px 22px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 100, color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Stop</button>
        </>
      )}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', marginTop: 48 }} className="anim-fade-up">
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple), var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color="#fff" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', letterSpacing: '-0.5px' }}>Session Complete</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>{totalCycles} breathing cycles complete</div>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', maxWidth: 280, margin: '24px auto 0', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>
            "Almost everything will work again if you unplug it for a few minutes. Including you."
          </div>
          <button className="btn-primary mt-24" onClick={stop} style={{ maxWidth: 200, margin: '24px auto 0', display: 'block' }}>Go Again</button>
        </div>
      )}
    </div>
  )
}

// ── VAULT ─────────────────────────────────────────────────────
function VaultScreen({ user }) {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ subject: 'biology', topic: '', mistake: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadEntries() }, [filter])

  async function loadEntries() {
    setLoading(true)
    let q = supabase.from('vault_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('subject', filter)
    const { data } = await q
    setEntries(data || []); setLoading(false)
  }

  async function addEntry() {
    if (!form.topic || !form.mistake) return
    setSaving(true)
    let aiQ = null
    try {
      const r = await getErrorVaultQuestion(form.subject, form.topic, form.mistake)
      aiQ = r.question + (r.explanation ? `\n\n${r.explanation}` : '')
    } catch (e) { console.error(e) }
    await supabase.from('vault_entries').insert({ user_id: user.id, ...form, ai_question: aiQ })
    setForm({ subject: 'biology', topic: '', mistake: '' }); setShowAdd(false); setSaving(false)
    loadEntries()
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">Error Vault</div><div className="dash-name">Mistake → Mastery</div></div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--grad-green)', border: 'none', borderRadius: 100, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={15} /> Add
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', overflowX: 'auto', paddingBottom: 4 }}>
        {['all', ...SUBJECTS].map(s => (
          <div key={s} className={`chip ${filter === s ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 16px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 52, color: 'var(--text3)' }}>
              <BookMarked size={36} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>No mistakes logged yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Every error is a lesson in disguise</div>
            </div>
          ) : entries.map(e => (
            <div key={e.id} className="vault-entry anim-fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="vault-subject" style={{ color: SUBJECT_COLORS[e.subject] }}>{e.subject}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(e.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div className="vault-topic">{e.topic}</div>
              <div className="vault-mistake">{e.your_mistake}</div>
              {e.ai_question && (
                <div className="ai-q-box">
                  <div className="ai-q-label"><Sparkles size={10} /> AI Parallel Question</div>
                  <div className="ai-q-text">{e.ai_question}</div>
                </div>
              )}
            </div>
          ))}
      </div>
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add to Error Vault</div>
            <div className="input-group">
              <label>Subject</label>
              <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Topic / Chapter</label>
              <input placeholder="e.g. Neural Control & Coordination" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Your Mistake</label>
              <textarea placeholder="What went wrong or confused you..." value={form.mistake} onChange={e => setForm(f => ({ ...f, mistake: e.target.value }))} style={{ minHeight: 80, resize: 'none' }} />
            </div>
            <button className="btn-primary" onClick={addEntry} disabled={saving}>
              {saving
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> AI generating question...</span>
                : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Sparkles size={15} /> Save + Get AI Question</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── JOURNAL ───────────────────────────────────────────────────
function JournalScreen({ user }) {
  const [entries, setEntries] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadEntries() }, [])

  async function loadEntries() {
    const { data } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    setEntries(data || [])
  }

  async function save() {
    if (!text.trim()) return
    setSaving(true)
    await supabase.from('journal_entries').insert({ user_id: user.id, content: text, mood })
    setText(''); setMood(''); setShowAdd(false); setSaving(false); loadEntries()
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">Daily Journal</div><div className="dash-name">Reflect & Grow</div></div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--grad-green)', border: 'none', borderRadius: 100, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <PenTool size={14} /> Write
        </button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 52, color: 'var(--text3)' }}>
            <NotebookPen size={36} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>Start journaling your NEET journey</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Even 2 lines a day builds self-awareness</div>
          </div>
        ) : entries.map(e => (
          <div key={e.id} className="journal-entry">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="journal-date">{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
              {e.mood && <div style={{ fontSize: 11, fontWeight: 700, color: MOOD_COLORS[e.mood] || 'var(--text3)' }}>{e.mood}</div>}
            </div>
            <div className="journal-text">{e.content}</div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Today's Entry</div>
            <div className="input-group">
              <label>Mood</label>
              <div className="mood-row">
                {MOODS.map(m => (
                  <div key={m} className={`mood-chip ${mood === m ? 'selected' : ''}`} style={{ borderColor: mood === m ? MOOD_COLORS[m] : undefined, color: mood === m ? MOOD_COLORS[m] : undefined }} onClick={() => setMood(m)}>{m}</div>
                ))}
              </div>
            </div>
            <div className="input-group mt-16">
              <label>Your Thoughts</label>
              <textarea placeholder="What did you study? How did it go? What will you improve?" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 120, resize: 'none' }} />
            </div>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── WORKOUT ───────────────────────────────────────────────────
function WorkoutScreen() {
  const [done, setDone] = useState({})
  const doneCount = Object.values(done).filter(Boolean).length

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">Body & Mind</div><div className="dash-name">Daily Workout</div></div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{doneCount}/{WORKOUTS.length}</div>
      </div>
      <div style={{ padding: '8px 16px' }}>
        <div style={{ background: 'rgba(0,255,163,0.04)', border: '1px solid rgba(0,255,163,0.1)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: 'var(--green)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Spark — Dr. John Ratey</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"Exercise is the single most powerful tool to optimize your brain for learning."</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Today's progress</span>
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>{Math.round((doneCount / WORKOUTS.length) * 100)}%</span>
          </div>
          <div className="progress-bar" style={{ height: 3 }}>
            <div className="progress-fill" style={{ width: `${(doneCount / WORKOUTS.length) * 100}%`, background: 'var(--grad-green)', transition: 'width 0.4s ease' }} />
          </div>
        </div>
        {WORKOUTS.map(({ id, name, Icon, detail, color }) => (
          <div key={id} className={`workout-card ${done[id] ? 'done-card' : ''}`}>
            <div className="workout-icon-box"><Icon size={20} color={done[id] ? color : 'var(--text3)'} /></div>
            <div>
              <div className="workout-name" style={{ textDecoration: done[id] ? 'line-through' : 'none' }}>{name}</div>
              <div className="workout-detail">{detail}</div>
            </div>
            <button className={`workout-check ${done[id] ? 'done' : ''}`} style={{ background: done[id] ? color : 'transparent', borderColor: done[id] ? color : undefined }}
              onClick={() => setDone(d => ({ ...d, [id]: !d[id] }))}>
              {done[id] && <Check size={14} color="#000" />}
            </button>
          </div>
        ))}
        {doneCount === WORKOUTS.length && (
          <div style={{ textAlign: 'center', padding: 28, background: 'rgba(0,255,163,0.04)', borderRadius: 16, border: '1px solid rgba(0,255,163,0.15)', marginTop: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--grad-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Flame size={22} color="#000" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>Workout Complete</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Your brain is primed for deep work</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── STUDY PLAN ────────────────────────────────────────────────
function StudyPlanScreen({ user, profile }) {
  const [plan, setPlan] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    const { data } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    setPlan(data || []); setLoading(false)
  }

  async function regenerate() {
    setGenerating(true)
    try {
      const np = await getStudyPlan({
        name: profile?.display_name || 'Student', studentType: profile?.student_type || 'Dropper',
        startDate: profile?.start_date || '', weakSubjects: profile?.weak_subjects || '',
        weakChapters: profile?.weak_chapters || '', hoursPerDay: profile?.hours_per_day || 8
      })
      if (np?.weekPlan) {
        await supabase.from('study_plans').delete().eq('user_id', user.id)
        await supabase.from('study_plans').insert(np.weekPlan.map(day => ({
          user_id: user.id, day_name: day.day, subject: day.subject, chapter: day.chapter,
          lecture_task: day.phases.lecture, practice_task: day.phases.practice,
          revision_task: day.phases.revision, error_fix_task: day.phases.errorFix,
          quote: day.quote, tip: day.tip
        })))
        loadPlan()
      }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const phases = [
    { key: 'lecture_task', label: 'Lecture', color: '#bf5af2', Icon: BookOpen },
    { key: 'practice_task', label: 'Practice', color: '#ff9500', Icon: PenTool },
    { key: 'revision_task', label: 'Revision', color: '#00c8ff', Icon: RotateCcw },
    { key: 'error_fix_task', label: 'Error Fix', color: '#ff375f', Icon: Brain },
  ]

  if (loading) return <div className="loading"><div className="spinner" /><div className="loading-text">Loading plan...</div></div>

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">AI Study Plan</div><div className="dash-name">7-Day Roadmap</div></div>
        <button onClick={regenerate} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid rgba(0,255,163,0.25)', borderRadius: 100, color: 'var(--green)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {generating ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <RefreshCw size={13} />}
          {!generating && 'Refresh'}
        </button>
      </div>
      {plan.length === 0 ? (
        <div style={{ padding: '52px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Bot size={28} color="var(--text3)" />
          </div>
          <div style={{ color: 'var(--text3)', marginBottom: 24, fontSize: 14 }}>No plan yet. Let AI build one for you.</div>
          <button className="btn-primary" style={{ maxWidth: 240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={regenerate} disabled={generating}>
            {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Building...</> : <><Sparkles size={15} /> Generate AI Study Plan</>}
          </button>
        </div>
      ) : (
        <div style={{ padding: '8px 16px' }}>
          {plan.map((day, i) => (
            <div key={day.id || i} className="chapter-card" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setSelected(selected === i ? null : i)}>
              <div className="chapter-top">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className="chapter-dot" style={{ background: SUBJECT_COLORS[day.subject?.toLowerCase()] || 'var(--green)', marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 9, color: SUBJECT_COLORS[day.subject?.toLowerCase()] || 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 3 }}>{day.day_name} · {day.subject}</div>
                    <div className="chapter-name">{day.chapter}</div>
                  </div>
                </div>
                {selected === i ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
              </div>
              <div className="phase-bars">
                {phases.map(({ label, color }) => (
                  <div key={label} className="phase-col">
                    <div className="phase-bar"><div className="phase-bar-fill" style={{ width: '100%', background: color }} /></div>
                    <div className="phase-label" style={{ color }}>{label[0]}</div>
                  </div>
                ))}
              </div>
              {selected === i && (
                <div style={{ marginTop: 14 }} className="anim-fade-up">
                  {phases.map(({ key, label, color, Icon }) => day[key] && (
                    <div key={key} className="phase-detail-card">
                      <div className="phase-detail-label" style={{ color, display: 'flex', alignItems: 'center', gap: 5 }}><Icon size={11} />{label}</div>
                      <div className="phase-detail-text">{day[key]}</div>
                    </div>
                  ))}
                  {day.quote && <div style={{ marginTop: 8, padding: 12, background: 'rgba(191,90,242,0.05)', borderRadius: 10, border: '1px solid rgba(191,90,242,0.12)', fontSize: 12, fontStyle: 'italic', color: 'var(--text2)', lineHeight: 1.6 }}>"{day.quote}"</div>}
                  {day.tip && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', padding: '8px 12px', background: 'rgba(0,255,163,0.04)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 6 }}><Sparkles size={12} style={{ flexShrink: 0, marginTop: 1 }} />{day.tip}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MORE ──────────────────────────────────────────────────────
function MoreScreen({ onNavigate }) {
  const items = [
    { id: 'breathe', Icon: Wind, label: 'Meditation & Breathing', sub: 'Box breathing · AI guided sessions', color: '#bf5af2', grad: 'linear-gradient(135deg, rgba(191,90,242,0.08), rgba(0,200,255,0.05))' },
    { id: 'workout', Icon: Dumbbell, label: 'Daily Workout', sub: 'Body primed for deep study', color: '#00ffa3', grad: 'linear-gradient(135deg, rgba(0,255,163,0.06), rgba(0,200,255,0.04))' },
    { id: 'journal', Icon: NotebookPen, label: 'Journal', sub: 'Reflect and track progress', color: '#ff9500', grad: 'linear-gradient(135deg, rgba(255,149,0,0.07), rgba(255,59,48,0.04))' },
  ]
  return (
    <div className="dashboard" style={{ paddingTop: 28 }}>
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 4 }}>More Tools</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Everything else</div>
      </div>
      {items.map(({ id, Icon, label, sub, color, grad }) => (
        <div key={id} className="more-card" style={{ background: grad }} onClick={() => onNavigate(id)}>
          <div className="more-icon-box" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
            <Icon size={22} color={color} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
          </div>
          <ArrowRight size={16} color="var(--text3)" style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  )
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ user, profile, onSignOut }) {
  const [stats, setStats] = useState(null)
  const [chapters, setChapters] = useState([])
  const [revisions, setRevisions] = useState([])
  const [motivation, setMotivation] = useState(null)
  const [loadingMoti, setLoadingMoti] = useState(true)

  useEffect(() => { loadData(); loadMotivation() }, [])

  async function loadData() {
    const [s, c, r] = await Promise.all([
      supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
      supabase.from('focus_chapters').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('revision_queue').select('*').eq('user_id', user.id).order('sort_order')
    ])
    if (s.data) setStats(s.data)
    if (c.data) setChapters(c.data)
    if (r.data) setRevisions(r.data)
  }

  async function loadMotivation() {
    setLoadingMoti(true)
    try {
      const m = await getDailyMotivation({
        name: profile?.display_name || 'Student',
        weakSubjects: profile?.weak_subjects || 'all subjects',
        studentType: profile?.student_type || 'NEET student'
      })
      setMotivation(m)
    } catch (e) { console.error(e) }
    setLoadingMoti(false)
  }

  const name = profile?.display_name || user.user_metadata?.display_name || 'Student'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const phases = [{ label: 'L', color: '#bf5af2' }, { label: 'P', color: '#ff9500' }, { label: 'R', color: '#00c8ff' }, { label: 'E', color: '#ff375f' }]

  return (
    <div className="dashboard">
      <div className="dash-header anim-fade-up">
        <div>
          <div className="dash-eyebrow">GOAT NEET · {greeting}</div>
          <div className="dash-name">{name}</div>
        </div>
        <div className="header-actions">
          <div className="dash-avatar">{initials}</div>
          <button className="btn-icon" onClick={onSignOut}><LogOut size={15} /></button>
        </div>
      </div>

      <div className="stats-row anim-fade-up-1">
        <div className="stat-card" style={{ borderColor: 'rgba(255,149,0,0.15)' }}>
          <div className="stat-label"><Flame size={11} color="var(--orange)" /> Streak</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{stats?.streak_days ?? 0}</div>
          <div className="stat-sub">days</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(0,200,255,0.15)' }}>
          <div className="stat-label"><Zap size={11} color="var(--cyan)" /> Energy</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{stats?.energy_pct ?? 80}%</div>
          <div className="stat-sub">today</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(0,255,163,0.15)' }}>
          <div className="stat-label"><Target size={11} color="var(--green)" /> Mode</div>
          <div className="stat-value" style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>{profile?.student_type?.split(' ')[0] ?? 'NEET'}</div>
          <div className="stat-sub">prep</div>
        </div>
      </div>

      {loadingMoti ? (
        <div style={{ margin: '8px 16px', padding: 18, background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: '85%', marginBottom: 10, animation: 'pulse 2s infinite' }} />
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: '55%', animation: 'pulse 2s infinite' }} />
        </div>
      ) : motivation && (
        <div className="quote-card anim-fade-up-2">
          <div className="quote-mark">"</div>
          <div className="quote-text">{motivation.quote?.replace(/^"|"$/g, '')}</div>
          {motivation.motivation && <div className="quote-motivation">{motivation.motivation}</div>}
        </div>
      )}

      <div className="section anim-fade-up-3">
        <div className="section-header">
          <div>
            <div className="section-title">Daily Focus Radar</div>
            <div className="section-sub">High-yield chapters · AI ranked</div>
          </div>
          <div className="live-badge"><div className="live-dot" />Live</div>
        </div>
        {chapters.map((c, i) => (
          <div key={c.id} className="chapter-card" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="chapter-top">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div className="chapter-dot" style={{ background: SUBJECT_COLORS[c.subject], marginTop: 5, boxShadow: `0 0 6px ${SUBJECT_COLORS[c.subject]}50` }} />
                <div>
                  <div className="chapter-name">{c.chapter}</div>
                  <div className="chapter-reason">{c.reason}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="chapter-yield" style={{ color: SUBJECT_COLORS[c.subject] }}>{c.yield_score}</div>
                <div className="chapter-yield-label">yield</div>
              </div>
            </div>
            <div className="phase-bars">
              {phases.map(({ label, color }) => (
                <div key={label} className="phase-col">
                  <div className="phase-bar"><div className="phase-bar-fill" style={{ width: `${c.mastery}%`, background: color }} /></div>
                  <div className="phase-label" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="section anim-fade-up-4">
        <div className="section-header">
          <div>
            <div className="section-title">Revision Queue</div>
            <div className="section-sub">Spaced repetition</div>
          </div>
          <div className="live-badge"><div className="live-dot" />Live</div>
        </div>
        {revisions.map(r => (
          <div key={r.id} className="revision-item">
            <div className="revision-top">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="revision-dot" style={{ background: SUBJECT_COLORS[r.subject], boxShadow: `0 0 6px ${SUBJECT_COLORS[r.subject]}40` }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.chapter}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.subject.charAt(0).toUpperCase() + r.subject.slice(1)} · {r.interval_label}</div>
                </div>
              </div>
              <div className={`due-chip ${r.urgent ? 'urgent' : ''}`}>{r.due_label}</div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${r.progress * 100}%`, background: SUBJECT_COLORS[r.subject] }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}

// ── NAV ───────────────────────────────────────────────────────
const NAV = [
  { id: 'home', Icon: Home, label: 'Home' },
  { id: 'plan', Icon: Bot, label: 'AI Plan' },
  { id: 'timer', Icon: Clock, label: 'Focus' },
  { id: 'vault', Icon: BookMarked, label: 'Vault' },
  { id: 'more', Icon: MoreHorizontal, label: 'More' },
]

function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {NAV.map(({ id, Icon, label }) => (
        <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onChange(id)}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboarded, setOnboarded] = useState(false)
  const [screen, setScreen] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setUser(data.session.user); loadProfile(data.session.user.id) }
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      else { setUser(null); setProfile(null); setLoading(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', uid).single()
    setProfile(data); setOnboarded(data?.onboarded === true); setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setOnboarded(false); setScreen('home')
  }

  if (loading) return (
    <div className="loading">
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #00ffa3, #00c8ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>GOAT NEET</div>
      <div className="spinner" />
      <div className="loading-text">Loading...</div>
    </div>
  )

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />
  if (!onboarded) return <Onboarding user={user} onComplete={() => { setOnboarded(true); loadProfile(user.id) }} />

  const navScreens = ['home', 'plan', 'timer', 'vault', 'more']
  const renderScreen = () => {
    switch (screen) {
      case 'home': return <Dashboard user={user} profile={profile} onSignOut={signOut} />
      case 'plan': return <StudyPlanScreen user={user} profile={profile} />
      case 'timer': return <TimerScreen />
      case 'vault': return <VaultScreen user={user} />
      case 'breathe': return <MeditationScreen />
      case 'workout': return <WorkoutScreen />
      case 'journal': return <JournalScreen user={user} />
      case 'more': return <MoreScreen onNavigate={setScreen} />
      default: return <Dashboard user={user} profile={profile} onSignOut={signOut} />
    }
  }

  return (
    <div className="app">
      {renderScreen()}
      <BottomNav active={navScreens.includes(screen) ? screen : 'more'} onChange={setScreen} />
    </div>
  )
}

