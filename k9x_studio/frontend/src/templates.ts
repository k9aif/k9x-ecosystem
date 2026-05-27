export interface ProjectTemplate {
  id: string;
  icon: string;
  name: string;
  domain: string;
  description: string;
  suggestion: {
    orchestrators: { name: string }[];
    squads: { name: string; agents: string[] }[];
    agents: { name: string; type: string; model: string; description: string }[];
  };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'automotive',
    icon: '🚗',
    name: 'Automotive Dealership AI',
    domain: 'automotive',
    description:
      'A luxury automotive dealership wants AI-driven inventory management across new, CPO, and trade-in vehicles — with aging prediction, showroom optimisation, and dynamic pricing recommendations.',
    suggestion: {
      orchestrators: [
        { name: 'InventoryOrchestrator' },
        { name: 'PricingOrchestrator' },
      ],
      squads: [
        { name: 'InventorySquad', agents: ['AgingPredictionAgent', 'ShowroomOptimiserAgent'] },
        { name: 'PricingSquad',   agents: ['MarketPricingAgent', 'PriceValidationAgent'] },
      ],
      agents: [
        { name: 'AgingPredictionAgent',  type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Predicts vehicle aging risk using sales velocity and market data' },
        { name: 'ShowroomOptimiserAgent', type: 'BaseAgent',             model: 'general',   description: 'Recommends showroom placement based on foot traffic and margin' },
        { name: 'MarketPricingAgent',     type: 'K9CriticActorAgent',    model: 'reasoning', description: 'Generates and critiques pricing recommendations against market comps' },
        { name: 'PriceValidationAgent',  type: 'BaseAgent',             model: 'general',   description: 'Validates final price against OEM guidelines and margin floors' },
      ],
    },
  },
  {
    id: 'document-intelligence',
    icon: '📄',
    name: 'Document Intelligence',
    domain: 'document-processing',
    description:
      'An enterprise document processing system that ingests contracts, invoices, and reports — extracting structured data, validating against business rules, and routing to downstream systems.',
    suggestion: {
      orchestrators: [
        { name: 'ExtractionOrchestrator' },
        { name: 'ValidationOrchestrator' },
      ],
      squads: [
        { name: 'ExtractionSquad',  agents: ['DocumentClassifierAgent', 'DataExtractorAgent'] },
        { name: 'ValidationSquad',  agents: ['BusinessRuleAgent', 'ComplianceCheckerAgent'] },
      ],
      agents: [
        { name: 'DocumentClassifierAgent', type: 'BaseAgent',             model: 'general',   description: 'Classifies document type — contract, invoice, report, or claim' },
        { name: 'DataExtractorAgent',      type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Extracts structured fields with iterative self-correction' },
        { name: 'BusinessRuleAgent',       type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Validates extracted data against configurable business rules' },
        { name: 'ComplianceCheckerAgent',  type: 'K9CriticActorAgent',    model: 'reasoning', description: 'Critiques and refines compliance flags before escalation' },
      ],
    },
  },
  {
    id: 'customer-service',
    icon: '💬',
    name: 'Customer Service AI',
    domain: 'customer-service',
    description:
      'An intelligent customer service platform that triages inbound requests, resolves common queries autonomously, escalates complex issues, and ensures quality through critique-actor evaluation.',
    suggestion: {
      orchestrators: [
        { name: 'TriageOrchestrator' },
        { name: 'ResolutionOrchestrator' },
      ],
      squads: [
        { name: 'TriageSquad',     agents: ['IntentClassifierAgent', 'SentimentAgent'] },
        { name: 'ResolutionSquad', agents: ['KnowledgeBaseAgent', 'ResponseQualityAgent'] },
      ],
      agents: [
        { name: 'IntentClassifierAgent', type: 'BaseAgent',          model: 'general',   description: 'Classifies customer intent — billing, support, complaint, or enquiry' },
        { name: 'SentimentAgent',        type: 'BaseAgent',          model: 'general',   description: 'Detects customer sentiment and urgency level' },
        { name: 'KnowledgeBaseAgent',    type: 'BaseAgent',          model: 'general',   description: 'Retrieves and synthesises answers from the knowledge base' },
        { name: 'ResponseQualityAgent',  type: 'K9CriticActorAgent', model: 'reasoning', description: 'Generates response, critiques tone and accuracy, refines before sending' },
      ],
    },
  },
  {
    id: 'financial-analysis',
    icon: '📊',
    name: 'Financial Analysis AI',
    domain: 'finance',
    description:
      'A financial analysis platform that ingests market data and portfolio positions, generates risk assessments, validates regulatory compliance, and produces investment recommendations.',
    suggestion: {
      orchestrators: [
        { name: 'RiskOrchestrator' },
        { name: 'ReportingOrchestrator' },
      ],
      squads: [
        { name: 'RiskSquad',      agents: ['MarketDataAgent', 'RiskScoringAgent', 'AnomalyDetectorAgent'] },
        { name: 'ReportingSquad', agents: ['NarrativeAgent', 'ComplianceReportAgent'] },
      ],
      agents: [
        { name: 'MarketDataAgent',       type: 'BaseAgent',             model: 'general',   description: 'Fetches and normalises market data from configured sources' },
        { name: 'RiskScoringAgent',      type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Iteratively scores portfolio risk with self-validation' },
        { name: 'AnomalyDetectorAgent',  type: 'BaseAgent',             model: 'reasoning', description: 'Detects statistical anomalies in position data' },
        { name: 'NarrativeAgent',        type: 'K9CriticActorAgent',    model: 'reasoning', description: 'Drafts investment narrative, critiques for bias, refines output' },
        { name: 'ComplianceReportAgent', type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Validates report against regulatory requirements iteratively' },
      ],
    },
  },
  {
    id: 'god-almighty',
    icon: '✦',
    name: 'God the Almighty',
    domain: 'Divinity',
    description:
      'The Almighty is overwhelmed. 8 billion humans are simultaneously submitting requests for world peace, lottery wins, revenge on their ex, and help finding car keys. A cosmic AI system is urgently required to triage the infinite request queue, audit karma, verify humanitarian merit, and ensure desires — sports cars, perfect abs, that promotion — are permanently deprioritized. Lottery requests route directly to /dev/null. Court-ordered community service hours do not count toward karma. The system must be fair, patient, and capable of handling "why me?" complaints at planetary scale.',
    suggestion: {
      orchestrators: [
        { name: 'RequestTriageOrchestrator' },
        { name: 'KarmaOrchestrator' },
        { name: 'HumanitarianOrchestrator' },
        { name: 'DesireManagementOrchestrator' },
        { name: 'MiracleOrchestrator' },
      ],
      squads: [
        { name: 'RequestTriageSquad',     agents: ['RequestClassifierAgent', 'WhiningFilterAgent', 'RepeatOffenderAgent', 'UrgencyRankingAgent'] },
        { name: 'KarmaAuditSquad',        agents: ['GoodDeedsCounterAgent', 'SelflessnessCheckAgent', 'CommunityServiceAgent', 'KarmaScoreAgent'] },
        { name: 'HumanitarianSquad',      agents: ['HumanitarianCheckAgent', 'AltruismScoreAgent', 'GlobalImpactAgent'] },
        { name: 'DesireManagementSquad',  agents: ['DesireDeprioritizationAgent', 'LotteryRequestAgent', 'MaterialDesireAgent', 'RevengeRequestAgent'] },
        { name: 'MiracleAllocationSquad', agents: ['MiracleBudgetAgent', 'HumilityVerificationAgent', 'WorthinessCriticAgent', 'DivinePatienceAgent'] },
      ],
      agents: [
        { name: 'RequestClassifierAgent',    type: 'BaseAgent',             model: 'general',   description: 'Classifies request: genuine need, humanitarian, desire, lottery, or "help me find my keys". Last two skip the queue — into /dev/null.' },
        { name: 'WhiningFilterAgent',        type: 'BaseAgent',             model: 'general',   description: 'Detects duplicate requests submitted more than 3 times in a week. Applies exponential backoff. No exceptions.' },
        { name: 'RepeatOffenderAgent',       type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Tracks lifetime request history. Flags chronic complainants for mandatory 30-day cooling-off period.' },
        { name: 'UrgencyRankingAgent',       type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Iteratively ranks urgency across 8 billion concurrent requests. Described internally as the hardest job in the universe.' },
        { name: 'GoodDeedsCounterAgent',     type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Audits lifetime good deeds with full iterative validation. Disputes accepted. Karma score is still final.' },
        { name: 'SelflessnessCheckAgent',    type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Determines if the good deed was genuinely selfless or just performed for social media. Instagram posts reduce score by 40%.' },
        { name: 'CommunityServiceAgent',     type: 'BaseAgent',             model: 'general',   description: 'Verifies community service hours. Court-ordered hours do not count. Neither do hours spent telling everyone about it.' },
        { name: 'KarmaScoreAgent',           type: 'BaseAgent',             model: 'reasoning', description: 'Computes final karma score. Needs > 500 for basic requests. Desires require > 9000. Miracles require > 9999.' },
        { name: 'HumanitarianCheckAgent',    type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Verifies whether the request has any humanitarian merit whatsoever. Spoiler: most do not.' },
        { name: 'AltruismScoreAgent',        type: 'BaseAgent',             model: 'reasoning', description: 'Measures true altruism. Did you do it for others, or did you just want the karma points? The system knows.' },
        { name: 'GlobalImpactAgent',         type: 'BaseAgent',             model: 'reasoning', description: 'Measures whether granting this request makes the world even 0.01% better. Lottery wins consistently score 0.00.' },
        { name: 'DesireDeprioritizationAgent', type: 'BaseAgent',           model: 'general',   description: 'Moves all desires — sports cars, perfect hair, that promotion — to the bottom of the eternal queue. ETA: undefined.' },
        { name: 'LotteryRequestAgent',       type: 'BaseAgent',             model: 'general',   description: 'Handles all lottery and windfall requests. Routing destination: /dev/null. Response time: never.' },
        { name: 'MaterialDesireAgent',       type: 'BaseAgent',             model: 'general',   description: 'Processes requests for material possessions. Deprioritized below world peace, climate change, and someone\'s lost umbrella.' },
        { name: 'RevengeRequestAgent',       type: 'BaseAgent',             model: 'general',   description: 'Classifies revenge requests. All are flagged, monitored, and denied. Requester karma reduced by 200 for submitting.' },
        { name: 'MiracleBudgetAgent',        type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Manages the strictly limited miracle budget. Current allocation: 3 miracles per century per continent. Budget frequently overspent.' },
        { name: 'HumilityVerificationAgent', type: 'BaseAgent',             model: 'general',   description: 'Verifies the requester said please and demonstrated basic humility. Entitlement detected = immediate rejection.' },
        { name: 'WorthinessCriticAgent',     type: 'K9CriticActorAgent',    model: 'reasoning', description: 'Generates divine ruling, critiques for fairness across all 8 billion complainants, and refines until defensible in cosmic court.' },
        { name: 'DivinePatienceAgent',       type: 'BaseAgent',             model: 'general',   description: 'Checks if sufficient time has elapsed since last answered request. Minimum wait: 7 years. No appeals.' },
      ],
    },
  },
  {
    id: 'healthcare',
    icon: '🏥',
    name: 'Healthcare AI Assistant',
    domain: 'healthcare',
    description:
      'A clinical AI assistant that processes patient intake data, suggests triage priorities, cross-references medical guidelines, and generates care plan summaries for review by clinicians.',
    suggestion: {
      orchestrators: [
        { name: 'TriageOrchestrator' },
        { name: 'ClinicalOrchestrator' },
      ],
      squads: [
        { name: 'IntakeSquad',   agents: ['SymptomExtractorAgent', 'UrgencyClassifierAgent'] },
        { name: 'ClinicalSquad', agents: ['GuidelineCheckerAgent', 'CarePlanAgent'] },
      ],
      agents: [
        { name: 'SymptomExtractorAgent',  type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Extracts and validates symptom data from unstructured intake notes' },
        { name: 'UrgencyClassifierAgent', type: 'BaseAgent',             model: 'general',   description: 'Classifies patient urgency — critical, urgent, routine' },
        { name: 'GuidelineCheckerAgent',  type: 'K9ValidationLoopAgent', model: 'reasoning', description: 'Cross-references symptoms against clinical guidelines iteratively' },
        { name: 'CarePlanAgent',          type: 'K9CriticActorAgent',    model: 'reasoning', description: 'Drafts care plan summary, critiques for clinical accuracy, refines' },
      ],
    },
  },
];
