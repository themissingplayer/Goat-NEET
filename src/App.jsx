import { useState, useEffect, useRef } from 'react'
import {
  Flame, Zap, Target, Brain, BookOpen, PenTool, RotateCcw,
  Play, Pause, SkipForward, RefreshCw, Home, Bot, Clock,
  MoreHorizontal, Plus, LogOut, ChevronDown, ChevronUp, Wind,
  Dumbbell, NotebookPen, Sparkles, Activity, Shield, Music2,
  ArrowRight, BookMarked, Check, CheckCircle2, Layers,
  Timer as TimerIcon, ListTodo, Bell, BellOff, Trash2,
  Youtube, HeadphonesIcon
} from 'lucide-react'
import { supabase } from './lib/supabase'
import {
  getStudyPlan, getErrorVaultQuestion, getDailyMotivation,
  getMeditationScript, getStudyContextAdvice, getAITasks
} from './lib/gemini'

// ── CONSTANTS ────────────────────────────────────────────────
const SUBJECTS = ['biology', 'physics', 'chemistry']
const SUBJECT_COLORS = { biology: '#86C98E', physics: '#5AC8FA', chemistry: '#F5A623' }
const MOODS = ['Focused', 'Good', 'Okay', 'Tired', 'Stressed']
const MOOD_COLORS = { Focused: '#F5A623', Good: '#86C98E', Okay: '#E8C98A', Tired: '#C084FC', Stressed: '#FF7B54' }
const PHASE_INFO = [
  { key: 'L', label: 'Lecture', color: '#C084FC', desc: 'NCERT first read — understand the concept fully' },
  { key: 'P', label: 'Practice', color: '#F5A623', desc: 'Solve 30+ MCQs — question patterns matter' },
  { key: 'R', label: 'Revision', color: '#5AC8FA', desc: 'Quick recall — flashcards, formulas, diagrams' },
  { key: 'E', label: 'Error Fix', color: '#FF7B54', desc: 'Review mistakes — log them in Error Vault' },
]
const WORKOUTS = [
  { id: 1, name: '20 Push-ups', Icon: Dumbbell, detail: 'Upper body · 3 sets', color: '#F5A623' },
  { id: 2, name: '30 Squats', Icon: Activity, detail: 'Lower body · 2 sets', color: '#86C98E' },
  { id: 3, name: '1 min Plank', Icon: Shield, detail: 'Core stability · 2 sets', color: '#C084FC' },
  { id: 4, name: '10 min Walk', Icon: Target, detail: 'Active recovery · 1 round', color: '#5AC8FA' },
  { id: 5, name: 'Neck Rolls', Icon: RotateCcw, detail: 'Tension relief · 5 each side', color: '#FF7B54' },
]
const PLAYLISTS = [
  { id: 1, title: 'Lo-fi Hip Hop', sub: 'Perfect for Biology NCERT', color: '#C084FC', youtube: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn' },
  { id: 2, title: 'Classical Focus', sub: 'Physics problem solving', color: '#F5A623', youtube: 'https://www.youtube.com/watch?v=_-QyR_hGOxA', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DWH0LTlAlHOqQ' },
  { id: 3, title: 'Nature & Rain', sub: 'Deep revision sessions', color: '#86C98E', youtube: 'https://www.youtube.com/watch?v=eKFTSSKCzWA', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX4PP3DA4J0N8' },
  { id: 4, title: 'Binaural 40Hz', sub: 'Memory & focus boost', color: '#5AC8FA', youtube: 'https://www.youtube.com/watch?v=WPni755-Krg', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6' },
  { id: 5, title: 'Bollywood Chill', sub: 'Late night Chemistry grind', color: '#FF7B54', youtube: 'https://www.youtube.com/watch?v=NVtqBrJkQGA', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX0h0QnLkMBl4' },
  { id: 6, title: 'Alpha Waves', sub: 'Organic Chemistry memorization', color: '#E8C98A', youtube: 'https://www.youtube.com/watch?v=W1GHMzOGMLA', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DXa2PvUpywmrr' },
]
const GUIDE_SLIDES = [
  { Icon: Target, color: '#F5A623', title: 'AI Study Plan', desc: 'Your 7-day roadmap auto-built by AI based on your exam date, weak chapters, and NEET syllabus weightage. Regenerate anytime.' },
  { Icon: Layers, color: '#C084FC', title: 'The 4-Phase Method', desc: 'Every chapter: Lecture → Practice → Revision → Error Fix. This is exactly how toppers crack NEET. No skipping phases.' },
  { Icon: BookMarked, color: '#FF7B54', title: 'Error Vault', desc: 'Every mistake you log gets a parallel AI-generated NEET MCQ. Your errors become your biggest competitive advantage.' },
  { Icon: Clock, color: '#5AC8FA', title: 'Focus Timer', desc: '25 min Pomodoro or custom Flow sessions. Browser notification alerts you when to take a break. Never burn out again.' },
  { Icon: Sparkles, color: '#86C98E', title: 'Live AI Coach', desc: "Tell AI exactly what you're studying right now. Get instant NEET tips, common mistakes, a practice MCQ, and your next step." },
]

const fmt = (s) => String(Math.floor(s)).padStart(2, '0')
const timeStr = (secs) => `${fmt(secs / 60)}:${fmt(secs % 60)}`

// ── NOTIFICATIONS ────────────────────────────────────────────
function useNotifications() {
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })
  async function requestPermission() {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setPermission(p); return p
  }
  function notify(title, body) {
    if (permission !== 'granted') return
    try { new Notification(title, { body }) } catch (e) { console.log(e) }
  }
  return { permission, requestPermission, notify }
}

// ── APP GUIDE ────────────────────────────────────────────────
function AppGuide({ onDone }) {
  const [slide, setSlide] = useState(0)
  const last = slide === GUIDE_SLIDES.length - 1
  const { Icon, color, title, desc } = GUIDE_SLIDES[slide]
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(245,166,35,0.1), transparent 60%), var(--bg)' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 40 }}>GOAT NEET · How it works</div>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: `${color}12`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <Icon size={34} color={color} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', textAlign: 'center', marginBottom: 14 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.75, maxWidth: 300, marginBottom: 48 }}>{desc}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {GUIDE_SLIDES.map((_, i) => <div key={i} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? 'var(--amber)' : 'var(--border)', transition: 'all 0.3s' }} />)}
      </div>
      <button className="btn-primary" style={{ maxWidth: 280 }} onClick={() => last ? onDone() : setSlide(s => s + 1)}>
        {last ? 'Start Studying →' : 'Next'}
      </button>
      {!last && <button onClick={onDone} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Skip guide</button>}
    </div>
  )
}

