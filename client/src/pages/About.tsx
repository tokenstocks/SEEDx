import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, TrendingUp, Users, Globe } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-title">
            About TokenStocks
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-subtitle">
            Democratizing agricultural investments through blockchain technology
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose prose-lg max-w-none mb-16">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-6">
            TokenStocks is revolutionizing agricultural investment by making it accessible to everyone. 
            Through the power of blockchain technology on the Stellar network, we enable fractional 
            ownership of agricultural assets starting from just $100.
          </p>
          <p className="text-muted-foreground mb-6">
            Our platform connects investors with verified agricultural projects across Nigeria, 
            providing transparent returns and secure transactions through smart contracts and 
            tokenized assets.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardContent className="pt-6">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Blockchain Security</h3>
              <p className="text-muted-foreground">
                All transactions are secured on the Stellar blockchain, providing transparent 
                and immutable records of ownership.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">High Returns</h3>
              <p className="text-muted-foreground">
                Agricultural investments offer competitive returns of 15-25% APY, backed by 
                real-world farming operations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Community Driven</h3>
              <p className="text-muted-foreground">
                Join thousands of investors supporting sustainable agriculture and earning 
                passive income together.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Globe className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Global Access</h3>
              <p className="text-muted-foreground">
                Invest from anywhere in the world with support for multiple currencies 
                including NGN, USDC, and XLM.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/50 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Our Story</h2>
          <p className="text-muted-foreground mb-4">
            Founded in 2024, TokenStocks was born from a vision to bridge the gap between 
            traditional agriculture and modern finance. We recognized that while agriculture 
            is one of Nigeria's most important sectors, small-scale farmers often struggle 
            to access funding, and everyday investors miss out on lucrative opportunities.
          </p>
          <p className="text-muted-foreground mb-4">
            By leveraging blockchain technology, we've created a platform that benefits everyone: 
            farmers get the funding they need to expand their operations, and investors gain 
            access to stable, high-return investments backed by real assets.
          </p>
          <p className="text-muted-foreground">
            Today, TokenStocks manages over $5.2M in tokenized agricultural assets, supporting 
            sustainable farming practices while delivering consistent returns to our growing 
            community of investors.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
