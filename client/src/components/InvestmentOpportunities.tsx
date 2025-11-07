import InvestmentCard from "./InvestmentCard";
import coffeeFarmImage from '@assets/generated_images/Coffee_farm_investment_opportunity_7fb2557a.png';
import greenhouseImage from '@assets/generated_images/Greenhouse_vegetable_farm_project_45f579e7.png';
import riceFarmImage from '@assets/generated_images/Rice_farm_investment_opportunity_552f1ad5.png';

export default function InvestmentOpportunities() {
  //todo: remove mock functionality
  const investments = [
    {
      image: coffeeFarmImage,
      title: "Organic Coffee Plantation",
      location: "Costa Rica",
      tokenSymbol: "COFFEE",
      expectedAPY: 12.5,
      investmentPeriod: "18 months",
      minInvestment: 1000,
      fundingProgress: 67,
      isFeatured: true
    },
    {
      image: greenhouseImage,
      title: "Sustainable Greenhouse",
      location: "Netherlands",
      tokenSymbol: "VEGGIE",
      expectedAPY: 10.2,
      investmentPeriod: "12 months",
      minInvestment: 500,
      fundingProgress: 85,
      isFeatured: false
    },
    {
      image: riceFarmImage,
      title: "Premium Rice Paddy",
      location: "Vietnam",
      tokenSymbol: "RICE",
      expectedAPY: 14.8,
      investmentPeriod: "24 months",
      minInvestment: 2000,
      fundingProgress: 42,
      isFeatured: true
    }
  ];

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Featured Investment Opportunities</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Carefully vetted agricultural projects ready for your investment
          </p>
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
      </div>
    </section>
  );
}