// ── AUTH ────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function reset() { setError(''); setSuccess(''); setEmail(''); setPassword(''); setName('') }

  async function handleSubmit() {
    setError(''); setSuccess('')
    if (!email) return setError('Please enter your email')
    setLoading(true)
    try {
      if (tab === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (e) throw e
        setSuccess('Password reset link sent! Check your email inbox.')
      } else if (tab === 'signup') {
        if (!name || !password) { setLoading(false); return setError('Please fill all fields') }
        const { error: e } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (e) throw e
        setSuccess('Account created! Check your email to confirm.')
      } else {
        if (!password) { setLoading(false); return setError('Please enter your password') }
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
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); reset() }}>Login</button>
          <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); reset() }}>Sign Up</button>
          <button className={`auth-tab ${tab === 'forgot' ? 'active' : ''}`} onClick={() => { setTab('forgot'); reset() }}>Reset</button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        {tab === 'signup' && <div className="input-group"><label>Your Name</label><input placeholder="e.g. Gulshan" value={name} onChange={e => setName(e.target.value)} /></div>}
        <div className="input-group"><label>Email</label><input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        {tab !== 'forgot' && <div className="input-group"><label>Password</label><input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} /></div>}
        {tab === 'forgot' && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>Enter your email and we'll send a reset link to your inbox.</div>}
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'login' ? 'Login' : tab === 'signup' ? 'Create Account' : 'Send Reset Link'}
        </button>
        {tab === 'login' && <button onClick={() => { setTab('forgot'); reset() }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, marginTop: 12, width: '100%', fontFamily: 'inherit' }}>Forgot password?</button>}
      </div>
    </div>
  )
}

