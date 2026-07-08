<USER_REQUEST>
change scheema 
-- ===========================================================================
-- POSTGRESQL DATABASE INITIALIZATION & MAPPING SCRIPT
-- SOURCE: JOB QUALIFICATION ELIGIBILITY DATA SHEET
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. DROP EXISTING TABLES (If any, to prevent conflicts during fresh setup)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS job_eligibility CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS degrees CASCADE;

-- ---------------------------------------------------------------------------
-- 2. CREATE MASTER TABLES (Normalization)
-- ---------------------------------------------------------------------------

-- Master Table for Educational Degrees
CREATE TABLE degrees (
    degree_id SERIAL PRIMARY KEY,
<truncated 14447 bytes>