import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { getStudyPlan, getErrorVaultQuestion, getDailyMotivation, getMeditationScript } from './lib/gemini'

const SUBJECTS = ['biology', 'physics', 'chemistry']
const SUBJECT_COLORS = { biology: '#00e5a0', physics: '#00d4ff', chemistry: '#ff8c00' }
const MOODS = ['😤 Focused', '😊 Good', '😐 Okay', '😩 Tired', '😰 Stressed']
const WORKOUTS = [
  { id: 1, name: '20 Push-ups', icon: '💪', detail: 'Upper body strength', sets: '3 sets' },
  { id: 2, name: '30 Squats', icon: '🦵', detail: 'Lower body power', sets: '2 sets' },
  { id: 3, name: '1 min Plank', icon: '🏋️', detail: 'Core stability', sets: '2 sets' },
  { id: 4, name: '10 min Walk', icon: '🚶', detail: 'Active recovery', sets: '1 round' },
  { id: 5, name: 'Neck Rolls', icon: '🔄', detail: 'Study tension relief', sets: '5 each side' },
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
        const { error: e } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name } }
        })
        if (e) throw e
        setSuccess('✅ Check your email to confirm your account!')
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) throw e
        onAuth(data.user)
      }
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo">GOAT NEET</div>
      <div className="auth-tagline">Elite Preparation OS · AI-Powered</div>
      <div className="auth-card">
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
          {loading ? 'Please wait...' : tab === 'login' ? 'Login →' : 'Create Account →'}
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

  const toggleSubject = (s) => setWeakSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  async function finish() {
    setLoading(true)
    try {
      await supabase.from('user_profiles').update({
        student_type: studentType,
        start_date: startDate,
        weak_subjects: weakSubjects.join(','),
        weak_chapters: weakChapters,
        hours_per_day: parseInt(hoursPerDay) || 8,
        onboarded: true
      }).eq('id', user.id)

      try {
        const plan = await getStudyPlan({
          name: user.user_metadata?.display_name || 'Student',
          studentType, startDate,
          weakSubjects: weakSubjects.join(', '),
          weakChapters, hoursPerDay
        })
        if (plan?.weekPlan) {
          await supabase.from('study_plans').insert(
            plan.weekPlan.map(day => ({
              user_id: user.id,
              day_name: day.day,
              subject: day.subject,
              chapter: day.chapter,
              lecture_task: day.phases.lecture,
              practice_task: day.phases.practice,
              revision_task: day.phases.revision,
              error_fix_task: day.phases.errorFix,
              quote: day.quote,
              tip: day.tip
            }))
          )
        }
      } catch (e) { console.error('AI plan error:', e) }
      onComplete()
    } catch (e) {
      console.error(e)
      onComplete()
    } finally { setLoading(false) }
  }

  if (step === 1) return (
    <div className="onboarding">
      <div className="onboarding-header">
        <div className="onboarding-step">Step 1 of 4</div>
        <div className="onboarding-title">Who are you,<br /><span>NEET warrior?</span></div>
      </div>
      <div className="input-group mt-16">
        <label>I am currently</label>
        <div className="chip-group mt-8">
          {['Class 11th Student', 'Class 12th Student', 'Dropper (1st year)', 'Dropper (2nd year+)'].map(t => (
            <div key={t} className={`chip ${studentType === t ? 'selected' : ''}`} onClick={() => setStudentType(t)}>{t}</div>
          ))}
        </div>
      </div>
      <div className="input-group mt-24">
        <label>Preparation Start Date</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </div>
      <button className="btn-primary mt-24" onClick={() => studentType && setStep(2)} disabled={!studentType}>Next →</button>
    </div>
  )

  if (step === 2) return (
    <div className="onboarding">
      <div className="onboarding-header">
        <div className="onboarding-step">Step 2 of 4</div>
        <div className="onboarding-title">Your <span>weak spots</span></div>
      </div>
      <div className="input-group mt-16">
        <label>Weak subjects</label>
        <div className="chip-group mt-8">
          {SUBJECTS.map(s => (
            <div key={s} className={`chip ${weakSubjects.includes(s) ? 'selected' : ''}`} onClick={() => toggleSubject(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
          <div className={`chip ${weakSubjects.length === 0 ? 'selected' : ''}`} onClick={() => setWeakSubjects([])}>None — I'm solid</div>
        </div>
      </div>
      <div className="input-group mt-24">
        <label>Specific weak chapters (optional)</label>
        <textarea placeholder="e.g. Thermodynamics, Genetics, Organic Chemistry..." value={weakChapters} onChange={e => setWeakChapters(e.target.value)} style={{ minHeight: 80, resize: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn-primary" style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setStep(1)}>← Back</button>
        <button className="btn-primary" onClick={() => setStep(3)}>Next →</button>
      </div>
    </div>
  )

  if (step === 3) return (
    <div className="onboarding">
      <div className="onboarding-header">
        <div className="onboarding-step">Step 3 of 4</div>
        <div className="onboarding-title">Your <span>daily capacity</span></div>
      </div>
      <div className="input-group mt-16">
        <label>Hours available per day</label>
        <div className="chip-group mt-8">
          {['4', '6', '8', '10', '12+'].map(h => (
            <div key={h} className={`chip ${hoursPerDay === h ? 'selected' : ''}`} onClick={() => setHoursPerDay(h)}>{h} hrs</div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 32, padding: 16, background: 'rgba(0,229,160,0.05)', borderRadius: 14, border: '1px solid rgba(0,229,160,0.15)' }}>
        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 8 }}>💡 ATOMIC HABITS</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>"You don't rise to the level of your goals. You fall to the level of your systems." — James Clear</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn-primary" style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setStep(2)}>← Back</button>
        <button className="btn-primary" onClick={() => hoursPerDay && setStep(4)} disabled={!hoursPerDay}>Next →</button>
      </div>
    </div>
  )

  return (
    <div className="onboarding">
      <div className="onboarding-header">
        <div className="onboarding-step">Step 4 of 4</div>
        <div className="onboarding-title">AI is crafting your<br /><span>personal plan</span></div>
      </div>
      <div style={{ marginTop: 24, padding: 20, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Your Profile</div>
        <div style={{ fontSize: 14, marginBottom: 6 }}>🎯 <strong>{studentType}</strong></div>
        {startDate && <div style={{ fontSize: 14, marginBottom: 6 }}>📅 Started: <strong>{startDate}</strong></div>}
        <div style={{ fontSize: 14, marginBottom: 6 }}>⚠️ Weak: <strong>{weakSubjects.length ? weakSubjects.join(', ') : 'None declared'}</strong></div>
        <div style={{ fontSize: 14 }}>⏱️ <strong>{hoursPerDay} hours/day</strong></div>
      </div>
      <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,212,255,0.05)', borderRadius: 14, border: '1px solid rgba(0,212,255,0.15)' }}>
        <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 700, marginBottom: 8 }}>💡 DEEP WORK</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>"Clarity about what matters provides clarity about what does not." — Cal Newport</div>
      </div>
      <button className="btn-primary mt-24" onClick={finish} disabled={loading}>
        {loading ? '⚡ AI building your plan...' : '🚀 Launch GOAT NEET →'}
      </button>
    </div>
  )
}

// ── POMODORO / FLOW TIMER ─────────────────────────────────────
function TimerScreen() {
  const [mode, setMode] = useState('pomodoro')
  const [phase, setPhase] = useState('focus')
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(25 * 60)
  const [customMins, setCustomMins] = useState(45)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)

  const total = mode === 'flow' ? customMins * 60 : phase === 'focus' ? 25 * 60 : 5 * 60
  const progress = ((total - secs) / total) * 100
  const color = phase === 'focus' ? '#00e5a0' : '#00d4ff'

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (mode === 'pomodoro') {
              if (phase === 'focus') { setSessions(n => n + 1); setPhase('break'); setSecs(5 * 60) }
              else { setPhase('focus'); setSecs(25 * 60) }
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, phase])

  function switchMode(m) {
    setMode(m); setRunning(false); clearInterval(intervalRef.current)
    setSecs(m === 'flow' ? customMins * 60 : 25 * 60); setPhase('focus')
  }

  function reset() {
    setRunning(false); clearInterval(intervalRef.current)
    setSecs(mode === 'flow' ? customMins * 60 : phase === 'focus' ? 25 * 60 : 5 * 60)
  }

  const r = 100
  const circumference = 2 * Math.PI * r
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="timer-screen">
      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Focus Timer</div>
      <div style={{ display: 'flex', gap: 8, background: 'var(--card)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
        {[['pomodoro', '🍅 Pomodoro'], ['flow', '🌊 Flow']].map(([m, label]) => (
          <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, padding: '8px 16px', border: 'none', borderRadius: 10, background: mode === m ? color : 'transparent', color: mode === m ? '#000' : 'var(--text2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {mode === 'flow' && !running && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[30, 45, 60, 90].map(m => (
            <div key={m} className={`chip ${customMins === m ? 'selected' : ''}`} onClick={() => { setCustomMins(m); setSecs(m * 60) }} style={{ padding: '6px 12px', fontSize: 12 }}>{m}m</div>
          ))}
        </div>
      )}

      <div className="timer-circle">
        <svg className="timer-svg" width="240" height="240" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle cx="120" cy="120" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="timer-text">
          <div className="timer-time" style={{ color }}>{timeStr(secs)}</div>
          <div className="timer-phase">{mode === 'flow' ? 'Flow State' : phase === 'focus' ? 'Focus Time' : 'Break Time'}</div>
          {sessions > 0 && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>🍅 {sessions} sessions</div>}
        </div>
      </div>

      <div className="timer-controls">
        <button className="btn-circle" onClick={reset}>↺</button>
        <button className="btn-circle primary" style={{ background: color, borderColor: color }} onClick={() => setRunning(r => !r)}>
          {running ? '⏸' : '▶'}
        </button>
        <button className="btn-circle" onClick={() => { const next = phase === 'focus' ? 'break' : 'focus'; setPhase(next); setSecs(next === 'focus' ? 25 * 60 : 5 * 60); setRunning(false) }}>⏭</button>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', maxWidth: 300, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginBottom: 6 }}>
          {mode === 'pomodoro' ? '🍅 POMODORO TECHNIQUE' : '🌊 FLOW STATE — Csikszentmihalyi'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
          {mode === 'pomodoro' ? '25 min deep focus → 5 min break. After 4 rounds, take a 20 min long break.' : 'Eliminate all distractions. Set one clear goal. Let your brain enter flow naturally.'}
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
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)

  const PHASES = [
    { name: 'inhale', label: 'Inhale', duration: 4, color: '#00e5a0', message: '👃 Breathe in slowly', note: 'Fill your lungs completely. Feel your chest expand.' },
    { name: 'hold', label: 'Hold', duration: 4, color: '#00d4ff', message: '🫁 Hold gently', note: 'Hold calmly. Let oxygen absorb fully.' },
    { name: 'exhale', label: 'Exhale', duration: 6, color: '#8b5cf6', message: '💨 Release slowly', note: 'Let go of all tension. Empty completely.' },
  ]

  async function loadAiScript() {
    setLoadingScript(true)
    try {
      const script = await getMeditationScript(duration)
      setAiScript(script)
    } catch (e) { console.error(e) }
    setLoadingScript(false)
  }

  function runPhase(phaseIdx, cycleNum) {
    if (cycleNum >= totalCycles) { setPhase('done'); setCount(0); return }
    const p = PHASES[phaseIdx]
    setPhase(p.name)
    setCount(p.duration)
    let remaining = p.duration
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      remaining -= 1
      setCount(remaining)
      if (remaining <= 0) {
        clearInterval(intervalRef.current)
        const next = (phaseIdx + 1) % 3
        if (next === 0) setCycle(c => c + 1)
        timeoutRef.current = setTimeout(() => runPhase(next, next === 0 ? cycleNum + 1 : cycleNum), 300)
      }
    }, 1000)
  }

  function start() { setCycle(0); runPhase(0, 0) }

  function stop() {
    clearTimeout(timeoutRef.current)
    clearInterval(intervalRef.current)
    setPhase('idle'); setCount(0); setCycle(0)
  }

  useEffect(() => () => { clearTimeout(timeoutRef.current); clearInterval(intervalRef.current) }, [])

  const currentPhaseData = PHASES.find(p => p.name === phase)
  const breathClass = ['inhale', 'hold', 'exhale'].includes(phase) ? `breathing-${phase}` : ''

  return (
    <div className="meditation-screen">
      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Breathe & Recover</div>

      {phase === 'idle' && (
        <div style={{ width: '100%', maxWidth: 320, marginTop: 32 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, textAlign: 'center' }}>Choose duration</div>
          <div className="chip-group" style={{ justifyContent: 'center', marginBottom: 24 }}>
            {[3, 5, 7, 10].map(d => (
              <div key={d} className={`chip ${duration === d ? 'selected' : ''}`} onClick={() => setDuration(d)}>{d} min</div>
            ))}
          </div>
          <button className="btn-primary" onClick={start}>Start Breathing ✦</button>
          <button className="btn-primary mt-8" onClick={loadAiScript} disabled={loadingScript}
            style={{ background: 'transparent', color: 'var(--cyan)', border: '1px solid var(--cyan)' }}>
            {loadingScript ? '✨ Generating AI script...' : '✨ Get AI Guided Script'}
          </button>
          {aiScript && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>✨ AI Script</div>
              {aiScript.cycles?.slice(0, 4).map((c, i) => (
                <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.instruction}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>In: {c.inhale}s · Hold: {c.hold}s · Out: {c.exhale}s</div>
                  {c.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>{c.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {['inhale', 'hold', 'exhale'].includes(phase) && (
        <>
          <div className={`breath-circle ${breathClass}`} style={{ marginTop: 32 }}>
            <div className="breath-ring breath-ring-1" />
            <div className="breath-ring breath-ring-2" />
            <div className="breath-ring breath-ring-3" />
            <div className="breath-core">{phase.toUpperCase()}</div>
          </div>
          <div className="breath-count" style={{ color: currentPhaseData?.color }}>{count}</div>
          <div className="breath-instruction" style={{ color: currentPhaseData?.color }}>{currentPhaseData?.message}</div>
          <div className="breath-note">{currentPhaseData?.note}</div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>Cycle {cycle + 1} of {totalCycles}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {PHASES.map(p => (
              <div key={p.name} style={{ width: 8, height: 8, borderRadius: '50%', background: phase === p.name ? p.color : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <button onClick={stop} style={{ marginTop: 24, padding: '10px 24px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 100, color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Stop</button>
        </>
      )}

      {phase === 'done' && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 56 }}>🧘</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', marginTop: 16 }}>Session Complete</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 8 }}>{totalCycles} breathing cycles complete</div>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', maxWidth: 280, margin: '24px auto 0' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"Almost everything will work again if you unplug it for a few minutes. Including you." — Anne Lamott</div>
          </div>
          <button className="btn-primary mt-24" onClick={stop} style={{ maxWidth: 200 }}>Go Again</button>
        </div>
      )}
    </div>
  )
}

// ── ERROR VAULT ───────────────────────────────────────────────
function VaultScreen({ user }) {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ subject: 'biology', topic: '', mistake: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadEntries() }, [filter])

  async function loadEntries() {
    setLoading(true)
    let q = supabase.from('vault_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('subject', filter)
    const { data } = await q
    setEntries(data || [])
    setLoading(false)
  }

  async function addEntry() {
    if (!form.topic || !form.mistake) return
    setSaving(true)
    let aiQ = null
    try {
      const result = await getErrorVaultQuestion(form.subject, form.topic, form.mistake)
      aiQ = result.question + (result.explanation ? `\n\n💡 ${result.explanation}` : '')
    } catch (e) { console.error(e) }
    await supabase.from('vault_entries').insert({ user_id: user.id, ...form, ai_question: aiQ })
    setForm({ subject: 'biology', topic: '', mistake: '' })
    setShowAdd(false)
    setSaving(false)
    loadEntries()
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-greeting">Error Vault</div><div className="dash-name">Mistake → Mastery</div></div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', background: 'var(--green)', border: 'none', borderRadius: 100, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add</button>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', flexWrap: 'wrap' }}>
        {['all', ...SUBJECTS].map(s => (
          <div key={s} className={`chip ${filter === s ? 'selected' : ''}`} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>Loading...</div> :
          entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text2)' }}>
              <div style={{ fontSize: 40 }}>📖</div>
              <div style={{ marginTop: 12 }}>No mistakes logged yet.<br />Every error is a lesson!</div>
            </div>
          ) : entries.map(e => (
            <div key={e.id} className="vault-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="vault-subject" style={{ color: SUBJECT_COLORS[e.subject] }}>{e.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(e.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div className="vault-topic">{e.topic}</div>
              <div className="vault-mistake">{e.your_mistake}</div>
              {e.ai_question && (
                <div className="ai-question-box">
                  <div className="ai-question-label">⚡ AI Parallel Question</div>
                  <div className="ai-question-text">{e.ai_question}</div>
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
              <label>What was your mistake?</label>
              <textarea placeholder="Describe what went wrong or what confused you..." value={form.mistake} onChange={e => setForm(f => ({ ...f, mistake: e.target.value }))} style={{ minHeight: 80, resize: 'none' }} />
            </div>
            <button className="btn-primary" onClick={addEntry} disabled={saving}>
              {saving ? '⚡ AI generating question...' : 'Save + Get AI Question'}
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
    setText(''); setMood(''); setShowAdd(false); setSaving(false)
    loadEntries()
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-greeting">Daily Journal</div><div className="dash-name">Reflect & Grow</div></div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', background: 'var(--green)', border: 'none', borderRadius: 100, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Write</button>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text2)' }}>
            <div style={{ fontSize: 40 }}>📔</div>
            <div style={{ marginTop: 12 }}>Start journaling your NEET journey.</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Even 2 lines a day builds self-awareness.</div>
          </div>
        ) : entries.map(e => (
          <div key={e.id} className="journal-entry">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="journal-date">{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              {e.mood && <div style={{ fontSize: 16 }}>{e.mood.split(' ')[0]}</div>}
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
              <label>How are you feeling?</label>
              <div className="mood-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {MOODS.map(m => (
                  <div key={m} className={`mood-chip ${mood === m ? 'selected' : ''}`} onClick={() => setMood(m)}>{m}</div>
                ))}
              </div>
            </div>
            <div className="input-group mt-16">
              <label>Your thoughts</label>
              <textarea placeholder="What did you study? How did it go? What will you improve tomorrow?" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 120, resize: 'none' }} />
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
        <div><div className="dash-greeting">Body & Mind</div><div className="dash-name">Daily Workout</div></div>
        <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>{doneCount}/{WORKOUTS.length}</div>
      </div>
      <div style={{ padding: '8px 20px' }}>
        <div style={{ background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginBottom: 4 }}>💪 SPARK — Dr. John Ratey</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>"Exercise is the single most powerful tool to optimize your brain for learning."</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Today's progress</div>
            <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>{Math.round((doneCount / WORKOUTS.length) * 100)}%</div>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(doneCount / WORKOUTS.length) * 100}%`, background: 'var(--green)', transition: 'width 0.4s ease' }} /></div>
        </div>
        {WORKOUTS.map(w => (
          <div key={w.id} className="workout-card" style={{ opacity: done[w.id] ? 0.55 : 1, transition: 'opacity 0.3s' }}>
            <div className="workout-icon">{w.icon}</div>
            <div>
              <div className="workout-name" style={{ textDecoration: done[w.id] ? 'line-through' : 'none' }}>{w.name}</div>
              <div className="workout-detail">{w.detail} · {w.sets}</div>
            </div>
            <button className={`workout-done ${done[w.id] ? 'done' : ''}`} onClick={() => setDone(d => ({ ...d, [w.id]: !d[w.id] }))}>
              {done[w.id] ? '✓' : ''}
            </button>
          </div>
        ))}
        {doneCount === WORKOUTS.length && (
          <div style={{ textAlign: 'center', padding: 24, background: 'rgba(0,229,160,0.08)', borderRadius: 16, border: '1px solid rgba(0,229,160,0.2)' }}>
            <div style={{ fontSize: 40 }}>🔥</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginTop: 8 }}>Workout Complete!</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Your brain is now primed for deep work</div>
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
    setPlan(data || [])
    setLoading(false)
  }

  async function regenerate() {
    setGenerating(true)
    try {
      const newPlan = await getStudyPlan({
        name: profile?.display_name || 'Student',
        studentType: profile?.student_type || 'Dropper',
        startDate: profile?.start_date || '',
        weakSubjects: profile?.weak_subjects || '',
        weakChapters: profile?.weak_chapters || '',
        hoursPerDay: profile?.hours_per_day || 8
      })
      if (newPlan?.weekPlan) {
        await supabase.from('study_plans').delete().eq('user_id', user.id)
        await supabase.from('study_plans').insert(
          newPlan.weekPlan.map(day => ({
            user_id: user.id, day_name: day.day, subject: day.subject,
            chapter: day.chapter, lecture_task: day.phases.lecture,
            practice_task: day.phases.practice, revision_task: day.phases.revision,
            error_fix_task: day.phases.errorFix, quote: day.quote, tip: day.tip
          }))
        )
        loadPlan()
      }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const phaseColors = { lecture: '#8b5cf6', practice: '#ff8c00', revision: '#00d4ff', error_fix: '#ff4444' }

  if (loading) return <div className="loading"><div className="spinner" /><div className="loading-text">Loading plan...</div></div>

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-greeting">AI Study Plan</div><div className="dash-name">Your 7-Day Roadmap</div></div>
        <button onClick={regenerate} disabled={generating} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--green)', borderRadius: 100, color: 'var(--green)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {generating ? '...' : '⚡ Refresh'}
        </button>
      </div>
      {plan.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🤖</div>
          <div style={{ color: 'var(--text2)', marginTop: 12, marginBottom: 24 }}>No plan yet. Let AI build one for you.</div>
          <button className="btn-primary" onClick={regenerate} disabled={generating}>
            {generating ? '⚡ Building your plan...' : '⚡ Generate AI Study Plan'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '8px 20px' }}>
          {plan.map((day, i) => (
            <div key={day.id || i} className="chapter-card" onClick={() => setSelected(selected === i ? null : i)}>
              <div className="chapter-top">
                <div>
                  <div style={{ fontSize: 11, color: SUBJECT_COLORS[day.subject?.toLowerCase()] || 'var(--green)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>
                    {day.day_name} · {day.subject}
                  </div>
                  <div className="chapter-name">{day.chapter}</div>
                </div>
                <div style={{ fontSize: 16, color: 'var(--text3)' }}>{selected === i ? '▲' : '▼'}</div>
              </div>
              <div className="phase-bars">
                {[['lecture', 'L'], ['practice', 'P'], ['revision', 'R'], ['error_fix', 'E']].map(([key, label]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div className="phase-bar"><div className="phase-bar-fill" style={{ width: '100%', background: phaseColors[key] }} /></div>
                    <div className="phase-label" style={{ color: phaseColors[key] }}>{label}</div>
                  </div>
                ))}
              </div>
              {selected === i && (
                <div style={{ marginTop: 16 }}>
                  {[['lecture_task', 'lecture', '📚 Lecture'], ['practice_task', 'practice', '✏️ Practice'], ['revision_task', 'revision', '🔄 Revision'], ['error_fix_task', 'error_fix', '⚡ Error Fix']].map(([key, colorKey, label]) => (
                    day[key] && (
                      <div key={key} style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: phaseColors[colorKey], marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{day[key]}</div>
                      </div>
                    )
                  ))}
                  {day.quote && <div style={{ marginTop: 8, padding: 12, background: 'rgba(139,92,246,0.08)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, fontStyle: 'italic', color: 'var(--text2)', lineHeight: 1.5 }}>"{day.quote}"</div>}
                  {day.tip && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', padding: '8px 12px', background: 'rgba(0,229,160,0.05)', borderRadius: 10 }}>💡 {day.tip}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MORE SCREEN ───────────────────────────────────────────────
function MoreScreen({ onNavigate }) {
  const items = [
    { id: 'breathe', icon: '🧘', label: 'Meditation & Breathing', sub: 'Guided breathing sessions' },
    { id: 'workout', icon: '💪', label: 'Daily Workout', sub: 'Body primed for deep study' },
    { id: 'journal', icon: '📔', label: 'Journal', sub: 'Reflect and track progress' },
  ]
  return (
    <div className="dashboard" style={{ paddingTop: 24 }}>
      <div style={{ padding: '0 20px 20px' }}><div style={{ fontSize: 20, fontWeight: 800 }}>More Tools</div></div>
      {items.map(item => (
        <div key={item.id} style={{ margin: '0 20px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => onNavigate(item.id)}>
          <div style={{ fontSize: 26, width: 48, height: 48, background: 'var(--card2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
          <div><div style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{item.sub}</div></div>
          <div style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 18 }}>›</div>
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
    try {
      const m = await getDailyMotivation({
        name: profile?.display_name || 'Student',
        weakSubjects: profile?.weak_subjects || 'all subjects',
        studentType: profile?.student_type || 'NEET student'
      })
      setMotivation(m)
    } catch (e) { console.error(e) }
  }

  const name = profile?.display_name || user.user_metadata?.display_name || 'Student'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <div className="dash-greeting">GOAT NEET · {greeting}</div>
          <div className="dash-name">{name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="dash-avatar">{initials}</div>
          <button onClick={onSignOut} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }} title="Sign out">↩</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card" style={{ borderColor: 'rgba(255,140,0,0.3)' }}>
          <div className="stat-label">🔥 Streak</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{stats?.streak_days ?? 0}</div>
          <div className="stat-sub">days</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(0,212,255,0.3)' }}>
          <div className="stat-label">⚡ Energy</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{stats?.energy_pct ?? 80}%</div>
          <div className="stat-sub">today</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(0,229,160,0.3)' }}>
          <div className="stat-label">📋 Mode</div>
          <div className="stat-value" style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>{profile?.student_type?.split(' ')[0] ?? 'NEET'}</div>
          <div className="stat-sub">prep</div>
        </div>
      </div>

      {motivation && (
        <div className="quote-card">
          <div className="quote-text">"{motivation.quote}"</div>
          {motivation.motivation && <div style={{ fontSize: 13, color: 'var(--cyan)', marginTop: 8 }}>{motivation.motivation}</div>}
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <div><div className="section-title">Daily Focus Radar</div><div className="section-sub">High-yield chapters · AI ranked</div></div>
          <div className="badge badge-green">LIVE</div>
        </div>
        {chapters.map(c => (
          <div key={c.id} className="chapter-card">
            <div className="chapter-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: SUBJECT_COLORS[c.subject], flexShrink: 0 }} />
                <div className="chapter-name">{c.chapter}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="chapter-yield">{c.yield_score}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>YIELD</div>
              </div>
            </div>
            <div className="chapter-reason">{c.reason}</div>
            <div className="phase-bars">
              {[['L', '#8b5cf6'], ['P', '#ff8c00'], ['R', '#00d4ff'], ['E', '#ff4444']].map(([label, color]) => (
                <div key={label} style={{ flex: 1 }}>
                  <div className="phase-bar"><div className="phase-bar-fill" style={{ width: `${c.mastery}%`, background: color }} /></div>
                  <div className="phase-label" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-header">
          <div><div className="section-title">Revision Queue</div><div className="section-sub">Spaced repetition · live</div></div>
          <div className="badge badge-red">{revisions.filter(r => r.urgent).length} urgent</div>
        </div>
        {revisions.map(r => (
          <div key={r.id} className="revision-item">
            <div className="revision-top">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="revision-dot" style={{ background: SUBJECT_COLORS[r.subject] }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.chapter}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{r.subject.charAt(0).toUpperCase() + r.subject.slice(1)} · {r.interval_label}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, background: 'var(--bg)', padding: '4px 10px', borderRadius: 100, color: r.urgent ? 'var(--red)' : 'var(--text2)', border: `1px solid ${r.urgent ? 'rgba(255,68,68,0.3)' : 'var(--border)'}` }}>{r.due_label}</div>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${r.progress * 100}%`, background: SUBJECT_COLORS[r.subject] }} /></div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}

// ── BOTTOM NAV ────────────────────────────────────────────────
const NAV = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'plan', icon: '🤖', label: 'AI Plan' },
  { id: 'timer', icon: '⏱️', label: 'Focus' },
  { id: 'vault', icon: '⚡', label: 'Vault' },
  { id: 'more', icon: '☰', label: 'More' },
]

function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {NAV.map(item => (
        <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => onChange(item.id)}>
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
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
    setProfile(data)
    setOnboarded(data?.onboarded === true)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setOnboarded(false); setScreen('home')
  }

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <div className="loading-text">GOAT NEET loading...</div>
    </div>
  )

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />
  if (!onboarded) return <Onboarding user={user} onComplete={() => { setOnboarded(true); loadProfile(user.id) }} />

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

  const navScreens = ['home', 'plan', 'timer', 'vault', 'more']

  return (
    <div className="app">
      {renderScreen()}
      <BottomNav active={navScreens.includes(screen) ? screen : 'more'} onChange={setScreen} />
    </div>
  )
}
