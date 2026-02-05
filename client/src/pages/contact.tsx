import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/footer";
import { Briefcase, Mail, MessageSquare, Send, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAiResponse(null);

    try {
      const res = await fetch("/api/contact/ai-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();
      setAiResponse(data.response);
      toast({
        title: "Response received!",
        description: "Our AI assistant has provided a response below.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                {aiResponse ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <h3 className="font-semibold text-primary">AI Response</h3>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setAiResponse(null);
                          setFormData({ name: "", email: "", subject: "", message: "" });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Ask Another Question
                      </Button>
                      <Button
                        onClick={() => setAiResponse(null)}
                        className="flex-1"
                      >
                        Follow Up
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      For more detailed assistance, email us at{" "}
                      <Button variant="link" className="h-auto p-0 text-xs text-primary" asChild>
                        <a href="mailto:privacy@joblifyai.com">privacy@joblifyai.com</a>
                      </Button>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="How can we help?"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
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
                    For general inquiries, privacy concerns, or support:
                  </p>
                  <a
                    href="mailto:privacy@joblifyai.com"
                    className="text-primary hover:underline font-medium"
                  >
                    privacy@joblifyai.com
                  </a>
                  <p className="text-sm text-muted-foreground mt-4">
                    We typically respond within 2-3 business days.
                  </p>
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
