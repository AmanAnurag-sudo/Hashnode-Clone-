import { useEffect, useMemo, useState } from 'react'
import './App.css'

const avatarColors = ['avatar-lilac', 'avatar-sky', 'avatar-peach', 'avatar-mint']

function mapApiPost(post) {
  const author = post.author && typeof post.author === 'object' ? post.author : {}
  const authorName = typeof author.name === 'string' && author.name.trim()
    ? author.name.trim()
    : 'Community author'
  const initials = authorName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const content = typeof post.content === 'string' ? post.content : ''
  const description = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const tags = Array.isArray(post.tags)
    ? post.tags.filter((tag) => typeof tag === 'string')
    : []
  const createdAt = new Date(post.createdAt)
  const date = Number.isNaN(createdAt.getTime())
    ? 'Recently'
    : createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const authorColorIndex = Array.from(String(post._id || post.slug || ''))
    .reduce((sum, character) => sum + character.charCodeAt(0), 0) % avatarColors.length
  const firstTag = tags[0] || ''
  const artClass = {
    react: 'art-react',
    nodejs: 'art-node',
    javascript: 'art-javascript',
    api: 'art-api',
  }[firstTag.toLowerCase()] || ''

  return {
    id: post._id || post.slug,
    avatarColor: avatarColors[authorColorIndex],
    avatarImage: typeof author.profileImage === 'string' ? author.profileImage : '',
    initials: initials || 'CA',
    author: authorName,
    username: typeof author.username === 'string' && author.username.trim()
      ? author.username.trim()
      : 'community',
    date,
    slug: post.slug || post._id,
    title: typeof post.title === 'string' && post.title.trim()
      ? post.title
      : 'Untitled story',
    description: description.length > 180
      ? `${description.slice(0, 177)}...`
      : description || 'No preview is available for this story.',
    tags,
    readTime: Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200)),
    likes: Number.isFinite(post.likes) ? post.likes : 0,
    coverImage: typeof post.coverImage === 'string' ? post.coverImage : '',
    artClass,
    artLabel: firstTag ? firstTag.toUpperCase() : 'STORY',
    artSymbol: firstTag.slice(0, 2).toUpperCase() || '✦',
    artCaption: 'A story from the developer community',
    following: Boolean(post.following),
  }
}

const iconPaths = {
  bookmark: <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  heart: <path d="M20.8 8.8c0 4.4-8.8 10-8.8 10S3.2 13.2 3.2 8.8a4.3 4.3 0 0 1 8.8-1 4.3 4.3 0 0 1 8.8 1Z" />,
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1.9-1.1 1.9-1.4-.5a7.7 7.7 0 0 1-1.6.9l-.2 1.5h-2.2l-.3-1.5a7.7 7.7 0 0 1-1.6-.9l-1.4.5-1.1-1.9 1.1-.9a7.5 7.5 0 0 1 0-1.8l-1.1-.9 1.1-1.9 1.4.5a7.7 7.7 0 0 1 1.6-.9l.3-1.5h2.2l.2 1.5a7.7 7.7 0 0 1 1.6.9l1.4-.5 1.1 1.9-1.1.9a7.5 7.5 0 0 1-.1 1.7Z" /></>,
  users: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3.5" /><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M16 4.65a3.5 3.5 0 0 1 0 6.7" /></>,
  write: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
}

function Icon({ name, size = 18, ...props }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  )
}

const navigation = [
  { label: 'Home', icon: 'home' },
  { label: 'Explore', icon: 'compass' },
  { label: 'Bookmarks', icon: 'bookmark' },
  { label: 'Following', icon: 'users' },
  { label: 'Reading history', icon: 'clock' },
  { label: 'Settings', icon: 'settings' },
]

function Logo() {
  return (
    <a className="brand" href="#" aria-label="Hashnode home">
      <span className="brand-mark">h</span>
      <span>Hashnode</span>
    </a>
  )
}

