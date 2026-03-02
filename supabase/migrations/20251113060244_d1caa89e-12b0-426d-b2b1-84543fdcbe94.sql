-- Create courses table
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  instructor text NOT NULL,
  duration text NOT NULL,
  level text NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  category text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  enrolled_count integer DEFAULT 0,
  rating numeric(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_enrollments table
CREATE TABLE public.user_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed boolean DEFAULT false,
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses policies (public read)
CREATE POLICY "Anyone can view courses"
ON public.courses FOR SELECT
USING (true);

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments"
ON public.user_enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses"
ON public.user_enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollment progress"
ON public.user_enrollments FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample courses
INSERT INTO public.courses (title, description, image_url, instructor, duration, level, category, price, rating) VALUES
('Hindi for Beginners', 'Master the basics of Hindi language with interactive lessons, pronunciation guides, and cultural insights. Perfect for absolute beginners.', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800', 'Dr. Priya Sharma', '8 weeks', 'beginner', 'Hindi', 2999.00, 4.8),
('Advanced Sanskrit Grammar', 'Deep dive into Sanskrit grammar, syntax, and classical texts. Learn to read and understand ancient Indian literature.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800', 'Prof. Rajesh Kumar', '12 weeks', 'advanced', 'Sanskrit', 3999.00, 4.9),
('Bengali Speaking & Writing', 'Comprehensive course covering Bengali script, conversation, and literature. Includes audio lessons and practice exercises.', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', 'Ananya Chatterjee', '10 weeks', 'intermediate', 'Bengali', 2499.00, 4.7),
('Tamil Literature & Culture', 'Explore Tamil language through its rich literary tradition. Learn classical and modern Tamil with cultural context.', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', 'Dr. Meena Sundaram', '10 weeks', 'intermediate', 'Tamil', 2799.00, 4.6),
('Telugu Conversational Skills', 'Focus on practical Telugu conversation for everyday situations. Includes role-plays and real-world scenarios.', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 'Venkat Reddy', '6 weeks', 'beginner', 'Telugu', 1999.00, 4.5),
('Marathi for Business', 'Professional Marathi course designed for business communication, presentations, and formal correspondence.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800', 'Sandeep Kulkarni', '8 weeks', 'intermediate', 'Marathi', 3499.00, 4.8),
('Kannada Script Mastery', 'Learn to read and write Kannada script from scratch. Includes handwriting practice and digital typing skills.', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800', 'Lakshmi Narayana', '6 weeks', 'beginner', 'Kannada', 1799.00, 4.4),
('Urdu Poetry & Literature', 'Appreciate the beauty of Urdu through its rich poetic tradition. Learn classical and contemporary Urdu literature.', 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800', 'Dr. Farah Ahmed', '12 weeks', 'advanced', 'Urdu', 3799.00, 4.9),
('Punjabi Folk & Modern', 'Experience Punjabi language through folk traditions and modern usage. Includes music and cultural elements.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'Harpreet Singh', '8 weeks', 'intermediate', 'Punjabi', 2599.00, 4.6),
('Malayalam Advanced Reading', 'Enhance your Malayalam reading skills with newspapers, novels, and academic texts. Focus on comprehension.', 'https://images.unsplash.com/photo-1513001900722-370f803f498d?w=800', 'Dr. Suresh Menon', '10 weeks', 'advanced', 'Malayalam', 3299.00, 4.7);