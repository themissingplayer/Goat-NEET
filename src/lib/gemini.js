const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`

const NEET_SYLLABUS = {
  biology: [
    'The Living World','Biological Classification','Plant Kingdom','Animal Kingdom',
    'Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals',
    'Cell: The Unit of Life','Biomolecules','Cell Cycle and Cell Division',
    'Transport in Plants','Mineral Nutrition','Photosynthesis in Higher Plants',
    'Respiration in Plants','Plant Growth and Development',
    'Digestion and Absorption','Breathing and Exchange of Gases','Body Fluids and Circulation',
    'Excretory Products and their Elimination','Locomotion and Movement',
    'Neural Control and Coordination','Chemical Coordination and Integration',
    'Reproduction in Organisms','Sexual Reproduction in Flowering Plants',
    'Human Reproduction','Reproductive Health',
    'Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution',
    'Human Health and Disease','Strategies for Enhancement in Food Production',
    'Microbes in Human Welfare','Biotechnology: Principles and Processes',
    'Biotechnology and its Applications','Organisms and Populations',
    'Ecosystem','Biodiversity and Conservation','Environmental Issues'
  ],
  physics: [
    'Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane',
    'Laws of Motion','Work Energy and Power','System of Particles and Rotational Motion',
    'Gravitation','Mechanical Properties of Solids','Mechanical Properties of Fluids',
    'Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves',
    'Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity',
    'Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction',
    'Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments',
    'Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei',
    'Semiconductor Electronics','Communication Systems'
  ],
  chemistry: [
    'Some Basic Concepts of Chemistry','Structure of Atom',
    'Classification of Elements and Periodicity in Properties',
    'Chemical Bonding and Molecular Structure','States of Matter','Thermodynamics',
    'Equilibrium','Redox Reactions','Hydrogen','The s-Block Elements','The p-Block Elements',
    'Organic Chemistry Basic Principles','Hydrocarbons','Environmental Chemistry',
    'The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry',
    'General Principles of Isolation of Elements','The p-Block Elements Group 15-18',
    'The d and f Block Elements','Coordination Compounds','Haloalkanes and Haloarenes',
    'Alcohols Phenols and Ethers','Aldehydes Ketones and Carboxylic Acids',
    'Amines','Biomolecules','Polymers','Chemistry in Everyday Life'
  ]
}

async function askGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
}

export async function getStudyPlan(profile) {
  const today = new Date()
  const examDate = profile.examDate ? new Date(profile.examDate) : null
  const daysLeft = examDate ? Math.ceil((examDate - today)/(1000*60*60*24)) : null
  const syllabus = Object.entries(NEET_SYLLABUS).map(([s,ch]) =>
    `${s.toUpperCase()}: ${ch.join(' | ')}`).join('\n')

  const prompt = `You are GOAT NEET AI, an expert NEET coach with deep knowledge of NCERT and NEET PG/UG patterns.

STUDENT PROFILE:
- Name: ${profile.name}
- Category: ${profile.studentType}
- Prep started: ${profile.startDate || 'Not specified'}
- Exam date: ${profile.examDate || 'Not specified'}
- Days to exam: ${daysLeft !== null ? daysLeft + ' days' : 'Unknown'}
- Daily hours: ${profile.hoursPerDay}
- Weak subjects: ${profile.weakSubjects || 'None'}
- Weak chapters: ${profile.weakChapters || 'None'}
- Currently studying: ${profile.currentContext || 'Not specified'}

NEET SYLLABUS (all chapters):
${syllabus}

NEET WEIGHTAGE: Biology 90Q (360 marks) | Physics 45Q (180 marks) | Chemistry 45Q (180 marks)

HIGH-YIELD chapters (appear every year): Neural Control, Genetics, Ecology, Human Reproduction, Biomolecules (Bio) | Thermodynamics, Rotational Motion, Modern Physics, Waves, Current Electricity (Phy) | Organic Chemistry, Equilibrium, Coordination Compounds, Electrochemistry (Chem)

