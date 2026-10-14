import { Domain } from '../models/Domain.js';

const publicDomainFields = 'name slug description tagline shortDescription icon color gradient coverImage leadName leadRole stats skills sortOrder';

export const listPublicDomains = async (_req, res) => {
  const domains = await Domain.find({ isActive: true }).select(publicDomainFields).sort({ sortOrder: 1, name: 1 }).lean();
  return res.json({ success: true, data: domains });
};

export const getPublicDomain = async (req, res) => {
  const domain = await Domain.findOne({ slug: req.params.slug, isActive: true }).select(publicDomainFields).lean();
  if (!domain) return res.status(404).json({ success: false, error: { code: 'DOMAIN_NOT_FOUND', message: 'Domain not found.' } });
  return res.json({ success: true, data: domain });
};
