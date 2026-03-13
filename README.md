# SDP-Website — Parkinson's Disease Detection Platform

A full-stack web application for Parkinson's Disease detection and analysis, combining a **Next.js** frontend, a **Python Flask** backend with machine learning inference, and a dedicated **feature-study module** for model interpretability.

---

## 📁 Project Structure

```
SDP-Website/
├── frontend/                  # Next.js web application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── page.tsx       # Landing / Home page
│   │   │   ├── about/         # About the project
│   │   │   ├── upload/        # CSV data upload
│   │   │   ├── prediction/    # Prediction results
│   │   │   ├── explainability/# SHAP-based explanations
│   │   │   └── performance/   # Model performance metrics
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React context (PredictionContext)
│   │   └── lib/               # API utility functions
│   └── package.json
│
├── backend/                   # Flask REST API
│   ├── app.py                 # API entry point
│   ├── ml_pipeline.py         # ML model pipeline
│   └── requirements.txt
│
├── parkinson_feature_study/   # ML feature analysis module
│   ├── src/                   # Source modules
│   │   ├── preprocessing.py
│   │   ├── training.py
│   │   ├── evaluation.py
│   │   ├── interpretability.py
│   │   └── feature_selection/
│   ├── experiments/
│   ├── notebooks/
│   ├── results/
│   ├── config.yaml
│   └── requirements.txt
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.9
- npm or yarn

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API will run at [http://localhost:5000](http://localhost:5000).

### Parkinson Feature Study

```bash
cd parkinson_feature_study
pip install -r requirements.txt
python run_classical_only.py
```

---

## ✨ Features

| Feature | Description |
|---|---|
| **Data Upload** | Upload CSV files of patient voice measurements |
| **ML Prediction** | Real-time Parkinson's disease prediction via Flask API |
| **Explainability** | SHAP-based feature importance and model interpretability |
| **Performance** | Model performance dashboard with metrics |
| **Feature Study** | Classical ML vs ensemble comparison on Parkinson's dataset |

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Python, Flask, scikit-learn
- **ML**: Random Forest, XGBoost, SHAP, scikit-learn
- **Visualization**: Recharts, Matplotlib

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

*Developed by Sai Kushal Vittanala*
