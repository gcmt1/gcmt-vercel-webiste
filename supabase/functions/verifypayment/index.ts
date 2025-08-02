import { serve } from "https://deno.land/std/http/server.ts";
import * as crypto from "https://deno.land/std@0.171.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const workingKey = Deno.env.get("CCA_WORKING_KEY")!;

function decrypt(encResp: string, workingKey: string) {
  const m = crypto.createDecipheriv("aes-128-cbc", workingKey, workingKey);
  let decrypted = m.update(encResp, "hex", "utf8");
  decrypted += m.final("utf8");
  return decrypted;
}

function parseResponse(data: string) {
  const parts = data.split("&");
  const response: Record<string, string> = {};
  parts.forEach(part => {
    const [key, value] = part.split("=");
    response[key] = decodeURIComponent(value || "");
  });
  return response;
}

serve(async (req) => {
  try {
    const formData = await req.formData();
    const encResp = formData.get("encResp")?.toString();

    if (!encResp) return new Response("Missing encResp", { status: 400 });

    const decrypted = decrypt(encResp, workingKey);
    const response = parseResponse(decrypted);

    const orderId = parseInt(response.order_id || "0");
    const status = response.order_status;

    if (!orderId || !status) return new Response("Invalid response", { status: 400 });

    // Update the order status in Supabase
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: status === "Success" ? "PAID" : "FAILED",
        order_status: status === "Success" ? "CONFIRMED" : "CANCELLED",
      })
      .eq("id", orderId);

    if (error) throw error;

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
