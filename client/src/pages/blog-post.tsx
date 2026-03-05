import { Link, useParams } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { ReadingProgress } from "@/components/reading-progress";
import { BackToTop } from "@/components/back-to-top";
import { NewsletterSubscribe } from "@/components/newsletter-subscribe";
import { SEO } from "@/components/seo";
import { Briefcase, ArrowLeft, Calendar, Clock, Share2, Twitter, Linkedin, Facebook } from "lucide-react";
import { getBlogPost, getAllBlogPosts } from "@/lib/blog-data";
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug!);
  const allPosts = getAllBlogPosts();
  const relatedPosts = allPosts
    .filter(p => p.slug !== slug && (p.category === post?.category || p.tags.some(tag => post?.tags.includes(tag))))
    .slice(0, 3);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">Sorry, we couldn't find the blog post you're looking for.</p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Check out this article: ${post.title}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`${post.title} | Blog`}
        description={post.description}
        keywords={post.tags.join(', ')}
        ogImage={post.image}
        ogType="article"
        canonicalUrl={`https://joblify.com/blog/${post.slug}`}
      />

      {/* Reading Progress Bar */}
      <ReadingProgress />
      
      {/* Back to Top Button */}
      <BackToTop />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Joblify</span>
            </div>
          </Link>
          <Link href="/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </nav>

      {/* Article Header */}
      <article className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Articles
              </Button>
            </Link>
            <Badge variant="secondary" className="mb-4">{post.category}</Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {post.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime} read
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            {/* Share Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')}
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')}
              >
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')}
              >
                <Facebook className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Article Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
          
          {/* Newsletter Subscribe */}
          <NewsletterSubscribe />
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 px-4 sm:px-6 bg-muted/30 border-t">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link key={relatedPost.slug} href={`/blog/${relatedPost.slug}`}>
                  <div className="bg-background border rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <Badge variant="secondary" className="mb-3 text-xs">
                      {relatedPost.category}
                    </Badge>
                    <h3 className="font-semibold mb-2 line-clamp-2">{relatedPost.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {relatedPost.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{relatedPost.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
