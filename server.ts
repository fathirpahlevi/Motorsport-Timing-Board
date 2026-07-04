import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route for Speedhive initial data to avoid CORS issues
  app.get("/api/speedhive-proxy", async (req, res) => {
    const { eventId, sessionId } = req.query;
    if (!eventId || !sessionId) {
      return res.status(400).json({ error: "Missing eventId or sessionId parameters." });
    }

    const apiUrl = `https://lt-api.speedhive.com/api/events/${eventId}/sessions/${sessionId}/data`;
    console.log(`[Proxy] Fetching initial data from: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`Speedhive API returned status ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy Error]", error);
      res.status(500).json({ error: error.message || "Failed to fetch from Speedhive API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
