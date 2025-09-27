# 🚀 AI Data Agent

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![SQLite](https://img.shields.io/badge/Database-SQLite-lightgrey?logo=sqlite)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

🤖 **AI Data Agent** is a chatbot-style document assistant that allows you to upload spreadsheets, analyze them with natural language queries, and receive answers in **tables, text insights, and visual charts**.

---

## ✨ Features

- 📂 Upload Excel/CSV datasets into SQLite database
- 💬 Ask questions in plain English (e.g., _"Show average salary by department"_)
- ⚡ Powered by **Gemini AI** for query generation & explanations
- 📊 Auto-generated **visualizations** from results
- 💻 Full-stack app with **FastAPI** backend & **React (Vite + Tailwind)** frontend
- 🔒 CORS-enabled API for smooth local/remote testing

---

## 📂 Project Structure

```bash
ai_data_agent/
├── backend/              # FastAPI app
│   ├── main.py
│   ├── requirements.txt
│   ├── uploaded_data.db
│   └── charts/           # stores generated PNG charts
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   └── App.jsx
│   └── package.json
├── .env                  # GEMINI_API_KEY goes here
└── README.md
```

---

## ⚙️ Installation

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn main:app --reload
```

Runs on 👉 `http://localhost:8000`

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Runs on 👉 `http://localhost:5173`

---

## 📡 API Endpoints

### `POST /upload`

Uploads an Excel/CSV file and stores it in SQLite.

Response:

```json
{ "status": "success", "columns": ["Dept", "Salary"], "rows": 20 }
```

### `POST /ask`

Ask natural questions about uploaded data.

Request:

```json
{ "question": "Show average salary by department" }
```

Response:

```json
{
  "sql_query": "SELECT Dept, AVG(Salary) FROM uploaded_data GROUP BY Dept",
  "columns": ["Dept", "avg_salary"],
  "rows": [
    ["HR", 65000],
    ["IT", 58000]
  ],
  "answer": "HR has the highest average salary (~65000).",
  "chart": "charts/chart_123.png"
}
```

---

## 🎨 Frontend Preview

Chatbot UI built with **TailwindCSS + Lucide Icons**:

- ✅ Upload prompt
- ✅ Animated typing indicator
- ✅ Chat bubbles for user & bot
- ✅ Chart preview support

---

## 🚀 Roadmap

- [ ] Support multiple datasets
- [ ] Export query results as CSV
- [ ] User authentication & history
- [ ] Deploy on **Docker / Vercel / Render**

---

## 🛠️ Troubleshooting

| Issue           | Cause                  | Fix                                  |
| --------------- | ---------------------- | ------------------------------------ |
| 422 Error       | Request body mismatch  | Ensure body is `{ question: "..." }` |
| Model not found | Wrong Gemini version   | Update to latest supported model     |
| Chart missing   | Static path not served | Serve `charts/` dir in FastAPI       |

---

## 🤝 Contributing

Contributions are welcome!  
Fork the repo → Create branch → Commit → PR 🚀

---

## 📜 License

MIT License © 2025 [Poojit Jagadeesh Nagaloti](https://github.com/mr-poojit)

---

💡 _Pro tip_: Add your Gemini API key in `.env` and you’re ready to chat with your data!
