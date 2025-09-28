import os
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
from dotenv import load_dotenv
import uuid

# Configure Gemini
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://docubot-ai-xi.vercel.app" "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp DB path
DB_PATH = "uploaded_data.db"
CHARTS_DIR = "charts"
os.makedirs(CHARTS_DIR, exist_ok=True)

class AskRequest(BaseModel):
    question: str

@app.get("/ping")
def ping():
    return {"message": "Backend is running!"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        # Save uploaded Excel to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Load into pandas
        df = pd.read_excel(tmp_path)

        # Store in SQLite
        conn = sqlite3.connect(DB_PATH)
        df.to_sql("uploaded_data", conn, if_exists="replace", index=False)
        conn.close()

        return {"status": "success", "columns": list(df.columns), "rows": len(df)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/ask")
async def ask_question(req: AskRequest):
    try:
        # Step 1: Ask Gemini for SQL query
        prompt = f"""
        You are a SQL expert. Generate ONLY a valid SQLite query (no markdown, no explanation, no extra text).
        Table name: uploaded_data.
        Question: {req.question}
        """
        response = model.generate_content(prompt)
        sql_query = response.text.strip().replace("```", "").replace("sqlite", "").replace("sql", "").strip()

        # Step 2: Run SQL query
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(sql_query, conn)
        conn.close()

        # Step 3: Ask Gemini to explain result in text
        explanation_prompt = f"""
        You are a data assistant. Based on this table result:

        {df.head(20).to_string(index=False)}

        Provide a short, clear natural language answer to the question:
        "{req.question}"
        """
        explanation = model.generate_content(explanation_prompt).text.strip()

        # Step 4: Save a chart
        chart_filename = f"{CHARTS_DIR}/chart_{uuid.uuid4().hex}.png"
        plt.figure(figsize=(8, 5))

        if df.shape[1] >= 2:  # At least two columns to plot
            x_col, y_col = df.columns[0], df.columns[1]
            plt.bar(df[x_col].astype(str), df[y_col])
            plt.xlabel(x_col)
            plt.ylabel(y_col)
            plt.title(req.question)
            plt.xticks(rotation=30)
            plt.tight_layout()
            plt.savefig(chart_filename)
            plt.close()
        else:
            chart_filename = None

        return {
            "sql_query": sql_query,
            "columns": df.columns.tolist(),
            "rows": df.values.tolist(),
            "answer": explanation,
            "chart": chart_filename if chart_filename else None
        }

    except Exception as e:
        return {"error": str(e)}
