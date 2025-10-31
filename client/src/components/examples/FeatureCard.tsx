import FeatureCard from '../FeatureCard';
import { Shield } from 'lucide-react';

export default function FeatureCardExample() {
  return (
    <div className="max-w-sm">
      <FeatureCard
        icon={Shield}
        title="Blockchain Security"
        description="All transactions are secured on the Stellar blockchain, ensuring transparency and immutability."
      />
    </div>
  );
}
