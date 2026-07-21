// Finance ISL - Content Manager
const ContentManager = {
  config: null,
  posts: null,
  navigation: null,
  downloads: null,
  faqs: null,
  glossary: null,
  about: null,
  
  async init() {
    try {
      // Load each file - use cache as fallback for each
      this.config = await this.loadFile('json/app-config.json', 'app-config');
      this.posts = await this.loadFile('json/blog-posts.json', 'blog-posts');
      this.navigation = await this.loadFile('json/navigation.json', 'navigation');
      this.downloads = await this.loadFile('json/downloads.json', 'downloads');
      this.faqs = await this.loadFile('json/faqs.json', 'faqs');
      this.glossary = await this.loadFile('json/glossary.json', 'glossary');
      this.about = await this.loadFile('json/about.json', 'about');
      
      // Cache everything
      this.cacheAll();
      
      return true;
    } catch (error) {
      console.error('Content init error:', error);
      // Try loading everything from cache
      this.config = this.config || StorageManager.loadCachedData('app-config');
      this.posts = this.posts || StorageManager.loadCachedData('blog-posts');
      this.navigation = this.navigation || StorageManager.loadCachedData('navigation');
      this.downloads = this.downloads || StorageManager.loadCachedData('downloads');
      this.faqs = this.faqs || StorageManager.loadCachedData('faqs');
      this.glossary = this.glossary || StorageManager.loadCachedData('glossary');
      this.about = this.about || StorageManager.loadCachedData('about');
      return this.config !== null;
    }
  },
  
  async loadFile(url, cacheKey) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn(`Failed to load ${url}, trying cache...`);
      return StorageManager.loadCachedData(cacheKey);
    }
  },
  
  cacheAll() {
    try {
      if (this.config) StorageManager.cacheData('app-config', this.config, 168);
      if (this.posts) StorageManager.cacheData('blog-posts', this.posts, 24);
      if (this.navigation) StorageManager.cacheData('navigation', this.navigation, 168);
      if (this.downloads) StorageManager.cacheData('downloads', this.downloads, 24);
      if (this.faqs) StorageManager.cacheData('faqs', this.faqs, 168);
      if (this.glossary) StorageManager.cacheData('glossary', this.glossary, 168);
      if (this.about) StorageManager.cacheData('about', this.about, 168);
    } catch (e) {}
  },
  
  // Posts
  getAllPosts() {
    return (this.posts && this.posts.posts) ? this.posts.posts : [];
  },
  getPostById(id) {
    return this.getAllPosts().find(p => p.id === id);
  },
  getPostBySlug(slug) {
    return this.getAllPosts().find(p => p.slug === slug);
  },
  getPostsByCategory(cat) {
    return this.getAllPosts().filter(p => p.category === cat);
  },
  getPostsBySubtopic(sub) {
    return this.getAllPosts().filter(p => {
      const subs = p.subtopics || (p.subtopic ? [p.subtopic] : []);
      return subs.includes(sub);
    });
  },
  getFeaturedPosts() {
    return this.getAllPosts().filter(p => p.featured);
  },
  getRecentPosts(limit = 9) {
    return [...this.getAllPosts()].sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate)).slice(0, limit);
  },
  getRelatedPosts(postId, limit = 3) {
    const post = this.getPostById(postId);
    if (!post || !post.relatedPosts) return [];
    return post.relatedPosts.map(id => this.getPostById(id)).filter(Boolean).slice(0, limit);
  },
  
  // Search
  searchPostsWithHighlight(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    const results = [];
    
    this.getAllPosts().forEach(post => {
      const matches = [];
      let snippet = null;
      
      if (post.title.toLowerCase().includes(q)) matches.push('title');
      if (post.excerpt && post.excerpt.toLowerCase().includes(q)) matches.push('excerpt');
      if (post.tags && post.tags.some(t => t.toLowerCase().includes(q))) matches.push('tags');
      
      const subs = post.subtopics || (post.subtopic ? [post.subtopic] : []);
      if (subs.some(s => s.toLowerCase().includes(q) || s.replace(/-/g, ' ').includes(q))) {
        matches.push('subtopic');
      }
      
      if (post.content) {
        for (const block of post.content) {
          let text = block.text || '';
          if (block.items) text += ' ' + block.items.join(' ');
          if (text.toLowerCase().includes(q)) {
            matches.push('content');
            const idx = text.toLowerCase().indexOf(q);
            snippet = text.substring(Math.max(0, idx - 60), Math.min(text.length, idx + q.length + 60));
            break;
          }
        }
      }
      
      if (matches.length > 0) {
        results.push({ post, matchSources: matches, contentSnippet: snippet,
          priority: matches.includes('title') ? 0 : matches.includes('excerpt') ? 1 : 2
        });
      }
    });
    
    return results.sort((a, b) => a.priority - b.priority);
  },
  
  // Categories
  getCategories() {
    // Try config first, then navigation file
    if (this.config && this.config.navigation && this.config.navigation.main) {
      return this.config.navigation.main;
    }
    if (this.navigation && this.navigation.menu && this.navigation.menu.main) {
      return this.navigation.menu.main;
    }
    return [];
  },
  getCategoryById(id) {
    return this.getCategories().find(c => c.id === id);
  },
  
  // Downloads
  getDownloads() {
    return (this.downloads && this.downloads.downloads) ? this.downloads.downloads : [];
  },
  getDownloadById(id) {
    return this.getDownloads().find(d => d.id === id);
  },
  
  // FAQs
  getFAQs() {
    return (this.faqs && this.faqs.faqs) ? this.faqs.faqs : [];
  },
  
  // Glossary
  getGlossaryTerms() {
    return (this.glossary && this.glossary.glossary) ? this.glossary.glossary : [];
  },
  searchGlossary(query) {
    const terms = this.getGlossaryTerms();
    if (!query) return terms;
    const q = query.toLowerCase();
    return terms.filter(t => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  },
  getGlossaryByLetter() {
    const grouped = {};
    this.getGlossaryTerms().forEach(t => {
      const letter = t.term.charAt(0).toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(t);
    });
    const sorted = {};
    Object.keys(grouped).sort().forEach(k => {
      sorted[k] = grouped[k].sort((a, b) => a.term.localeCompare(b.term));
    });
    return sorted;
  },
  
  // About
  getAbout() {
    return this.about ? this.about.about : null;
  },
  
  // Config
  getAppConfig() {
    return this.config || {};
  },
  getWeb3FormsKey() {
    return (this.config && this.config.app) ? this.config.app.web3formsAccessKey : null;
  },
  getContactEmail() {
    return (this.config && this.config.app) ? this.config.app.email : 'abdulrahamanraye68@gmail.com';
  },
  
  // Utils
  formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return d; }
  },
  getAuthorInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
};