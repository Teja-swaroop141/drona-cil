-- Create course_roadmap_items table for learning paths within courses
CREATE TABLE public.course_roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL,
  duration TEXT,
  item_type TEXT NOT NULL DEFAULT 'milestone', -- 'milestone', 'checkpoint', 'objective'
  icon TEXT DEFAULT 'circle', -- icon name for UI
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_roadmap_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view roadmap items
CREATE POLICY "Anyone can view roadmap items"
ON public.course_roadmap_items
FOR SELECT
USING (true);

-- Only admins can manage roadmap items
CREATE POLICY "Admins can insert roadmap items"
ON public.course_roadmap_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roadmap items"
ON public.course_roadmap_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roadmap items"
ON public.course_roadmap_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_course_roadmap_items_course_id ON public.course_roadmap_items(course_id);
CREATE INDEX idx_course_roadmap_items_order ON public.course_roadmap_items(course_id, order_number);