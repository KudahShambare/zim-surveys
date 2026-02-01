import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL ,
  process.env.SUPABASE_KEY 
)

// Add this configuration for body parsing
export const config = {
  api: {
    bodyParser: true,
  },
}



export default async function handler(req, res) {

    // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*') // Allow all origins, or specify your domain
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
res.setHeader(
  'Access-Control-Allow-Headers',
  'Content-Type, Authorization, Accept, X-Requested-With'
)

   if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse body if it's a string
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    console.log('Received body:', body) // Debug log

    /* Basic validation */
    if (!body.age || !body.employment_status) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    /* Normalize checkbox values */
    const arr = (v) => Array.isArray(v) ? v : v ? [v] : []

    const payload = {
      age: body.age,
      gender: body.gender,
      province: body.province,
      diaspora_country: body.diaspora_country,
      diaspora_city: body.diaspora_city,
      diaspora_engagement: body.diaspora_engagement,

      education_level: body.education_level,
      field_of_study: body.field_of_study,
      university: body.university,
      year_started_tech: body.year_started_tech,
      learned_coding: arr(body.learned_coding),

      employment_status: body.employment_status,
      job_title: body.job_title,
      job_title_other: body.job_title_other,
      years_experience: body.years_experience,
      years_current_employer: body.years_current_employer,
      company_type: body.company_type,
      industry: body.industry,
      company_hq: body.company_hq,

      annual_compensation: body.annual_compensation,
      monthly_salary: body.monthly_salary,
      payment_method: arr(body.payment_method),
      benefits: arr(body.benefits),
      compensation_satisfaction: body.compensation_satisfaction,

      work_arrangement: body.work_arrangement,
      remote_days: body.remote_days,
      work_schedule: body.work_schedule,
      team_size: body.team_size,
      management_structure: body.management_structure,
      development_methodology: body.development_methodology,
      meeting_frequency: body.meeting_frequency,

      languages: arr(body.languages),
      frameworks: arr(body.frameworks),
      databases: arr(body.databases),
      cloud: arr(body.cloud),
      dev_tools: arr(body.dev_tools),
      version_control: arr(body.version_control),
      ai_tools: arr(body.ai_tools),

      stay_updated: arr(body.stay_updated),
      learning_hours: body.learning_hours,
      learning_resources: arr(body.learning_resources),
      has_certifications: body.has_certifications,
      certifications: arr(body.certifications),
      is_mentoring: body.is_mentoring,
      has_mentor: body.has_mentor,
      open_source_contribution: body.open_source_contribution,

      challenges: arr(body.challenges),

      user_agent: req.headers['user-agent']
    }

    const { error } = await supabase
      .from('survey_responses')
      .insert(payload)

    if (error) {
      console.error(error)
      return res.status(500).json({ error: 'Database insert failed' })
    }

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Error:', err)
    return res.status(400).json({ error: 'Invalid request', details: err.message })
  }
}