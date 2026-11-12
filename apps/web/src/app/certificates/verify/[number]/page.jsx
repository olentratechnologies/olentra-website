import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CertificateVerify from "@/components/intern/CertificateVerify";
import { buildMetadata } from "@/lib/seo";

const pageMetadata = buildMetadata({
  title: "Verify a Certificate",
  description: "Confirm that an Olentra Technologies internship certificate is genuine.",
  path: "/certificates/verify",
});

export const metadata = {
  ...pageMetadata,
  title: { absolute: pageMetadata.title },
  robots: { index: false, follow: false },
};

export default async function CertificateVerifyPage({ params }) {
  const { number } = await params;
  return (
    <>
      <Navbar />
      <CertificateVerify number={decodeURIComponent(number || "")} />
      <Footer />
    </>
  );
}
