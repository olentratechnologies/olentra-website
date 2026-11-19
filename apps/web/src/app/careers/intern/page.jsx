import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InternLanding from "@/components/intern/InternLanding";
import { buildMetadata } from "@/lib/seo";
import dockStyles from "@/components/intern/mobile-dock.module.css";

const pageMetadata = buildMetadata({
  title: "Internship Program",
  description:
    "Learn, build, and grow with Olentra Technologies. Explore our Software Engineer Intern program, mentorship, and real-world projects.",
  path: "/careers/intern",
  keywords: [
    "Olentra internships",
    "Software Engineer Intern",
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