function Header({ search, setSearch }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Logo />
        <nav className="top-links" aria-label="Main navigation">
          <a className="top-link active" href="#feed">Home</a>
          <a className="top-link" href="#explore">Explore</a>
        </nav>
        <label className={`search-box ${mobileSearchOpen ? 'search-open' : ''}`}>
          <Icon name="search" size={17} />
          <input
            type="search"
            aria-label="Search stories and developers"
            placeholder="Search stories, tags, people..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="header-actions">
          <button
            className="icon-button mobile-search-toggle"
            type="button"
            aria-label="Toggle search"
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            <Icon name="search" />
          </button>
          <a className="write-button" href="#write">
            <Icon name="write" size={16} />
            <span>Write</span>
          </a>
          <a className="sign-in-button" href="#sign-in">Sign in</a>
        </div>
      </div>
    </header>
  )
}

function Sidebar({ activeItem, onNavigate }) {
  return (
    <aside className="left-sidebar" aria-label="Your navigation">
      <p className="sidebar-label">MENU</p>
      <nav className="side-nav">
        {navigation.map((item) => (
          <button
            className={`side-nav-item ${activeItem === item.label ? 'selected' : ''}`}
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.label)}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <div className="sidebar-note-icon"><Icon name="write" size={17} /></div>
        <strong>Your ideas deserve an audience.</strong>
        <p>Share what you know with the developer community.</p>
        <a href="#write">Start writing <span aria-hidden="true">→</span></a>
      </div>
      <p className="sidebar-footer">© 2025 Hashnode&nbsp; · &nbsp;About&nbsp; · &nbsp;Help</p>
    </aside>
  )
}

function PostCard({ post, isLiked, isBookmarked, onLike, onBookmark, onOpenPost }) {
  const [avatarImageFailed, setAvatarImageFailed] = useState(false)
  const [coverImageFailed, setCoverImageFailed] = useState(false)
  const showAvatarImage = post.avatarImage && !avatarImageFailed
  const showCoverImage = post.coverImage && !coverImageFailed

  return (
    <article className="post-card">
      <div className="post-main">
        <div className="post-author">
          <div className={`avatar ${post.avatarColor}`} aria-hidden="true">
            {showAvatarImage ? (
              <img
                className="post-avatar-image"
                src={post.avatarImage}
                alt=""
                onError={() => setAvatarImageFailed(true)}
              />
            ) : post.initials}
          </div>
          <div className="author-details">
            <strong>{post.author}</strong>
            <span>@{post.username} <i>·</i> {post.date}</span>
          </div>
        </div>
        <a
          className="post-title"
          href={`/posts/${encodeURIComponent(post.slug)}`}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return
            }

            event.preventDefault()
            onOpenPost(post.slug)
          }}
        >
          {post.title}
        </a>
        <p className="post-description">{post.description}</p>
        <div className="post-tags">
          {post.tags.map((tag) => <a href={`#tag-${tag}`} key={tag}>#{tag}</a>)}
        </div>
        <div className="post-footer">
          <span className="read-time"><Icon name="clock" size={15} /> {post.readTime} min read</span>
          <div className="post-actions">
            <button
              className={`post-action ${isLiked ? 'is-active' : ''}`}
              type="button"
              aria-label={`${isLiked ? 'Unlike' : 'Like'} ${post.title}`}
              aria-pressed={isLiked}
              onClick={() => onLike(post.id)}
            >
              <Icon name="heart" size={17} />
              <span>{post.likes + (isLiked ? 1 : 0)}</span>
            </button>
            <button
              className={`post-action bookmark-action ${isBookmarked ? 'is-active' : ''}`}
              type="button"
              aria-label={`${isBookmarked ? 'Remove bookmark for' : 'Bookmark'} ${post.title}`}
              aria-pressed={isBookmarked}
              onClick={() => onBookmark(post.id)}
            >
              <Icon name="bookmark" size={17} />
            </button>
          </div>
        </div>
      </div>
      <div className={`post-art ${post.artClass}`} aria-hidden="true">
        {showCoverImage ? (
          <img
            className="post-cover-image"
            src={post.coverImage}
            alt=""
            onError={() => setCoverImageFailed(true)}
          />
        ) : (
          <>
            <span className="art-label">{post.artLabel}</span>
            <span className="art-decoration">{post.artSymbol}</span>
            <span className="art-caption">{post.artCaption}</span>
          </>
        )}
      </div>
    </article>
  )
}

