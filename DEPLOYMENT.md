# Deployment Guide

This project is set up to be deployed with **Vercel** (Frontend) and **Render** (Backend + Database).

## 1. Prerequisites

- A GitHub account (push this project to a new repository).
- A [Vercel](https://vercel.com) account.
- A [Render](https://render.com) account.

## 2. Backend Deployment (Render)

We will deploy the Python FastAPI backend first, as we need its URL for the frontend.

1.  **Create a New Web Service** on Render.
2.  Connect your GitHub repository.
3.  **Configure the Service**:
    -   **Name**: `ai-ops-backend` (or similar)
    -   **Root Directory**: `backend` (Important!)
    -   **Runtime**: `Python 3`
    -   **Build Command**: `pip install -r requirements.txt`
    -   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4.  **Add Database (PostgreSQL)**:
    -   On Render, create a new **PostgreSQL** database.
    -   Copy the `Internal Connection String` (starts with `postgres://...`).
5.  **Environment Variables** (in Web Service > Environment):
    -   `DATABASE_URL`: Paste the Internal Connection String from step 4.
    -   `PYTHON_VERSION`: `3.10.0` (Recommended)
    -   `GOOGLE_CREDENTIALS_JSON`: Paste the *content* of your local `backend/credentials.json`.
    -   `GOOGLE_TOKEN_JSON`: Paste the *content* of your local `backend/token.json` (if you are already logged in locally).

    *Note: The app is configured to automatically recreate these files from the environment variables on startup.*

6.  **Deploy** the backend. Once finished, copy the **onrender.com** URL (e.g., `https://ai-ops-backend.onrender.com`).

## 3. Frontend Deployment (Vercel)

1.  **Add New Project** on Vercel.
2.  Import your GitHub repository.
3.  **Configure Project**:
    -   **Root Directory**: `frontend` (Click "Edit" next to Root Directory and select the `frontend` folder).
    -   **Framework Preset**: Next.js (Should auto-detect).
4.  **Environment Variables**:
    -   `NEXT_PUBLIC_API_URL`: Paste your Render Backend URL (e.g., `https://ai-ops-backend.onrender.com`). **Note**: Ensure there is no trailing slash `/`.
5.  **Deploy**.

## 4. Final Configuration

1.  Once the Frontend is deployed, copy its URL (e.g., `https://ai-ops-frontend.vercel.app`).
2.  Go back to **Render > Backend Service > Environment**.
3.  Add/Update:
    -   `FRONTEND_URL`: Paste the Vercel Frontend URL (e.g., `https://ai-ops-frontend.vercel.app`).
4.  **Redeploy** the backend (Manual Deploy > Clear build cache & deploy, or just trigger a deploy) so it updates the CORS settings to allow your frontend to talk to it.

## Troubleshooting

-   **Database**: If you see errors about tables missing, the app tries to create them on startup (`create_db_and_tables`). Check Render logs.
-   **Gmail Auth**: If authentication fails, ensure you pasted the full JSON content into the environment variables correctly. 
