import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  const DB_FILE = path.join(process.cwd(), 'internal-db.json');

  app.use(express.json({ limit: "10mb" }));

  app.post("/api/register-entrant", async (req, res) => {
    try {
      const data = req.body;
      let db = [];
      if (fs.existsSync(DB_FILE)) {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      }
      db.push(data);
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      res.json({ success: true });
    } catch (e) {
      console.error("Local DB save failed", e);
      res.status(500).json({ error: "Failed to save locally" });
    }
  });

  app.get("/api/agents-csv", async (req, res) => {
    const USER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ5AqtIOOwuBZnyb3L7hd-11U2EoEIL8pkJyCPcT3qlPej5Y1-OGJxpKtvOdWSfVmsInZFR2SQNwU4/pub?gid=1846778885&single=true&output=csv";
    const fallbackCsv = `UID,RANK,NAME,EMAILADDRESS,LOCATION,CATEGORYEMAIL,PASSWORD,PAYPERHR,NOOFDAY,NOOFNIGHT,NOOFSHIFTS,TOTALDUE,,BASICSALARY,EPF,GROSS,ADVANCE,MEAL,NOPAY,UNIFORM,FINES,OTHER,NETTSALARY
XG296,CSO,T.D.K Edward,tdkedward.te@gmail.com,Fairway,xguardfairway@gmail.com,tdked321,2300,25,28,53,121900,,26000,2080,93820,5000,1500,,250,,,87070
XG489,SO,K.D.T Sandaruwan,tharindasadaruwan893@gmail.com,Fairway,xguardfairway@gmail.com,sadke123,2200,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG502,SO,H.K.M Gamini,gaminigama64@gmail.com,Fairway,xguardfairway@gmail.com,kmhg2122,2200,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG527,SO,K.K.W.A Darshana,darshanakaru928@gmail.com,Fairway,xguardfairway@gmail.com,kkkd8712,2200,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG352,SO,P.D.G.N Pushpakumara,,Fairway,xguardfairway@gmail.com,ghdp3123,2200,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG459,SO,KENUJAN,maganathankenujan@gmail.com,Fairway,xguardfairway@gmail.com,juen3232,2200,,,0,0,,26000,2080,-28080,,,,,,,-28080
TUID001,SO,Chandana Sujith,sujithchandana1980@gmail.com,Fairway,xguardfairway@gmail.com,char3232,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG292,CSO,WMAsoka,asoka_wanninayakam@gmail.com,M2M,xguardm2m@gmail.com,asww9999,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG040,CQO,PSBKurera,Sbuddika230@gmail.com,M2M,xguardm2m@gmail.com,phgnb213,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG346,PO,CRRoshan,shaveecon@gmail.com,M2M,xguardm2m@gmail.com,crcrr221,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG453,SO,HMSemasinghe,hmhsemasingha@gmail.com,M2M,xguardm2m@gmail.com,semmm213,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG476,SO,NuwanDissanayaka,Nuwananurudha287@gmail.com,M2M,xguardm2m@gmail.com,213rtawa,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG526,SO,K Avinash,Avinashabinash@gmail.com,M2M,xguardm2m@gmail.com,kawgm212,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG545,SO,M CJ Soyza,soisasoisa111@gmail.com,M2M,xguardm2m@gmail.com,mmmm212j,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG497,SO,K D LS Senarathne,Lasanthasanthaa32@gmail.com,M2M,xguardm2m@gmail.com,khjay213,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
TUID002,SO,K.M.K. Chathuranga,KMKchathuranga@gmail.com,M2M,xguardm2m@gmail.com,sosuu213,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080
XG551,SO,N.K.H.A.J. Randunu,jagathrandunu05@gmail.com,M2M,xguardm2m@gmail.com,nklllll25,2000,,,0,0,,26000,2080,-28080,,,,,,,-28080`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const resData = await fetch(USER_CSV_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resData.ok) {
        const text = await resData.text();
        res.setHeader('Content-Type', 'text/csv');
        return res.send(text);
      }
      throw new Error("Spreadsheet response not OK");
    } catch (e) {
      console.warn("Server-side CSV fetch failed, serving fallback:", e);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(fallbackCsv);
    }
  });

  app.get("/api/vehicles-csv", async (req, res) => {
    const VEHICLES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaVZ7bAweT7l7fWhALHeuI1szSa4S47iWKEos7WYsRKWzfqSeb6cZBor4YWzY3K6oy7AUY8wLCJoO_/pub?gid=0&single=true&output=csv";
    const fallbackVehiclesCsv = `SERIAL NO,NAME,TOWER ADDRESS,VEHICLE NO,CONTACT NO,CATEGORY
T1R001,Sumudu Sadaruwan,APT 26 TOWER 1,WPHU3812,778432311,Resident
T1R002,Geeth kahandugoda,APT 34 TOWER 2,WPBDH3775,786012309,Resident
T1R003,Imal devapriya,APT 21 TOWER 32,SGVE9478,7789123576,Resident
T1R004,Nelushan Pushpawela,APT 11 TOWER 6,NCKG3149,7089891212,Resident`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const resData = await fetch(VEHICLES_CSV_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resData.ok) {
        const text = await resData.text();
        res.setHeader('Content-Type', 'text/csv');
        return res.send(text);
      }
      throw new Error("Spreadsheet response not OK");
    } catch (e) {
      console.warn("Server-side CSV fetch failed, serving fallback:", e);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(fallbackVehiclesCsv);
    }
  });

  app.post("/api/scan-plate", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      
      let response;
      let plateNumber = "NONE";
      try {
        const reqOpts = {
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: "image/jpeg",
                },
              },
              {
                text: "Extract the vehicle license plate number from this image. Return ONLY the alphanumeric characters of the license plate with no spaces, dashes, or punctuation. If no license plate is visible, return 'NONE'.",
              },
            ],
          },
        };
        try {
          response = await ai.models.generateContent({ model: "gemini-3.5-flash", ...reqOpts });
        } catch (e: any) {
          console.warn("gemini-3.5-flash failed, falling back to gemini-2.5-flash", e);
          response = await ai.models.generateContent({ model: "gemini-2.5-flash", ...reqOpts });
        }
        plateNumber = response.text?.trim() || "NONE";
        plateNumber = plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
      } catch (err) {
        console.error("AI processing failed completely:", err);
      }

      res.json({ plateNumber });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to scan plate" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
