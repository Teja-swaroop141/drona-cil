import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const audiences = ["individual", "university", "government"] as const;
type Audience = (typeof audiences)[number];

const formSchema = z.object({
  full_name: z
    .string()
    .trim()
    .max(120, "Please keep your name under 120 characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .min(5, "Please enter a valid email")
    .max(255, "Please keep your email under 255 characters")
    .email("Please enter a valid email"),
  phone_number: z
    .string()
    .trim()
    .max(30, "Please keep your phone number under 30 characters")
    .optional()
    .or(z.literal("")),
  organization: z
    .string()
    .trim()
    .max(160, "Please keep your organization under 160 characters")
    .optional()
    .or(z.literal("")),
  requirement: z
    .string()
    .trim()
    .min(10, "Please add a bit more detail (min 10 characters)")
    .max(2000, "Please keep your requirement under 2000 characters"),
  consent_to_contact: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeOptional(value?: string) {
  const v = (value ?? "").trim();
  return v.length ? v : null;
}

const ContactRequest = () => {
  const navigate = useNavigate();
  const { audience: audienceParam } = useParams();
  const [submitted, setSubmitted] = useState(false);

  const audience = useMemo<Audience>(() => {
    if (audiences.includes(audienceParam as Audience)) return audienceParam as Audience;
    return "individual";
  }, [audienceParam]);

  const copy = useMemo(() => {
    switch (audience) {
      case "university":
        return {
          title: "Partner with us for language learning",
          subtitle:
            "Tell us about your institution and your goals. Our team will reach out with a tailored plan for courses, cohorts, and certification.",
          orgLabel: "University / Institution",
        };
      case "government":
        return {
          title: "Language programs for government teams",
          subtitle:
            "Share your training needs and timelines. We'll contact you with an implementation plan and support options.",
          orgLabel: "Department / Organization",
        };
      default:
        return {
          title: "Let's find the right course for you",
          subtitle:
            "Answer a few quick questions and we'll get back with course recommendations and next steps.",
          orgLabel: "Organization (optional)",
        };
    }
  }, [audience]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      organization: "",
      requirement: "",
      consent_to_contact: true,
    },
    mode: "onSubmit",
  });

  const onSubmit = async (values: FormValues) => {
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) return;

    try {
      const payload = {
        audience,
        full_name: normalizeOptional(parsed.data.full_name),
        email: parsed.data.email.trim(),
        phone_number: normalizeOptional(parsed.data.phone_number),
        organization: normalizeOptional(parsed.data.organization),
        requirement: parsed.data.requirement.trim(),
        consent_to_contact: parsed.data.consent_to_contact,
      };

      const { error } = await supabase.from("contact_requests").insert(payload);
      if (error) throw error;

      // Send email notifications (don't block on failure)
      supabase.functions
        .invoke("send-contact-notification", {
          body: payload,
        })
        .then((res) => {
          if (res.error) {
            console.error("Email notification failed:", res.error);
          } else {
            console.log("Email notifications sent successfully");
          }
        })
        .catch((err) => {
          console.error("Email notification error:", err);
        });

      setSubmitted(true);
      toast.success("Thanks — we received your request. Check your email for confirmation.");
    } catch (err: any) {
      console.error("Failed to submit contact request", err);
      toast.error("Couldn't submit right now. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Header />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          <div className="container relative py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-6">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                  {copy.title}
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">{copy.subtitle}</p>

                <div className="mt-8 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <p>We usually respond within 1–2 working days.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <p>Your information is used only to contact you about your request.</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <Card className="shadow-lg">
                  {!submitted ? (
                    <>
                      <CardHeader>
                        <CardTitle>Request a call back</CardTitle>
                        <CardDescription>
                          Share your details and requirements. We'll get in touch.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Full name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Your name" autoComplete="name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="phone_number"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone number</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Optional" autoComplete="tel" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="you@example.com"
                                      autoComplete="email"
                                      inputMode="email"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="organization"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{copy.orgLabel}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Optional" autoComplete="organization" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="requirement"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Your requirement</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Tell us what you need — language, level, number of learners, timeline, certification, etc."
                                      className="min-h-28"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="consent_to_contact"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="cursor-pointer">Consent to be contacted</FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                      You agree that our team may contact you regarding this request.
                                    </p>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                              <Button
                                type="submit"
                                className="sm:w-auto"
                                disabled={form.formState.isSubmitting}
                              >
                                {form.formState.isSubmitting ? "Submitting…" : "Submit request"}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}
                              >
                                Back to courses
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <CardHeader>
                        <CardTitle>Request submitted</CardTitle>
                        <CardDescription>
                          Thanks for reaching out. We'll contact you soon.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                          Tip: If you don't hear back within 2 working days, please submit again with an alternate phone/email.
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button onClick={() => navigate("/dashboard")}>Explore courses</Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSubmitted(false);
                              form.reset();
                            }}
                          >
                            Submit another request
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContactRequest;
