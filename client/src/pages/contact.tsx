import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/footer";
import { Briefcase, Mail, MessageSquare, Send, CheckCircle2, Sparkles, Loader2, AlertCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getCsrfToken } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAiResponse(null);

    try {
      // First, try to get AI response
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch("/api/contact/ai-response", {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await res.json();
      
      if (data.success && data.response) {
        setAiResponse(data.response);
        toast({
          title: "AI Assistant Response",
          description: "Our AI has analyzed your question. Please review the response below.",
        });
      } else {
        // If AI can't help, send email directly
        await sendEmailToSupport();
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Fallback to email if AI fails
      await sendEmailToSupport();
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendEmailToSupport = async () => {
    setIsSendingEmail(true);
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch("/api/contact/send-email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...formData,
          aiResponse: aiResponse || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send email");
      }

      const data = await res.json();
      
      if (data.success) {
        setShowSuccessDialog(true);
        setFormData({ name: "", email: "", message: "" });
        setAiResponse(null);
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try emailing us directly at support@joblifyai.com",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAcceptAiResponse = () => {
    // User is satisfied with AI response, clear form
    setFormData({ name: "", email: "", message: "" });
    setAiResponse(null);
    toast({
      title: "Glad we could help!",
      description: "If you have more questions, feel free to reach out again.",
    });
  };

  const handleRejectAiResponse = async () => {
    // User wants to contact support anyway
    toast({
      title: "Sending to support...",
      description: "We're forwarding your message to our support team.",
    });
    await sendEmailToSupport();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <AlertDialogTitle>Message Sent Successfully!</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Your message has been sent to our support team. You should receive a confirmation email shortly.
              We typically respond within 24-48 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Joblify</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/why-us">
              <Button variant="ghost" size="sm">Why Us</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 border-b">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about Joblify? We're here to help. Send us a message and we'll respond within 2-3 business days.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Send us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {aiResponse ? (
                    <motion.div
                      key="ai-response"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2 mb-3">
                          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <h3 className="font-semibold text-primary">AI Assistant Response</h3>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-sm text-muted-foreground mb-3">
                          Did this answer your question?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAcceptAiResponse}
                            variant="default"
                            className="flex-1"
                            disabled={isSendingEmail}
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Yes, I'm satisfied
                          </Button>
                          <Button
                            onClick={handleRejectAiResponse}
                            variant="outline"
                            className="flex-1"
                            disabled={isSendingEmail}
                          >
                            {isSendingEmail ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Contact Support
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Choosing "Contact Support" will forward your message to our team
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="contact-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Describe your question or issue..."
                          rows={6}
                          required
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Our AI will attempt to answer instantly, or we'll forward to our support team.
                        </p>
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Getting AI Response...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    For direct support or urgent inquiries:
                  </p>
                  <a
                    href="mailto:support@joblifyai.com"
                    className="text-primary hover:underline font-medium"
                  >
                    support@joblifyai.com
                  </a>
                  <p className="text-sm text-muted-foreground mt-4">
                    We typically respond within 24-48 hours during business days.
                  </p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      For privacy-related inquiries:
                    </p>
                    <a
                      href="mailto:privacy@joblifyai.com"
                      className="text-sm text-primary hover:underline"
                    >
                      privacy@joblifyai.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">How does Joblify work?</h4>
                      <p className="text-sm text-muted-foreground">
                        Joblify uses AI to help you create professional resumes through natural conversation. Just chat with our AI assistant and it will guide you through the process.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">What formats can I export?</h4>
                      <p className="text-sm text-muted-foreground">
                        You can export your resume in both PDF and DOCX formats, optimized for ATS systems.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Is my data secure?</h4>
                      <p className="text-sm text-muted-foreground">
                        Yes, we take data security seriously. All your information is encrypted and stored securely. Read our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link> for details.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