// ── ONBOARDING ───────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [studentType, setStudentType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [examDate, setExamDate] = useState('')
  const [weakSubjects, setWeakSubjects] = useState([])
  const [weakChapters, setWeakChapters] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState('')
  const [loading, setLoading] = useState(false)
  const toggle = (s) => setWeakSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  async function finish() {
    setLoading(true)
    try {
      await supabase.from('user_profiles').update({
        student_type: studentType, start_date: startDate || null, exam_date: examDate || null,
        weak_subjects: weakSubjects.join(','), weak_chapters: weakChapters,
        hours_per_day: parseInt(hoursPerDay) || 8, onboarded: true
      }).eq('id', user.id)
      try {
        const plan = await getStudyPlan({
          name: user.user_metadata?.display_name || 'Student',
          studentType, startDate, examDate,
          weakSubjects: weakSubjects.join(', '), weakChapters, hoursPerDay
        })
        if (plan?.weekPlan) {
          await supabase.from('study_plans').insert(plan.weekPlan.map(day => ({
            user_id: user.id, day_name: day.day, subject: day.subject, chapter: day.chapter,
            lecture_task: day.phases.lecture, practice_task: day.phases.practice,
            revision_task: day.phases.revision, error_fix_task: day.phases.errorFix,
            quote: day.quote, tip: day.neetTip || day.tip
          })))
        }
      } catch (e) { console.error(e) }
      onComplete()
    } catch (e) { console.error(e); onComplete() }
    finally { setLoading(false) }
  }

  return (
    <div className="onboarding">
      <div className="progress-track"><div className="progress-track-fill" style={{ width: `${(step / 4) * 100}%` }} /></div>
      {step === 1 && (
        <div className="anim-fade-up">
          <div className="onboarding-step">Step 1 of 4</div>
          <div className="onboarding-title">Who are you,<br /><span>NEET warrior?</span></div>
          <div className="input-group">
            <label>I am currently</label>
            <div className="chip-group" style={{ marginTop: 8 }}>
              {['Class 11th', 'Class 12th', 'Dropper (1st)', 'Dropper (2nd+)'].map(t => <div key={t} className={`chip ${studentType === t ? 'selected' : ''}`} onClick={() => setStudentType(t)}>{t}</div>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <div className="input-group" style={{ flex: 1 }}><label>Prep start date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label>NEET exam date</label><input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} /></div>
          </div>
          <button className="btn-primary" style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => studentType && setStep(2)} disabled={!studentType}>Continue <ArrowRight size={15} /></button>
        </div>
      )}
      {step === 2 && (
        <div className="anim-fade-up">
          <div className="onboarding-step">Step 2 of 4</div>
          <div className="onboarding-title">Your <span>weak spots</span></div>
          <div className="input-group">
            <label>Weak subjects</label>
            <div className="chip-group" style={{ marginTop: 8 }}>
              {SUBJECTS.map(s => <div key={s} className={`chip ${weakSubjects.includes(s) ? 'selected' : ''}`} onClick={() => toggle(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>)}
              <div className={`chip ${weakSubjects.length === 0 ? 'selected' : ''}`} onClick={() => setWeakSubjects([])}>All solid</div>
            </div>
          </div>
          <div className="input-group" style={{ marginTop: 24 }}>
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
            <div className="chip-group" style={{ marginTop: 8 }}>
              {['4', '6', '8', '10', '12+'].map(h => <div key={h} className={`chip ${hoursPerDay === h ? 'selected' : ''}`} onClick={() => setHoursPerDay(h)}>{h} hrs</div>)}
            </div>
          </div>
          <div style={{ marginTop: 32, padding: 18, background: 'rgba(245,166,35,0.05)', borderRadius: 16, border: '1px solid rgba(245,166,35,0.12)' }}>
            <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Atomic Habits — James Clear</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, fontStyle: 'italic' }}>"You do not rise to the level of your goals. You fall to the level of your systems."</div>
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
          <div className="onboarding-title">AI is building your<br /><span>battle plan</span></div>
          <div style={{ marginTop: 24, padding: 18, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
            {[['Target', studentType], examDate ? ['Exam Date', examDate] : null, ['Weak Areas', weakSubjects.length ? weakSubjects.join(', ') : 'None'], ['Daily Study', `${hoursPerDay} hours`]].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 14, background: 'rgba(245,166,35,0.04)', borderRadius: 12, border: '1px solid rgba(245,166,35,0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Deep Work — Cal Newport</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, fontStyle: 'italic' }}>"Clarity about what matters provides clarity about what does not."</div>
          </div>
          <button className="btn-primary" style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={finish} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Building AI plan...</> : <><Sparkles size={16} /> Launch GOAT NEET</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ── LIVE STUDY CONTEXT ───────────────────────────────────────
function StudyContextCard({ user, profile }) {
  const [input, setInput] = useState(profile?.current_study_context || '')
  const [subject, setSubject] = useState('biology')
  const [phase, setPhase] = useState('lecture')
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(false)

  async function getAdvice() {
    if (!input.trim()) return
    setLoading(true)
    try {
      await supabase.from('user_profiles').update({ current_study_context: input }).eq('id', user.id)
      const result = await getStudyContextAdvice({ currentStudying: input, subject, phase }, profile)
      setAdvice(result)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="context-card anim-fade-up-2">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={14} color="var(--amber)" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Live AI Coach</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Tell AI what you're studying right now</div>
        </div>
      </div>
      <div className="input-group" style={{ marginBottom: 8 }}>
        <input placeholder="e.g. NCERT Ch 13 Photosynthesis, light reactions..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && getAdvice()} style={{ fontSize: 13 }} />
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {SUBJECTS.map(s => <div key={s} className={`chip ${subject === s ? 'selected' : ''}`} style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setSubject(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>)}
        {['lecture', 'practice', 'revision', 'errorfix'].map(p => <div key={p} className={`chip ${phase === p ? 'selected' : ''}`} style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setPhase(p)}>{p}</div>)}
      </div>
      <button onClick={getAdvice} disabled={loading || !input.trim()} style={{ width: '100%', padding: '10px', background: loading ? 'rgba(245,166,35,0.08)' : 'linear-gradient(135deg, #F5A623, #D4853A)', border: loading ? '1px solid rgba(245,166,35,0.15)' : 'none', borderRadius: 10, color: loading ? 'var(--amber)' : '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {loading ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderTopColor: 'var(--amber)' }} /> Getting AI advice...</> : <><Sparkles size={13} /> Get AI Advice</>}
      </button>
      {advice && (
        <div style={{ marginTop: 14 }} className="anim-fade-up">
          {advice.topPoints?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Key Points for NEET</div>
              {advice.topPoints.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 700, color: 'var(--amber)' }}>{i + 1}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{p}</div>
                </div>
              ))}
            </div>
          )}
          {advice.commonMistakes?.length > 0 && (
            <div style={{ marginBottom: 10, padding: 10, background: 'rgba(255,123,84,0.05)', borderRadius: 10, border: '1px solid rgba(255,123,84,0.12)' }}>
              <div style={{ fontSize: 9, color: 'var(--red)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Common NEET Mistakes</div>
              {advice.commonMistakes.map((m, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'flex', gap: 6 }}><span style={{ color: 'var(--red)', flexShrink: 0 }}>✕</span>{m}</div>)}
            </div>
          )}
          {advice.quickMCQ && (
            <div style={{ padding: 12, background: 'rgba(245,166,35,0.04)', borderRadius: 10, border: '1px solid rgba(245,166,35,0.12)', marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Practice MCQ</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>{advice.quickMCQ.question}</div>
              {advice.quickMCQ.options?.map((opt, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, padding: '6px 8px', background: 'var(--bg)', borderRadius: 6 }}>{opt}</div>)}
              {advice.quickMCQ.answer && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>Answer: {advice.quickMCQ.answer}{advice.quickMCQ.explanation && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> — {advice.quickMCQ.explanation}</span>}</div>}
            </div>
          )}
          {advice.nextStep && (
            <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 12px', background: 'rgba(134,201,142,0.05)', borderRadius: 8, border: '1px solid rgba(134,201,142,0.12)', display: 'flex', gap: 6 }}>
              <ArrowRight size={13} color="#86C98E" style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong style={{ color: '#86C98E' }}>Next:</strong> {advice.nextStep}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TIMER ────────────────────────────────────────────────────
function TimerScreen({ notify }) {
  const [mode, setMode] = useState('pomodoro')
  const [phase, setPhase] = useState('focus')
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(25 * 60)
  const [customMins, setCustomMins] = useState(45)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)
  const color = '#F5A623'
  const r = 96; const circ = 2 * Math.PI * r
  const total = mode === 'flow' ? customMins * 60 : phase === 'focus' ? 25 * 60 : 5 * 60
  const offset = circ - ((total - secs) / total) * circ

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current); setRunning(false)
            if (mode === 'pomodoro') {
              if (phase === 'focus') { setSessions(n => n + 1); notify('Focus done!', 'Take a 5-minute break. You earned it.'); setPhase('break'); return 5 * 60 }
              else { notify('Break over!', 'Time to focus again. Back to work.'); setPhase('focus'); return 25 * 60 }
            } else { notify('Flow complete!', `${customMins} minutes done. Great work!`) }
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
        <button className={`timer-mode-btn ${mode === 'pomodoro' ? 'active' : ''}`} onClick={() => switchMode('pomodoro')}><TimerIcon size={13} /> Pomodoro</button>
        <button className={`timer-mode-btn ${mode === 'flow' ? 'active' : ''}`} onClick={() => switchMode('flow')}><Layers size={13} /> Flow</button>
      </div>
      {mode === 'flow' && !running && (
        <div className="chip-group" style={{ justifyContent: 'center', marginTop: 16 }}>
          {[30, 45, 60, 90].map(m => <div key={m} className={`chip ${customMins === m ? 'selected' : ''}`} onClick={() => { setCustomMins(m); setSecs(m * 60) }} style={{ padding: '7px 14px', fontSize: 12 }}>{m}m</div>)}
        </div>
      )}
      <div className="timer-circle">
        <svg className="timer-svg" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(245,166,35,0.08)" strokeWidth="8" />
          <circle cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 12px ${color}50)` }} />
        </svg>
        <div className="timer-text">
          <div className="timer-time" style={{ color }}>{timeStr(secs)}</div>
          <div className="timer-phase-label">{mode === 'flow' ? 'Flow State' : phase === 'focus' ? 'Focus' : 'Break'}</div>
          {sessions > 0 && <div className="timer-sessions">{sessions} sessions done</div>}
        </div>
      </div>
      <div className="timer-controls">
        <button className="btn-circle" onClick={reset}><RefreshCw size={17} /></button>
        <button className="btn-circle primary" style={{ boxShadow: running ? `0 0 28px ${color}45` : 'none' }} onClick={() => setRunning(r => !r)}>
          {running ? <Pause size={24} fill="#000" color="#000" /> : <Play size={24} fill="#000" color="#000" />}
        </button>
        <button className="btn-circle" onClick={() => { const n = phase === 'focus' ? 'break' : 'focus'; setPhase(n); setSecs(n === 'focus' ? 25 * 60 : 5 * 60); setRunning(false) }}><SkipForward size={17} /></button>
      </div>
      <div className="timer-info">
        <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
          {mode === 'pomodoro' ? 'Pomodoro Technique' : 'Flow State — Csikszentmihalyi'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          {mode === 'pomodoro' ? '25 min deep focus · 5 min break · After 4 rounds take 20 min long break' : 'One goal. Zero distractions. Let your brain enter the zone naturally.'}
        </div>
      </div>
    </div>
  )
}

// ── MEDITATION ───────────────────────────────────────────────
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
    { name: 'inhale', label: 'Inhale', duration: 4, color: '#F5A623', message: 'Breathe In', note: 'Fill your lungs completely. Feel your chest rise.' },
    { name: 'hold', label: 'Hold', duration: 4, color: '#E8C98A', message: 'Hold', note: 'Stay still. Let the oxygen absorb fully.' },
    { name: 'exhale', label: 'Exhale', duration: 6, color: '#C084FC', message: 'Release', note: 'Let go of all tension. Empty completely.' },
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
          <button className="btn-primary" onClick={start} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Wind size={16} /> Start Breathing</button>
          <button className="btn-primary" style={{ marginTop: 8, background: 'transparent', color: 'var(--purple)', border: '1px solid rgba(192,132,252,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={loadAiScript} disabled={loadingScript}>
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
            <div className="breath-core" style={{ background: `linear-gradient(135deg, ${cp?.color}, ${cp?.color}99)`, color: '#000' }}>{cp?.label}</div>
          </div>
          <div className="breath-count" style={{ color: cp?.color }}>{count}</div>
          <div className="breath-phase-label" style={{ color: cp?.color }}>{cp?.message}</div>
          <div className="breath-note">{cp?.note}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 14, fontWeight: 600, letterSpacing: '1px' }}>CYCLE {cycle + 1} OF {totalCycles}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {PHASES.map(p => <div key={p.name} style={{ width: 6, height: 6, borderRadius: '50%', background: phase === p.name ? p.color : 'var(--border)', transition: 'all 0.3s', boxShadow: phase === p.name ? `0 0 8px ${p.color}` : 'none' }} />)}
          </div>
          <button onClick={stop} style={{ marginTop: 28, padding: '9px 22px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 100, color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Stop</button>
        </>
      )}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', marginTop: 48 }} className="anim-fade-up">
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #D4853A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(245,166,35,0.3)' }}>
            <CheckCircle2 size={32} color="#000" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.5px' }}>Session Complete</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>{totalCycles} breathing cycles complete</div>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', maxWidth: 280, margin: '24px auto 0', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"Almost everything will work again if you unplug it for a few minutes. Including you."</div>
          <button className="btn-primary" style={{ maxWidth: 200, margin: '24px auto 0', display: 'block' }} onClick={stop}>Go Again</button>
        </div>
      )}
    </div>
  )
}

// ── VAULT ────────────────────────────────────────────────────
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
      aiQ = `${r.question}\n\n${r.options?.join('\n') || ''}\n\nAnswer: ${r.answer}\n${r.explanation || ''}`
    } catch (e) { console.error(e) }
    await supabase.from('vault_entries').insert({ user_id: user.id, ...form, ai_question: aiQ })
    setForm({ subject: 'biology', topic: '', mistake: '' }); setShowAdd(false); setSaving(false); loadEntries()
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">Error Vault</div><div className="dash-name">Mistake → Mastery</div></div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg, #F5A623, #D4853A)', border: 'none', borderRadius: 100, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={15} /> Add
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', overflowX: 'auto', paddingBottom: 4 }}>
        {['all', ...SUBJECTS].map(s => <div key={s} className={`chip ${filter === s ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={() => setFilter(s)}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</div>)}
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
                  <div className="ai-q-label"><Sparkles size={10} /> AI Parallel MCQ</div>
                  <div className="ai-q-text" style={{ whiteSpace: 'pre-line' }}>{e.ai_question}</div>
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
            <div className="input-group"><label>Subject</label>
              <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="input-group"><label>Topic / Chapter</label><input placeholder="e.g. Neural Control & Coordination" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} /></div>
            <div className="input-group"><label>Your Mistake</label><textarea placeholder="What went wrong or confused you..." value={form.mistake} onChange={e => setForm(f => ({ ...f, mistake: e.target.value }))} style={{ minHeight: 80, resize: 'none' }} /></div>
            <button className="btn-primary" onClick={addEntry} disabled={saving}>
              {saving ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> AI generating MCQ...</span>
                : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Sparkles size={15} /> Save + Get AI MCQ</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── JOURNAL ──────────────────────────────────────────────────
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
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg, #F5A623, #D4853A)', border: 'none', borderRadius: 100, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
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
            <div className="input-group"><label>Mood</label>
              <div className="mood-row">
                {MOODS.map(m => <div key={m} className={`mood-chip ${mood === m ? 'selected' : ''}`} style={{ borderColor: mood === m ? MOOD_COLORS[m] : undefined, color: mood === m ? MOOD_COLORS[m] : undefined }} onClick={() => setMood(m)}>{m}</div>)}
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 16 }}><label>Your Thoughts</label>
              <textarea placeholder="What did you study? How did it go? What will you improve tomorrow?" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 120, resize: 'none' }} />
            </div>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── WORKOUT ──────────────────────────────────────────────────
function WorkoutScreen() {
  const [done, setDone] = useState({})
  const doneCount = Object.values(done).filter(Boolean).length
  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">Body & Mind</div><div className="dash-name">Daily Workout</div></div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>{doneCount}/{WORKOUTS.length}</div>
      </div>
      <div style={{ padding: '8px 16px' }}>
        <div style={{ background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.1)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Spark — Dr. John Ratey</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' }}>"Exercise is the single most powerful tool to optimize your brain for learning."</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Today's progress</span>
            <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>{Math.round((doneCount / WORKOUTS.length) * 100)}%</span>
          </div>
          <div className="progress-bar" style={{ height: 3 }}>
            <div className="progress-fill" style={{ width: `${(doneCount / WORKOUTS.length) * 100}%`, background: 'linear-gradient(90deg, #F5A623, #D4853A)', transition: 'width 0.4s ease' }} />
          </div>
        </div>
        {WORKOUTS.map(({ id, name, Icon, detail, color }) => (
          <div key={id} className={`workout-card ${done[id] ? 'done-card' : ''}`}>
            <div className="workout-icon-box"><Icon size={20} color={done[id] ? color : 'var(--text3)'} /></div>
            <div>
              <div className="workout-name" style={{ textDecoration: done[id] ? 'line-through' : 'none', color: done[id] ? 'var(--text3)' : 'var(--text)' }}>{name}</div>
              <div className="workout-detail">{detail}</div>
            </div>
            <button className={`workout-check ${done[id] ? 'done' : ''}`} onClick={() => setDone(d => ({ ...d, [id]: !d[id] }))}>
              {done[id] && <Check size={14} color="#000" />}
            </button>
          </div>
        ))}
        {doneCount === WORKOUTS.length && (
          <div style={{ textAlign: 'center', padding: 28, background: 'rgba(245,166,35,0.06)', borderRadius: 16, border: '1px solid rgba(245,166,35,0.15)', marginTop: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #D4853A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(245,166,35,0.3)' }}>
              <Flame size={22} color="#000" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--amber)' }}>Workout Complete</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Your brain is primed for deep work</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── WAR ROOM ─────────────────────────────────────────────────
function WarRoomScreen({ user, profile }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [form, setForm] = useState({ title: '', subject: '', phase: 'lecture', priority: 'medium', description: '' })

  useEffect(() => { loadTasks() }, [filter])
  async function loadTasks() {
    setLoading(true)
    let q = supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setTasks(data || []); setLoading(false)
  }
  async function generateAITasks() {
    setGenerating(true)
    try {
      const result = await getAITasks(profile)
      if (result?.tasks) {
        await supabase.from('tasks').insert(result.tasks.map(t => ({ user_id: user.id, title: t.title, subject: t.subject, phase: t.phase, priority: t.priority, description: t.description, ai_generated: true })))
        loadTasks()
      }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }
  async function toggleTask(id, status) {
    const ns = status === 'done' ? 'pending' : 'done'
    await supabase.from('tasks').update({ status: ns }).eq('id', id)
    setTasks(t => t.map(task => task.id === id ? { ...task, status: ns } : task))
  }
  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(t => t.filter(task => task.id !== id))
  }
  async function addTask() {
    if (!form.title.trim()) return
    await supabase.from('tasks').insert({ user_id: user.id, ...form })
    setForm({ title: '', subject: '', phase: 'lecture', priority: 'medium', description: '' })
    setShowAdd(false); loadTasks()
  }
  const PRIORITY_COLORS = { high: '#FF7B54', medium: '#F5A623', low: '#86C98E' }
  const PHASE_COLORS = { lecture: '#C084FC', practice: '#F5A623', revision: '#5AC8FA', errorfix: '#FF7B54' }
  const doneCount = tasks.filter(t => t.status === 'done').length

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">War Room</div><div className="dash-name">Today's Battle Plan</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowAdd(true)} style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #F5A623, #D4853A)', border: 'none', borderRadius: 10, color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} /></button>
          <button onClick={generateAITasks} disabled={generating} style={{ height: 36, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: generating ? 'var(--text3)' : 'var(--amber)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            {generating ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderTopColor: 'var(--amber)' }} /> : <Sparkles size={13} />}
            {!generating && 'AI Tasks'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 16px', overflowX: 'auto' }}>
        {['pending', 'done', 'all'].map(f => <div key={f} className={`chip ${filter === f ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</div>)}
      </div>
      <div style={{ padding: '8px 16px' }}>
        {tasks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Completed today</span>
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>{doneCount}/{tasks.length}</span>
            </div>
            <div className="progress-bar" style={{ height: 2 }}><div className="progress-fill" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #F5A623, #D4853A)' }} /></div>
          </div>
        )}
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
              <ListTodo size={36} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>No tasks yet</div>
              <div style={{ fontSize: 12, marginTop: 4, marginBottom: 20 }}>Let AI build your battle plan for today</div>
              <button className="btn-primary" style={{ maxWidth: 220, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={generateAITasks} disabled={generating}>
                {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Building...</> : <><Sparkles size={15} /> Generate AI Tasks</>}
              </button>
            </div>
          ) : tasks.map(task => (
            <div key={task.id} style={{ background: 'var(--surface2)', border: `1px solid ${task.priority === 'high' && task.status !== 'done' ? 'rgba(255,123,84,0.18)' : 'var(--border)'}`, borderRadius: 14, padding: 14, marginBottom: 8, opacity: task.status === 'done' ? 0.4 : 1, transition: 'all 0.25s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <button onClick={() => toggleTask(task.id, task.status)} style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${task.status === 'done' ? 'var(--amber)' : 'var(--border)'}`, background: task.status === 'done' ? 'linear-gradient(135deg, #F5A623, #D4853A)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {task.status === 'done' && <Check size={12} color="#000" />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {task.subject && <span style={{ fontSize: 10, fontWeight: 700, color: SUBJECT_COLORS[task.subject] || 'var(--text3)', textTransform: 'uppercase' }}>{task.subject}</span>}
                    {task.phase && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: `${PHASE_COLORS[task.phase] || 'var(--amber)'}15`, color: PHASE_COLORS[task.phase] || 'var(--amber)', fontWeight: 600 }}>{task.phase}</span>}
                    {task.priority && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: `${PRIORITY_COLORS[task.priority]}12`, color: PRIORITY_COLORS[task.priority], fontWeight: 600 }}>{task.priority}</span>}
                    {task.ai_generated && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 100, background: 'rgba(245,166,35,0.08)', color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase' }}>AI</span>}
                  </div>
                  {task.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>{task.description}</div>}
                </div>
                <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
      </div>
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add Task</div>
            <div className="input-group"><label>Task Title</label><input placeholder="e.g. Read NCERT Chapter 13 Biology" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="input-group" style={{ marginTop: 12 }}><label>Subject (optional)</label>
              <div className="chip-group">
                <div className={`chip ${form.subject === '' ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setForm(f => ({ ...f, subject: '' }))}>None</div>
                {SUBJECTS.map(s => <div key={s} className={`chip ${form.subject === s ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setForm(f => ({ ...f, subject: s }))}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>)}
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 12 }}><label>Phase</label>
              <div className="chip-group">
                {['lecture', 'practice', 'revision', 'errorfix'].map(p => <div key={p} className={`chip ${form.phase === p ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setForm(f => ({ ...f, phase: p }))}>{p}</div>)}
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 12 }}><label>Priority</label>
              <div className="chip-group">
                {['high', 'medium', 'low'].map(p => <div key={p} className={`chip ${form.priority === p ? 'selected' : ''}`} style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setForm(f => ({ ...f, priority: p }))}>{p}</div>)}
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 12 }}><label>Notes (optional)</label><textarea placeholder="Any specific details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 60, resize: 'none' }} /></div>
            <button className="btn-primary" onClick={addTask}>Add Task</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SOUNDTRACK ───────────────────────────────────────────────
function SoundtrackScreen() {
  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">Study Soundtrack</div><div className="dash-name">Focus Music</div></div>
      </div>
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(245,166,35,0.04)', borderRadius: 10, border: '1px solid rgba(245,166,35,0.1)', marginBottom: 14 }}>
          Music should increase focus, not distract. No lyrics during reading. Pick one playlist and commit to it.
        </div>
        {PLAYLISTS.map(p => (
          <div key={p.id} style={{ background: 'var(--surface2)', border: `1px solid ${p.color}15`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}12`, border: `1px solid ${p.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Music2 size={20} color={p.color} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>{p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{p.sub}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={p.youtube} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '9px 12px', background: 'rgba(255,0,0,0.07)', border: '1px solid rgba(255,0,0,0.12)', borderRadius: 10, color: '#FF4444', textDecoration: 'none', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Youtube size={14} /> YouTube
              </a>
              <a href={p.spotify} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '9px 12px', background: 'rgba(30,215,96,0.07)', border: '1px solid rgba(30,215,96,0.12)', borderRadius: 10, color: '#1ED760', textDecoration: 'none', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <HeadphonesIcon size={14} /> Spotify
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── STUDY PLAN ───────────────────────────────────────────────
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
        startDate: profile?.start_date || '', examDate: profile?.exam_date || '',
        weakSubjects: profile?.weak_subjects || '', weakChapters: profile?.weak_chapters || '',
        hoursPerDay: profile?.hours_per_day || 8, currentContext: profile?.current_study_context || ''
      })
      if (np?.weekPlan) {
        await supabase.from('study_plans').delete().eq('user_id', user.id)
        await supabase.from('study_plans').insert(np.weekPlan.map(day => ({
          user_id: user.id, day_name: day.day, subject: day.subject, chapter: day.chapter,
          lecture_task: day.phases.lecture, practice_task: day.phases.practice,
          revision_task: day.phases.revision, error_fix_task: day.phases.errorFix,
          quote: day.quote, tip: day.neetTip || day.tip
        })))
        loadPlan()
      }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }
  const phases = [
    { key: 'lecture_task', label: 'Lecture', color: '#C084FC', Icon: BookOpen },
    { key: 'practice_task', label: 'Practice', color: '#F5A623', Icon: PenTool },
    { key: 'revision_task', label: 'Revision', color: '#5AC8FA', Icon: RotateCcw },
    { key: 'error_fix_task', label: 'Error Fix', color: '#FF7B54', Icon: Brain },
  ]
  if (loading) return <div className="loading"><div className="spinner" /><div className="loading-text">Loading plan...</div></div>

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div><div className="dash-eyebrow">AI Study Plan</div><div className="dash-name">7-Day Roadmap</div></div>
        <button onClick={regenerate} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 100, color: 'var(--amber)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {generating ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderTopColor: 'var(--amber)' }} /> : <RefreshCw size={13} />}
          {!generating && 'Refresh'}
        </button>
      </div>

      {/* Phase Legend */}
      <div style={{ margin: '0 16px 10px', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>What Each Phase Means</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PHASE_INFO.map(({ key, label, color, desc }) => (
            <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: `${color}14`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color }}>{key}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4, marginTop: 1 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {plan.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Bot size={28} color="var(--text3)" /></div>
          <div style={{ color: 'var(--text3)', marginBottom: 24, fontSize: 14 }}>No plan yet. Let AI build one for you.</div>
          <button className="btn-primary" style={{ maxWidth: 240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={regenerate} disabled={generating}>
            {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Building...</> : <><Sparkles size={15} /> Generate AI Study Plan</>}
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 16px 8px' }}>
          {plan.map((day, i) => (
            <div key={day.id || i} className="chapter-card" onClick={() => setSelected(selected === i ? null : i)}>
              <div className="chapter-top">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className="chapter-dot" style={{ background: SUBJECT_COLORS[day.subject?.toLowerCase()] || 'var(--amber)', marginTop: 4, boxShadow: `0 0 6px ${SUBJECT_COLORS[day.subject?.toLowerCase()] || 'var(--amber)'}50` }} />
                  <div>
                    <div style={{ fontSize: 9, color: SUBJECT_COLORS[day.subject?.toLowerCase()] || 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 3 }}>{day.day_name} · {day.subject}</div>
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
                      <div className="phase-detail-label" style={{ color }}><Icon size={11} />{label}</div>
                      <div className="phase-detail-text">{day[key]}</div>
                    </div>
                  ))}
                  {day.quote && <div style={{ marginTop: 8, padding: 12, background: 'rgba(192,132,252,0.05)', borderRadius: 10, border: '1px solid rgba(192,132,252,0.12)', fontSize: 12, fontStyle: 'italic', color: 'var(--text2)', lineHeight: 1.6 }}>"{day.quote}"</div>}
                  {day.tip && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)', padding: '8px 12px', background: 'rgba(245,166,35,0.05)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 6 }}><Sparkles size={12} style={{ flexShrink: 0, marginTop: 1 }} />{day.tip}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MORE ─────────────────────────────────────────────────────
function MoreScreen({ onNavigate }) {
  const items = [
    { id: 'breathe', Icon: Wind, label: 'Meditation & Breathing', sub: 'Box breathing · AI guided sessions', color: '#C084FC', grad: 'linear-gradient(135deg, rgba(192,132,252,0.06), rgba(90,200,250,0.03))' },
    { id: 'workout', Icon: Dumbbell, label: 'Daily Workout', sub: 'Brain primed for deep study', color: '#F5A623', grad: 'linear-gradient(135deg, rgba(245,166,35,0.06), rgba(212,133,58,0.03))' },
    { id: 'journal', Icon: NotebookPen, label: 'Journal', sub: 'Reflect and track growth', color: '#86C98E', grad: 'linear-gradient(135deg, rgba(134,201,142,0.06), rgba(90,200,250,0.03))' },
    { id: 'warroom', Icon: ListTodo, label: 'War Room', sub: 'Daily battle plan + AI tasks', color: '#FF7B54', grad: 'linear-gradient(135deg, rgba(255,123,84,0.06), rgba(245,166,35,0.03))' },
    { id: 'soundtrack', Icon: Music2, label: 'Study Soundtrack', sub: 'Curated playlists for focus', color: '#5AC8FA', grad: 'linear-gradient(135deg, rgba(90,200,250,0.06), rgba(192,132,252,0.03))' },
  ]
  return (
    <div className="dashboard" style={{ paddingTop: 28 }}>
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 4 }}>More Tools</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Everything else</div>
      </div>
      {items.map(({ id, Icon, label, sub, color, grad }) => (
        <div key={id} className="more-card" style={{ background: grad }} onClick={() => onNavigate(id)}>
          <div className="more-icon-box" style={{ background: `${color}10`, border: `1px solid ${color}18` }}><Icon size={22} color={color} /></div>
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

// ── DASHBOARD ────────────────────────────────────────────────
function Dashboard({ user, profile, onSignOut, notify, permission, requestPermission }) {
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
      const m = await getDailyMotivation({ name: profile?.display_name || 'Student', weakSubjects: profile?.weak_subjects || 'all subjects', studentType: profile?.student_type || 'NEET student', examDate: profile?.exam_date })
      setMotivation(m)
    } catch (e) { console.error(e) }
    setLoadingMoti(false)
  }

  const name = profile?.display_name || user.user_metadata?.display_name || 'Student'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const phases = [{ label: 'L', color: '#C084FC' }, { label: 'P', color: '#F5A623' }, { label: 'R', color: '#5AC8FA' }, { label: 'E', color: '#FF7B54' }]
  const examDate = profile?.exam_date ? new Date(profile.exam_date) : null
  const daysLeft = examDate ? Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="dashboard">
      <div className="dash-header anim-fade-up">
        <div>
          <div className="dash-eyebrow">GOAT NEET · {greeting}</div>
          <div className="dash-name">{name}</div>
        </div>
        <div className="header-actions">
          {permission !== 'granted' && permission !== 'unsupported' && (
            <button className="btn-icon" onClick={requestPermission} title="Enable notifications"><BellOff size={15} /></button>
          )}
          {permission === 'granted' && (
            <button className="btn-icon" title="Notifications active" style={{ borderColor: 'rgba(245,166,35,0.3)', color: 'var(--amber)' }}><Bell size={15} /></button>
          )}
          <div className="dash-avatar">{initials}</div>
          <button className="btn-icon" onClick={onSignOut}><LogOut size={15} /></button>
        </div>
      </div>

      {daysLeft !== null && daysLeft > 0 && (
        <div style={{ margin: '0 16px 4px', padding: '10px 14px', background: daysLeft < 30 ? 'rgba(255,123,84,0.06)' : 'rgba(245,166,35,0.05)', border: `1px solid ${daysLeft < 30 ? 'rgba(255,123,84,0.18)' : 'rgba(245,166,35,0.12)'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>NEET Exam Countdown</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: daysLeft < 30 ? 'var(--red)' : 'var(--amber)' }}>{daysLeft} days left</div>
        </div>
      )}

      <div className="stats-row anim-fade-up-1">
        <div className="stat-card" style={{ borderColor: 'rgba(245,166,35,0.15)' }}>
          <div className="stat-label"><Flame size={11} color="var(--orange)" /> Streak</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{stats?.streak_days ?? 0}</div>
          <div className="stat-sub">days</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(90,200,250,0.15)' }}>
          <div className="stat-label"><Zap size={11} color="var(--cyan)" /> Energy</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{stats?.energy_pct ?? 80}%</div>
          <div className="stat-sub">today</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(245,166,35,0.15)' }}>
          <div className="stat-label"><Target size={11} color="var(--amber)" /> Mode</div>
          <div className="stat-value" style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>{profile?.student_type?.split(' ')[0] ?? 'NEET'}</div>
          <div className="stat-sub">prep</div>
        </div>
      </div>

      {loadingMoti ? (
        <div style={{ margin: '8px 16px', padding: 18, background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: '80%', marginBottom: 10, animation: 'pulse 2s infinite' }} />
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: '50%', animation: 'pulse 2s infinite' }} />
        </div>
      ) : motivation && (
        <div className="quote-card anim-fade-up-2">
          <div className="quote-mark">"</div>
          <div className="quote-text">{motivation.quote?.replace(/^"|"$/g, '')}</div>
          {motivation.motivation && <div className="quote-motivation">{motivation.motivation}</div>}
        </div>
      )}

      <StudyContextCard user={user} profile={profile} />

      <div className="section anim-fade-up-3">
        <div className="section-header">
          <div><div className="section-title">Daily Focus Radar</div><div className="section-sub">High-yield chapters · AI ranked</div></div>
          <div className="live-badge"><div className="live-dot" />Live</div>
        </div>
        {chapters.map(c => (
          <div key={c.id} className="chapter-card">
            <div className="chapter-top">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div className="chapter-dot" style={{ background: SUBJECT_COLORS[c.subject], marginTop: 5, boxShadow: `0 0 6px ${SUBJECT_COLORS[c.subject]}50` }} />
                <div><div className="chapter-name">{c.chapter}</div><div className="chapter-reason">{c.reason}</div></div>
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
          <div><div className="section-title">Revision Queue</div><div className="section-sub">Spaced repetition</div></div>
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
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${r.progress * 100}%`, background: SUBJECT_COLORS[r.subject] }} /></div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}

// ── NAV ──────────────────────────────────────────────────────
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
          <Icon size={20} /><span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboarded, setOnboarded] = useState(false)
  const [screen, setScreen] = useState('home')
  const [showGuide, setShowGuide] = useState(false)
  const { permission, requestPermission, notify } = useNotifications()

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
    setProfile(data); setOnboarded(data?.onboarded === true)
    if (data?.onboarded && !localStorage.getItem('goatneet_guide_seen')) setShowGuide(true)
    setLoading(false)
  }

  function doneGuide() { localStorage.setItem('goatneet_guide_seen', 'true'); setShowGuide(false) }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setOnboarded(false); setScreen('home')
  }

  if (loading) return (
    <div className="loading">
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #F5A623, #E8C98A, #D4853A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>GOAT NEET</div>
      <div className="spinner" />
      <div className="loading-text">Loading...</div>
    </div>
  )

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />
  if (!onboarded) return <Onboarding user={user} onComplete={() => { setOnboarded(true); loadProfile(user.id) }} />
  if (showGuide) return <AppGuide onDone={doneGuide} />

  const navScreens = ['home', 'plan', 'timer', 'vault', 'more']
  const renderScreen = () => {
    switch (screen) {
      case 'home': return <Dashboard user={user} profile={profile} onSignOut={signOut} notify={notify} permission={permission} requestPermission={requestPermission} />
      case 'plan': return <StudyPlanScreen user={user} profile={profile} />
      case 'timer': return <TimerScreen notify={notify} />
      case 'vault': return <VaultScreen user={user} />
      case 'breathe': return <MeditationScreen />
      case 'workout': return <WorkoutScreen />
      case 'journal': return <JournalScreen user={user} />
      case 'warroom': return <WarRoomScreen user={user} profile={profile} />
      case 'soundtrack': return <SoundtrackScreen />
      case 'more': return <MoreScreen onNavigate={setScreen} />
      default: return <Dashboard user={user} profile={profile} onSignOut={signOut} notify={notify} permission={permission} requestPermission={requestPermission} />
    }
  }

  return (
    <div className="app">
      {renderScreen()}
      <BottomNav active={navScreens.includes(screen) ? screen : 'more'} onChange={setScreen} />
    </div>
  )
}


