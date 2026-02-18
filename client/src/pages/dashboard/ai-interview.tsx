import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Sparkles } from "lucide-react";

export default function AIInterview() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Mic className="w-6 h-6 text-primary" />
          AI Interview
        </h2>
        <p className="text-muted-foreground">Practice role-specific interviews and get structured feedback.</p>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Coming soon
          </CardTitle>
          <CardDescription>
            We are shipping guided mock interviews with follow-up prompts, response scoring, and coaching insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can now access AI Interview directly from the sidebar while we finish the full feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
