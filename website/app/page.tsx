import { LocaleProvider } from "@/components/LocaleContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import OnlineConverterSection from "@/components/OnlineConverterSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CompatibilitySection from "@/components/CompatibilitySection";
import FaqSection from "@/components/FaqSection";
import DownloadSection from "@/components/DownloadSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <LocaleProvider>
      <main className="flex flex-col">
        <Navbar />
        <HeroSection />
        <OnlineConverterSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CompatibilitySection />
        <FaqSection />
        <DownloadSection />
        <Footer />
      </main>
    </LocaleProvider>
  );
}
