import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, Brain, LineChart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <section className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Machine learning for student budgets
        </span>
        <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[1.05]">
          Predict your <em className="text-primary">semester spending</em><br />
          before it happens.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Answer a quick lifestyle survey. Our model gives you a personalized
          monthly spending forecast, feature-level insights, and a track record
          over time.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth">Get started free</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/dashboard">Open dashboard</Link></Button>
        </div>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {[
          { icon: Brain, title: "Trained on lifestyle signals", body: "12 inputs — allowance, housing, food, transport, gaming, outings — feed a regression model." },
          { icon: LineChart, title: "Prediction history", body: "Every submission is saved so you can watch your spending pattern change over the semester." },
          { icon: BarChart3, title: "Explainable results", body: "See exactly which lifestyle factors are pushing your budget up or down." },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-6">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
