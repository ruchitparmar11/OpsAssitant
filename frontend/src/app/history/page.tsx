"use client";

import { useState, useEffect, Fragment, Suspense } from "react";
import {
    LayoutDashboard,
    Mail,
    FileText,
    Settings,
    ArrowLeft,
    Search,
    Filter,
    Download,
    Trash2,
    RefreshCw,
    Send,
    CheckCircle,
    Sparkles,
    Copy,
    X,
    Plus,
    Menu,
    ChevronDown
} from "lucide-react";
import { LoggedEmail, getHistory, fetchGmailInbox, analyzeBatch, sendReply, createDraft, GmailMessage, getKnowledge, addKnowledge, deleteKnowledge, KnowledgeItem } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

function HistoryPageContent() {
    const [activeTab, setActiveTab] = useState<"history" | "inbox" | "knowledge">("history");
    const [history, setHistory] = useState<LoggedEmail[]>([]);
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
    const [inbox, setInbox] = useState<GmailMessage[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

    const [filteredHistory, setFilteredHistory] = useState<LoggedEmail[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [sentimentFilter, setSentimentFilter] = useState("All");
    const [urgencyFilter, setUrgencyFilter] = useState<number>(0); // 0 means show all

    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");

    const [isFetching, setIsFetching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [syncLimit, setSyncLimit] = useState(10);
    const [hideAnalyzed, setHideAnalyzed] = useState(true);

    // Knowledge Base Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTopic, setNewTopic] = useState("");
    const [newContent, setNewContent] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    const loadHistory = async () => {
        const data = await getHistory();
        setHistory(data);
        setFilteredHistory(data);
    };

    const loadKnowledge = async () => {
        const data = await getKnowledge();
        setKnowledge(data);
    };

    const handleAddKnowledge = async (topic: string, content: string) => {
        await addKnowledge(topic, content);
        loadKnowledge();
    };

    const handleDeleteKnowledge = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        await deleteKnowledge(id);
        loadKnowledge();
    };

    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "inbox" || tab === "knowledge" || tab === "history") {
            setActiveTab(tab);
            if (tab === "knowledge") loadKnowledge();
        }
        loadHistory();
    }, [searchParams]);

    useEffect(() => {
        let result = history;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.sender.toLowerCase().includes(lowerTerm) ||
                item.subject.toLowerCase().includes(lowerTerm) ||
                item.summary.toLowerCase().includes(lowerTerm)
            );
        }

        if (categoryFilter !== "All") {
            result = result.filter(item => item.category === categoryFilter);
        }

        if (sentimentFilter !== "All") {
            result = result.filter(item => item.sentiment === sentimentFilter);
        }

        if (urgencyFilter > 0) {
            result = result.filter(item => item.urgency >= urgencyFilter);
        }

        setFilteredHistory(result);
    }, [searchTerm, categoryFilter, sentimentFilter, urgencyFilter, history]);

    // Persistence Logic
    useEffect(() => {
        const cachedInbox = sessionStorage.getItem("cached_inbox");
        const cachedToken = sessionStorage.getItem("cached_token");
        if (cachedInbox) {
            try {
                setInbox(JSON.parse(cachedInbox));
            } catch (e) { console.error("Cache parse error", e); }
        }
        if (cachedToken) {
            setNextPageToken(cachedToken);
        }
    }, []);

    useEffect(() => {
        if (inbox.length > 0) {
            sessionStorage.setItem("cached_inbox", JSON.stringify(inbox));
        }
        if (nextPageToken) {
            sessionStorage.setItem("cached_token", nextPageToken);
        }
    }, [inbox, nextPageToken]);

    const handleFetchInbox = async (reset = false) => {
        setIsFetching(true);
        if (reset) {
            sessionStorage.removeItem("cached_inbox");
            sessionStorage.removeItem("cached_token");
        }
        // If resetting, use null token. Otherwise use current state token.
        // Note: For the very first fetch, nextPageToken is null, so it works effectively as reset.
        const token = reset ? null : nextPageToken;

        const result = await fetchGmailInbox(syncLimit, token);

        if (reset) {
            setInbox(result.emails);
        } else {
            // Filter out any duplicates just in case
            const newEmails = result.emails.filter(newMsg => !inbox.some(existing => existing.id === newMsg.id));
            setInbox(prev => [...prev, ...newEmails]);
        }

        setNextPageToken(result.nextPageToken);
        setIsFetching(false);
        setActiveTab("inbox");
    };

    const toggleEmailSelection = (id: string) => {
        const newSelected = new Set(selectedEmails);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedEmails(newSelected);
    };

    const handleAnalyzeSelected = async () => {
        if (selectedEmails.size === 0) return;

        setIsAnalyzing(true);
        const messagesToAnalyze = inbox.filter(msg => selectedEmails.has(msg.id));

        const result = await analyzeBatch(messagesToAnalyze);
        alert(result.message);

        setIsAnalyzing(false);
        setSelectedEmails(new Set());
        loadHistory();
        setActiveTab("history");
    };

    const exportCSV = () => {
        // ... (existing export logic)
        const headers = ["ID", "Sender", "Subject", "Category", "Sentiment", "Urgency", "Summary", "Date"];
        const csvContent = [
            headers.join(","),
            ...filteredHistory.map(item => [
                item.id,
                `"${item.sender.replace(/"/g, '""')}"`,
                `"${item.subject.replace(/"/g, '""')}"`,
                item.category,
                item.sentiment,
                item.urgency,
                `"${item.summary.replace(/"/g, '""')}"`,
                item.created_at
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "email_history_export.csv";
        a.click();
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">AI</div>
                    <span className="font-bold text-lg">OpsAssistant</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-30 bg-background pt-20 px-6 animate-in slide-in-from-top-10 md:hidden">
                    <nav className="flex flex-col gap-4 text-lg">
                        <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted font-medium">
                                <LayoutDashboard size={24} /> Dashboard
                            </div>
                        </Link>
                        <div onClick={() => { setActiveTab("inbox"); setIsMobileMenuOpen(false); }} className={cn("flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer font-medium", activeTab === 'inbox' && "text-primary bg-primary/10")}>
                            <Sparkles size={24} /> Inbox (AI)
                        </div>
                        <div onClick={() => { setActiveTab("history"); setIsMobileMenuOpen(false); }} className={cn("flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer font-medium", activeTab === 'history' && "text-primary bg-primary/10")}>
                            <CheckCircle size={24} /> Processed
                        </div>
                        <div onClick={() => { setActiveTab("knowledge"); loadKnowledge(); setIsMobileMenuOpen(false); }} className={cn("flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer font-medium", activeTab === 'knowledge' && "text-primary bg-primary/10")}>
                            <FileText size={24} /> Knowledge Base
                        </div>
                    </nav>
                </div>
            )}
            {/* Sidebar */}
            <aside className="w-64 border-r border-border hidden md:flex flex-col p-6 gap-6 glass h-screen sticky top-0">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                        AI
                    </div>
                    <span className="font-bold text-xl tracking-tight">OpsAssistant</span>
                </div>

                <nav className="flex flex-col gap-2">
                    <Link href="/">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                            <LayoutDashboard size={20} />
                            <span className="text-sm">Dashboard</span>
                        </div>
                    </Link>
                    <div
                        onClick={() => setActiveTab("inbox")}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                            activeTab === "inbox" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <Sparkles size={20} />
                        <span className="text-sm">Inbox (AI)</span>
                    </div>
                    <div
                        onClick={() => setActiveTab("history")}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                            activeTab === "history" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <CheckCircle size={20} />
                        <span className="text-sm">Processed</span>
                    </div>
                    <div
                        onClick={() => { setActiveTab("knowledge"); loadKnowledge(); }}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                            activeTab === "knowledge" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <FileText size={20} />
                        <span className="text-sm">Knowledge Base</span>
                    </div>
                    <Link href="/settings">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                            <Settings size={20} />
                            <span className="text-sm">Settings</span>
                        </div>
                    </Link>
                </nav>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                            {activeTab === 'knowledge' ? "Knowledge Base" : (activeTab === 'history' ? "Analysis History" : "Gmail Inbox")}
                        </h1>
                        <p className="text-muted-foreground">
                            {activeTab === 'knowledge'
                                ? "Manage context documents to improve AI accuracy."
                                : (activeTab === 'history'
                                    ? "Track and manage all your processed emails."
                                    : "Fetch and analyze new emails from your inbox.")}
                        </p>

                    </div>

                    <div className="flex gap-3 items-center flex-wrap justify-end">
                        <div className="h-6 w-px bg-border mx-2"></div>

                        {activeTab === 'inbox' && (
                            <div className="flex items-center gap-4 mr-2">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={hideAnalyzed}
                                        onChange={(e) => setHideAnalyzed(e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Hide Analyzed
                                </label>

                                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1 shadow-sm">
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">Limit:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={syncLimit}
                                        onChange={(e) => setSyncLimit(parseInt(e.target.value) || 10)}
                                        className="w-12 bg-transparent text-sm text-center outline-none border-b border-transparent focus:border-primary font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'inbox' && (
                            <>
                                <button
                                    onClick={() => handleFetchInbox(true)}
                                    disabled={isFetching}
                                    title="Refresh Inbox (Start Over)"
                                    className="p-2 ml-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-medium disabled:opacity-50"
                                >
                                    <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
                                </button>

                                <button
                                    onClick={() => handleFetchInbox(false)}
                                    disabled={isFetching}
                                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-medium disabled:opacity-50"
                                >
                                    {inbox.length > 0 ? "Fetch More" : "Fetch Inbox"}
                                </button>
                            </>
                        )}

                        {activeTab === 'knowledge' && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium"
                            >
                                <FileText size={18} />
                                Add Context
                            </button>
                        )}

                        {activeTab === 'history' && (
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium"
                            >
                                <Download size={18} />
                                Export CSV
                            </button>
                        )}

                        {activeTab === 'inbox' && (
                            <button
                                onClick={handleAnalyzeSelected}
                                disabled={isAnalyzing || selectedEmails.size === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:shadow-none"
                            >
                                <Sparkles size={18} />
                                {isAnalyzing ? "Analyzing..." : `Analyze (${selectedEmails.size})`}
                            </button>
                        )}
                    </div>
                </header>

                {/* View: Processed History */}
                {activeTab === 'history' && (
                    <>
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search sender, subject, or summary..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <select
                                    className="px-4 py-2 rounded-lg bg-muted/50 border border-border outline-none cursor-pointer text-sm"
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                >
                                    <option value="All">All Categories</option>
                                    <option value="Work">Work</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Spam">Spam</option>
                                    <option value="Other">Other</option>
                                </select>

                                <select
                                    className="px-4 py-2 rounded-lg bg-muted/50 border border-border outline-none cursor-pointer text-sm"
                                    value={sentimentFilter}
                                    onChange={(e) => setSentimentFilter(e.target.value)}
                                >
                                    <option value="All">All Sentiments</option>
                                    <option value="Positive">Positive</option>
                                    <option value="Neutral">Neutral</option>
                                    <option value="Negative">Negative</option>
                                </select>

                                <select
                                    className="px-4 py-2 rounded-lg bg-muted/50 border border-border outline-none cursor-pointer text-sm"
                                    value={urgencyFilter}
                                    onChange={(e) => setUrgencyFilter(Number(e.target.value))}
                                >
                                    <option value={0}>Any Urgency</option>
                                    <option value={5}>High Priority (5+)</option>
                                    <option value={8}>Critical (8+)</option>
                                </select>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                        <tr>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Sender & Subject</th>
                                            <th className="px-6 py-4">Summary</th>
                                            <th className="px-6 py-4">Urgency</th>
                                            <th className="px-6 py-4">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                                    No records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistory.map((item) => (
                                                <Fragment key={item.id}>
                                                    <tr
                                                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                                        onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <span className={cn(
                                                                    "px-2.5 py-1 rounded-full text-xs font-medium border",
                                                                    item.category === 'Lead' && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
                                                                    item.category === 'Invoice' && "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
                                                                    item.category === 'Spam' && "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
                                                                    item.category === 'Work' && "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
                                                                    item.category === 'Personal' && "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
                                                                    item.category === 'Support' && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
                                                                    !['Lead', 'Invoice', 'Spam', 'Work', 'Personal', 'Support'].includes(item.category) && "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                                                )}>
                                                                    {item.category}
                                                                </span>
                                                                {item.is_replied && (
                                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 flex items-center gap-1">
                                                                        <CheckCircle size={10} /> Replied
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 max-w-[300px]">
                                                            <div className="font-medium text-foreground truncate" title={item.sender}>{item.sender}</div>
                                                            <div className="text-xs text-muted-foreground truncate" title={item.subject}>{item.subject}</div>
                                                        </td>
                                                        <td className="px-6 py-4 max-w-[400px]">
                                                            <p className="truncate text-muted-foreground group-hover:text-foreground transition-colors" title={item.summary}>
                                                                {item.summary}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className={cn("h-full rounded-full",
                                                                            item.urgency > 7 ? "bg-red-500" : item.urgency > 4 ? "bg-amber-500" : "bg-green-500"
                                                                        )}
                                                                        style={{ width: `${item.urgency * 10}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="font-mono text-xs">{item.urgency}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground">
                                                            {new Date(item.created_at + "Z").toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                    {expandedRow === item.id && (
                                                        <tr className="bg-muted/10">
                                                            <td colSpan={5} className="px-6 py-6 border-b border-border">
                                                                <div className="flex flex-col gap-6 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                        {/* Left Column - Email Details */}
                                                                        <div className="space-y-4">
                                                                            {/* Email Body */}
                                                                            <div className="p-5 rounded-xl bg-background border border-border shadow-sm">
                                                                                <div className="flex items-center gap-2 mb-3">
                                                                                    <Mail size={16} className="text-primary" />
                                                                                    <p className="font-semibold text-foreground">Email Content</p>
                                                                                </div>
                                                                                <div className="text-sm text-muted-foreground leading-relaxed max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                                                                    {item.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'No content available'}
                                                                                </div>
                                                                            </div>

                                                                            {/* Metadata */}
                                                                            <div className="p-5 rounded-xl bg-background border border-border shadow-sm">
                                                                                <p className="font-semibold text-foreground mb-3">Details</p>
                                                                                <div className="space-y-2 text-sm">
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-muted-foreground">Sentiment:</span>
                                                                                        <span className={cn(
                                                                                            "font-medium",
                                                                                            item.sentiment === "Positive" && "text-green-600",
                                                                                            item.sentiment === "Negative" && "text-red-600",
                                                                                            item.sentiment === "Neutral" && "text-gray-600"
                                                                                        )}>{item.sentiment}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-muted-foreground">Urgency:</span>
                                                                                        <span className="font-medium">{item.urgency}/10</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-muted-foreground">Category:</span>
                                                                                        <span className="font-medium">{item.category}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Original Content Toggle */}
                                                                            <details className="mt-4 group">
                                                                                <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground list-none">
                                                                                    <span className="group-open:rotate-90 transition-transform">▸</span> View Original Email
                                                                                </summary>
                                                                                <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs font-mono whitespace-pre-wrap border border-border/50 max-h-60 overflow-y-auto">
                                                                                    {item.body}
                                                                                </div>
                                                                            </details>
                                                                        </div>

                                                                        {/* Right Column - Actions */}
                                                                        <div className="space-y-4">
                                                                            {/* Action Items */}
                                                                            <div className="p-5 rounded-xl bg-background border border-border shadow-sm">
                                                                                <div className="flex items-center gap-2 mb-3">
                                                                                    <CheckCircle size={16} className="text-primary" />
                                                                                    <p className="font-semibold text-foreground">Action Items</p>
                                                                                </div>
                                                                                <ul className="space-y-2">
                                                                                    {JSON.parse(item.action_items_json).map((action: any, idx: number) => (
                                                                                        <li key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                                                                                            <div className={cn(
                                                                                                "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
                                                                                                action.priority === "High" && "bg-red-500",
                                                                                                action.priority === "Medium" && "bg-amber-500",
                                                                                                action.priority === "Low" && "bg-green-500"
                                                                                            )}></div>
                                                                                            <div className="flex-1">
                                                                                                <span className="text-xs font-bold uppercase text-primary mr-2">[{action.priority}]</span>
                                                                                                <span className="text-sm">{action.description}</span>
                                                                                            </div>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>

                                                                            {/* Suggested Reply with Edit Mode */}
                                                                            {item.suggested_reply && (
                                                                                <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 shadow-sm">
                                                                                    <div className="flex items-center justify-between mb-3">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Sparkles size={16} className="text-primary" />
                                                                                            <p className="font-semibold text-foreground">
                                                                                                {editingId === item.id ? "Edit Reply" : "AI Suggested Reply"}
                                                                                            </p>
                                                                                        </div>
                                                                                        {item.is_replied && (
                                                                                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                                                                                                ✓ Sent
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Content Area */}
                                                                                    {editingId === item.id ? (
                                                                                        <textarea
                                                                                            value={editContent}
                                                                                            onChange={(e) => setEditContent(e.target.value)}
                                                                                            className="w-full p-4 rounded-lg bg-background border border-primary/30 min-h-[150px] outline-none focus:ring-2 focus:ring-primary/50 mb-3 text-sm leading-relaxed resize-y"
                                                                                            autoFocus
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="bg-background/80 p-4 rounded-lg border border-border/50 mb-3 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                                                                            {item.suggested_reply}
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="flex gap-2">
                                                                                        {editingId === item.id ? (
                                                                                            // Edit Mode Buttons
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setEditingId(null);
                                                                                                    }}
                                                                                                    className="px-4 py-2.5 bg-background text-foreground rounded-lg text-sm font-medium hover:bg-muted border border-border"
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const res = await createDraft(item.sender, `Re: ${item.subject}`, editContent, item.id);
                                                                                                        alert(res.message);
                                                                                                        // setEditingId(null);
                                                                                                    }}
                                                                                                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium shadow transition-all flex items-center gap-2"
                                                                                                >
                                                                                                    <FileText size={14} /> Save Draft
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        if (!confirm("Confirm and send this reply?")) return;
                                                                                                        const res = await sendReply(item.sender, `Re: ${item.subject}`, editContent, item.id);
                                                                                                        alert(res.message);

                                                                                                        // Update State
                                                                                                        const updatedHistory = history.map(h => h.id === item.id ? { ...h, is_replied: true, suggested_reply: editContent } : h);
                                                                                                        setHistory(updatedHistory);
                                                                                                        setEditingId(null);
                                                                                                    }}
                                                                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-sm font-medium shadow-lg transition-all"
                                                                                                >
                                                                                                    <Send size={14} /> Send Now
                                                                                                </button>
                                                                                            </>
                                                                                        ) : (
                                                                                            // View Mode Buttons
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        navigator.clipboard.writeText(item.suggested_reply || "");
                                                                                                        alert("Reply copied to clipboard!");
                                                                                                    }}
                                                                                                    className="px-4 py-2.5 bg-background text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors border border-border"
                                                                                                >
                                                                                                    <Copy size={14} />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setEditingId(item.id);
                                                                                                        setEditContent(item.suggested_reply || "");
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl",
                                                                                                        item.is_replied
                                                                                                            ? "bg-gray-600 hover:bg-gray-700" // Darker gray for sent
                                                                                                            : "bg-blue-600 hover:bg-blue-700" // Strong Solid Blue for Review
                                                                                                    )}
                                                                                                >
                                                                                                    {item.is_replied ? "Resend Reply" : "Review & Send"}
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}                    </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* View: Knowledge Base */}
                {activeTab === 'knowledge' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {knowledge.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                                <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground">No context items added yet.</p>
                                <p className="text-xs text-muted-foreground mt-2">Add info about your pricing, services, or FAQs to help the AI.</p>
                            </div>
                        ) : (
                            knowledge.map((item) => (
                                <div key={item.id} className="p-6 rounded-xl bg-card border border-border shadow-sm flex flex-col group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <FileText size={18} />
                                            </div>
                                            <h3 className="font-semibold">{item.topic}</h3>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteKnowledge(item.id)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap flex-1">
                                        {item.content}
                                    </p>
                                    <div className="mt-4 text-xs text-muted-foreground pt-4 border-t border-border flex justify-between">
                                        <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {activeTab === 'inbox' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            {inbox.length === 0 ? (
                                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                                    <Mail size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground">Inbox is empty or not fetched yet.</p>
                                    <button
                                        onClick={() => handleFetchInbox(true)}
                                        className="mt-4 text-primary hover:underline text-sm font-medium"
                                    >
                                        Fetch Emails
                                    </button>
                                </div>
                            ) : (
                                inbox
                                    .filter(msg => !hideAnalyzed || !history.some(h => h.gmail_message_id === msg.id))
                                    .map((msg) => {
                                        // Check if this email is already analyzed (exists in history)
                                        // Note: history stores 'gmail_message_id' (or 'id' if we normalized it in API calls?
                                        // Looking at main.py: LoggedEmail has gmail_message_id.
                                        // Looking at frontend api.ts: LoggedEmail has id (database id), gmail_message_id, sender...
                                        // Wait, LoggedEmail definition in api.ts might be missing gmail_message_id. Let's assume we map it or check 'id' vs 'gmail_message_id'.
                                        // Actually, looking at main.py, the 'id' returned in JSON for LoggedEmail is the DB ID (int), not the gmail ID string.
                                        // BUT, we need to check if we have the gmail message ID in the frontend model.
                                        // Let's modify the frontend LoggedEmail interface first or assume we have it. 
                                        // If we don't have it, we can't match easily.
                                        // Wait, 'gmail_message_id' IS in the LoggedEmail model in db_models.py.
                                        // Does the API return it? Yes, SQLModel default.
                                        // Does frontend interface have it? I should check api.ts.

                                        // Assuming history item has gmail_message_id property. 
                                        // I will use `history.some(h => h.gmail_message_id === msg.id)`
                                        // IF TS error occurs, I will fix api.ts next.

                                        const isAnalyzed = history.some(h => h.gmail_message_id === msg.id);

                                        return (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                                                    selectedEmails.has(msg.id)
                                                        ? "bg-primary/5 border-primary shadow-sm"
                                                        : "bg-card border-border hover:bg-muted/50",
                                                    isAnalyzed && "opacity-75 bg-muted/30"
                                                )}
                                                onClick={() => !isAnalyzed && toggleEmailSelection(msg.id)}
                                            >
                                                <div className="pt-1">
                                                    {isAnalyzed ? (
                                                        <div className="flex flex-col items-center">
                                                            <CheckCircle size={20} className="text-green-500" />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmails.has(msg.id)}
                                                            readOnly
                                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold text-foreground truncate">{msg.subject}</h4>
                                                        <div className="flex items-center gap-2">
                                                            {isAnalyzed && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 whitespace-nowrap">
                                                                    Analyzed
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                                                {msg.sender.split('<')[0]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                        {msg.body.replace(/\s+/g, ' ').substring(0, 150)}...
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                            )}
                        </div>
                    </div>
                )}

                {/* Add Knowledge Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Add Context</h3>
                                        <p className="text-xs text-zinc-400">Teach the AI about you.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Topic / Keyword</label>
                                    <input
                                        type="text"
                                        value={newTopic}
                                        onChange={(e) => setNewTopic(e.target.value)}
                                        placeholder="e.g. Hourly Rate, Availability, Bio..."
                                        className="w-full bg-zinc-950/50 border border-zinc-700/50 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Detailed Information</label>
                                    <textarea
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="Type the information the AI should know..."
                                        className="w-full bg-zinc-950/50 border border-zinc-700/50 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all min-h-[120px] resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!newTopic || !newContent) return;
                                        handleAddKnowledge(newTopic, newContent);
                                        setNewTopic("");
                                        setNewContent("");
                                        setIsAddModalOpen(false);
                                    }}
                                    disabled={!newTopic || !newContent}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Save to Memory
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <HistoryPageContent />
        </Suspense>
    );
}
