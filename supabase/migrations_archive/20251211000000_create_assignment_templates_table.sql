-- Create assignment_templates table
CREATE TABLE IF NOT EXISTS assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. View policies
CREATE POLICY "Admins can view all assignment templates"
    ON assignment_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Teachers can view their own assignment templates"
    ON assignment_templates
    FOR SELECT
    USING (
        auth.uid() = teacher_id
    );

-- 2. Insert policies
CREATE POLICY "Admins can insert assignment templates"
    ON assignment_templates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Teachers can insert their own assignment templates"
    ON assignment_templates
    FOR INSERT
    WITH CHECK (
        auth.uid() = teacher_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_teacher = true
        )
    );

-- 3. Update policies
CREATE POLICY "Admins can update all assignment templates"
    ON assignment_templates
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Teachers can update their own assignment templates"
    ON assignment_templates
    FOR UPDATE
    USING (
        auth.uid() = teacher_id
    );

-- 4. Delete policies
CREATE POLICY "Admins can delete all assignment templates"
    ON assignment_templates
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Teachers can delete their own assignment templates"
    ON assignment_templates
    FOR DELETE
    USING (
        auth.uid() = teacher_id
    );

-- Add trigger for updated_at
CREATE TRIGGER update_assignment_templates_updated_at
    BEFORE UPDATE ON assignment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
