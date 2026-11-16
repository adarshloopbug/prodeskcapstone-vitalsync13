const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateBody, aiSuggestSchema } = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimiter');
const { generateClinicalSuggestion } = require('../services/aiService');

const router = express.Router();

/**
 * @route   GET /api/ai/status
 * @desc    Check AI Microservice health and configured provider
 * @access  Public
 */
router.get('/status', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIza'));
  return res.status(200).json({
    success: true,
    service: 'VitalSync Server-Side AI Microservice',
    status: 'OPERATIONAL',
    activeProvider: hasGeminiKey ? 'google-gemini-ai (Live SDK)' : 'vitalsync-clinical-nlp-engine (Emulated)',
    supportedCategories: ['DIAGNOSIS', 'PRESCRIPTION', 'TRIAGE', 'GENERAL', 'FOLLOW_UP'],
    rateLimit: '10 requests / minute'
  });
});

/**
 * @route   POST /api/ai/suggest
 * @desc    Generate clinical AI suggestions and decision support (Phase 2)
 * @access  Protected (Requires Bearer JWT)
 * @security Rate limited (Phase 3: aiLimiter)
 * @validation Zod validated (Phase 1: aiSuggestSchema)
 */
router.post(
  '/suggest',
  verifyToken,
  aiLimiter,
  validateBody(aiSuggestSchema),
  async (req, res, next) => {
    try {
      const { prompt, context, category } = req.body;

      const aiResponse = await generateClinicalSuggestion({
        prompt,
        context,
        category: category || 'GENERAL'
      });

      return res.status(200).json({
        success: true,
        message: 'AI clinical suggestion generated successfully.',
        data: aiResponse
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        code: 'AI_PROCESSING_ERROR',
        message: error.message || 'Failed to generate AI suggestion.'
      });
    }
  }
);

module.exports = router;
