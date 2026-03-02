import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactNotificationRequest {
  audience: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  organization: string | null;
  requirement: string;
}

const audienceLabels: Record<string, string> = {
  individual: "Individual",
  university: "University/Institution",
  government: "Government Department",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ContactNotificationRequest = await req.json();

    // Validate required fields
    if (!data.email || !data.requirement || !data.audience) {
      throw new Error("Missing required fields: email, requirement, audience");
    }

    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    if (!adminEmail) {
      throw new Error("ADMIN_NOTIFICATION_EMAIL not configured");
    }

    const audienceLabel = audienceLabels[data.audience] || data.audience;
    const userName = data.full_name || "there";

    // Send confirmation email to user
    const userEmailResult = await resend.emails.send({
      from: "NTS Language Courses <noreply@resend.dev>",
      to: [data.email],
      subject: "We received your request - NTS Language Courses",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Thank You for Reaching Out!</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-top: 0;">Hi ${userName},</p>
            
            <p style="font-size: 16px;">We've received your request and our team is reviewing it. You can expect to hear from us within <strong>1-2 working days</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Your Request Summary</h3>
              <p style="margin: 8px 0;"><strong>Category:</strong> ${audienceLabel}</p>
              ${data.organization ? `<p style="margin: 8px 0;"><strong>Organization:</strong> ${data.organization}</p>` : ""}
              <p style="margin: 8px 0;"><strong>Requirement:</strong></p>
              <p style="margin: 8px 0; color: #64748b;">${data.requirement}</p>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">If you don't hear back within 2 working days, please feel free to submit another request or reply to this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Best regards,<br>
              <strong>NTS Language Courses Team</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("User confirmation email sent:", userEmailResult);

    // Send notification email to admin
    const adminEmailResult = await resend.emails.send({
      from: "NTS Contact System <noreply@resend.dev>",
      to: [adminEmail],
      subject: `New Contact Request: ${audienceLabel} - ${data.full_name || data.email}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Contact Request</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Contact Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Category:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 14px;">${audienceLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Name:</td>
                  <td style="padding: 8px 0;">${data.full_name || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                  <td style="padding: 8px 0;">${data.phone_number || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Organization:</td>
                  <td style="padding: 8px 0;">${data.organization || "Not provided"}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f97316;">
              <h3 style="margin-top: 0; color: #1e40af;">Requirement</h3>
              <p style="margin: 0; white-space: pre-wrap;">${data.requirement}</p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 20px; text-align: center;">
              <a href="${Deno.env.get("SITE_URL") || "https://dronaciil-p1.lovable.app"}/admin" style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View in Admin Panel</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Admin notification email sent:", adminEmailResult);

    return new Response(
      JSON.stringify({
        success: true,
        userEmailId: userEmailResult.data?.id,
        adminEmailId: adminEmailResult.data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending contact notification emails:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