function getPostSlugFromPath() {
  const match = window.location.pathname.match(/^\/posts\/([^/]+)\/?$/)

  if (!match) return ''

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function PostDetail({ slug, onBack }) {
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    const loadPost = async () => {
      setStatus('loading')
      setError('')
      setPost(null)

      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        })

        if (response.status === 404) {
          setStatus('not-found')
          return
        }

        if (!response.ok) {
          throw new Error(`Could not load this story (HTTP ${response.status}).`)
        }

        const result = await response.json()

        if (!result.success || !result.post || typeof result.post !== 'object') {
          throw new Error('The server returned an invalid story response.')
        }

        setPost(result.post)
        setStatus('success')
      } catch (loadError) {
        if (loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Could not load this story.')
        setStatus('error')
      }
    }

    loadPost()
    return () => controller.abort()
  }, [retryCount, slug])

  if (status === 'loading') {
    return (
      <div className="empty-state post-detail-status" role="status">
        <span className="feed-spinner" aria-hidden="true" />
        <h2>Loading story</h2>
        <p>Fetching this post.</p>
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="empty-state post-detail-status" role="status">
        <div className="empty-state-icon"><Icon name="search" size={22} /></div>
        <h2>Story not found</h2>
        <p>This post may have been removed or is no longer available.</p>
        <button type="button" onClick={onBack}>Back to feed</button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="empty-state post-detail-status" role="alert">
        <div className="empty-state-icon"><Icon name="search" size={22} /></div>
        <h2>Story couldn’t be loaded</h2>
        <p>{error}</p>
        <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
          Try again
        </button>
        <button className="post-detail-back-button" type="button" onClick={onBack}>
          Back to feed
        </button>
      </div>
    )
  }

  const author = post.author && typeof post.author === 'object' ? post.author : {}
  const authorName = typeof author.name === 'string' && author.name.trim()
    ? author.name.trim()
    : 'Community author'
  const initials = authorName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CA'
  const createdAt = new Date(post.createdAt)
  const date = post.createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'Date unavailable'
  const title = typeof post.title === 'string' && post.title.trim()
    ? post.title.trim()
    : 'Untitled story'
  const content = typeof post.content === 'string' && post.content.trim()
    ? post.content
    : 'No content is available for this post.'
  const tags = Array.isArray(post.tags)
    ? post.tags.filter((tag) => typeof tag === 'string' && tag.trim())
    : []

  return (
    <article className="post-detail">
      <button className="post-detail-back" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to feed
      </button>
      <header className="post-detail-header">
        <h1>{title}</h1>
        <div className="post-detail-byline">
          <div className="avatar avatar-sky" aria-hidden="true">{initials}</div>
          <div>
            <strong>{authorName}</strong>
            <span>{date}</span>
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="post-detail-tags" aria-label="Post tags">
            {tags.map((tag, index) => <span key={`${tag}-${index}`}>#{tag}</span>)}
          </div>
        ) : (
          <p className="post-detail-no-tags">No tags</p>
        )}
      </header>
      <div className="post-detail-content">{content}</div>
    </article>
  )
}

