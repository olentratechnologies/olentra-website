import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InternLanding from "@/components/intern/InternLanding";
import { buildMetadata } from "@/lib/seo";
import dockStyles from "@/components/intern/mobile-dock.module.css";

const pageMetadata = buildMetadata({
  title: "Internship Program",
  description:
    "Learn, build, and grow with Olentra Technologies. Explore our Tech Explorer and Tech Innovator internship tracks, mentorship, and real-world projects.",
  path: "/intern",
  keywords: [
    "Olentra internships",
    "Tech Explorer",
    "Tech Innovator",
    "technology internship",
  ],
});

export const metadata = {
  ...pageMetadata,
  title: { absolute: pageMetadata.title },
};

export default function InternPage() {
  return (
    <div className={dockStyles.page}>
      <Navbar />
      <InternLanding />
      <Footer />
    </div>
  );
}
