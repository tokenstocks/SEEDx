# SEEDx MVP Design Guidelines

**Tagline**: Plant capital. Grow impact. A regenerative capital exchange.

## Design Approach

**Hybrid Approach**: Drawing inspiration from modern fintech leaders (Coinbase, Stripe) combined with data-rich dashboards (Linear, Robinhood) to create a trustworthy yet innovative regenerative capital platform for agricultural investment.

**Key Design Principles**:
- Build immediate trust through professional layouts and clear information hierarchy
- Balance financial data density with agricultural authenticity
- Create confidence through transparent metrics and blockchain verification
- Innovate within fintech conventions to feel cutting-edge yet reliable

## Typography System

**Font Families**:
- Primary: Inter (headings, UI elements, numbers) - modern, highly legible for data
- Secondary: System UI fallback for body text
- Accent: Space Grotesk for hero headlines (optional modern touch)

**Type Scale**:
- Hero Headlines: text-5xl to text-7xl, font-bold
- Section Headers: text-3xl to text-4xl, font-semibold
- Card Titles: text-xl, font-semibold
- Body Text: text-base to text-lg
- Financial Data: text-2xl to text-4xl, font-bold (investments, returns)
- Micro Text: text-sm for labels, captions
- Mono: font-mono for wallet addresses, transaction IDs

## Layout System

**Spacing Primitives**: Use Tailwind units of 3, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: py-16, py-20, py-24
- Card gaps: gap-6, gap-8
- Element margins: mb-3, mb-4, mb-6

**Grid System**:
- Container: max-w-7xl for content sections
- Investment cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard metrics: grid-cols-2 lg:grid-cols-4
- Feature showcases: grid-cols-1 lg:grid-cols-2

## Component Library

### Landing Page Structure

**Hero Section** (h-screen with strategic content centering):
- Large hero image showing lush agricultural landscape (farms, crops, sustainable agriculture)
- Overlay with blurred-background CTA buttons
- Headline: "Plant capital. Grow impact."
- Subheadline: "A regenerative capital exchange for sustainable agricultural investments on the Stellar blockchain."
- Dual CTAs: "Start Investing" (primary) + "Explore Opportunities" (secondary)
- Trust indicators below fold: "Blockchain Verified • Regulated • $XXM in Assets"

**How It Works Section** (3-column grid):
- Icon-driven cards explaining: Browse Farms → Purchase Tokens → Earn Returns
- Each card with icon, title, description, subtle hover lift effect

**Featured Investment Opportunities** (card grid):
- 3-6 investment cards showing farm projects
- Each card contains: Farm image, location badge, token symbol, expected ROI, investment period, funded percentage progress bar, "View Details" CTA
- Cards use rounded-2xl, overflow-hidden for images

**Trust & Transparency Section** (2-column split):
- Left: Blockchain verification feature with visual chain/ledger graphic
- Right: Real-time metrics dashboard preview (total investments, active farms, investor count)

**Benefits Grid** (4-column on desktop):
- Fractional Ownership, Blockchain Security, Transparent Returns, Easy Liquidity
- Icon + title + short description format

**Testimonials/Social Proof** (carousel or 3-column grid):
- Investor testimonials with photos, names, investment amounts

**CTA Section** (full-width with background treatment):
- "Ready to diversify your portfolio?" headline
- Email capture + "Get Started" button
- Supporting text about minimum investment amounts

**Footer** (comprehensive):
- Newsletter signup, navigation links (About, How It Works, Legal, FAQ)
- Stellar network status indicator
- Social links, regulatory compliance badges

### Dashboard Layout (Post-Auth)

**Top Navigation Bar**:
- Logo left, wallet balance center-right, profile dropdown right
- Subtle border-b separation

**Sidebar Navigation** (fixed left, w-64):
- Dashboard, My Investments, Browse Farms, Transactions, Wallet, Settings
- Active state indicators

**Main Dashboard Grid**:
- Top row: 4 metric cards (Portfolio Value, Total Returns, Active Investments, Available Balance)
- Portfolio chart (line/area graph showing growth)
- Recent transactions table
- Investment opportunities carousel

### Investment Cards (Reusable Component)

Structure: rounded-2xl, overflow-hidden, shadow-lg, hover:shadow-2xl transition
- Image: aspect-video, object-cover (farm photo)
- Content padding: p-6
- Badge overlays: Verified checkmark, "Featured" tag
- Title: Farm/project name, text-xl font-semibold
- Metadata row: Location pin icon + location, token symbol chip
- Metrics: Expected APY (large, bold), Investment period, Min investment
- Progress bar: Funding progress with percentage
- CTA button: "Invest Now" full width at bottom

### Data Tables

**Transaction History**:
- Alternating row backgrounds for scannability
- Columns: Date, Type, Amount, Status, Blockchain Hash
- Mono font for hashes with copy button
- Status badges with icons (confirmed, pending)

### Forms & Input Fields

**Styling**:
- Input fields: rounded-lg, border-2, px-4 py-3, focus:ring pattern
- Labels: text-sm font-medium, mb-2
- Helper text: text-sm, mt-1
- Error states: border-red emphasis

**Investment Flow**:
- Multi-step form with progress indicator
- Step 1: Select investment amount (slider + manual input)
- Step 2: Review details (summary card)
- Step 3: Wallet connection/payment
- Confirmation screen with transaction hash and next steps

### Modals & Overlays

**Investment Details Modal**:
- Large modal (max-w-4xl) with image gallery
- Tabbed interface: Overview, Financials, Documents, Blockchain
- Download prospectus button
- Invest button fixed at bottom

## Navigation Patterns

**Public Site**: Sticky top nav with transparency, becomes solid on scroll
**Dashboard**: Persistent sidebar + top bar combo
**Mobile**: Hamburger menu for public, bottom tab bar for dashboard

## Images Strategy

**Hero**: Full-width, high-quality agricultural landscape (golden wheat fields, modern greenhouse, or diverse crop rows) - conveys authenticity and abundance

**Investment Cards**: Individual farm/project photos - real, documentary-style agriculture imagery

**How It Works**: Icon illustrations (custom or from Heroicons) rather than photos

**Trust Section**: Abstract blockchain visualization or infographic-style graphic

**About/Team**: Professional team photos if available

## Animation Guidelines

**Minimal Motion**:
- Card hover: subtle lift (translate-y-1) + shadow increase
- Button hover: slight scale (scale-105) or brightness shift
- Page transitions: simple fade
- Loading states: gentle pulse on skeleton screens
- NO distracting scroll animations or parallax effects

## Accessibility Implementation

- All interactive elements meet 44x44px touch targets
- Form inputs with clear labels and error messaging
- Financial data with proper ARIA labels for screen readers
- Keyboard navigation support throughout
- High contrast for all text (especially critical financial data)

## Special Considerations

**Blockchain Elements**:
- Transaction hashes in mono font with truncation and copy functionality
- Wallet addresses formatted and verifiable
- Network status indicators (green dot for connected)
- Gas/fee displays clearly separated from investment amounts

**Financial Data Display**:
- Always show currency symbols
- Use separators for large numbers (1,000,000)
- Percentage returns in prominent, bold typography
- Clear distinction between projected vs. actual returns

**Trust Signals Throughout**:
- Verification badges on farms/investments
- Regulatory compliance notices in footer
- Blockchain verification CTAs on transaction confirmations
- Security messaging on wallet/payment screens

This design creates a professional, trustworthy fintech platform while celebrating the agricultural nature of the investments through strategic imagery and modern, data-focused layouts.