import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  PlayCircle,
  Users,
  TrendingUp,
  DollarSign,
  HandCoins,
  Coins,
  Blocks,
  Wallet,
  Shield,
  Scale,
  FileText,
  AlertCircle,
  LogOut,
  ClipboardCheck,
  LayoutGrid,
  Rocket,
  Settings,
  Gavel,
  Mail,
  Book,
  MessageCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

type Category = "all" | "getting-started" | "financial" | "technical" | "legal";

interface FAQ {
  id: string;
  category: Category;
  icon: any;
  question: string;
  answer: JSX.Element;
}

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const shouldReduceMotion = useReducedMotion();

  const categories = [
    { id: "all" as Category, label: "All Questions", icon: LayoutGrid },
    { id: "getting-started" as Category, label: "Getting Started", icon: Rocket },
    { id: "financial" as Category, label: "Financial", icon: TrendingUp },
    { id: "technical" as Category, label: "Technical", icon: Settings },
    { id: "legal" as Category, label: "Legal & Compliance", icon: Gavel },
  ];

  const faqs: FAQ[] = [
    {
      id: "q1",
      category: "getting-started",
      icon: Sprout,
      question: "What is SEEDx?",
      answer: (
        <>
          <p>
            SEEDx is a regenerative capital exchange connecting participants with verified
            agricultural projects across Africa. We enable direct funding of sustainable farms
            while providing access to farm-backed utility tokens for ecosystem participation.
          </p>
          <p>
            Our platform combines blockchain transparency, IoT monitoring, and comprehensive
            due diligence to create a trusted marketplace for agricultural project funding
            and token access.
          </p>
        </>
      ),
    },
    {
      id: "q2",
      category: "getting-started",
      icon: PlayCircle,
      question: "How do I get started on SEEDx?",
      answer: (
        <>
          <p className="font-semibold">Getting started is simple:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Create an account</strong> - Sign up with your email and complete identity verification (KYC)</li>
            <li><strong>Browse projects</strong> - Explore verified farms and review their documentation</li>
            <li><strong>Choose your path</strong> - Decide whether to fund projects directly or access utility tokens</li>
            <li><strong>Participate</strong> - Fund a farm or acquire tokens through the exchange</li>
            <li><strong>Track progress</strong> - Monitor your participation through your personalized dashboard</li>
          </ol>
          <p>
            The entire onboarding process typically takes 5-10 minutes, with KYC verification
            completed within 24-48 hours.
          </p>
        </>
      ),
    },
    {
      id: "q3",
      category: "getting-started",
      icon: Users,
      question: "Who can participate on SEEDx?",
      answer: (
        <>
          <p>
            SEEDx is currently available to participants in supported jurisdictions who meet
            our eligibility requirements:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Must be 18 years or older</li>
            <li>Must complete identity verification (KYC)</li>
            <li>Must be located in a supported country (see our supported regions list)</li>
            <li>Must comply with local regulations regarding agricultural project participation</li>
          </ul>
          <p>
            <strong>Note:</strong> Certain jurisdictions may have additional requirements or
            restrictions. U.S. participants may be subject to accredited investor requirements
            for certain project types. Please review our Terms of Service for complete eligibility details.
          </p>
        </>
      ),
    },
    {
      id: "q4",
      category: "financial",
      icon: TrendingUp,
      question: "What kind of returns can I expect from farm projects?",
      answer: (
        <>
          <p>
            <strong>Important:</strong> Returns are not guaranteed and depend entirely on project
            performance, market conditions, weather, and numerous other factors. Agricultural
            projects carry inherent risks including crop failure, market price fluctuations,
            and operational challenges.
          </p>
          <p className="font-semibold">Historical Context (Not a Guarantee):</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Completed projects</strong> have historically generated revenue distributions
            ranging from 8-18% annually, depending on crop type, market conditions, and project execution</li>
            <li><strong>Timeline:</strong> Most projects have cycles of 6-18 months from funding to harvest</li>
            <li><strong>Distribution schedule:</strong> Revenue distributions typically occur after
            harvest and sale of produce, subject to project milestones</li>
          </ul>
          <p className="font-semibold">Key Factors Affecting Returns:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Crop type and market demand</li>
            <li>Weather conditions and climate factors</li>
            <li>Farm management quality</li>
            <li>Market prices at harvest time</li>
            <li>Operational efficiency</li>
            <li>Currency exchange rates (for international projects)</li>
          </ul>
          <p>
            <strong>Risk Disclosure:</strong> You may lose some or all of your principal. Past
            performance of completed projects does not guarantee future results. Each project's
            detailed risk assessment is available in its documentation. Please review carefully
            before participating.
          </p>
          <div className="flex gap-4 p-5 bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 rounded-xl mt-6">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200 m-0">
              <strong>This is not investment advice.</strong> Revenue distributions are subject
              to project performance and are not guaranteed. Consult with qualified financial
              and legal professionals before participating.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "q5",
      category: "financial",
      icon: DollarSign,
      question: "What fees does SEEDx charge?",
      answer: (
        <>
          <p className="font-semibold">Our fee structure is transparent and straightforward:</p>
          <div className="my-6 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div className="flex flex-col gap-1">
                <strong className="text-white">Platform Fee (Primers)</strong>
                <span className="text-sm text-slate-400">For direct farm funding</span>
              </div>
              <div className="text-xl font-bold text-emerald-500">2-3%</div>
            </div>
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div className="flex flex-col gap-1">
                <strong className="text-white">Transaction Fee (Regenerators)</strong>
                <span className="text-sm text-slate-400">For token exchanges</span>
              </div>
              <div className="text-xl font-bold text-emerald-500">0.5-1%</div>
            </div>
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div className="flex flex-col gap-1">
                <strong className="text-white">Success Fee</strong>
                <span className="text-sm text-slate-400">Only charged on revenue distributions</span>
              </div>
              <div className="text-xl font-bold text-emerald-500">10-15%</div>
            </div>
            <div className="flex justify-between items-center p-5">
              <div className="flex flex-col gap-1">
                <strong className="text-white">Withdrawal Fee</strong>
                <span className="text-sm text-slate-400">For fiat currency withdrawals</span>
              </div>
              <div className="text-xl font-bold text-emerald-500">$5-25</div>
            </div>
          </div>
          <p className="font-semibold">What's Included:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Comprehensive due diligence and verification</li>
            <li>Ongoing project monitoring and reporting</li>
            <li>Blockchain transaction processing</li>
            <li>Customer support and platform access</li>
            <li>Legal and compliance infrastructure</li>
          </ul>
          <p>
            <strong>No Hidden Fees:</strong> All fees are disclosed upfront before you participate
            in any project or transaction. Detailed fee breakdowns are available in each project's
            documentation.
          </p>
        </>
      ),
    },
    {
      id: "q6",
      category: "financial",
      icon: HandCoins,
      question: "What is the minimum amount to participate?",
      answer: (
        <>
          <p>
            Minimum participation amounts vary by project type and jurisdiction:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Direct farm funding (Primers):</strong> Typically $500-$5,000 minimum,
            depending on the specific project and your location</li>
            <li><strong>Token access (Regenerators):</strong> No minimum for token exchanges;
            you can start with any amount</li>
            <li><strong>U.S. participants:</strong> May be subject to higher minimums or
            accredited investor requirements for certain project types</li>
          </ul>
          <p>
            Each project page clearly displays its minimum participation amount. We recommend
            starting with amounts you're comfortable potentially losing, as all agricultural
            projects carry risk.
          </p>
        </>
      ),
    },
    {
      id: "q7",
      category: "financial",
      icon: Coins,
      question: "How and when do I receive revenue distributions?",
      answer: (
        <>
          <p className="font-semibold">Distribution Process:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Harvest & Sale:</strong> Farm produces are harvested and sold to buyers</li>
            <li><strong>Revenue Calculation:</strong> Net revenue is calculated after deducting
            operational costs, fees, and reserves</li>
            <li><strong>Distribution:</strong> Revenue is distributed proportionally to participants
            based on their funding percentage</li>
            <li><strong>Payment:</strong> Distributions are sent to your SEEDx wallet in stablecoins
            (USDC/USDT) or your preferred currency</li>
          </ol>
          <p className="font-semibold">Timeline:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Distributions typically occur 30-60 days after harvest and sale completion</li>
            <li>Some projects may have multiple distribution events (e.g., multiple harvests)</li>
            <li>Exact timelines are specified in each project's documentation</li>
          </ul>
          <p className="font-semibold">Tracking:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All distributions are recorded on-chain for transparency</li>
            <li>You'll receive email notifications when distributions are processed</li>
            <li>View complete distribution history in your dashboard</li>
          </ul>
          <p>
            <strong>Important:</strong> Distributions are subject to project performance and are
            not guaranteed. If a project underperforms or fails, distributions may be reduced or
            eliminated entirely.
          </p>
        </>
      ),
    },
    {
      id: "q8",
      category: "technical",
      icon: Blocks,
      question: "What blockchain technology does SEEDx use?",
      answer: (
        <>
          <p>
            SEEDx is built on the <strong>Stellar network</strong> to ensure:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Transparency:</strong> All transactions are publicly verifiable on-chain</li>
            <li><strong>Security:</strong> Battle-tested blockchain with proven track record</li>
            <li><strong>Low fees:</strong> Minimal transaction costs (fractions of a cent)</li>
            <li><strong>Speed:</strong> Fast transaction confirmation times (3-5 seconds)</li>
            <li><strong>Interoperability:</strong> Compatible with major wallets and financial systems</li>
          </ul>
          <p className="font-semibold">Smart Contract Features:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Milestone-based fund releases</li>
            <li>Automated distribution calculations</li>
            <li>Multi-signature security for large transactions</li>
            <li>Transparent audit trails</li>
          </ul>
          <p>
            You don't need to be a blockchain expert to use SEEDx. Our platform handles all
            technical complexity behind the scenes while giving you the benefits of blockchain
            transparency and security.
          </p>
        </>
      ),
    },
    {
      id: "q9",
      category: "technical",
      icon: Wallet,
      question: "Do I need a cryptocurrency wallet to use SEEDx?",
      answer: (
        <>
          <p className="font-semibold">No, but it's recommended for advanced users.</p>
          <p className="font-semibold">Option 1: SEEDx Custodial Wallet (Easiest)</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Automatically created when you sign up</li>
            <li>We manage the technical details for you</li>
            <li>Fund with credit card, bank transfer, or crypto</li>
            <li>Best for beginners and most users</li>
          </ul>
          <p className="font-semibold">Option 2: Connect Your Own Wallet (Advanced)</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Connect compatible Stellar wallets</li>
            <li>Maintain full custody of your assets</li>
            <li>Interact directly with smart contracts</li>
            <li>Best for experienced crypto users</li>
          </ul>
          <p>
            Both options provide the same access to projects and features. Choose what's most
            comfortable for you.
          </p>
        </>
      ),
    },
    {
      id: "q10",
      category: "technical",
      icon: Shield,
      question: "How does SEEDx protect my data and funds?",
      answer: (
        <>
          <p className="font-semibold">Security Measures:</p>
          <p className="font-semibold">Fund Protection:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Multi-signature wallets for large fund movements</li>
            <li>Cold storage for majority of platform assets</li>
            <li>Smart contract audits by leading security firms</li>
            <li>Insurance coverage for platform-held funds (up to certain limits)</li>
            <li>Regular security penetration testing</li>
          </ul>
          <p className="font-semibold">Data Protection:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Bank-level encryption (AES-256) for all sensitive data</li>
            <li>Two-factor authentication (2FA) required for all accounts</li>
            <li>SOC 2 Type II compliance</li>
            <li>GDPR compliant data handling</li>
            <li>Regular third-party security audits</li>
          </ul>
          <p className="font-semibold">Operational Security:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>24/7 security monitoring and threat detection</li>
            <li>Withdrawal whitelist and time-delay options</li>
            <li>Email/SMS alerts for all account activities</li>
            <li>IP whitelisting available for enhanced security</li>
          </ul>
          <p>
            While we implement industry-leading security measures, no system is 100% secure.
            We recommend enabling all available security features and using strong, unique passwords.
          </p>
        </>
      ),
    },
    {
      id: "q11",
      category: "legal",
      icon: Scale,
      question: "Are farm tokens considered securities?",
      answer: (
        <>
          <p>
            <strong>Farm tokens on SEEDx are designed as utility tokens</strong> that provide
            access to platform features and agricultural project ecosystems. They are not
            intended to be investment securities or investment contracts.
          </p>
          <p className="font-semibold">Utility Token Characteristics:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide access to platform services and features</li>
            <li>Enable participation in agricultural project ecosystems</li>
            <li>Facilitate exchange within the SEEDx marketplace</li>
            <li>Do not represent equity ownership in farms or SEEDx</li>
            <li>Do not promise or guarantee returns</li>
          </ul>
          <p className="font-semibold">Important Legal Considerations:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Token classification may vary by jurisdiction</li>
            <li>Regulatory frameworks for digital assets are evolving</li>
            <li>Some jurisdictions may classify certain tokens differently</li>
            <li>We comply with applicable regulations in all operating jurisdictions</li>
          </ul>
          <p>
            <strong>Direct farm funding participation</strong> may be subject to securities
            regulations in certain jurisdictions, including potential accredited investor
            requirements in the United States.
          </p>
          <div className="flex gap-4 p-5 bg-blue-500/10 border border-blue-500/30 border-l-4 border-l-blue-500 rounded-xl mt-6">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200 m-0">
              <strong>This is not legal advice.</strong> Token classification and regulatory
              requirements vary by jurisdiction. Consult with qualified legal counsel regarding
              your specific situation and local regulations.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "q12",
      category: "legal",
      icon: FileText,
      question: "What are the tax implications of using SEEDx?",
      answer: (
        <>
          <p>
            <strong>Tax treatment varies significantly by jurisdiction and individual circumstances.</strong>
            We cannot provide tax advice, but here are general considerations:
          </p>
          <p className="font-semibold">Potential Taxable Events:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Revenue distributions:</strong> May be taxable as income in your jurisdiction</li>
            <li><strong>Token exchanges:</strong> May trigger capital gains/losses</li>
            <li><strong>Token appreciation:</strong> May be subject to capital gains tax when sold</li>
            <li><strong>Cryptocurrency transactions:</strong> May have specific reporting requirements</li>
          </ul>
          <p className="font-semibold">SEEDx Tax Support:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Annual tax statements summarizing your activity</li>
            <li>Transaction history export (CSV format)</li>
            <li>On-chain transaction records for verification</li>
            <li>Integration with popular crypto tax software (coming soon)</li>
          </ul>
          <p className="font-semibold">Jurisdiction-Specific Considerations:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>United States:</strong> IRS treats cryptocurrency as property; revenue
            distributions may be ordinary income; consult a CPA familiar with crypto taxation</li>
            <li><strong>European Union:</strong> Tax treatment varies by member state; some
            countries have specific crypto tax regimes</li>
            <li><strong>Africa:</strong> Tax regulations vary widely; some countries have
            emerging crypto tax frameworks</li>
          </ul>
          <div className="flex gap-4 p-5 bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 rounded-xl mt-6">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200 m-0">
              <strong>Consult a tax professional.</strong> Tax laws are complex and vary by
              jurisdiction. This information is for general awareness only and is not tax advice.
              Consult with a qualified tax advisor familiar with cryptocurrency and agricultural
              investments in your jurisdiction.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "q13",
      category: "legal",
      icon: AlertCircle,
      question: "What happens if a farm project fails or underperforms?",
      answer: (
        <>
          <p>
            <strong>Agricultural projects carry inherent risks,</strong> and despite our rigorous
            verification process, some projects may underperform or fail. Here's what happens:
          </p>
          <p className="font-semibold">Risk Mitigation Measures:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Milestone-based funding:</strong> Funds are released in stages as projects
            hit verified milestones, reducing total exposure</li>
            <li><strong>Reserve funds:</strong> Projects maintain operational reserves for
            unexpected challenges</li>
            <li><strong>Insurance:</strong> Many projects carry crop insurance (where available)</li>
            <li><strong>Diversification:</strong> We encourage participants to spread funding
            across multiple projects</li>
          </ul>
          <p className="font-semibold">If a Project Underperforms:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Participants are notified immediately with detailed explanation</li>
            <li>Project team works with agricultural experts to implement recovery measures</li>
            <li>Remaining funds may be reallocated or returned (minus costs incurred)</li>
            <li>Revenue distributions are reduced proportionally to actual performance</li>
          </ul>
          <p className="font-semibold">If a Project Fails Completely:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Full transparency report provided to all participants</li>
            <li>Any recoverable assets or insurance proceeds are distributed proportionally</li>
            <li>Lessons learned are incorporated into future due diligence processes</li>
            <li>Participants may lose some or all of their principal</li>
          </ul>
          <div className="flex gap-4 p-5 bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 rounded-xl mt-6">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200 m-0">
              <strong>Risk Warning:</strong> You may lose some or all of your principal. Only
              participate with amounts you can afford to lose. Past performance does not guarantee
              future results. Diversification does not eliminate risk.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "q14",
      category: "financial",
      icon: LogOut,
      question: "Can I withdraw my funds at any time?",
      answer: (
        <>
          <p className="font-semibold">It depends on your participation type:</p>
          <p className="font-semibold">Direct Farm Funding (Primers):</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Before project starts:</strong> Full withdrawal available (minus any
            processing fees)</li>
            <li><strong>After project starts:</strong> Funds are committed until project completion
            or failure; early withdrawal not available</li>
            <li><strong>Lock-up period:</strong> Typically 6-18 months depending on crop cycle</li>
            <li><strong>Distributions:</strong> Received after harvest and can be withdrawn immediately</li>
          </ul>
          <p className="font-semibold">Token Holdings (Regenerators):</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Tokens:</strong> Can be exchanged on the platform at any time, subject
            to marketplace liquidity</li>
            <li><strong>Wallet funds:</strong> Can be withdrawn to external wallets or converted
            to fiat anytime</li>
            <li><strong>No lock-up:</strong> Tokens are not subject to lock-up periods</li>
          </ul>
          <p className="font-semibold">Withdrawal Process:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Request withdrawal from your dashboard</li>
            <li>Choose withdrawal method (crypto wallet, bank transfer, etc.)</li>
            <li>Complete any required verification</li>
            <li>Funds typically arrive within 1-5 business days (depending on method)</li>
          </ol>
          <p>
            <strong>Important:</strong> Direct farm funding is illiquid until project completion.
            Only participate with funds you won't need during the project timeline.
          </p>
        </>
      ),
    },
    {
      id: "q15",
      category: "getting-started",
      icon: ClipboardCheck,
      question: "How does SEEDx verify and vet farm projects?",
      answer: (
        <>
          <p>
            <strong>Every project undergoes our comprehensive 7-stage verification process:</strong>
          </p>
          <p className="font-semibold">Stage 1: Initial Screening</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Business plan review</li>
            <li>Team background checks</li>
            <li>Market opportunity assessment</li>
            <li>Preliminary financial analysis</li>
          </ul>
          <p className="font-semibold">Stage 2: Legal Due Diligence</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Land ownership verification</li>
            <li>Regulatory compliance review</li>
            <li>Contract and agreement analysis</li>
            <li>Intellectual property verification</li>
          </ul>
          <p className="font-semibold">Stage 3: Financial Audit</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Historical financial statement review</li>
            <li>Cash flow projections analysis</li>
            <li>Cost structure verification</li>
            <li>Revenue model validation</li>
          </ul>
          <p className="font-semibold">Stage 4: Physical Site Visit</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>On-site inspection by agricultural experts</li>
            <li>Soil quality testing</li>
            <li>Infrastructure assessment</li>
            <li>Photo and video documentation</li>
          </ul>
          <p className="font-semibold">Stage 5: Environmental Assessment</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Sustainability practices evaluation</li>
            <li>Environmental impact analysis</li>
            <li>Regenerative agriculture verification</li>
            <li>Biodiversity impact assessment</li>
          </ul>
          <p className="font-semibold">Stage 6: Risk Analysis</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Market risk evaluation</li>
            <li>Operational risk assessment</li>
            <li>Climate and weather risk analysis</li>
            <li>Overall risk rating assignment</li>
          </ul>
          <p className="font-semibold">Stage 7: Ongoing Monitoring</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>IoT sensor deployment</li>
            <li>Regular progress reporting</li>
            <li>Milestone verification</li>
            <li>Continuous compliance monitoring</li>
          </ul>
          <p>
            <strong>Approval Rate:</strong> Only about 15-20% of submitted projects pass our
            complete verification process and are listed on the platform.
          </p>
        </>
      ),
    },
  ];

  const filteredFAQs = activeCategory === "all"
    ? faqs
    : faqs.filter((faq) => faq.category === activeCategory);

  return (
    <section className="relative py-20 md:py-32 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_25%_25%,rgba(251,191,54,0.06)_0%,transparent_50%),radial-gradient(circle_at_75%_75%,rgba(16,185,129,0.06)_0%,transparent_50%)]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-block px-5 py-2 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-full shadow-[0_0_20px_rgba(251,191,54,0.15)]">
            <span className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">
              Questions & Answers
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tracking-tight" data-testid="heading-faq">
            Frequently Asked Questions
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed" data-testid="text-faq-subtitle">
            Everything you need to know about participating in regenerative agriculture through SEEDx. Can't find your answer?{" "}
            <a href="/contact" className="text-emerald-500 hover:text-amber-500 border-b-2 border-emerald-500/30 hover:border-amber-500/50 transition-all">
              Contact our team
            </a>.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="flex flex-wrap justify-center gap-3 mb-12 md:mb-16"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                variant={activeCategory === category.id ? "default" : "outline"}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === category.id
                    ? "bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/30 scale-105 border-0"
                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
                }`}
                data-testid={`filter-${category.id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.label}</span>
              </Button>
            );
          })}
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mb-12 md:mb-16"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFAQs.map((faq) => {
              const Icon = faq.icon;
              return (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 data-[state=open]:border-amber-500/50 data-[state=open]:shadow-[0_8px_24px_rgba(251,191,54,0.15)]"
                  data-testid={`faq-item-${faq.id}`}
                >
                  <AccordionTrigger className="px-6 md:px-8 py-6 hover:no-underline group [&[data-state=open]>div>.faq-icon]:scale-110 [&[data-state=open]>div>.faq-icon]:rotate-6">
                    <div className="flex items-center gap-4 md:gap-6 text-left flex-1">
                      <div className="faq-icon w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center flex-shrink-0 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-slate-950" />
                      </div>
                      <span className="text-base md:text-xl font-bold text-white" data-testid={`question-${faq.id}`}>
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 md:px-8 pb-6 text-slate-300 leading-relaxed [&>*]:mb-4 [&>*:last-child]:mb-0" data-testid={`answer-${faq.id}`}>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </motion.div>

        {/* Still Have Questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12"
          data-testid="cta-still-have-questions"
        >
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Still have questions?
              </h3>
              <p className="text-slate-400">
                Our team is here to help. Get in touch and we'll respond within 24 hours.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button
                variant="default"
                className="bg-gradient-to-br from-emerald-500 to-emerald-700 hover:opacity-90 text-white px-7 py-6 text-base font-semibold shadow-lg shadow-emerald-500/30 whitespace-nowrap"
                data-testid="button-contact-support"
              >
                <Mail className="w-5 h-5 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 px-7 py-6 text-base font-semibold whitespace-nowrap"
                data-testid="button-view-documentation"
              >
                <Book className="w-5 h-5 mr-2" />
                View Documentation
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