function RightSidebar() {
  const [followed, setFollowed] = useState([])
  const toggleFollow = (username) => {
    setFollowed((current) => current.includes(username)
      ? current.filter((name) => name !== username)
      : [...current, username])
  }
  const developers = [
    { name: 'Sophie Alpert', handle: 'sophiebits', initials: 'SA', color: 'avatar-lilac', specialty: 'React · Open source' },
    { name: 'Theodore Brown', handle: 'teddev', initials: 'TB', color: 'avatar-sky', specialty: 'Node.js · APIs' },
    { name: 'Mina Park', handle: 'minacodes', initials: 'MP', color: 'avatar-peach', specialty: 'Frontend · Design systems' },
  ]

  return (
    <aside className="right-sidebar" id="explore" aria-label="Discover developers and topics">
      <section className="rail-section">
        <div className="rail-heading">
          <h2>Recommended topics</h2>
          <a href="#topics">See all</a>
        </div>
        <div className="topic-list">
          <a href="#topic-react"><span className="topic-dot dot-blue" />React</a>
          <a href="#topic-javascript"><span className="topic-dot dot-yellow" />JavaScript</a>
          <a href="#topic-webdev"><span className="topic-dot dot-purple" />Web Development</a>
          <a href="#topic-node"><span className="topic-dot dot-green" />Node.js</a>
        </div>
      </section>
      <section className="rail-section">
        <div className="rail-heading">
          <h2>Popular this week</h2>
          <span className="trending-mark">↗</span>
        </div>
        <div className="popular-tags">
          {['typescript', 'ai', 'nextjs', 'career', 'css', 'opensource'].map((tag) => (
            <a href={`#tag-${tag}`} key={tag}>#{tag}</a>
          ))}
        </div>
      </section>
      <section className="rail-section developers-section">
        <div className="rail-heading">
          <h2>People to follow</h2>
          <a href="#people">See all</a>
        </div>
        <div className="developer-list">
          {developers.map((developer) => {
            const isFollowed = followed.includes(developer.handle)
            return (
              <div className="developer" key={developer.handle}>
                <div className={`avatar ${developer.color}`} aria-hidden="true">{developer.initials}</div>
                <div className="developer-info">
                  <strong>{developer.name}</strong>
                  <span>{developer.specialty}</span>
                </div>
                <button
                  type="button"
                  className={`follow-button ${isFollowed ? 'following' : ''}`}
                  aria-label={`${isFollowed ? 'Unfollow' : 'Follow'} ${developer.name}`}
                  onClick={() => toggleFollow(developer.handle)}
                >
                  {isFollowed ? 'Following' : 'Follow'}
                </button>
              </div>
            )
          })}
        </div>
      </section>
      <section className="newsletter-card">
        <div className="newsletter-icon">✳</div>
        <p className="newsletter-eyebrow">THE HASHNODE LETTER</p>
        <h2>A little inspiration for your inbox.</h2>
        <p>Fresh ideas and stories from the developer community, every week.</p>
        <a href="#newsletter">Join the newsletter <span aria-hidden="true">→</span></a>
      </section>
      <p className="rail-legal">Guidelines&nbsp; · &nbsp;Terms&nbsp; · &nbsp;Privacy</p>
    </aside>
  )
}

