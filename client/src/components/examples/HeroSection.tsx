import HeroSection from '../HeroSection';
import heroImage from '@assets/generated_images/Agricultural_hero_landscape_image_05fbe562.png';

export default function HeroSectionExample() {
  return (
    <HeroSection 
      heroImage={heroImage}
      onGetStarted={() => console.log('Get Started clicked')}
      onExplore={() => console.log('Explore clicked')}
    />
  );
}
