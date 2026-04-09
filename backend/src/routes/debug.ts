import { Router } from 'express';

const router = Router();

function summarizeSecret(name: string) {
  const rawValue = process.env[name] || '';
  return {
    present: Boolean(rawValue),
    length: rawValue.length,
  };
}

router.get('/env-check', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    runtime: {
      nodeEnv: process.env.NODE_ENV || '',
      port: process.env.PORT || '',
      cwd: process.cwd(),
      frontendUrl: process.env.FRONTEND_URL || '',
      backendPublicUrl: process.env.BACKEND_PUBLIC_URL || '',
      railwayServiceName: process.env.RAILWAY_SERVICE_NAME || '',
      railwayEnvironmentName: process.env.RAILWAY_ENVIRONMENT_NAME || '',
      railwayProjectName: process.env.RAILWAY_PROJECT_NAME || '',
    },
    payment: {
      gatewayMode: process.env.PAYMENT_GATEWAY_MODE || '',
      gatewayUrlPresent: Boolean(process.env.PAYMENT_GATEWAY_URL),
      gatewayApiUrlPresent: Boolean(process.env.PAYMENT_GATEWAY_API_URL),
      gatewayBaseUrlPresent: Boolean(process.env.PAYMENT_GATEWAY_BASE_URL),
      siteNamePresent: Boolean(process.env.PAYMENT_SITE_NAME),
      merchantId: summarizeSecret('PAYMENT_MERCHANT_ID'),
      merchantKey: summarizeSecret('PAYMENT_MERCHANT_KEY'),
    },
    chat: {
      defaultModel: process.env.NOIF_CHAT_DEFAULT_MODEL || '',
      enabledModels: process.env.NOIF_CHAT_ENABLED_MODELS || '',
      webSearchEnabled: process.env.NOIF_WEB_SEARCH_ENABLED || '',
      kimiApiKey: summarizeSecret('KIMI_API_KEY'),
      openaiApiKey: summarizeSecret('OPENAI_API_KEY'),
      anthropicApiKey: summarizeSecret('ANTHROPIC_API_KEY'),
    },
  });
});

export default router;
