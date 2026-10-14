import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['weekly', 'attendance', 'workload', 'custom'], required: true, index: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
reportSchema.index({ type: 1, periodStart: -1, periodEnd: -1 });

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;
