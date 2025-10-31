import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InvestmentCard from "@/components/InvestmentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";

const investments = [
  {
    title: "Premium Rice Farm",
    location: "Kano, Nigeria",
    minInvestment: 100,
    expectedAPY: 16.5,
    investmentPeriod: "12 months",
    fundingProgress: 78,
    tokenSymbol: "RICE",
    image: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800&auto=format&fit=crop",
    isFeatured: true,
  },
  {
    title: "Cassava Processing Plant",
    location: "Ogun State, Nigeria",
    minInvestment: 250,
    expectedAPY: 22.5,
    investmentPeriod: "18 months",
    fundingProgress: 45,
    tokenSymbol: "CASS",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop",
  },
  {
    title: "Fish Farm Expansion",
    location: "Lagos, Nigeria",
    minInvestment: 150,
    expectedAPY: 20,
    investmentPeriod: "12 months",
    fundingProgress: 92,
    tokenSymbol: "FISH",
    image: "https://images.unsplash.com/photo-1535406208535-1429839cfd13?w=800&auto=format&fit=crop",
    isFeatured: true,
  },
  {
    title: "Poultry Farm",
    location: "Ibadan, Nigeria",
    minInvestment: 200,
    expectedAPY: 18,
    investmentPeriod: "9 months",
    fundingProgress: 65,
    tokenSymbol: "POULT",
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&auto=format&fit=crop",
  },
  {
    title: "Organic Vegetable Farm",
    location: "Plateau State, Nigeria",
    minInvestment: 100,
    expectedAPY: 15.5,
    investmentPeriod: "6 months",
    fundingProgress: 55,
    tokenSymbol: "VEGE",
    image: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&auto=format&fit=crop",
  },
  {
    title: "Dairy Farm Co-op",
    location: "Kaduna, Nigeria",
    minInvestment: 300,
    expectedAPY: 19,
    investmentPeriod: "24 months",
    fundingProgress: 38,
    tokenSymbol: "DAIRY",
    image: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&auto=format&fit=crop",
  },
];

export default function Browse() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-title">
            Browse Investment Opportunities
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl" data-testid="text-subtitle">
            Discover tokenized agricultural investments with transparent returns and blockchain verification
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search farms by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="return-high">Highest Return</SelectItem>
                <SelectItem value="return-low">Lowest Return</SelectItem>
                <SelectItem value="min-investment">Min Investment</SelectItem>
                <SelectItem value="funded">Most Funded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {investments.map((investment, index) => (
            <InvestmentCard
              key={index}
              {...investment}
              onInvest={() => console.log(`Invest in ${investment.title}`)}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" data-testid="button-load-more">
            Load More Opportunities
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
