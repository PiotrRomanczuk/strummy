-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Technique', 'Theory', 'Improvisation'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_skills table
CREATE TABLE IF NOT EXISTS student_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'mastered')),
    notes TEXT,
    last_assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, skill_id)
);

-- Enable RLS
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skills ENABLE ROW LEVEL SECURITY;

-- Policies for skills
-- Everyone can view skills
CREATE POLICY "Everyone can view skills" ON skills
    FOR SELECT USING (true);

-- Only admins/teachers can insert/update/delete skills
CREATE POLICY "Admins and teachers can manage skills" ON skills
    FOR ALL USING (is_admin_or_teacher());

-- Policies for student_skills
-- Students can view their own skills
CREATE POLICY "Students can view their own skills" ON student_skills
    FOR SELECT USING (
        student_id = auth.uid()
    );

-- Admins/Teachers can view all student skills
CREATE POLICY "Admins and teachers can view all student skills" ON student_skills
    FOR SELECT USING (is_admin_or_teacher());

-- Admins/Teachers can manage student skills
CREATE POLICY "Admins and teachers can manage student skills" ON student_skills
    FOR ALL USING (is_admin_or_teacher());

-- Triggers for updated_at
CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_student_skills_updated_at
    BEFORE UPDATE ON student_skills
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
