"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Mail,
  FileText,
  Settings,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  Loader2,
  Sparkles,
  Send,
  Brain,
  Zap,
  BarChart3,
  LogOut,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeEmail, type EmailAnalysis, getHistory, type LoggedEmail, getAnalytics, type AnalyticsData, checkGmailStatus, sendReply, createDraft, logoutUser } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<EmailAnalysis | null>(null);
  const [history, setHistory] = useState<LoggedEmail[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const [emailInput, setEmailInput] = useState({
    sender: "",
    subject: "",
    body: ""
  });

  const fetchData = async () => {
    try {
      const hist = await getHistory();
      setHistory(hist);
      const stats = await getAnalytics();
      setAnalytics(stats);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessEmail = async () => {
    const isConnected = await checkGmailStatus();
    if (!isConnected) {
      router.push("/welcome");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await analyzeEmail(emailInput.sender, emailInput.subject, emailInput.body);
      setLastAnalysis(result);
      fetchData();
    } catch (error) {
      console.log(error);
      alert("Error connecting to AI Backend. Is it running?");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "Z");
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return "Just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return "Unknown";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground flex font-sans">

      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 backdrop-blur-sm bg-background/80 hidden md:flex flex-col p-6 gap-6 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-lg">
            AI
          </div>
          <span className="font-bold text-xl tracking-tight">OpsAssistant</span>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <Link href="/history">
            <NavItem icon={<Mail size={20} />} label="History" badge={history.length > 0 ? String(history.length) : undefined} />
          </Link>
          <Link href="/settings">
            <NavItem icon={<Settings size={20} />} label="Settings" />
          </Link>
        </nav>

        <div className="mt-auto p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Efficiency Score</p>
          <div className="w-full bg-muted/50 rounded-full h-2.5 mb-2">
            <div className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${analytics?.efficiency_score_percent || 15}%` }}></div>
          </div>
          <p className="text-sm font-bold text-primary">Top {analytics?.efficiency_score_percent || 15}%</p>
        </div>

        <button
          onClick={async () => {
            if (confirm("Are you sure you want to logout?")) {
              await logoutUser();
              router.push("/welcome");
            }
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all cursor-pointer group mt-2"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome back, Ruchit
          </h1>
          <p className="text-lg text-muted-foreground">
            Your AI saved you <span className="text-primary font-semibold">{analytics?.time_saved_hours || 0} hours</span> this week ⚡
          </p>
        </header>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            icon={<Clock className="text-blue-500" size={24} />}
            title="Time Saved"
            value={`${analytics?.time_saved_hours || 0}h`}
            gradient="from-blue-500/10 to-blue-600/10"
            border="border-blue-500/20"
            onClick={() => alert(`Time saved is calculated based on 5 minutes saved per email processed. \n\n${analytics?.tasks_automated || 0} emails × 5 mins = ${analytics?.time_saved_hours || 0} hours.`)}
          />
          <StatCard
            icon={<DollarSign className="text-green-500" size={24} />}
            title="Value Generated"
            value={`₹${(analytics?.money_saved || 0).toLocaleString()}`}
            gradient="from-green-500/10 to-green-600/10"
            border="border-green-500/20"
            onClick={() => router.push("/settings")}
          />
          <StatCard
            icon={<Zap className="text-amber-500" size={24} />}
            title="Emails Processed"
            value={String(analytics?.tasks_automated || 0)}
            gradient="from-amber-500/10 to-amber-600/10"
            border="border-amber-500/20"
            onClick={() => router.push("/history")}
          />
        </div>

        {/* Priority Actions Section */}
        {analytics?.pending_actions && analytics.pending_actions.length > 0 && (
          <div className="mb-10 bg-card border border-border/50 rounded-2xl p-6 shadow-xl shadow-red-500/5 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <CheckCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold">Priority Action Items</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.pending_actions.map((action, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setExpandedEmailId(action.email_id);
                    document.getElementById("recent-activity")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 bg-background border border-border rounded-xl flex items-start gap-3 hover:shadow-md transition-all cursor-pointer hover:bg-muted/50"
                >
                  <div className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0",
                    action.priority === 'High' ? 'bg-red-500' :
                      action.priority === 'Medium' ? 'bg-amber-500' : 'bg-green-500'
                  )} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{action.title}</h4>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* Left: Analyze Email */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl shadow-primary/5">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">Analyze Email</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Sender</label>
                <input
                  value={emailInput.sender}
                  onChange={(e) => setEmailInput({ ...emailInput, sender: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Subject</label>
                <input
                  value={emailInput.subject}
                  onChange={(e) => setEmailInput({ ...emailInput, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  placeholder="Project inquiry"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Content</label>
                <textarea
                  value={emailInput.body}
                  onChange={(e) => setEmailInput({ ...emailInput, body: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/30 outline-none transition-all min-h-[140px] resize-none"
                  placeholder="Paste email content here..."
                />
              </div>

              <button
                onClick={handleProcessEmail}
                disabled={isProcessing}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Brain size={20} />}
                {isProcessing ? "Analyzing..." : "Analyze with AI"}
              </button>
            </div>
          </div>

          {/* Right: AI Result or Recent Emails */}
          {lastAnalysis ? (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 shadow-xl animate-in slide-in-from-right-4 fade-in duration-500">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles size={20} className="text-primary" />
                <h3 className="font-bold text-lg">AI Analysis</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background/80 rounded-xl border border-border/50">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="font-semibold text-primary">{lastAnalysis.category}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-background/80 rounded-xl border border-border/50">
                  <span className="text-sm text-muted-foreground">Urgency</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full",
                          lastAnalysis.urgency > 7 ? "bg-red-500" : lastAnalysis.urgency > 4 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${lastAnalysis.urgency * 10}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm font-bold">{lastAnalysis.urgency}/10</span>
                  </div>
                </div>

                <div className="p-4 bg-background/80 rounded-xl border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Summary</p>
                  <p className="text-sm leading-relaxed">{lastAnalysis.summary}</p>
                </div>

                {lastAnalysis.suggested_reply && (
                  <div className="p-4 bg-background/80 rounded-xl border border-border/50">
                    <p className="text-sm text-muted-foreground mb-3">Suggested Reply</p>
                    <div className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg mb-3 max-h-32 overflow-y-auto">
                      {lastAnalysis.suggested_reply}
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium shadow-lg transition-all">
                      <Send size={16} /> Send Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl shadow-primary/5">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={20} className="text-muted-foreground" />
                <h3 className="font-bold text-lg" id="recent-activity">Recent Activity</h3>
              </div>

              {history.length > 0 ? (
                <div className="space-y-3">
                  {((): LoggedEmail[] => {
                    // Logic to ensure expanded email is visible even if not in top 5
                    const recent = history.slice(0, 5);
                    if (expandedEmailId && !recent.some(h => h.id === expandedEmailId)) {
                      const target = history.find(h => h.id === expandedEmailId);
                      if (target) return [target, ...recent];
                    }
                    return recent;
                  })().map((email) => (
                    <div key={email.id}>
                      <div
                        onClick={() => setExpandedEmailId(expandedEmailId === email.id ? null : email.id)}
                        className="p-4 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border/30 cursor-pointer transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm truncate flex-1">{email.sender.split('<')[0].trim()}</p>
                          <span className="text-xs text-muted-foreground ml-2">{formatTime(email.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            email.category === "Lead" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            email.category === "Invoice" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                            email.category === "Support" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          )}>
                            {email.category}
                          </span>
                          {email.is_replied && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle size={12} /> Replied
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedEmailId === email.id && (
                        <div className="mt-2 p-4 bg-background border border-border rounded-xl space-y-4 animate-in slide-in-from-top-2 fade-in">
                          {/* Email Body */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Email Content</p>
                            <p className="text-sm leading-relaxed text-foreground/80 max-h-32 overflow-y-auto">
                              {email.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                            </p>
                          </div>

                          {/* Summary & Details */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
                              <p className={cn(
                                "text-sm font-semibold",
                                email.sentiment === "Positive" && "text-green-600",
                                email.sentiment === "Negative" && "text-red-600",
                                email.sentiment === "Neutral" && "text-gray-600"
                              )}>{email.sentiment}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Urgency</p>
                              <p className="text-sm font-semibold">{email.urgency}/10</p>
                            </div>
                          </div>

                          <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground list-none mb-2 select-none">
                              <span className="group-open:rotate-90 transition-transform">▸</span> View Original Email
                            </summary>
                            <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono whitespace-pre-wrap border border-border/50 max-h-48 overflow-y-auto mb-3">
                              {email.body}
                            </div>
                          </details>

                          {/* Action Items */}
                          {JSON.parse(email.action_items_json).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Action Items</p>
                              <ul className="space-y-2">
                                {JSON.parse(email.action_items_json).map((action: any, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <div className={cn(
                                      "mt-1 h-1.5 w-1.5 rounded-full",
                                      action.priority === "High" && "bg-red-500",
                                      action.priority === "Medium" && "bg-amber-500",
                                      action.priority === "Low" && "bg-green-500"
                                    )}></div>
                                    <span className="flex-1">{action.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Suggested Reply with Edit Mode */}
                          {email.suggested_reply && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-muted-foreground">{editingId === email.id ? "Edit Reply" : "AI Suggested Reply"}</p>
                              </div>

                              {editingId === email.id ? (
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full p-3 rounded-lg bg-background border border-primary/30 min-h-[120px] outline-none focus:ring-2 focus:ring-primary/50 mb-3 text-sm leading-relaxed resize-y"
                                  autoFocus
                                />
                              ) : (
                                <div className="bg-muted/30 p-3 rounded-lg text-sm leading-relaxed max-h-32 overflow-y-auto mb-3 whitespace-pre-wrap">
                                  {email.suggested_reply}
                                </div>
                              )}

                              <div className="flex gap-2">
                                {editingId === email.id ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(null);
                                      }}
                                      className="px-3 py-2 bg-background text-foreground rounded-lg text-xs font-medium hover:bg-muted border border-border"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const res = await createDraft(email.sender, `Re: ${email.subject}`, editContent, email.id);
                                        alert(res.message);
                                        // Update state (maybe marking as replied isn't accurate, but let's keep it simple or allow re-edit)
                                        // setEditingId(null);
                                      }}
                                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium shadow transition-all flex items-center gap-2"
                                    >
                                      <FileText size={14} /> Save Draft
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm("Confirm and send this reply?")) return;
                                        const res = await sendReply(email.sender, `Re: ${email.subject}`, editContent, email.id);
                                        alert(res.message);
                                        // Update state
                                        const updated = history.map(h => h.id === email.id ? { ...h, is_replied: true, suggested_reply: editContent } : h);
                                        setHistory(updated);
                                        setEditingId(null);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-medium shadow transition-all"
                                    >
                                      <Send size={14} /> Send Now
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(email.suggested_reply || "");
                                        alert("Copied!");
                                      }}
                                      className="px-3 py-2 bg-background text-foreground rounded-lg text-xs font-medium hover:bg-muted border border-border"
                                    >
                                      <Copy size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(email.id);
                                        setEditContent(email.suggested_reply || "");
                                      }}
                                      className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-white rounded-lg text-xs font-medium shadow transition-all",
                                        email.is_replied
                                          ? "bg-gray-600 hover:bg-gray-700"
                                          : "bg-blue-600 hover:bg-blue-700"
                                      )}
                                    >
                                      {email.is_replied ? "Resend Reply" : "Review & Send"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mail size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No emails processed yet</p>
                  <p className="text-sm text-muted-foreground/70">Try analyzing an email or sync your Gmail</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/history">
            <div className="p-6 bg-card border border-border/50 rounded-xl hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Mail size={24} className="text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold">View All Emails</h4>
                  <p className="text-sm text-muted-foreground">{history.length} emails processed</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/settings">
            <div className="p-6 bg-card border border-border/50 rounded-xl hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Brain size={24} className="text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold">AI Knowledge Base</h4>
                  <p className="text-sm text-muted-foreground">Teach your AI assistant</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

      </main>
    </div>
  );
}

function NavItem({ icon, label, active, badge }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group",
      active
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
    )}>
      {icon}
      <span className="flex-1 font-medium">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 bg-background/20 rounded-full text-xs font-bold">
          {badge}
        </span>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, gradient, border, onClick }: { icon: React.ReactNode; title: string; value: string; gradient: string; border: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border bg-gradient-to-br shadow-xl transition-all hover:scale-105 active:scale-95",
        gradient,
        border,
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-background/50 rounded-xl">
          {icon}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
