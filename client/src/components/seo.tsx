import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  includeBrandSuffix?: boolean;
  robots?: string;
}

export function SEO({
  title,
  description,
  keywords,
  ogImage = '/og-image.jpg',
  ogType = 'website',
  canonicalUrl,
  includeBrandSuffix = true,
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
}: SEOProps) {
  useEffect(() => {
    const pageTitle = includeBrandSuffix ? `${title} | Joblify` : title;

    // Set title
    document.title = pageTitle;

    // Set or update meta tags
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    // Standard meta tags
    setMetaTag('title', pageTitle);
    setMetaTag('description', description);
    setMetaTag('robots', robots);
    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    // Open Graph tags
    setMetaTag('og:title', pageTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', 'Joblify', true);
    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', pageTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);
    if (canonicalUrl) {
      setMetaTag('twitter:url', canonicalUrl);
    }

    // Canonical URL
    if (canonicalUrl) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', canonicalUrl);
    }
  }, [title, description, keywords, ogImage, ogType, canonicalUrl, includeBrandSuffix, robots]);

  return null;
}
