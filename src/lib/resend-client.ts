import https from "node:https";

interface ResendSendInput {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
}

/** Node https — more reliable than fetch on some Azure App Service Node runtimes. */
export function sendViaResendHttps(input: ResendSendInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  const body = JSON.stringify({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 30_000,
      },
      (res) => {
        let chunks = "";
        res.on("data", (chunk) => {
          chunks += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true });
            return;
          }
          resolve({
            ok: false,
            error: chunks || `HTTP ${res.statusCode ?? "unknown"}`,
          });
        });
      }
    );

    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Resend request timed out" });
    });

    req.write(body);
    req.end();
  });
}
