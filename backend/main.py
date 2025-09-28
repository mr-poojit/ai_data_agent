import os
import sqlite3
import pandas as pd
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import tempfile
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import uuid

# Configure Gemini
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "uploaded_data.db"
CHARTS_DIR = "charts"
os.makedirs(CHARTS_DIR, exist_ok=True)
app.mount("/charts", StaticFiles(directory="charts"), name="charts")

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
        # Step 1: Generate SQL query (force full dataset, not just LIMIT 1)
        sql_prompt = f"""
        You are a SQL expert.
        Generate ONLY a valid SQLite query (no explanation, no markdown).
        Table name: uploaded_data.

        Rules:
        - Always return ALL groups, not just the top row. 
          For example: if asked "Which department has the highest salary?", 
          return a GROUP BY query with SUM/AVG/etc for all departments, 
          ORDER BY the metric, but DO NOT use LIMIT.
        - The query must return at least 2 columns: 
          (1) a categorical column (like Department), 
          (2) a numeric aggregate (like SUM(Salary) or AVG(Salary)).

        Question: {req.question}
        """
        response = model.generate_content(sql_prompt)
        sql_query = response.text.strip().replace("```", "").replace("sqlite", "").replace("sql", "").strip()

        # Step 2: Run query
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(sql_query, conn)
        conn.close()

        if df.empty:
            return {"answer": "No data found for your query.", "sql_query": sql_query, "columns": [], "rows": [], "chart": None}

        # Step 3: Generate text answer (summarize top row, but with context of all rows)
        top_row = df.iloc[0]
        answer_prompt = f"""
        The SQL result has columns {list(df.columns)} and rows {df.values.tolist()}.
        Question: {req.question}
        Please answer clearly in plain English:
        - State which {df.columns[0]} ranks highest (from the first row).
        - Mention its numeric value.
        - Briefly note that the chart compares all groups.
        """
        text_answer = model.generate_content(answer_prompt).text.strip()

        # Step 4: Save chart (always use full dataset)
        chart_path = None
        if df.shape[1] >= 2 and pd.api.types.is_numeric_dtype(df.iloc[:, 1]):
            plt.figure(figsize=(7, 5))
            df.plot(kind="bar", x=df.columns[0], y=df.columns[1], legend=False, color="skyblue", edgecolor="black")
            plt.title(f"{req.question}")
            plt.ylabel(df.columns[1])
            plt.xticks(rotation=45, ha="right")
            chart_filename = f"{uuid.uuid4().hex}.png"
            chart_path = os.path.join(CHARTS_DIR, chart_filename)
            plt.tight_layout()
            plt.savefig(chart_path)
            plt.close()

        return {
            "answer": text_answer,
            "sql_query": sql_query,
            "columns": list(df.columns),
            "rows": df.values.tolist(),
            "chart": chart_path
        }

    except Exception as e:
        return {"error": str(e)}
