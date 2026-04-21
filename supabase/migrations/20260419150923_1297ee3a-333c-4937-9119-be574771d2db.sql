
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.question_type AS ENUM ('yes_no', 'single_choice', 'multiple_choice', 'text_input', 'personal_info');
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- ===== TABLES =====
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  image_url TEXT,
  format TEXT,
  sessions INTEGER,
  duration TEXT,
  schedule TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT '招募中',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type public.question_type NOT NULL,
  text TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  hint_text TEXT,
  hint_trigger_value TEXT,
  jump_logic JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  is_exclusion BOOLEAN NOT NULL DEFAULT false,
  allow_free_text BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_gender TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  status public.registration_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_value TEXT,
  answer_options TEXT[],
  free_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ===== FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_questionnaires_updated BEFORE UPDATE ON public.questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_registrations_updated BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== ENABLE RLS =====
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====
-- services: public read active, admin all
CREATE POLICY "Anyone can view active services" ON public.services
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- questionnaires
CREATE POLICY "Anyone can view active questionnaires" ON public.questionnaires
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage questionnaires" ON public.questionnaires
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- questions
CREATE POLICY "Anyone can view questions" ON public.questions
  FOR SELECT USING (true);
CREATE POLICY "Admins manage questions" ON public.questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- question_options
CREATE POLICY "Anyone can view options" ON public.question_options
  FOR SELECT USING (true);
CREATE POLICY "Admins manage options" ON public.question_options
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- registrations: anyone insert, admin read/update
CREATE POLICY "Anyone can submit registration" ON public.registrations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view registrations" ON public.registrations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update registrations" ON public.registrations
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete registrations" ON public.registrations
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- answers: anyone insert, admin read
CREATE POLICY "Anyone can submit answers" ON public.answers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view answers" ON public.answers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: user reads own, admin reads all
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== INDEXES =====
CREATE INDEX idx_questions_questionnaire ON public.questions(questionnaire_id, sort_order);
CREATE INDEX idx_options_question ON public.question_options(question_id, sort_order);
CREATE INDEX idx_answers_registration ON public.answers(registration_id);
CREATE INDEX idx_registrations_service ON public.registrations(service_id);
CREATE INDEX idx_registrations_status ON public.registrations(status);
