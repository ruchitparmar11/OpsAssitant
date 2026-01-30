export interface EmailAnalysis {
    category: "Lead" | "Invoice" | "Support" | "Spam" | "Other";
    summary: string;
    sentiment: "Positive" | "Neutral" | "Negative";
    urgency: number;
    action_items: { description: string; priority: "High" | "Medium" | "Low" }[];
    suggested_reply: string | null;
}


export interface LoggedEmail {
    id: number;
    gmail_message_id: string;
    sender: string;
    subject: string;
    body: string;
    category: string;
    summary: string;
    sentiment: string;
    urgency: number;
    suggested_reply: string | null;
    action_items_json: string;
    created_at: string;
    is_replied?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function checkGmailStatus(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/gmail-status`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.connected;
    } catch (error) {
        console.error("Gmail Status Error:", error);
        return false;
    }
}

export async function analyzeEmail(sender: string, subject: string, body: string): Promise<EmailAnalysis> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ sender, subject, body }),
        });

        if (!response.ok) {
            throw new Error("Failed to analyze email");
        }

        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

export async function getHistory(): Promise<LoggedEmail[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/history`);
        if (!response.ok) throw new Error("Failed to fetch history");
        return await response.json();
    } catch (error) {
        console.error("History API Error:", error);
        return [];
    }
}

export interface GmailMessage {
    id: string;
    sender: string;
    subject: string;
    body: string;
}

export async function fetchGmailInbox(limit: number, nextPageToken?: string | null): Promise<{ emails: GmailMessage[], nextPageToken: string | null }> {
    try {
        let url = `${API_BASE_URL}/api/gmail-inbox?limit=${limit}`;
        if (nextPageToken) {
            url += `&next_page_token=${nextPageToken}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch inbox");
        const data = await response.json();

        // Handle both old (array) and new (object) API responses for safety
        if (Array.isArray(data)) {
            return { emails: data, nextPageToken: null };
        }

        return {
            emails: data.emails,
            nextPageToken: data.next_page_token
        };
    } catch (error) {
        console.error("Inbox API Error:", error);
        return { emails: [], nextPageToken: null };
    }
}

export async function analyzeBatch(messages: GmailMessage[]): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-batch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
        });
        return await response.json();
    } catch (error) {
        console.error("Batch Analyze API Error:", error);
        return { status: "error", message: "Failed to connect to backend" };
    }
}


export async function sendReply(to: string, subject: string, body: string, emailId?: number): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-reply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ to, subject, body, email_id: emailId }),
        });
        return await response.json();
    } catch (error) {
        console.error("Send API Error:", error);
        return { status: "error", message: "Failed to connect to backend" };
    }
}

export async function createDraft(to: string, subject: string, body: string, emailId?: number): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-draft`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ to, subject, body, email_id: emailId }),
        });
        return await response.json();
    } catch (error) {
        console.error("Draft API Error:", error);
        return { status: "error", message: "Failed to connect to backend" };
    }
}

export interface AnalyticsData {
    time_saved_hours: number;
    money_saved: number;
    tasks_automated: number;
    efficiency_score_percent: number;
    pending_actions: { title: string; desc: string; priority: string; email_id: number }[];
}

export async function getAnalytics(): Promise<AnalyticsData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics`);
        if (!response.ok) throw new Error("Failed to fetch analytics");
        return await response.json();
    } catch (error) {
        console.error("Analytics API Error:", error);
        return null;
    }
}

export interface KnowledgeItem {
    id: number;
    topic: string;
    content: string;
    created_at: string;
}

export async function getKnowledge(): Promise<KnowledgeItem[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge`);
        if (!response.ok) throw new Error("Failed to fetch knowledge");
        return await response.json();
    } catch (error) {
        console.error("Knowledge API Error:", error);
        return [];
    }
}

export async function addKnowledge(topic: string, content: string): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ topic, content }),
        });
        return await response.json();
    } catch (error) {
        console.error("Add Knowledge API Error:", error);
        return { status: "error", message: "Failed to connect to backend" };
    }
}

export async function deleteKnowledge(id: number): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
            method: "DELETE"
        });
        return await response.json();
    } catch (error) {
        console.error("Delete Knowledge API Error:", error);
        return { status: "error", message: "Failed to connect to backend" };
    }
}

export interface AISettings {
    tone: string;
    signature: string;
    hourly_rate?: number;
}

export async function getSettings(): Promise<AISettings> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (!response.ok) return { tone: "Professional", signature: "" };
        return await response.json();
    } catch (error) {
        console.error("Get Settings Error:", error);
        return { tone: "Professional", signature: "" };
    }
}

export async function saveSettings(settings: AISettings): Promise<{ status: string; settings?: AISettings }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        });
        return await response.json();
    } catch (error) {
        console.error("Save Settings Error:", error);
        return { status: "error" };
    }
}
export async function logoutUser(): Promise<{ status: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/logout`, { method: "POST" });
        return await response.json();
    } catch (error) {
        return { status: "error" };
    }
}