STRATEGY BASED ON DAYS LEFT:
${daysLeft !== null ?
  daysLeft < 30 ? 'CRITICAL: Only revision + mock tests. No new chapters.' :
  daysLeft < 60 ? 'URGENT: Prioritize high-yield chapters, daily revision.' :
  daysLeft < 120 ? 'FOCUSED: Cover weak areas deeply, start revision cycle.' :
  'FOUNDATION: Deep study, concept clarity, build strong base.'
  : 'Create optimal balanced plan.'}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "strategy": "2-sentence personalized strategy based on their profile and days left",
  "weekPlan": [
    {
      "day": "Monday",
      "subject": "biology",
      "chapter": "exact chapter from NEET syllabus above",
      "priority": "HIGH",
      "estimatedHours": 2,
      "phases": {
        "lecture": "exact NCERT pages or concepts to study",
        "practice": "exact number of MCQs, which type, which source",
        "revision": "specific revision method for this chapter",
        "errorFix": "top 2 mistakes students make in NEET on this chapter"
      },
      "neetTip": "one specific NEET exam tip for this chapter",
      "quote": "motivational quote with author"
    }
  ]
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getStudyContextAdvice(context, profile) {
  const prompt = `You are GOAT NEET AI. A student is studying RIGHT NOW:
Topic: "${context.currentStudying}"
Subject: ${context.subject}
Phase: ${context.phase}
Student type: ${profile?.student_type || 'NEET aspirant'}
Weak subjects: ${profile?.weak_subjects || 'none'}

Give INSTANT targeted advice. Be specific to NEET, not generic.

Return ONLY valid JSON (no markdown):
{
  "topPoints": ["3 NEET-specific key points about this exact topic"],
  "commonMistakes": ["2 mistakes students make in NEET on this topic"],
  "quickMCQ": {
    "question": "NEET-style MCQ on this exact topic",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A",
    "explanation": "why correct in one crisp sentence"
  },
  "nextStep": "what to do next based on their current phase",
  "timeEstimate": "how long to master this topic for NEET"
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getAITasks(profile) {
  const today = new Date()
  const dayName = today.toLocaleDateString('en-IN',{weekday:'long'})
  const examDate = profile.exam_date ? new Date(profile.exam_date) : null
  const daysLeft = examDate ? Math.ceil((examDate - today)/(1000*60*60*24)) : null

  const prompt = `You are GOAT NEET AI. Generate specific study tasks for ${dayName}.

Student: ${profile.student_type || 'NEET aspirant'}
Weak subjects: ${profile.weak_subjects || 'none'}
Weak chapters: ${profile.weak_chapters || 'none'}
Hours today: ${profile.hours_per_day || 8}
Days to exam: ${daysLeft || 'unknown'}
Currently studying: ${profile.current_study_context || 'not specified'}

Generate 5 specific tasks for today. Mix of subjects. Prioritize weak areas.

Return ONLY valid JSON (no markdown):
{
  "tasks": [
    {
      "title": "specific actionable task title",
      "subject": "biology",
      "phase": "lecture",
      "duration": 45,
      "priority": "high",
      "description": "exactly what to do — specific chapters, page numbers, MCQ count"
    }
  ]
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getErrorVaultQuestion(subject, topic, mistake) {
  const prompt = `You are a NEET expert.
Subject: ${subject}, Topic: ${topic}, Mistake: ${mistake}

Create a NEET-style parallel MCQ testing the same concept differently.

Return ONLY valid JSON (no markdown):
{
  "question": "NEET-style MCQ",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "answer": "A",
  "explanation": "2-line concept fix"
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getDailyMotivation(profile) {
  const examDate = profile.examDate ? new Date(profile.examDate) : null
  const daysLeft = examDate ? Math.ceil((examDate - new Date())/(1000*60*60*24)) : null

  const prompt = `Give a NEET student named ${profile.name}:
${daysLeft ? `They have ${daysLeft} days to NEET exam.` : ''}
Weak subject: ${profile.weakSubjects || 'working on everything'}

1. One powerful quote from Atomic Habits, Deep Work, Can't Hurt Me, or The Almanack of Naval Ravikant
2. One personalized NEET motivation sentence

Return ONLY valid JSON (no markdown):
{
  "quote": "exact quote — Author Name, Book Name",
  "motivation": "personalized one-liner"
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getMeditationScript(duration) {
  const prompt = `Create a ${duration}-minute breathing meditation for a stressed NEET student.

Return ONLY valid JSON (no markdown):
{
  "cycles": [
    {"instruction": "what to do", "inhale": 4, "hold": 4, "exhale": 6, "note": "calming thought"}
  ]
}`
  return JSON.parse(await askGemini(prompt))
}
