import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";
import HomeContent from "./HomeContent";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <HomeContent />
      </main>
      <Footer />
    </>
  );
}
