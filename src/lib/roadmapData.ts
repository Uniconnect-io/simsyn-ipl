export interface FeatureCard {
  id: string;
  title: string;
  description: string;
}

export const MOSCOW_MAP: Record<string, number> = {
  'W': 1,
  'C': 3,
  'S': 8,
  'M': 13
};

export const TSHIRT_MAP: Record<string, number> = {
  'XS': 1,
  'S': 2,
  'M': 3,
  'L': 5,
  'XL': 8
};

export const FEATURE_CARDS: FeatureCard[] = [
  { id: 'feat_1', title: 'Real-time AI Meeting Minutes & Auto-Delegation', description: 'Automatically transcribes meetings and creates action items in Jira/Asana.' },
  { id: 'feat_2', title: 'Slack-to-Teams Universal Sync Bridge', description: 'Enables seamless chat channels across Slack and Microsoft Teams environments.' },
  { id: 'feat_3', title: 'Predictive Employee Churn Dashboard', description: 'Uses NLP on public channels to alert HR about employee satisfaction and churn risk.' },
  { id: 'feat_4', title: 'AI Multi-Agent Standup Coordinator', description: 'Gathers standups asynchronously and resolves blockers automatically using agent orchestration.' },
  { id: 'feat_5', title: 'AI Procurement Contract Negotiator', description: 'Automates review and counter-offers for vendor procurement contracts.' },
  { id: 'feat_6', title: 'Self-Healing IT Helpdesk System', description: 'Automatically resolves standard IT issues using generative AI runbooks.' },
  { id: 'feat_7', title: 'Enterprise Semantic Document Search', description: 'Searches across PDF, Notion, Drive, and Confluence with contextual accuracy.' },
  { id: 'feat_8', title: 'Automated Compliance & Security Audit', description: 'Continuous compliance tracking for SOC2, GDPR, and ISO27001.' },
  { id: 'feat_9', title: 'Voice-Controlled Salesforce CRM Command', description: 'Update opportunities, accounts, and tasks using natural voice commands.' },
  { id: 'feat_10', title: 'AI-Generated Micro-Learning Modules', description: 'Creates custom upskilling materials based on employee performance gaps.' },
  { id: 'feat_11', title: 'No-Code Automated Workflow Generator', description: 'Drag-and-drop builder to generate backend automation scripts using LLMs.' },
  { id: 'feat_12', title: 'Personal AI Productivity Assistant', description: 'Learns calendar habits to protect focus time and schedule high-priority tasks.' },
  { id: 'feat_13', title: 'Intelligent CV Screening & Scheduler', description: 'Ranks resumes and automates calendar invites for interview rounds.' },
  { id: 'feat_14', title: 'Real-Time Budget Optimization Predictor', description: 'Analyzes cloud costs and SaaS seats to suggest immediate savings opportunities.' },
  { id: 'feat_15', title: 'Automated Customer Support Response Drafts', description: 'Generates context-aware drafts for support tickets using previous customer interactions.' },
  { id: 'feat_16', title: 'Multi-Lingual Audio Live Translator', description: 'Real-time translation for international team video calls with sub-100ms latency.' },
  { id: 'feat_17', title: 'Generative Figma-to-Code Landing Pages', description: 'Creates fully responsive React and Tailwind code directly from Figma designs.' },
  { id: 'feat_18', title: 'Enterprise SSO Quick Connector', description: 'Streamlined OAuth and SAML2 integration for fast secure login configurations.' },
  { id: 'feat_19', title: 'Predictive Server Load & Auto-Scaler', description: 'Optimizes resource allocation by forecasting peak usage periods.' },
  { id: 'feat_20', title: 'AI Competitor Intel & Market Synthesizer', description: 'Monitors competitor pricing, feature releases, and news to generate daily briefs.' }
];
