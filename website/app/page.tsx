import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CompatibilitySection from "@/components/CompatibilitySection";
import DownloadSection from "@/components/DownloadSection";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="flex flex-col">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CompatibilitySection />
      <DownloadSection />
      <Footer />
    </main>
  );
}
