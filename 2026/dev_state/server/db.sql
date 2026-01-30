-- ========================================
-- ZIMBABWE STATE OF DEVELOPERS SURVEY 2026
-- PostgreSQL Database Schema
-- ========================================

-- Create database (run this separately if needed)
-- CREATE DATABASE zimbabwe_dev_survey;

-- Connect to the database
-- \c zimbabwe_dev_survey;

-- ========================================
-- MAIN SURVEY RESPONSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS survey_responses (
  -- Primary key
  id SERIAL PRIMARY KEY,
  
  -- SECTION 1: DEMOGRAPHICS
  experience VARCHAR(50),
  role VARCHAR(100),
  developer_location VARCHAR(100),
  company_location VARCHAR(100),
  employment_type VARCHAR(100),
  company_size VARCHAR(50),
  education VARCHAR(100),
  
  -- SECTION 2: COMPENSATION
  salary VARCHAR(50),
  salary_satisfaction VARCHAR(50),
  benefits TEXT[], -- PostgreSQL array for multiple selections
  
  -- SECTION 3: TECH STACK & TOOLS
  languages TEXT[],
  frameworks TEXT[],
  cloud VARCHAR(50),
  ai_tools TEXT[],
  other_tools TEXT,
  
  -- SECTION 4: LEARNING & PERSONAL DEVELOPMENT
  certifications TEXT[],
  mentor_status VARCHAR(50),
  dev_focus TEXT[],
  books TEXT,
  
  -- SECTION 5: SOCIAL & COMMUNITY
  social_platforms TEXT[],
  
  -- SECTION 6: OPINIONS & INSIGHTS
  dev_culture VARCHAR(50),
  tech_industry VARCHAR(50),
  education_system VARCHAR(50),
  remote_opportunities VARCHAR(50),
  ai_proof VARCHAR(50),
  
  -- SECTION 7: TOP CHALLENGES
  challenges TEXT[],
  
  -- SECTION 8: DIGITAL TAX
  tax_aware VARCHAR(50),
  tax_impact VARCHAR(50),
  tax_influence VARCHAR(100),
  tax_feeling VARCHAR(50),
  tax_relief VARCHAR(50),
  tax_comments TEXT,
  
  -- SECTION 9: EDUCATION VS INDUSTRY & INNOVATION
  education_preparation VARCHAR(50),
  lacking_skills TEXT[],
  self_study VARCHAR(50),
  innovation_hubs VARCHAR(50),
  hubs_value VARCHAR(50),
  exchange_programs VARCHAR(50),
  industry_connection VARCHAR(50),
  suggestions TEXT,
  
  -- SECTION 10: MATHEMATICS & IT
  math_background VARCHAR(50),
  math_relevance VARCHAR(50),
  math_areas TEXT[],
  math_training VARCHAR(50),
  math_emphasis VARCHAR(50),
  math_topics TEXT,
  
  -- SECTION 11: ADVICE TO STARTERS & ASPIRING DEVELOPERS
  advice TEXT[],
  mistakes TEXT[],
  resources TEXT[],
  motivational_advice TEXT,
  
  -- METADATA
  timestamp TIMESTAMP,
  user_agent TEXT,
  survey_version VARCHAR(20),
  ip_address INET,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR BETTER QUERY PERFORMANCE
-- ========================================

-- Indexes on frequently queried single-value columns
CREATE INDEX IF NOT EXISTS idx_experience ON survey_responses(experience);
CREATE INDEX IF NOT EXISTS idx_role ON survey_responses(role);
CREATE INDEX IF NOT EXISTS idx_salary ON survey_responses(salary);
CREATE INDEX IF NOT EXISTS idx_developer_location ON survey_responses(developer_location);
CREATE INDEX IF NOT EXISTS idx_company_location ON survey_responses(company_location);
CREATE INDEX IF NOT EXISTS idx_employment_type ON survey_responses(employment_type);
CREATE INDEX IF NOT EXISTS idx_timestamp ON survey_responses(timestamp);
CREATE INDEX IF NOT EXISTS idx_created_at ON survey_responses(created_at);

-- GIN indexes for array columns (for searching within arrays)
CREATE INDEX IF NOT EXISTS idx_languages ON survey_responses USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_frameworks ON survey_responses USING GIN(frameworks);
CREATE INDEX IF NOT EXISTS idx_challenges ON survey_responses USING GIN(challenges);
CREATE INDEX IF NOT EXISTS idx_benefits ON survey_responses USING GIN(benefits);

-- ========================================
-- TRIGGER FOR AUTOMATIC UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_survey_responses_updated_at 
    BEFORE UPDATE ON survey_responses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- USEFUL VIEWS FOR REPORTING
-- ========================================

-- Experience distribution view
CREATE OR REPLACE VIEW v_experience_distribution AS
SELECT 
  experience,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM survey_responses
WHERE experience IS NOT NULL
GROUP BY experience
ORDER BY count DESC;

-- Salary distribution view
CREATE OR REPLACE VIEW v_salary_distribution AS
SELECT 
  salary,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM survey_responses
WHERE salary IS NOT NULL AND salary != '' AND salary != 'Prefer not to say'
GROUP BY salary
ORDER BY count DESC;

-- Role distribution view
CREATE OR REPLACE VIEW v_role_distribution AS
SELECT 
  role,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM survey_responses
WHERE role IS NOT NULL
GROUP BY role
ORDER BY count DESC;

-- Top programming languages view
CREATE OR REPLACE VIEW v_top_languages AS
SELECT 
  unnest(languages) as language,
  COUNT(*) as count
FROM survey_responses
WHERE languages IS NOT NULL
GROUP BY language
ORDER BY count DESC;

-- Top challenges view
CREATE OR REPLACE VIEW v_top_challenges AS
SELECT 
  unnest(challenges) as challenge,
  COUNT(*) as count
FROM survey_responses
WHERE challenges IS NOT NULL
GROUP BY challenge
ORDER BY count DESC;

-- Location analysis view
CREATE OR REPLACE VIEW v_location_analysis AS
SELECT 
  developer_location,
  company_location,
  employment_type,
  COUNT(*) as count
FROM survey_responses
WHERE developer_location IS NOT NULL
GROUP BY developer_location, company_location, employment_type
ORDER BY count DESC;

-- ========================================
-- SAMPLE QUERIES FOR ANALYSIS
-- ========================================

-- Query 1: Get total number of responses
-- SELECT COUNT(*) as total_responses FROM survey_responses;

-- Query 2: Experience vs Salary analysis
-- SELECT experience, salary, COUNT(*) as count
-- FROM survey_responses
-- WHERE salary IS NOT NULL
-- GROUP BY experience, salary
-- ORDER BY experience, count DESC;

-- Query 3: Most popular tech stack
-- SELECT 
--   unnest(languages) as language,
--   unnest(frameworks) as framework,
--   COUNT(*) as count
-- FROM survey_responses
-- GROUP BY language, framework
-- ORDER BY count DESC
-- LIMIT 20;

-- Query 4: Challenges by role
-- SELECT 
--   role,
--   unnest(challenges) as challenge,
--   COUNT(*) as count
-- FROM survey_responses
-- WHERE role IS NOT NULL
-- GROUP BY role, challenge
-- ORDER BY count DESC;

-- Query 5: AI tool usage statistics
-- SELECT 
--   unnest(ai_tools) as tool,
--   COUNT(*) as count
-- FROM survey_responses
-- WHERE ai_tools IS NOT NULL
-- GROUP BY tool
-- ORDER BY count DESC;

-- Query 6: Remote work analysis
-- SELECT 
--   employment_type,
--   company_location,
--   COUNT(*) as count
-- FROM survey_responses
-- GROUP BY employment_type, company_location
-- ORDER BY count DESC;

-- Query 7: Education vs Preparation
-- SELECT 
--   education,
--   education_preparation,
--   COUNT(*) as count
-- FROM survey_responses
-- WHERE education IS NOT NULL
-- GROUP BY education, education_preparation
-- ORDER BY count DESC;

-- Query 8: Developer satisfaction metrics
-- SELECT 
--   salary_satisfaction,
--   dev_culture,
--   tech_industry,
--   COUNT(*) as count
-- FROM survey_responses
-- GROUP BY salary_satisfaction, dev_culture, tech_industry
-- ORDER BY count DESC;

-- ========================================
-- COMMENTS ON COLUMNS
-- ========================================
COMMENT ON TABLE survey_responses IS 'Survey responses from Zimbabwe State of Developers Survey 2026';

COMMENT ON COLUMN survey_responses.id IS 'Unique identifier for each survey response';
COMMENT ON COLUMN survey_responses.experience IS 'Years of professional experience';
COMMENT ON COLUMN survey_responses.role IS 'Current job title/role';
COMMENT ON COLUMN survey_responses.salary IS 'Monthly income range in USD';
COMMENT ON COLUMN survey_responses.benefits IS 'Array of benefits received';
COMMENT ON COLUMN survey_responses.languages IS 'Programming languages used';
COMMENT ON COLUMN survey_responses.frameworks IS 'Frameworks and libraries used';
COMMENT ON COLUMN survey_responses.challenges IS 'Top challenges faced in career';
COMMENT ON COLUMN survey_responses.timestamp IS 'When the survey was submitted';
COMMENT ON COLUMN survey_responses.created_at IS 'Record creation timestamp';

-- ========================================
-- GRANT PERMISSIONS (adjust as needed)
-- ========================================
-- GRANT SELECT, INSERT ON survey_responses TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE survey_responses_id_seq TO your_app_user;

-- ========================================
-- BACKUP REMINDER
-- ========================================
-- Regular backups are recommended!
-- pg_dump zimbabwe_dev_survey > backup_$(date +%Y%m%d).sql

-- ========================================
-- TABLE SUCCESSFULLY CREATED
-- ========================================
-- You can now insert data using:
-- INSERT INTO survey_responses (experience, role, salary, ...) VALUES (...);

SELECT 'Survey tables created successfully!' as status;