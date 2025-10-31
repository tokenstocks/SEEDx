import InvestmentCard from '../InvestmentCard';
import coffeeFarmImage from '@assets/generated_images/Coffee_farm_investment_opportunity_7fb2557a.png';

export default function InvestmentCardExample() {
  return (
    <div className="max-w-sm">
      <InvestmentCard
        image={coffeeFarmImage}
        title="Organic Coffee Plantation"
        location="Costa Rica"
        tokenSymbol="COFFEE"
        expectedAPY={12.5}
        investmentPeriod="18 months"
        minInvestment={1000}
        fundingProgress={67}
        isFeatured={true}
        isVerified={true}
        onInvest={() => console.log('Invest clicked')}
      />
    </div>
  );
}
