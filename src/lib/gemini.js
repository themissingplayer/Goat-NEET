const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`

async function askGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function getStudyPlan(profile) {
  const prompt = `You are GOAT NEET AI, an expert NEET coach for Indian students.
Student profile:
- Name: ${profile.name}
- Type: ${profile.studentType} (11th/12th/dropper)
- Preparation start date: ${profile.startDate}
- Weak subjects: ${profile.weakSubjects}
- Weak chapters: ${profile.weakChapters}
- Daily study hours available: ${profile.hoursPerDay}

Give a personalized 7-day study plan divided into exactly 4 phases per chapter:
1. LECTURE (understand the concept)
2. PRACTICE (solve questions)
3. REVISION (quick recall)
4. ERROR FIX (master mistakes)

Return ONLY valid JSON like this:
{
  "weekPlan": [
    {
      "day": "Monday",
      "subject": "Biology",
      "chapter": "chapter name",
      "phases": {
        "lecture": "what to do",
        "practice": "what to do",
        "revision": "what to do",
        "errorFix": "what to do"
      },
      "quote": "a motivational quote from a famous book",
      "tip": "one expert tip"
    }
  ]
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getErrorVaultQuestion(subject, topic, mistake) {
  const prompt = `You are a NEET expert. A student made this mistake:
Subject: ${subject}
Topic: ${topic}
Their mistake: ${mistake}

Generate ONE sharp parallel question that tests the same concept from a different angle.
Also give a 2-line explanation of the core concept they need to fix.

Return ONLY valid JSON:
{
  "question": "the parallel question",
  "explanation": "2-line concept fix"
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getDailyMotivation(profile) {
  const prompt = `Give a NEET student named ${profile.name} who is a ${profile.studentType}:
1. One powerful quote from Atomic Habits, Deep Work, or any famous productivity book
2. One sentence of personalized motivation based on their weak subject: ${profile.weakSubjects}

Return ONLY valid JSON:
{
  "quote": "the quote with author name",
  "motivation": "personalized one-liner"
}`
  return JSON.parse(await askGemini(prompt))
}

export async function getMeditationScript(duration) {
  const prompt = `Create a ${duration}-minute guided breathing meditation script for a stressed NEET student.
Include inhale/hold/exhale timings and calming instructions.

Return ONLY valid JSON:
{
  "cycles": [
    {
      "instruction": "what to do",
      "inhale": 4,
      "hold": 4,
      "exhale": 6,
      "note": "calming thought"
    }
  ]
}`
  return JSON.parse(await askGemini(prompt))
}
