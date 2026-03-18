export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("API key present:", !!process.env.ANTHROPIC_API_KEY);
    console.log("Body model:", body?.model);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    console.log("Anthropic status:", response.status);
    const data = await response.json();
    console.log("Response keys:", Object.keys(data));
    return res.status(200).json(data);
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "API call failed" });
  }
}
