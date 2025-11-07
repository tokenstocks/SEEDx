import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export default function CTASection() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email submitted:', email);
    setEmail("");
  };

  return (
    <section className="py-20 px-4 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
          Ready to Fund Real Impact?
        </h2>
        <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-primary-foreground/90">
          Join thousands of participants funding regenerative agriculture across Africa. Start with as little as $100.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-6">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white text-foreground border-0 h-12"
            required
            data-testid="input-email"
          />
          <Button 
            type="submit"
            size="lg" 
            variant="secondary"
            className="whitespace-nowrap"
            data-testid="button-get-started-cta"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </form>

        <p className="text-sm text-primary-foreground/80">
          Minimum participation: $100 • No hidden fees • Withdraw anytime
        </p>
      </div>
    </section>
  );
}