function App() {
  const [currentSlug, setCurrentSlug] = useState(getPostSlugFromPath)
  const [activeItem, setActiveItem] = useState('Home')
  const [activeTab, setActiveTab] = useState('Featured')
  const [search, setSearch] = useState('')
  const [likedPosts, setLikedPosts] = useState([])
  const [bookmarkedPosts, setBookmarkedPosts] = useState([])
  const [posts, setPosts] = useState([])
  const [feedStatus, setFeedStatus] = useState('loading')
  const [feedError, setFeedError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const syncRoute = () => setCurrentSlug(getPostSlugFromPath())
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const openPost = (slug) => {
    window.history.pushState({}, '', `/posts/${encodeURIComponent(slug)}`)
    setCurrentSlug(slug)
    window.scrollTo(0, 0)
  }

  const returnToFeed = () => {
    window.history.pushState({}, '', '/')
    setCurrentSlug('')
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    if (currentSlug) return undefined

    const controller = new AbortController()

    const loadPosts = async () => {
      setFeedStatus('loading')
      setFeedError('')

      try {
        const response = await fetch('/api/posts', { signal: controller.signal })

        if (!response.ok) {
          throw new Error(`Could not load stories (HTTP ${response.status}).`)
        }

        const result = await response.json()

        if (!result.success || !Array.isArray(result.posts)) {
          throw new Error('The server returned an invalid stories response.')
        }

        setPosts(result.posts.map(mapApiPost))
        setFeedStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') return
        setFeedError(error instanceof Error ? error.message : 'Could not load stories.')
        setFeedStatus('error')
      }
    }

    loadPosts()
    return () => controller.abort()
  }, [currentSlug, retryCount])

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return posts.filter((post) => {
      const matchesQuery = !query || [
        post.author,
        post.username,
        post.title,
        post.description,
        ...post.tags,
      ].join(' ').toLowerCase().includes(query)
      const matchesTab = activeTab !== 'Following' || post.following
      return matchesQuery && matchesTab
    })
  }, [activeTab, posts, search])

  const togglePostState = (id, setter) => {
    setter((current) => current.includes(id)
      ? current.filter((postId) => postId !== id)
      : [...current, id])
  }

  return (
    <div className="app-shell">
      <Header search={search} setSearch={setSearch} />
      <div className="page-layout">
        <Sidebar activeItem={activeItem} onNavigate={setActiveItem} />
        <main className="feed-column" id="feed">
          {currentSlug ? (
            <PostDetail slug={currentSlug} onBack={returnToFeed} />
          ) : (
            <>
          <div className="feed-heading">
            <div>
              <p className="eyebrow">MONDAY, MAY 19</p>
              <h1>Your feed<span className="heading-period">.</span></h1>
              <p className="feed-subtitle">Ideas and insights from developers you follow.</p>
            </div>
            <button className="filter-button" type="button" aria-label="Feed options">
              <Icon name="menu" size={17} />
            </button>
          </div>
          <div className="feed-tabs" role="tablist" aria-label="Feed type">
            {['Featured', 'Following', 'Latest'].map((tab) => (
              <button
                className={`feed-tab ${activeTab === tab ? 'active' : ''}`}
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'Featured' && <span className="featured-spark">✦</span>}
              </button>
            ))}
          </div>
          {feedStatus === 'loading' ? (
            <div className="empty-state feed-status" role="status">
              <span className="feed-spinner" aria-hidden="true" />
              <h2>Loading stories</h2>
              <p>Fetching the latest published posts.</p>
            </div>
          ) : feedStatus === 'error' ? (
            <div className="empty-state feed-status" role="alert">
              <div className="empty-state-icon"><Icon name="search" size={22} /></div>
              <h2>Stories couldn’t be loaded</h2>
              <p>{feedError}</p>
              <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
                Try again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state feed-status">
              <div className="empty-state-icon"><Icon name="write" size={22} /></div>
              <h2>No published stories yet</h2>
              <p>Check back soon for stories from the community.</p>
            </div>
          ) : visiblePosts.length ? (
            <div className="post-list">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={likedPosts.includes(post.id)}
                  isBookmarked={bookmarkedPosts.includes(post.id)}
                  onLike={(id) => togglePostState(id, setLikedPosts)}
                  onBookmark={(id) => togglePostState(id, setBookmarkedPosts)}
                  onOpenPost={openPost}
                />
              ))}
            </div>
          ) : activeTab === 'Following' ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="users" size={22} /></div>
              <h2>Following feed isn’t connected yet</h2>
              <p>The posts API doesn’t identify posts from authors you follow.</p>
              <button type="button" onClick={() => { setSearch(''); setActiveTab('Featured') }}>Show all stories</button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="search" size={22} /></div>
              <h2>No stories found</h2>
              <p>Try a different search, or explore the latest stories from the community.</p>
              <button type="button" onClick={() => { setSearch(''); setActiveTab('Featured') }}>Clear filters</button>
            </div>
          )}
          {feedStatus === 'success' && posts.length > 0 && (
            <div className="feed-end">You’re all caught up <span aria-hidden="true">✦</span></div>
          )}
            </>
          )}
        </main>
        <RightSidebar />
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 5).map((item) => (
          <button
            className={activeItem === item.label ? 'active' : ''}
            key={item.label}
            type="button"
            aria-label={item.label}
            onClick={() => setActiveItem(item.label)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label === 'Reading history' ? 'History' : item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
