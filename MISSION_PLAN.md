# 🚀 AI Operations Assistant - Mission Plan

## 🎯 Core Philosophy
**"Pain + Money > Cool Tech"**
We are building a profitable B2B tool for Indian SMBs, not a demo.

## 🏢 Target Audience
**Indian SMBs (10–100 employees)**
- **Pain Points**: Owner burnout, staff inefficiency, manual data entry, unstructured processes.
- **Value Proposition**: "Pay ₹5,000/month, save ₹30,000 in salary time."

## 🛠 Product: AI Operations Assistant
An automated employee that handles:
1.  **Email Triaging**: Reads and drafts replies.
2.  **CRM Management**: Updates leads automatically.
3.  **Invoicing**: Generates/sends invoices.
4.  **Reporting**: Daily summaries for the owner.

## 🏗 Tech Stack (MVP 3-Month Limit)

### Frontend (The Dashboard)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS (Premium, Glassmorphism, "Wow" factor)
- **State**: React Query / Zustand

### Backend (The Brain)
- **Framework**: FastAPI (Python) - *Chosen for superior AI/LLM libraries*
- **LLM Orchestration**: PydanticAI or LangChain
- **LLM Provider**: Gemini 1.5 Flash (Cost/Period efficient) or GPT-4o-mini
- **Database**: PostgreSQL (Structured data)
- **Vector DB**: Pinecone (Context/RAG)

### Deployment & Infra
- **Auth**: Supabase / Clerk / NextAuth
- **Hosting**: Vercel (FE) + Railway/Render (BE)

## 📅 Execution Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up Monorepo (Next.js + FastAPI)
- [ ] Design "Premium" Landing/Dashboard Shell
- [ ] Define Database Schema (Users, Tasks, Integrations)

### Phase 2: Core "Pain" Features (Week 2-3)
- [ ] Email Parser Agent (Gmail API)
- [ ] Basic RAG Implementation for Context

### Phase 3: MVP Polish (Week 4)
- [ ] Billing Integration (Stripe/Razorpay)
- [ ] Alpha testing with 5 users

---
*Created by Antigravity*
