-- Add prefix column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN prefix text;

-- Update the handle_new_user function to include prefix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, first_name, last_name, gender, designation, phone_number, prefix)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'designation',
    new.raw_user_meta_data ->> 'phone_number',
    new.raw_user_meta_data ->> 'prefix'
  );
  RETURN new;
END;
$$;