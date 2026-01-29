"use client";

import { useState, useEffect } from "react";
import {
    ArrowLeft,
    Brain,
    Plus,
    Trash2,
    Save,
    User,
    Sparkles,
    CheckCircle,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { getKnowledge, addKnowledge, deleteKnowledge, type KnowledgeItem, getSettings, saveSettings, type AISettings } from "@/lib/api";

export default function SettingsPage() {
    // Knowledge Base State
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [newTopic, setNewTopic] = useState("");
    const [newContent, setNewContent] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // AI Settings State
    const [settings, setSettingsState] = useState<AISettings>({ tone: "Professional", signature: "" });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [knowledgeData, settingsData] = await Promise.all([
            getKnowledge(),
            getSettings()
        ]);
        setItems(knowledgeData);
        setSettingsState(settingsData);
    };

    const handleAddKnowledge = async () => {
        if (!newTopic || !newContent) return;
        setIsAdding(true);
        await addKnowledge(newTopic, newContent);
        setNewTopic("");
        setNewContent("");
        setIsAdding(false);
        const data = await getKnowledge();
        setItems(data);
    };

    const handleDeleteKnowledge = async (id: number) => {
        if (confirm("Delete this knowledge Item?")) {
            await deleteKnowledge(id);
            const data = await getKnowledge();
            setItems(data);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        await saveSettings(settings);
        setTimeout(() => setIsSaving(false), 1000); // Fake delay for UX
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-2xl space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Brain className="text-primary" />
                        Settings
                    </h1>
                </div>

                {/* AI Personality Settings */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <User className="text-primary" size={20} />
                            AI Personality
                        </h2>
                        <p className="text-sm text-muted-foreground">Customize how your AI sounds and signs off emails.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tone of Voice</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {["Professional", "Friendly", "Urgent", "Concise"].map((tone) => (
                                    <div
                                        key={tone}
                                        onClick={() => setSettingsState({ ...settings, tone })}
                                        className={`cursor-pointer border rounded-lg p-3 text-center text-sm transition-all ${settings.tone === tone
                                            ? "bg-primary/10 border-primary text-primary font-medium ring-1 ring-primary"
                                            : "bg-background hover:bg-muted"
                                            }`}
                                    >
                                        {tone}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Signature</label>
                            <textarea
                                value={settings.signature}
                                onChange={(e) => setSettingsState({ ...settings, signature: e.target.value })}
                                placeholder="Best regards,&#10;Your Name&#10;Operations Manager"
                                className="flex w-full min-h-[100px] rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <p className="text-xs text-muted-foreground">This signature will be appended to all AI-generated replies.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Hourly Value (₹)</label>
                            <input
                                type="number"
                                value={settings.hourly_rate || 50}
                                onChange={(e) => setSettingsState({ ...settings, hourly_rate: parseFloat(e.target.value) })}
                                className="flex w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <p className="text-xs text-muted-foreground">Used to calculate the "Money Saved" metric.</p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-lg ${isSaving ? "bg-green-600" : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90"
                                    }`}
                            >
                                {isSaving ? <CheckCircle size={16} /> : <Save size={16} />}
                                {isSaving ? "Saved!" : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Knowledge Base */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-700">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <Sparkles className="text-primary" size={20} />
                            Knowledge Base
                        </h2>
                        <p className="text-sm text-muted-foreground">Teach your AI about specific business details.</p>
                    </div>

                    <div className="p-6">
                        {/* Helpful Guide */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                            <p className="text-sm font-semibold text-primary mb-3">💡 What should you add?</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {["Pricing & Packages", "Services Offered", "Contact Info", "Common FAQs", "Company Policies", "Team & Expertise"].map((item) => (
                                    <div key={item} className="flex items-center gap-2">
                                        <span className="text-primary">•</span>
                                        <span className="text-foreground/80">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 mb-6">
                            <input
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Topic (e.g. Renovation Pricing)"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                            />
                            <textarea
                                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Content (e.g. Our renovation packages start at ₹1,500/sqft...)"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                            />
                            <button
                                onClick={handleAddKnowledge}
                                disabled={isAdding || !newTopic || !newContent}
                                className="self-end bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium shadow transition-colors flex items-center gap-2"
                            >
                                {isAdding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                Add Knowledge
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8 italic">No knowledge added yet.</p>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex items-start justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-muted/30 transition-colors group">
                                        <div className="space-y-1">
                                            <h3 className="font-medium text-foreground">{item.topic}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.content}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteKnowledge(item.id)}
                                            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
