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
