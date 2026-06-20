import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, canonical, ogType, ogImage, keywords, schemaMarkup }) => {
  const siteName = "Pak Burger House Khanewal";
  const fullTitle = `${title} | ${siteName}`;
  const url = `https://www.pakburger.com${canonical || ""}`;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords || "Pak Burger Khanewal, Best Burger in Khanewal, Fast Food Delivery Khanewal"} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType || "website"} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage || "/logo.png"} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage || "/logo.png"} />

      {/* Structured Data (JSON-LD) */}
      {schemaMarkup && (
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
