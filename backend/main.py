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
    allow_origins=["http://localhost:5173"],
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
        # Step 1: Get available schema
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(uploaded_data)")
        columns_info = cursor.fetchall()
        conn.close()
        available_columns = [col[1] for col in columns_info]

        # Step 2: Ask Gemini for SQL query
        sql_prompt = f"""
        You are a SQL and data analysis expert.

        Table name: uploaded_data
        Available columns: {available_columns}

        Task:
        - If the question can be answered with SQL (aggregates, counts, comparisons, groupings), 
          generate ONLY a valid SQLite query (no explanation, no markdown).
        - Always return ALL groups/categories, not just the top row. 
        - NEVER use LIMIT unless explicitly asked.
        - Always GROUP BY the category column if comparing groups.
        - Query must return at least 2 columns: 
            (1) a categorical column (e.g., Product, Department, Feedback), 
            (2) a numeric aggregate (e.g., COUNT(*), SUM(sales), AVG(rating)).
        - Use COUNT for text feedback categories if no numeric column exists.
        - If the question cannot be answered with SQL, return "TEXT_MODE".

        Question: {req.question}
        """
        response = model.generate_content(sql_prompt)
        sql_query = response.text.strip().replace("```", "").replace("sqlite", "").replace("sql", "").strip()

        # Step 3: Handle TEXT_MODE
        if sql_query.upper() == "TEXT_MODE":
            text_answer = model.generate_content(
                f"The user asked: {req.question}. Provide a clear, helpful natural language answer without SQL."
            ).text.strip()
            return {
                "answer": text_answer,
                "sql_query": None,
                "columns": [],
                "rows": [],
                "chart": None
            }

        # Step 4: Run SQL query
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(sql_query, conn)
        conn.close()

        if df.empty:
            return {"answer": "No data found for your query.", "sql_query": sql_query, "columns": [], "rows": [], "chart": None}

        # Step 5: Generate natural language answer
        answer_prompt = f"""
        The SQL result has columns {list(df.columns)} and rows {df.values.tolist()}.
        Question: {req.question}
        Write a clear, concise answer in plain English.
        Explicitly state which category is highest or lowest, and its numeric value.
        Also note that the chart compares all categories.
        """
        text_answer = model.generate_content(answer_prompt).text.strip()

        # Step 6: Generate chart with better precision
        chart_path = None
        if df.shape[1] >= 2 and pd.api.types.is_numeric_dtype(df.iloc[:, 1]):
            plt.figure(figsize=(8, 5))
            bars = plt.bar(df.iloc[:, 0].astype(str), df.iloc[:, 1], color="skyblue", edgecolor="black")

            # Add value labels on top of bars
            for bar, value in zip(bars, df.iloc[:, 1]):
                plt.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height(),
                    f"{value:.2f}",  # show 2 decimal precision
                    ha="center",
                    va="bottom",
                    fontsize=9
                )

            plt.title(f"{req.question}")
            plt.ylabel(df.columns[1])
            plt.xticks(rotation=30, ha="right")
            plt.tight_layout()

            chart_filename = f"{uuid.uuid4().hex}.png"
            chart_path = os.path.join(CHARTS_DIR, chart_filename)
            plt.savefig(chart_path, dpi=200)  # high resolution
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

