"use client";

import { useState } from "react";
import { Mail, Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import { fetchGmailInbox } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
    const [isConnecting, setIsConnecting] = useState(false);
    const router = useRouter();

    const handleConnectGmail = async () => {
        setIsConnecting(true);
        try {
            alert("A browser window will open for Gmail authorization. After authorizing, return here.");
            // Fetching inbox triggers the auth flow if not authenticated
            await fetchGmailInbox(1);

            // Assume success if no error thrown, redirect to Inbox (history page)
            alert("Gmail connected! Redirecting to your Inbox...");
            router.push("/history");

        } catch (error) {
            alert("Failed to connect. Make sure you've authorized Gmail in the browser window.");
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-card border border-border rounded-3xl p-8 md:p-12 shadow-2xl">
                {/* Logo & Title */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl mb-4 shadow-lg">
                        AI
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                        Welcome to OpsAssistant
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Your AI-powered operations assistant for email management
                    </p>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                    <FeatureItem
                        icon={<Sparkles className="text-primary" />}
                        title="AI Email Analysis"
                        description="Automatically categorize, summarize, and prioritize your emails"
                    />
                    <FeatureItem
                        icon={<Mail className="text-primary" />}
                        title="Smart Replies"
                        description="Get AI-generated reply suggestions based on your business context"
                    />
                    <FeatureItem
                        icon={<CheckCircle className="text-primary" />}
                        title="Action Tracking"
                        description="Never miss important tasks with automated action item extraction"
                    />
                </div>

                {/* Connect Gmail Button */}
                <div className="bg-muted/30 rounded-2xl p-6 border border-border">
                    <h3 className="font-semibold text-lg mb-2">Get Started</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Connect your Gmail account to start analyzing emails with AI
                    </p>
                    <button
                        onClick={handleConnectGmail}
                        disabled={isConnecting}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                        {isConnecting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Mail size={20} />
                                Connect Gmail Account
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                        We'll open a secure Google OAuth window to authorize access
                    </p>
                </div>

                {/* Security Note */}
                <div className="mt-6 text-center text-xs text-muted-foreground">
                    🔒 Your data is stored locally and never shared with third parties
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex gap-3 items-start p-4 rounded-xl bg-muted/20 border border-border/50">
            <div className="mt-0.5">{icon}</div>
            <div>
                <h4 className="font-semibold mb-1">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
